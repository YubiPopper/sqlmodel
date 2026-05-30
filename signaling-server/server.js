#!/usr/bin/env node
// y-webrtc signaling server for sqlmodel.org real-time collaboration.
// Taken from the y-webrtc reference implementation with minor cleanup.
// Deploy free on Render.com (see README in this folder).

import { WebSocketServer } from 'ws';
import http from 'http';

const pingTimeout = 30000;
const port = process.env.PORT || 4444;

const wss = new WebSocketServer({ noServer: true });

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('sqlmodel signaling server ok');
});

/** @type {Map<string, Set<any>>} topic → set of subscriber ws connections */
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

const onconnection = (conn) => {
  const subscribedTopics = new Set();
  let closed = false;

  let pongReceived = true;
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      conn.close();
      clearInterval(pingInterval);
    } else {
      pongReceived = false;
      try { conn.ping(); } catch { conn.close(); }
    }
  }, pingTimeout);

  conn.on('pong', () => { pongReceived = true; });

  conn.on('close', () => {
    subscribedTopics.forEach((topicName) => {
      const subs = topics.get(topicName);
      if (subs) {
        subs.delete(conn);
        if (subs.size === 0) topics.delete(topicName);
      }
    });
    subscribedTopics.clear();
    closed = true;
    clearInterval(pingInterval);
  });

  conn.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(typeof raw === 'string' ? raw : raw.toString());
    } catch { return; }

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

      case 'publish':
        if (message.topic) {
          const receivers = topics.get(message.topic);
          if (receivers) {
            message.clients = receivers.size;
            receivers.forEach((receiver) => send(receiver, message));
          }
        }
        break;

      case 'ping':
        send(conn, { type: 'pong' });
        break;
    }
  });
};

wss.on('connection', onconnection);

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

server.listen(port, () => {
  console.log(`Signaling server listening on port ${port}`);
});
