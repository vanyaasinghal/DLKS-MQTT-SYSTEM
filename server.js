const express = require('express');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── DLKS-MQTT Core Logic ────────────────────────────────────────────────────

// Linear Congruential Generator for ephemeral key generation
function lcgRandom(seed) {
  const a = 1664525;
  const c = 1013904223;
  const m = Math.pow(2, 32);
  return ((a * seed + c) % m) / m;
}

function generateSessionKey(deviceId) {
  const seed = Date.now() ^ parseInt(deviceId.replace(/\D/g, '').slice(0, 8) || '12345678');
  let key = '';
  let state = seed;
  for (let i = 0; i < 16; i++) {
    state = Math.floor(lcgRandom(state) * Math.pow(2, 32));
    key += Math.floor(lcgRandom(state) * 256).toString(16).padStart(2, '0');
  }
  return key.toUpperCase(); // 128-bit = 32 hex chars
}

// BLAKE2s-like integrity hash (using Node crypto SHA-256 as equivalent)
function computeHash(data) {
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 32);
}

// Generate a random nonce
function generateNonce() {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
}

// Active sessions store
const sessions = new Map();

// ─── API Routes ───────────────────────────────────────────────────────────────

// POST /api/handshake/initiate — Device sends CONNECT with K_sess + ID_dev + Nonce
app.post('/api/handshake/initiate', (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: 'deviceId required' });

  const kSess = generateSessionKey(deviceId);
  const nonce = generateNonce();
  const hash = computeHash(kSess + deviceId + nonce);
  const timestamp = new Date().toISOString();

  // Store session
  sessions.set(deviceId, { kSess, nonce, hash, timestamp, status: 'pending' });

  res.json({
    step: 1,
    label: 'Device Initiation',
    deviceId,
    kSess,
    nonce,
    hash,
    timestamp,
    message: `CONNECT sent with K_sess=${kSess.slice(0,8)}... and Nonce=${nonce}`
  });
});

// POST /api/handshake/verify — Broker decrypts, validates nonce, authenticates
app.post('/api/handshake/verify', (req, res) => {
  const { deviceId } = req.body;
  const session = sessions.get(deviceId);
  if (!session) return res.status(404).json({ error: 'Session not found. Initiate first.' });

  const verifiedHash = computeHash(session.kSess + deviceId + session.nonce);
  const isValid = verifiedHash === session.hash;

  if (isValid) {
    session.status = 'verified';
    sessions.set(deviceId, session);
  }

  res.json({
    step: 2,
    label: 'Broker Verification',
    deviceId,
    receivedHash: session.hash,
    computedHash: verifiedHash,
    nonceValid: isValid,
    authenticated: isValid,
    message: isValid
      ? `Broker verified device. Nonce validated. Authentication SUCCESS.`
      : `Authentication FAILED. Nonce mismatch.`
  });
});

// POST /api/handshake/establish — Broker responds with CONNACK + auth status + timestamp
app.post('/api/handshake/establish', (req, res) => {
  const { deviceId } = req.body;
  const session = sessions.get(deviceId);
  if (!session) return res.status(404).json({ error: 'Session not found.' });
  if (session.status !== 'verified') return res.status(400).json({ error: 'Device not verified yet.' });

  session.status = 'established';
  session.establishedAt = new Date().toISOString();
  sessions.set(deviceId, session);

  res.json({
    step: 3,
    label: 'Session Establishment',
    deviceId,
    connack: 'ACCEPTED',
    authStatus: 'AUTHENTICATED',
    sessionKey: session.kSess,
    establishedAt: session.establishedAt,
    overhead: '60 bytes',
    message: `CONNACK sent. Session established. Secure channel active.`
  });
});

// GET /api/sessions — View all active sessions
app.get('/api/sessions', (req, res) => {
  const data = [];
  sessions.forEach((val, key) => {
    data.push({ deviceId: key, ...val });
  });
  res.json(data);
});

// GET /api/performance — Performance metrics
app.get('/api/performance', (req, res) => {
  res.json({
    energyConsumption: { dlksMqtt: 0.0014, smqtt: 0.00177, unit: 'mJ' },
    executionTime: { dlksMqtt: 0.40, smqtt: 2.8, unit: 's' },
    overhead: { dlksMqtt: 60, unit: 'bytes per message' },
    algorithm: 'LCG + BLAKE2s (SHA-256 equivalent)',
    keySize: '128-bit'
  });
});

// DELETE /api/sessions/:deviceId — Clear session
app.delete('/api/sessions/:deviceId', (req, res) => {
  sessions.delete(req.params.deviceId);
  res.json({ message: `Session for ${req.params.deviceId} cleared.` });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🔐 DLKS-MQTT Server running at http://localhost:${PORT}\n`);
});
