import makeConnection from "../utils/makeConnection.js";
import { ObjectId } from "mongodb";

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

function flattenObject(obj, prefix = '', parentId = null) {
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

      for (const sample of samples) {
        const flat = flattenObject(sample);
        for (const key in flat) {
          if (!(key in fieldTypeMap)) {
            fieldTypeMap[key] = inferSQLType(flat[key]);

            // Infer foreign key if ends with Id and value is ObjectId
            if (
              key.toLowerCase().endsWith("id") &&
              sample[key] instanceof ObjectId &&
              collectionNames.includes(key.replace(/id$/i, '').toLowerCase())
            ) {
              foreignKeys.push({ column: key, references: key.replace(/id$/i, '').toLowerCase() });
            }
          }
        }
      }

      const createQuery = `CREATE TABLE IF NOT EXISTS \`${collectionName}\` (${Object.entries(fieldTypeMap)
        .map(([k, type]) => `\`${k}\` ${type}`)
        .join(", ")}${foreignKeys.length ? ', ' + foreignKeys.map(fk => `FOREIGN KEY (\`${fk.column}\`) REFERENCES \`${fk.references}\`(_id)`).join(', ') : ''})`;

      await mysqlConn.query(createQuery);

      if (options.generateER) {
        erDiagram.push({
          table: collectionName,
          columns: Object.entries(fieldTypeMap).map(([name, type]) => ({ name, type })),
          foreignKeys
        });
      }

      const documents = await collection.find().toArray();

      for (const doc of documents) {
        const id = doc._id;

        const flatDoc = flattenObject(doc);
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

        // 🔁 Normalize nested objects into separate tables (optional)
        if (options.normalize) {
          for (const key in doc) {
            const val = doc[key];
            if (
              typeof val === "object" &&
              val !== null &&
              !(val instanceof Date) &&
              !Array.isArray(val) &&
              !val._bsontype
            ) {
              const nestedTable = `${collectionName}_${key}`;
              const nestedFlat = flattenObject(val);
              nestedFlat[`${collectionName}_id`] = id.toString();

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
