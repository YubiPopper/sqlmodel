import crypto from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import * as Y from 'yjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = Number(process.env.PORT || 4173);
const distDir = path.join(__dirname, 'dist');
const collabDataDir = path.join(__dirname, '.collaboration');
const collabStoreFile = path.join(collabDataDir, 'rooms.json');
const pingTimeoutMs = 30000;
const roomArchiveMs = Number(process.env.COLLAB_ROOM_ARCHIVE_MS || 1000 * 60 * 60 * 24 * 7);
const roomTtlMs = Number(process.env.COLLAB_ROOM_TTL_MS || 1000 * 60 * 60 * 24 * 30);
const roomCleanupMs = Number(process.env.COLLAB_ROOM_CLEANUP_MS || 1000 * 60 * 10);
const roomCompactThreshold = Number(process.env.COLLAB_ROOM_COMPACT_THRESHOLD || 50);

/** @type {Map<string, {
 *   roomId: string,
 *   roomKey: string,
 *   createdBy: string,
 *   memberIds: string[],
 *   createdAt: number,
 *   lastActiveAt: number,
 *   archivedAt: number | null,
 *   snapshot: string,
 *   updates: string[]
 * }>} */
const rooms = new Map();

/** @type {Map<string, Y.Doc>} */
const roomDocs = new Map();
/** @type {Set<string>} */
const roomDocListeners = new Set();
/** @type {Map<string, Set<any>>} */
const roomConnections = new Map();
/** @type {Map<string, Map<number, { id: string, name: string, color: string, selectedId: string | null }>>} */
const roomPresence = new Map();
/** @type {Map<any, { roomId: string, clientId: number }>} */
const connectionSessions = new Map();

let nextClientId = 1;
let persistTimeout = null;

if (!fs.existsSync(collabDataDir)) {
  fs.mkdirSync(collabDataDir, { recursive: true });
}

const toBase64 = (input) => Buffer.from(input).toString('base64');
const fromBase64 = (input) => Buffer.from(input, 'base64');

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

const writeStore = () => {
  const payload = JSON.stringify({ rooms: Array.from(rooms.values()) });
  const tempPath = `${collabStoreFile}.tmp`;
  fs.writeFileSync(tempPath, payload, 'utf8');
  fs.renameSync(tempPath, collabStoreFile);
};

const schedulePersist = () => {
  if (persistTimeout) return;
  persistTimeout = setTimeout(() => {
    persistTimeout = null;
    writeStore();
  }, 200);
};

const loadStore = () => {
  if (!fs.existsSync(collabStoreFile)) return;
  try {
    const parsed = JSON.parse(fs.readFileSync(collabStoreFile, 'utf8'));
    const storedRooms = Array.isArray(parsed?.rooms) ? parsed.rooms : [];
    storedRooms.forEach((room) => {
      if (
        !room ||
        typeof room.roomId !== 'string' ||
        typeof room.roomKey !== 'string' ||
        typeof room.createdBy !== 'string'
      ) {
        return;
      }
      rooms.set(room.roomId, {
        roomId: room.roomId,
        roomKey: room.roomKey,
        createdBy: room.createdBy,
        memberIds: Array.isArray(room.memberIds) ? room.memberIds.filter((id) => typeof id === 'string') : [],
        createdAt: typeof room.createdAt === 'number' ? room.createdAt : Date.now(),
        lastActiveAt: typeof room.lastActiveAt === 'number' ? room.lastActiveAt : Date.now(),
        archivedAt: typeof room.archivedAt === 'number' ? room.archivedAt : null,
        snapshot: typeof room.snapshot === 'string' ? room.snapshot : '',
        updates: Array.isArray(room.updates) ? room.updates.filter((u) => typeof u === 'string') : [],
      });
    });
  } catch (err) {
    console.error('[sqlmodel] Failed to load collaboration store:', err);
  }
};

