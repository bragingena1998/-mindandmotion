const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
<<<<<<< HEAD
  timezone: '+00:00'  // Гарантирует UTC интерпретацию TIMESTAMP
=======
  timezone: '+00:00'
>>>>>>> b97d4b836e263e5445df81510b9bc9a57500631e
});

pool.getConnection()
  .then(connection => {
    console.log('✓ MySQL connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('MySQL connection error:', err);
  });

module.exports = pool;
