const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.API_PORT || 8787;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic CORS for dev
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Mount handlers from api/banking
const initiate = require(path.join(__dirname, '..', 'api', 'banking', 'initiate'));
const status = require(path.join(__dirname, '..', 'api', 'banking', 'status'));
const all = require(path.join(__dirname, '..', 'api', 'banking', 'all'));
const capture = require(path.join(__dirname, '..', 'api', 'banking', 'capture'));

app.post('/api/banking/initiate', (req, res) => initiate(req, res));
app.get('/api/banking/status', (req, res) => status(req, res));
app.get('/api/banking/all', (req, res) => all(req, res));
app.post('/api/banking/capture', (req, res) => capture(req, res));

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'API route not found' });
});

app.listen(PORT, () => {
  console.log(`[dev-api] Listening on http://localhost:${PORT}`);
});