const attachRoomDocListener = (roomId, doc) => {
  if (roomDocListeners.has(roomId)) return;
  roomDocListeners.add(roomId);

  doc.on('update', (update, origin) => {
    const currentRoom = rooms.get(roomId);
    if (!currentRoom) return;

    const encoded = toBase64(update);
    currentRoom.updates.push(encoded);
    currentRoom.lastActiveAt = Date.now();
    currentRoom.archivedAt = null;

    if (currentRoom.updates.length >= roomCompactThreshold) {
      currentRoom.snapshot = toBase64(Y.encodeStateAsUpdate(doc));
      currentRoom.updates = [];
    }

    schedulePersist();

    const sourceClientId = typeof origin === 'object' && origin && 'clientId' in origin
      ? Number(origin.clientId)
      : null;

    const subscribers = roomConnections.get(roomId);
    if (!subscribers) return;
    subscribers.forEach((conn) => {
      const session = connectionSessions.get(conn);
      if (sourceClientId && session?.clientId === sourceClientId) return;
      send(conn, { type: 'update', update: encoded });
    });
  });
};

const getRoomDoc = (roomId) => {
  const existing = roomDocs.get(roomId);
  if (existing) return existing;

  const room = rooms.get(roomId);
  if (!room) return null;

  const doc = new Y.Doc();
  try {
    if (room.snapshot) {
      Y.applyUpdate(doc, fromBase64(room.snapshot), 'server-load');
    }
    room.updates.forEach((encodedUpdate) => {
      Y.applyUpdate(doc, fromBase64(encodedUpdate), 'server-load');
    });
  } catch (err) {
    console.error(`[sqlmodel] Failed to rehydrate room ${roomId}:`, err);
  }

  attachRoomDocListener(roomId, doc);
  roomDocs.set(roomId, doc);
  return doc;
};

const createRoomDoc = (roomId) => {
  const existing = roomDocs.get(roomId);
  if (existing) return existing;

  const doc = new Y.Doc();
  roomDocs.set(roomId, doc);
  attachRoomDocListener(roomId, doc);

  return doc;
};

const getRoomSummary = (room) => ({
  roomId: room.roomId,
  roomKey: room.roomKey,
  createdAt: room.createdAt,
  lastActiveAt: room.lastActiveAt,
  archivedAt: room.archivedAt,
  expiresAt: room.lastActiveAt + roomTtlMs,
});

const refreshPresence = (roomId) => {
  const users = Array.from((roomPresence.get(roomId) || new Map()).entries()).map(([clientId, user]) => ({
    clientId,
    user,
  }));

  const subscribers = roomConnections.get(roomId);
  if (!subscribers) return;
  subscribers.forEach((conn) => send(conn, { type: 'presence', users }));
};

const removeConnection = (conn) => {
  const session = connectionSessions.get(conn);
  if (!session) return;

  const { roomId, clientId } = session;
  connectionSessions.delete(conn);

  roomConnections.get(roomId)?.delete(conn);
  if (roomConnections.get(roomId)?.size === 0) {
    roomConnections.delete(roomId);
  }

  const roomUsers = roomPresence.get(roomId);
  if (roomUsers) {
    roomUsers.delete(clientId);
    if (roomUsers.size === 0) {
      roomPresence.delete(roomId);
    }
  }

  refreshPresence(roomId);
};

const cleanupRooms = () => {
  const now = Date.now();
  let changed = false;

  rooms.forEach((room, roomId) => {
    const inactivityMs = now - room.lastActiveAt;

    if (inactivityMs > roomArchiveMs && room.archivedAt === null) {
      room.archivedAt = now;
      changed = true;
    }

    if (inactivityMs > roomTtlMs) {
      const subscribers = roomConnections.get(roomId);
      if (subscribers) {
        subscribers.forEach((conn) => {
          send(conn, { type: 'error', message: 'Room expired due to inactivity.' });
          conn.close();
        });
      }

      roomConnections.delete(roomId);
      roomPresence.delete(roomId);
      roomDocs.get(roomId)?.destroy();
      roomDocs.delete(roomId);
      roomDocListeners.delete(roomId);
      rooms.delete(roomId);
      changed = true;
    }
  });

  if (changed) schedulePersist();
};

loadStore();
cleanupRooms();
setInterval(cleanupRooms, roomCleanupMs);

