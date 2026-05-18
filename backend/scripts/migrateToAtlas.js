const { MongoClient } = require('mongodb');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function migrate() {
  console.log("=== CREASE: Local to Atlas Database Migration Tool ===");
  const localUri = 'mongodb://localhost:27017/live-sports-fantasy';
  console.log(`Source (Local): ${localUri}`);
  
  const atlasUri = await askQuestion("\nEnter your exact MongoDB Atlas Connection String (Target):\n> ");
  
  if (!atlasUri || !atlasUri.startsWith('mongodb')) {
    console.error("Invalid Atlas URI. It must start with mongodb+srv:// or mongodb://");
    process.exit(1);
  }

  let localClient, atlasClient;

  try {
    console.log("\nConnecting to local database...");
    localClient = new MongoClient(localUri);
    await localClient.connect();
    const localDb = localClient.db();
    
    console.log("Connecting to Atlas database...");
    atlasClient = new MongoClient(atlasUri);
    await atlasClient.connect();
    
    // Parse DB name from atlas URI, default to 'live-sports-fantasy' if missing
    let atlasDbName = atlasUri.split('?')[0].split('/').pop();
    if (!atlasDbName || atlasDbName === 'mongodb+srv:' || atlasDbName === 'mongodb:') {
      atlasDbName = 'live-sports-fantasy';
    }
    
    const atlasDb = atlasClient.db(atlasDbName);

    const collections = await localDb.listCollections().toArray();
    console.log(`\nFound ${collections.length} collections to migrate.`);

    for (const collInfo of collections) {
      const collName = collInfo.name;
      if (collName.startsWith('system.')) continue;

      console.log(`\nMigrating collection: ${collName}...`);
      const localColl = localDb.collection(collName);
      const atlasColl = atlasDb.collection(collName);

      const docs = await localColl.find({}).toArray();
      console.log(` -> Found ${docs.length} documents.`);

      if (docs.length > 0) {
        // Clear existing data in Atlas for this collection to avoid duplicates
        await atlasColl.deleteMany({});
        // Insert all documents
        await atlasColl.insertMany(docs);
        console.log(` -> Successfully inserted ${docs.length} documents into Atlas.`);
      } else {
        console.log(` -> Skipped (empty).`);
      }
    }

    console.log("\n✅ === Migration Completed Successfully! === ✅");
    console.log("Your local database has been perfectly cloned to MongoDB Atlas.");
    console.log("You can now update your backend/.env file to use the Atlas URL and push to GitHub!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
  } finally {
    if (localClient) await localClient.close();
    if (atlasClient) await atlasClient.close();
    rl.close();
  }
}

migrate();
