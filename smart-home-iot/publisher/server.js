const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const fs = require('fs');
const path = require('path');

// Start the MQTT publisher logic by importing the module with side effects
require('./publisher');

// Basic CORS (allow all origins for demo)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const HISTORY_DIR = path.join(__dirname, 'history');

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'smart-home-iot-publisher',
    port: PORT,
    broker: process.env.BROKER_URL || 'wss://test.mosquitto.org:8081/mqtt',
    time: new Date().toISOString()
  });
});

// GET /history/today?room=<room>
app.get('/history/today', (req, res) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const file = path.join(HISTORY_DIR, `${y}-${m}-${d}.ndjson`);
  if (!fs.existsSync(file)) return res.json([]);
  const roomFilter = req.query.room;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  const rows = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const filtered = roomFilter ? rows.filter(r => r.room === roomFilter) : rows;
  res.json(filtered);
});

// GET /history/:date (YYYY-MM-DD)?room=<room>
app.get('/history/:date', (req, res) => {
  const date = req.params.date; // expect YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'invalid date' });
  const file = path.join(HISTORY_DIR, `${date}.ndjson`);
  if (!fs.existsSync(file)) return res.json([]);
  const roomFilter = req.query.room;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  const rows = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const filtered = roomFilter ? rows.filter(r => r.room === roomFilter) : rows;
  res.json(filtered);
});

app.listen(PORT, () => {
  console.log(`HTTP server listening on port ${PORT}`);
});