const parseJsonBody = (req) => new Promise((resolve, reject) => {
  let body = '';
  let settled = false;

  const cleanup = () => {
    req.off('data', onData);
    req.off('end', onEnd);
    req.off('error', onError);
  };

  const fail = (error) => {
    if (settled) return;
    settled = true;
    cleanup();
    reject(error);
  };

  const onData = (chunk) => {
    if (settled) return;
    body += chunk;
    if (body.length > 1024 * 1024) {
      fail(new Error('Request body too large'));
      req.destroy();
    }
  };

  const onEnd = () => {
    if (settled) return;
    settled = true;
    cleanup();
    if (!body) {
      resolve({});
      return;
    }
    try {
      resolve(JSON.parse(body));
    } catch {
      reject(new Error('Invalid JSON'));
    }
  };

  const onError = (error) => fail(error);

  req.on('data', onData);
  req.on('end', onEnd);
  req.on('error', onError);
});

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
};

const isJsonRequest = (req) => {
  const contentType = req.headers['content-type'];
  if (typeof contentType !== 'string') return false;
  return contentType.toLowerCase().includes('application/json');
};

const onCollaborationConnection = (conn) => {
  const clientId = nextClientId++;
  let joinedRoomId = null;

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
    clearInterval(pingInterval);
    removeConnection(conn);
  });

  conn.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(typeof raw === 'string' ? raw : raw.toString());
    } catch {
      return;
    }

    if (!message || typeof message.type !== 'string') return;

    if (message.type === 'join') {
      const roomId = message.roomId;
      const roomKey = message.roomKey;
      const userId = message.userId;
      const userName = message.userName;
      const userColor = message.userColor;

      if (
        typeof roomId !== 'string' ||
        typeof roomKey !== 'string' ||
        typeof userId !== 'string' ||
        typeof userName !== 'string' ||
        typeof userColor !== 'string'
      ) {
        send(conn, { type: 'error', message: 'Invalid join request.' });
        return;
      }

      const room = rooms.get(roomId);
      if (!room || room.roomKey !== roomKey) {
        send(conn, { type: 'error', message: 'Room not found or access denied.' });
        return;
      }

      if (!room.memberIds.includes(userId)) {
        room.memberIds.push(userId);
      }
      room.lastActiveAt = Date.now();
      room.archivedAt = null;
      schedulePersist();

      const doc = getRoomDoc(roomId);
      if (!doc) {
        send(conn, { type: 'error', message: 'Failed to initialize room.' });
        return;
      }

      if (!roomConnections.has(roomId)) roomConnections.set(roomId, new Set());
      roomConnections.get(roomId).add(conn);

      connectionSessions.set(conn, { roomId, clientId });
      joinedRoomId = roomId;

      if (!roomPresence.has(roomId)) roomPresence.set(roomId, new Map());
      roomPresence.get(roomId).set(clientId, {
        id: userId,
        name: userName,
        color: userColor,
        selectedId: null,
      });

      send(conn, {
        type: 'joined',
        roomId,
        clientId,
        snapshot: toBase64(Y.encodeStateAsUpdate(doc)),
        room: getRoomSummary(room),
      });

      refreshPresence(roomId);
      return;
    }

    const session = connectionSessions.get(conn);
    if (!session) {
      send(conn, { type: 'error', message: 'Join a room first.' });
      return;
    }

    const room = rooms.get(session.roomId);
    if (!room) {
      send(conn, { type: 'error', message: 'Room not found.' });
      return;
    }

    room.lastActiveAt = Date.now();
    room.archivedAt = null;

    if (message.type === 'update') {
      if (typeof message.update !== 'string') return;
      const doc = getRoomDoc(session.roomId);
      if (!doc) return;
      try {
        Y.applyUpdate(doc, fromBase64(message.update), { clientId: session.clientId });
      } catch {
        send(conn, { type: 'error', message: 'Invalid document update.' });
      }
      return;
    }

    if (message.type === 'presence') {
      if (!message.user || typeof message.user !== 'object') return;
      const user = message.user;
      const selection = typeof user.selectedId === 'string' || user.selectedId === null ? user.selectedId : null;
      if (
        typeof user.id !== 'string' ||
        typeof user.name !== 'string' ||
        typeof user.color !== 'string'
      ) {
        return;
      }
      if (!roomPresence.has(session.roomId)) roomPresence.set(session.roomId, new Map());
      roomPresence.get(session.roomId).set(session.clientId, {
        id: user.id,
        name: user.name,
        color: user.color,
        selectedId: selection,
      });
      refreshPresence(session.roomId);
      return;
    }

    if (message.type === 'leave') {
      conn.close();
    }
  });
};

