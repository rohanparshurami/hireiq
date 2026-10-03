require('dotenv').config();
const express = require('express');
const routes = require('./routes/routes');

const app = express();

app.use(express.json());

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
async function health(req, res) {
  return res.json({ status: 'ok' });
}
app.get('/health', health);

routes.registerRoutes(app);

module.exports = app;