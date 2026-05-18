require('dotenv').config();
const bcrypt = require('bcryptjs');
const { mongoose, User } = require('../src/models');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const passwordHash = await bcrypt.hash('Admin@123', 10);
  await User.updateOne({ email: 'admin@cricket.local' }, { $set: { passwordHash } });
  
  const users = await User.find({}, 'email role').lean();
  console.log('All Users in DB:');
  users.forEach(u => console.log(`- ${u.email} (${u.role})`));
  
  console.log('\nAdmin password successfully forced to Admin@123');
  process.exit(0);
};

run().catch(console.error);
