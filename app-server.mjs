import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = Number(process.env.PORT || 4173);
const distDir = path.join(__dirname, 'dist');
const pingTimeoutMs = 30000;

/** @type {Map<string, Set<any>>} */
const topics = new Map();

const send = (conn, message) => {
  if (conn.readyState !== 0 && conn.readyState !== 1) {
    conn.close();
    return;
  }
  try {
    conn.send(JSON.stringify(message));
  } catch {
    conn.close();
  }
};

const onSignalConnection = (conn) => {
  const subscribedTopics = new Set();
  let closed = false;

  let pongReceived = true;
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      conn.close();
      clearInterval(pingInterval);
    } else {
      pongReceived = false;
      try {
        conn.ping();
      } catch {
        conn.close();
      }
    }
  }, pingTimeoutMs);

  conn.on('pong', () => {
    pongReceived = true;
  });

  conn.on('close', () => {
    subscribedTopics.forEach((topicName) => {
      const subs = topics.get(topicName);
      if (!subs) return;
      subs.delete(conn);
      if (subs.size === 0) topics.delete(topicName);
    });
    subscribedTopics.clear();
    closed = true;
    clearInterval(pingInterval);
  });

  conn.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(typeof raw === 'string' ? raw : raw.toString());
    } catch {
      return;
    }

    if (!message || !message.type || closed) return;

    switch (message.type) {
      case 'subscribe':
        (message.topics || []).forEach((topicName) => {
          if (typeof topicName !== 'string') return;
          if (!topics.has(topicName)) topics.set(topicName, new Set());
          topics.get(topicName).add(conn);
          subscribedTopics.add(topicName);
        });
        break;

      case 'unsubscribe':
        (message.topics || []).forEach((topicName) => {
          topics.get(topicName)?.delete(conn);
        });
        break;

      case 'publish': {
        const topic = message.topic;
        if (!topic) return;
        const receivers = topics.get(topic);
        if (!receivers) return;
        message.clients = receivers.size;
        receivers.forEach((receiver) => send(receiver, message));
        break;
      }

      case 'ping':
        send(conn, { type: 'pong' });
        break;
    }
  });
};

const wss = new WebSocketServer({ noServer: true });
wss.on('connection', onSignalConnection);

const contentTypeByExt = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  if (!fs.existsSync(distDir)) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('dist not found. Run npm run build first.');
    return;
  }

  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

  if (urlPath === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('ok');
    return;
  }

  const candidatePath = urlPath === '/' ? '/index.html' : urlPath;
  let filePath = path.join(distDir, candidatePath);

  // Prevent path traversal
  if (!filePath.startsWith(distDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = contentTypeByExt[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Failed to read file');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.on('upgrade', (request, socket, head) => {
  const urlPath = new URL(request.url || '/', `http://${request.headers.host}`).pathname;
  if (urlPath !== '/signaling') {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

server.listen(port, () => {
  console.log(`SQLModel server running on port ${port}`);
  console.log(`Signaling endpoint: ws://localhost:${port}/signaling`);
});
