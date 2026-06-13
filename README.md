# NWF — Network Wide Flash

Share text and files instantly across every device on your local Wi-Fi network.

---

## Files

```
nwf/
├── index.html   ← the UI (served by the server)
├── server.js    ← Node.js HTTP + WebSocket server
├── package.json ← dependencies
└── README.md
```

---

## Setup

### 1. Install Node.js
Download from https://nodejs.org (v16 or newer).

### 2. Install dependencies
```bash
cd nwf
npm install
```

### 3. Start the server
```bash
node server.js
```

You'll see output like:
```
  ┌─────────────────────────────────────────┐
  │  NWF server running on port 3000         │
  │                                         │
  │  ➜  http://192.168.1.42:3000            │
  │  ➜  http://localhost:3000               │
  └─────────────────────────────────────────┘
```

### 4. Open on all devices
Open the **`http://192.168.1.x:3000`** URL (the one showing your local IP, not localhost)
on every phone, tablet, or computer connected to the **same Wi-Fi network**.

---

## How it works

| Feature | How |
|---------|-----|
| Text sharing | Sent via WebSocket, instantly appears on all connected devices |
| File sharing | Chunked (64 KB pieces) as base64 over WebSocket, reassembled in the browser |
| Connection status | Live peer count shown in the header |
| Auto-reconnect | Clients reconnect automatically if the server restarts |

---

## Change the port

```bash
PORT=8080 node server.js
```

---

## Notes
- Works on any OS: Windows, macOS, Linux.
- No internet required — purely local network.
- Files are transferred peer-to-peer through the server's memory; they are **not saved to disk**.
- For very large files (>100 MB) the browser memory usage will be high; best suited for everyday documents, images, and small videos.
