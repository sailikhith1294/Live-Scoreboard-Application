const { createServer } = require('./src/app');

const PORT = Number(process.env.PORT || 5000);

createServer()
  .then(({ server }) => {
    server.listen(PORT, () => {
      console.log(`Cricket Tournament Organizer backend running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
