This page is based on [SQL.js Web Worker]: https://sqldelight.github.io/sqldelight/2.0.2/js_sqlite/sqljs_worker/. Follow the instructions in that page before do this.

# SQL.js Web Worker

To include the SQL.js worker in your project, first add a dependency on the worker package along with a dependency on [SQL.js].
```kotlin
kotlin {
  sourceSets.jsMain.dependencies {
    implementation(npm("@devs-studio/kmp-js", "1.0.0"))
    implementation(npm("sql.js", "1.8.0"))
  }
}
```

The [SQL.js] package includes a WebAssembly binary that must be copied into your application's output.
In your project, add an [additional Webpack configuration file](https://kotlinlang.org/docs/js-project-setup.html#webpack-configuration-file)
to configure the copying of the binary to your assembled project.

```js title="webpack.config.d/sqljs-config.js"
// {project}/webpack.config.d/sqljs.js
config.resolve = {
    fallback: {
        fs: false,
        path: false,
        crypto: false,
    }
};

const CopyWebpackPlugin = require('copy-webpack-plugin');
config.plugins.push(
    new CopyWebpackPlugin({
        patterns: [
            '../../node_modules/sql.js/dist/sql-wasm.wasm'
        ]
    })
);
```

## Using the Worker

The worker script is called `sqljs-custom.worker.js` and can be referenced in code like this:

```kotlin
val driver = WebWorkerDriver(
  Worker(
    js("""new URL("@devs-studio/kmp-js/dist/sqldelight/sqljs-custom.worker.js", import.meta.url)""")
  )
)
```

See "[Using a Web Worker](https://sqldelight.github.io/sqldelight/2.0.2/js_sqlite/#using-a-web-worker)" for more details.

[SQL.js]: https://github.com/sql-js/sql.js/