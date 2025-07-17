import { connectToMongo } from '../utils/connectToMongo.js';

export const getMigratedData = async (req, res) => {
  try {
    console.log('Fetching migrated data from MongoDB...');
    const config =req.body?.data; 
    console.log('Raw body:', req.body);
    console.log('Data config:', req.body?.data);

    if (!config || !config.database) {
      return res.status(400).json({ error: 'Missing or invalid MongoDB config' });
    }

    const db = await connectToMongo(config);

    const collections = await db.listCollections().toArray();
    const allData = {};

    for (const col of collections) {
      const name = col.name;
      const collection = db.collection(name);
      const documents = await collection.find({}).toArray();
      allData[name] = documents;
    }

    res.status(200).json(allData);
  } catch (error) {
    console.error('Error fetching data from MongoDB:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
};
