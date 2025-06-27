import makeConnection from "../utils/makeConnection.js";
import { ObjectId } from "mongodb";
import crypto from "crypto";

function inferSQLType(value) {
  if (value === null || value === undefined) return "TEXT";
  if (typeof value === "number") return "DOUBLE";
  if (typeof value === "boolean") return "BOOLEAN";
  if (typeof value === "string") return "TEXT";
  if (value instanceof Date) return "DATETIME";
  if (Array.isArray(value)) return "JSON";
  if (typeof value === "object" && value._bsontype === "ObjectID") return "VARCHAR(24)";
  if (typeof value === "object") return "JSON";
  return "TEXT";
}

function flattenObject(obj, prefix = '') {
  let result = {};
  for (let key in obj) {
    const val = obj[key];
    const fullKey = prefix ? `${prefix}_${key}` : key;

    if (
      typeof val === "object" &&
      val !== null &&
      !(val instanceof Date) &&
      !Array.isArray(val) &&
      !val._bsontype
    ) {
      const nested = flattenObject(val, fullKey);
      Object.assign(result, nested);
    } else {
      result[fullKey] = val;
    }
  }
  return result;
}

function detectRelationships(doc, collectionNames) {
  const references = [];
  for (const key in doc) {
    if (
      key.toLowerCase().endsWith("id") &&
      doc[key] instanceof ObjectId
    ) {
      const refCollection = key.replace(/id$/i, '').toLowerCase();
      if (collectionNames.includes(refCollection)) {
        references.push({ column: key, references: refCollection });
      }
    }
  }
  return references;
}

