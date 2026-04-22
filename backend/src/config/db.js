const mongoose = require('mongoose');

const connectMongo = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cricket_organizer';
  await mongoose.connect(uri);
};

module.exports = { connectMongo };
