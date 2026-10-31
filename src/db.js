// src/db.js
const fs = require('fs');
const path = require('path');
const mysql2 = require('mysql2/promise');

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'defaultdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
};

if ((process.env.DB_SSL || '').toUpperCase() === 'REQUIRED') {
  const caPath = path.join(__dirname, '..', 'ca.pem');
  poolConfig.ssl = fs.existsSync(caPath)
    ? { ca: fs.readFileSync(caPath), rejectUnauthorized: true }
    : { rejectUnauthorized: true };
}

module.exports = mysql2.createPool(poolConfig);