async function transform(data, options = { normalize: true, generateER: true }) {
  console.log("🚀 Migration function execution started");

  const dbName = data.source.database;
  const erDiagram = [];

  try {
    const { source, target } = await makeConnection(data);
    const db = source.db;
    const mongoClient = source.client;
    const mysqlConn = target;

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    await mysqlConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await mysqlConn.query(`USE \`${dbName}\``);

    for (const col of collections) {
      const collectionName = col.name;
      const collection = db.collection(collectionName);
      const samples = await collection.find().limit(20).toArray();
      if (!samples.length) continue;

      let fieldTypeMap = {};
      let foreignKeys = [];
      let skipAttributes = new Set();

      for (const sample of samples) {
        for (const key in sample) {
          const val = sample[key];
          if (Array.isArray(val) && val.length && typeof val[0] === 'object') {
            skipAttributes.add(key);
          } else if (typeof val === 'object' && val !== null && !(val instanceof Date) && !val._bsontype && !Array.isArray(val)) {
            skipAttributes.add(key);
          } else {
            fieldTypeMap[key] = inferSQLType(val);
          }
        }
        foreignKeys.push(...detectRelationships(sample, collectionNames));
      }

      const createQuery = `CREATE TABLE IF NOT EXISTS \`${collectionName}\` (
        \`_id\` VARCHAR(24) PRIMARY KEY,
        ${Object.entries(fieldTypeMap)
          .filter(([k]) => k !== '_id')
          .map(([k, type]) => `\`${k}\` ${type}`)
          .join(", ")}
        ${foreignKeys.length ? ', ' + foreignKeys.map(fk => `FOREIGN KEY (\`${fk.column}\`) REFERENCES \`${fk.references}\`(_id)`).join(', ') : ''}
      )`;

      await mysqlConn.query(createQuery);

      if (options.generateER) {
        erDiagram.push({
          table: collectionName,
          columns: [{ name: '_id', type: 'VARCHAR(24)' }, ...Object.entries(fieldTypeMap).filter(([k]) => k !== '_id').map(([name, type]) => ({ name, type }))],
          foreignKeys
        });
      }

      const documents = await collection.find().toArray();

      for (const doc of documents) {
        const id = doc._id?.toString() ?? crypto.randomUUID();
        const clonedDoc = { ...doc, _id: id };

        if (options.normalize) {
          for (const key of skipAttributes) {
            const val = doc[key];
            const nestedTable = `${collectionName}_${key}`;

            if (Array.isArray(val) && val.length && typeof val[0] === 'object') {
              for (const item of val) {
                const itemId = crypto.randomUUID();
                const nestedFlat = flattenObject(item);
                nestedFlat._id = itemId;
                nestedFlat[`${collectionName}_ref_id`] = id;

                const nestedTypeMap = Object.fromEntries(
                  Object.entries(nestedFlat).map(([k, v]) => [k, inferSQLType(v)])
                );

                const nestedCreate = `CREATE TABLE IF NOT EXISTS \`${nestedTable}\` (${Object.entries(nestedTypeMap)
                  .map(([k, type]) => `\`${k}\` ${type}`)
                  .join(', ')})`;
                await mysqlConn.query(nestedCreate);

                const nestedKeys = Object.keys(nestedFlat);
                const nestedValues = nestedKeys.map(k => nestedFlat[k]);
                const nestedInsert = `INSERT INTO \`${nestedTable}\` (${nestedKeys.map(k => `\`${k}\``).join(', ')}) VALUES (${nestedKeys.map(() => '?').join(', ')})`;
                await mysqlConn.query(nestedInsert, nestedValues);
              }
            }

            else if (
              typeof val === "object" &&
              val !== null &&
              !(val instanceof Date) &&
              !Array.isArray(val) &&
              !val._bsontype
            ) {
              const nestedId = crypto.randomUUID();
              const nestedFlat = flattenObject(val);
              nestedFlat._id = nestedId;
              nestedFlat[`${collectionName}_ref_id`] = id;

              const nestedTypeMap = Object.fromEntries(
                Object.entries(nestedFlat).map(([k, v]) => [k, inferSQLType(v)])
              );

              const nestedCreate = `CREATE TABLE IF NOT EXISTS \`${nestedTable}\` (${Object.entries(nestedTypeMap)
                .map(([k, type]) => `\`${k}\` ${type}`)
                .join(', ')})`;
              await mysqlConn.query(nestedCreate);

              const nestedKeys = Object.keys(nestedFlat);
              const nestedValues = nestedKeys.map(k => nestedFlat[k]);
              const nestedInsert = `INSERT INTO \`${nestedTable}\` (${nestedKeys.map(k => `\`${k}\``).join(', ')}) VALUES (${nestedKeys.map(() => '?').join(', ')})`;
              await mysqlConn.query(nestedInsert, nestedValues);
            }

            delete clonedDoc[key];
          }
        }

        const flatDoc = flattenObject(clonedDoc);
        const keys = Object.keys(flatDoc).filter(k => k && k.trim() !== "");
        if (!keys.length) continue;

        const values = keys.map(k => {
          const val = flatDoc[k];
          if (typeof val === 'object' && !(val instanceof Date)) return JSON.stringify(val);
          return val;
        });

        const placeholders = keys.map(() => '?').join(', ');
        const insertQuery = `INSERT INTO \`${collectionName}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders})`;

        try {
          await mysqlConn.query(insertQuery, values);
        } catch (err) {
          if (err.code === 'ER_BAD_FIELD_ERROR') {
            for (const k of keys) {
              if (!(k in fieldTypeMap)) {
                const type = inferSQLType(flatDoc[k]);
                await mysqlConn.query(`ALTER TABLE \`${collectionName}\` ADD COLUMN \`${k}\` ${type}`);
              }
            }
            await mysqlConn.query(insertQuery, values);
          } else {
            console.error(`❌ Insert Error in ${collectionName}:`, err.message);
          }
        }
      }

      console.log(`✅ Migrated collection: ${collectionName}`);
    }

    await mysqlConn.end();
    await mongoClient.close();

    if (options.generateER) {
      console.log("\n📘 ER Diagram JSON:");
      console.log(JSON.stringify(erDiagram, null, 2));
    }

    console.log("🎉 Migration Complete");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    throw "❌ Migration failed:";
  }
}

export default transform;
