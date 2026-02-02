import express from 'express';
import initiate from '../api/banking/initiate.js';
import status from '../api/banking/status.js';
import all from '../api/banking/all.js';
import capture from '../api/banking/capture.js';
import debugProfile from '../api/banking/debug-profile.js';
import creditCheck from '../api/credit-check.js';
import mockMode from '../api/mock-mode.js';

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

app.post('/api/banking/initiate', (req, res) => initiate(req, res));
app.get('/api/banking/status', (req, res) => status(req, res));
app.get('/api/banking/all', (req, res) => all(req, res));
app.post('/api/banking/capture', (req, res) => capture(req, res));
app.get('/api/banking/debug-profile', (req, res) => debugProfile(req, res));
app.post('/api/credit-check', (req, res) => creditCheck(req, res));
app.get('/api/mock-mode', (req, res) => mockMode(req, res));

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'API route not found' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[dev-api] Listening on http://localhost:${PORT}`);
});
