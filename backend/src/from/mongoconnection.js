import {MongoClient}from 'mongodb'

  const uri = 'mongodb+srv://dixitshubham8873:LV1G1dTec1hO3hWy@mycluster.98leq.mongodb.net/?retryWrites=true&w=majority&appName=MyCluster';
  const database = "sample_mflix";

async function fatchMongoDatabase(uri, database) {

const limit = 100;
   
const client = new MongoClient(uri);

  try {
    // Attempt to connect to the MongoDB server
    await client.connect();
    console.log('Database connected successfully!');

    // Optional: Check the connection state
    if (client.topology.isConnected()) {
      console.log('Connection state: Connected');

      const db = client.db(database);
    const collections = await db.listCollections().toArray();

    for (const collectionMeta of collections) {
        const collection = db.collection(collectionMeta.name);
  
        // Count the total number of documents in the collection
        const documentCount = await collection.countDocuments();
        console.log(`Collection: ${collectionMeta.name}, Total Documents: ${documentCount}`);
  
        let documentsFetched = 0;
  
        // Fetch documents in chunks
        while (documentsFetched < documentCount) {
          const chunk = await collection
            .find({})
            .skip(documentsFetched)
            .limit(limit)
            .toArray();
  
          console.log(`Fetched ${chunk.length} documents from ${collectionMeta.name}:`, chunk);
  
          documentsFetched += chunk.length;
        }
      }
        
    

    } else {
      console.log('Connection state: Not connected');
    }
    
    

  } catch (error) {
    console.error('Failed to connect to the database:', error);
  } finally {
    // Close the connection after checking
    await client.close();
    console.log('Connection closed.');
  }
}


export default fatchMongoDatabase;