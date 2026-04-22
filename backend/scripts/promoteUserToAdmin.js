require('dotenv').config();
const { syncDatabase, User } = require('../src/models');

const run = async () => {
  await syncDatabase();

  const email = 'likhithgolagani1294@gmail.com';
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      $set: {
        role: 'admin',
        approvalStatus: 'approved',
        isActive: true,
      },
    },
    { new: true }
  );

  if (!user) {
    console.log('USER_NOT_FOUND');
    process.exit(2);
  }

  console.log(
    JSON.stringify(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
      },
      null,
      2
    )
  );

  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
