// server.js — entry point
require('dotenv').config(); // MUST be first

const path = require('path');
const express = require('express');
const taskRoutes = require('./src/routes/taskrouters');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use(express.static(path.join(__dirname, 'frontend')));

app.get('/api', (req, res) => res.json({ message: 'Task API Plus is ready!' }));

app.use('/tasks', taskRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  console.error('Error:', err.stack);
  res.status(err.statusCode || 500).json({
    error: err.statusCode ? err.message : 'Internal Server Error',
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