const wss = new WebSocketServer({ noServer: true });
wss.on('connection', onCollaborationConnection);

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

const server = http.createServer(async (req, res) => {
  const method = req.method || 'GET';
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host}`);
  const urlPath = decodeURIComponent(requestUrl.pathname);

  if (urlPath === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('ok');
    return;
  }

  if (urlPath === '/api/collaboration/rooms' && method === 'POST') {
    if (!isJsonRequest(req)) {
      sendJson(res, 415, { error: 'Content-Type must be application/json.' });
      return;
    }
    try {
      const body = await parseJsonBody(req);
      const userId = typeof body.userId === 'string' && body.userId.trim() ? body.userId.trim() : null;
      if (!userId) {
        sendJson(res, 400, { error: 'userId is required.' });
        return;
      }

      const now = Date.now();
      const roomId = crypto.randomUUID();
      const roomKey = crypto.randomBytes(32).toString('hex');
      const doc = createRoomDoc(roomId);

      const room = {
        roomId,
        roomKey,
        createdBy: userId,
        memberIds: [userId],
        createdAt: now,
        lastActiveAt: now,
        archivedAt: null,
        snapshot: toBase64(Y.encodeStateAsUpdate(doc)),
        updates: [],
      };

      rooms.set(roomId, room);
      schedulePersist();
      sendJson(res, 201, getRoomSummary(room));
      return;
    } catch (error) {
      sendJson(res, 400, { error: error instanceof Error ? error.message : 'Invalid request.' });
      return;
    }
  }

  if (urlPath === '/api/collaboration/rooms' && method === 'GET') {
    const userId = requestUrl.searchParams.get('userId');
    if (!userId) {
      sendJson(res, 400, { error: 'userId query param is required.' });
      return;
    }

    const userRooms = Array.from(rooms.values())
      .filter((room) => room.memberIds.includes(userId))
      .sort((a, b) => b.lastActiveAt - a.lastActiveAt)
      .map(getRoomSummary);

    sendJson(res, 200, { rooms: userRooms });
    return;
  }

  const joinMatch = urlPath.match(/^\/api\/collaboration\/rooms\/([^/]+)\/join$/);
  if (joinMatch && method === 'POST') {
    if (!isJsonRequest(req)) {
      sendJson(res, 415, { error: 'Content-Type must be application/json.' });
      return;
    }
    try {
      const roomId = joinMatch[1];
      const body = await parseJsonBody(req);
      const userId = typeof body.userId === 'string' && body.userId.trim() ? body.userId.trim() : null;
      const roomKey = typeof body.roomKey === 'string' && body.roomKey.trim() ? body.roomKey.trim() : null;

      if (!userId || !roomKey) {
        sendJson(res, 400, { error: 'userId and roomKey are required.' });
        return;
      }

      const room = rooms.get(roomId);
      if (!room || room.roomKey !== roomKey) {
        sendJson(res, 403, { error: 'Room not found or access denied.' });
        return;
      }

      if (!room.memberIds.includes(userId)) {
        room.memberIds.push(userId);
      }
      room.lastActiveAt = Date.now();
      room.archivedAt = null;
      schedulePersist();

      sendJson(res, 200, getRoomSummary(room));
      return;
    } catch (error) {
      sendJson(res, 400, { error: error instanceof Error ? error.message : 'Invalid request.' });
      return;
    }
  }

  if (!fs.existsSync(distDir)) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('dist not found. Run npm run build first.');
    return;
  }

  const candidatePath = urlPath === '/' ? '/index.html' : urlPath;
  let filePath = path.join(distDir, candidatePath);

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
  if (urlPath !== '/collaboration') {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

server.listen(port, () => {
  console.log(`SQLModel server running on port ${port}`);
  console.log(`Collaboration websocket endpoint: ws://localhost:${port}/collaboration`);
});
