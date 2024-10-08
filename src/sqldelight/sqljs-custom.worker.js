
import initSqlJs from "sql.js";

let db = null;
const dbName = "myDatabase"; // Cambia esto por el nombre que desees para tu base de datos
const storeName = "sqlData";

// Función para crear la base de datos y almacenar en IndexedDB
async function createDatabase() {
  let SQL = await initSqlJs({ locateFile: file => '/sql-wasm.wasm' });

  // Recupera la base de datos de IndexedDB
  const request = indexedDB.open(dbName);

  request.onupgradeneeded = function (event) {
    const db = event.target.result;
    // Crea un almacén de objetos si no existe
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
          // Si hay datos, cargar la base de datos desde IndexedDB
          db = new SQL.Database(getRequest.result);
        } else {
          // Si no hay datos, crear una nueva base de datos
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
    store.put(db.export(), "database"); // Almacenar la base de datos
  };
}

// Manejar los mensajes entrantes
function onModuleReady() {
  const data = this.data;

  switch (data && data.action) {
    case "exec":
      if (!data["sql"]) {
        throw new Error("exec: Missing query string");
      }

      const result = db.exec(data.sql, data.params);
      saveDatabase(); // Guardar la base de datos después de ejecutar
      return postMessage({
        id: data.id,
        results: result[0] ?? { values: [] }
      });
    case "begin_transaction":
      return postMessage({
        id: data.id,
        results: db.exec("BEGIN TRANSACTION;")
      });
    case "end_transaction":
      return postMessage({
        id: data.id,
        results: db.exec("END TRANSACTION;")
      });
    case "rollback_transaction":
      return postMessage({
        id: data.id,
        results: db.exec("ROLLBACK TRANSACTION;")
      });
    default:
      throw new Error(`Unsupported action: ${data && data.action}`);
  }
}

function onError(err) {
  return postMessage({
    id: this.data.id,
    error: err
  });
}

// Configuración del worker
if (typeof importScripts === "function") {
  db = null;
  const sqlModuleReady = createDatabase();
  self.onmessage = (event) => {
    return sqlModuleReady
      .then(onModuleReady.bind(event))
      .catch(onError.bind(event));
  };
}
