/**
 * NWF - Network Wide Flash
 * WebSocket server for real cross-device sharing on the same LAN
 *
 * Usage:  node server.js
 * Then open  http://<your-local-ip>:3000  on any device on the same Wi-Fi
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;

// ── HTTP server ──────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.js':   'text/javascript',
  '.css':  'text/css',
  '.ico':  'image/x-icon',
};

const server = http.createServer((req, res) => {
  // Normalise path
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

  // Prevent path traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext  = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

// ── WebSocket server ─────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server });

// Track connected clients with metadata
const clients = new Map(); // ws → { id, ip, ua }
let nextId = 1;

wss.on('connection', (ws, req) => {
  const id = nextId++;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  clients.set(ws, { id, ip });

  console.log(`[+] Client #${id} connected  (${ip})  — total: ${clients.size}`);

  // Tell this client its own id + current peer count
  send(ws, { type: 'welcome', clientId: id, peers: clients.size - 1 });

  // Tell everyone else a new peer joined
  broadcast({ type: 'peer_joined', peers: clients.size - 1 }, ws);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    // Attach sender id
    msg.from = id;

    switch (msg.type) {
      case 'text':
        console.log(`[text] #${id} → all | ${msg.content?.slice(0, 60)}`);
        broadcast(msg, ws);   // relay to everyone else
        break;

      case 'file_meta':
        // { type, name, size, mime, totalChunks }
        console.log(`[file] #${id} → all | ${msg.name} (${msg.size} B)`);
        broadcast(msg, ws);
        break;

      case 'file_chunk':
        // { type, transferId, index, data }  — data is base64
        broadcast(msg, ws);
        break;

      case 'file_done':
        broadcast(msg, ws);
        break;

      case 'ping':
        send(ws, { type: 'pong' });
        break;

      default:
        break;
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[-] Client #${id} disconnected — total: ${clients.size}`);
    broadcast({ type: 'peer_left', peers: clients.size });
  });

  ws.on('error', (err) => {
    console.error(`[!] Client #${id} error:`, err.message);
  });
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function send(ws, obj) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}

function broadcast(obj, exclude = null) {
  const payload = JSON.stringify(obj);
  for (const [ws] of clients) {
    if (ws !== exclude && ws.readyState === ws.OPEN) ws.send(payload);
  }
}

// ── Start ────────────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  // Print local IPs so the user knows what to open on other devices
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  const ips  = [];
  for (const ifaces of Object.values(nets)) {
    for (const i of ifaces) {
      if (i.family === 'IPv4' && !i.internal) ips.push(i.address);
    }
  }

  console.log('\n  ┌─────────────────────────────────────────┐');
  console.log(`  │  NWF server running on port ${PORT}         │`);
  console.log('  │                                         │');
  ips.forEach(ip => {
    const url = `http://${ip}:${PORT}`;
    console.log(`  │  ➜  ${url.padEnd(36)}│`);
  });
  console.log(`  │  ➜  http://localhost:${PORT}               │`);
  console.log('  └─────────────────────────────────────────┘\n');
});
