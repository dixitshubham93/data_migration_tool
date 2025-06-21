import makeConnection from "../utils/makeConnection.js";
async function transform(data) {
  console.log("🚀 Migration function execution started");

  const dbName = data.source.database;

  try {
    const { source, target } = await makeConnection(data);
    const db = source.db;
    const mongoClient = source.client;
    const mysqlConn = target;

    const collections = await db.listCollections().toArray();

    // Ensure database exists and switch to it
    await mysqlConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await mysqlConn.query(`USE \`${dbName}\``);

    for (const col of collections) {
      const collectionName = col.name;
      const collection = db.collection(collectionName);
      const sample = await collection.findOne();
      if (!sample) continue;

      // Sanitize keys
      const sampleKeys = Object.keys(sample).filter(k => k && k.trim() !== "");
      if (!sampleKeys.length) {
        console.warn(`⚠️ Skipping collection '${collectionName}' due to invalid sample keys`);
        continue;
      }

      const createQuery = `CREATE TABLE IF NOT EXISTS \`${collectionName}\` (${sampleKeys.map(k => `\`${k}\` TEXT`).join(", ")})`;
      await mysqlConn.query(createQuery);

      const documents = await collection.find().toArray();

      for (const doc of documents) {
        delete doc._id;

        const keys = Object.keys(doc).filter(k => k && k.trim() !== "");
        if (!keys.length) {
          console.warn(`⚠️ Skipping document in '${collectionName}' with no valid keys`);
          continue;
        }

        const values = keys.map(k => doc[k]);
        const placeholders = keys.map(() => '?').join(', ');
        const insertQuery = `INSERT INTO \`${collectionName}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders})`;

        try {
          await mysqlConn.query(insertQuery, values);
        } catch (err) {
          if (err.code === 'ER_BAD_FIELD_ERROR') {
            // Handle schema drift
            for (const k of keys) {
              await mysqlConn.query(`ALTER TABLE \`${collectionName}\` ADD COLUMN \`${k}\` TEXT`);
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

    console.log("🎉 Migration Complete");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    throw("❌ Migration failed:");
  }
}

export default transform;
