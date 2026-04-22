require('dotenv').config();
const bcrypt = require('bcryptjs');
const { syncDatabase, User } = require('./models');

const seed = async () => {
  await syncDatabase();

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@cricket.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

  const existing = await User.findOne({ email: adminEmail.toLowerCase() });
  if (existing) {
    console.log('Admin already exists.');
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const admin = await User.create({
    fullName: 'System Admin',
    email: adminEmail.toLowerCase(),
    passwordHash,
    role: 'admin',
    approvalStatus: 'approved',
  });

  console.log('Seed complete:', admin.email);
  process.exit(0);
};

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
