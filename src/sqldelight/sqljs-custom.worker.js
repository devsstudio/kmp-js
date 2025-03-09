"use strict";
importScripts("https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.11.0/sql-wasm.js");
let db = null;
const dbName = "myDatabase";
const storeName = "sqlData";
// Crear base de datos
async function createDatabase() {
    let SQL = await initSqlJs({ locateFile: file => './sql-wasm.wasm' });
    const request = indexedDB.open(dbName);
    request.onupgradeneeded = function (event) {
        const db = event.target.result;
        db.createObjectStore(storeName);
    };
    return new Promise((resolve, reject) => {
        request.onsuccess = async function (event) {
            const dbIDB = event.target.result;
            const tx = dbIDB.transaction(storeName, "readonly");
            const store = tx.objectStore(storeName);
            const getRequest = store.get("database");
            getRequest.onsuccess = function () {
                if (getRequest.result) {
                    db = new SQL.Database(getRequest.result);
                }
                else {
                    db = new SQL.Database();
                }
                resolve();
            };
            getRequest.onerror = function () {
                reject(getRequest.error);
            };
        };
        request.onerror = function () {
            reject(request.error);
        };
    });
}
// Guardar la base de datos en IndexedDB
async function saveDatabase() {
    const request = indexedDB.open(dbName);
    request.onsuccess = function (event) {
        const dbIDB = event.target.result;
        const tx = dbIDB.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        store.put(db.export(), "database");
    };
}
// Manejo de mensajes en el Worker
self.onmessage = async function (event) {
    var _a;
    const data = event.data;
    if (!db)
        await createDatabase();
    switch (data.action) {
        case "exec":
            if (!data.sql)
                throw new Error("exec: Missing query string");
            const result = db.exec(data.sql, data.params);
            saveDatabase();
            self.postMessage({ id: data.id, results: (_a = result[0]) !== null && _a !== void 0 ? _a : { values: [] } });
            break;
        case "begin_transaction":
            self.postMessage({ id: data.id, results: db.exec("BEGIN TRANSACTION;") });
            break;
        case "end_transaction":
            self.postMessage({ id: data.id, results: db.exec("END TRANSACTION;") });
            break;
        case "rollback_transaction":
            self.postMessage({ id: data.id, results: db.exec("ROLLBACK TRANSACTION;") });
            break;
        default:
            throw new Error(`Unsupported action: ${data.action}`);
    }
};
