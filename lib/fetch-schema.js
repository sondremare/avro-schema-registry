'use strict';

const avsc = require('avsc');

module.exports = (registry, schemaId, parseOptions) => new Promise((resolve, reject) => {
  const {protocol, host, port, username, password, path} = registry;
  const requestOptions = {
    host,
    port,
    path: `${path}schemas/ids/${schemaId}`,
    auth: username && password ? `${username}:${password}` : null,
  };
  protocol.get(requestOptions, (res) => {
    let data = '';
    res.on('data', (d) => {
      data += d;
    });
    res.on('error', (e) => {
      reject(e);
    });
    res.on('end', () => {
      if (res.statusCode !== 200) {
        const error = JSON.parse(data);
        return reject(new Error(`Schema registry error: ${error.error_code} - ${error.message}`));
      }

      const schema = JSON.parse(data).schema;
      
      try {
        const parsedSchema = JSON.parse(schema);
        if (Array.isArray(parsedSchema)) {
          const dependencySchemas = parsedSchema.slice(0, -1);
          const [mainSchema] = parsedSchema.slice(-1);
          for (const dependencySchema of dependencySchemas) {
            avsc.parse(dependencySchema, parseOptions);
          }
          const parsedMain = avsc.parse(mainSchema, parseOptions);
          return resolve(parsedMain);
        }
        resolve(avsc.parse(schema, parseOptions));
      } catch (e) {
        reject(e)
      }
    });
  }).on('error', (e) => {
    reject(e);
  });
});
