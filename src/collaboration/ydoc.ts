import * as Y from 'yjs';

const REMOTE_SYNC_ORIGIN = 'server-collaboration';

type AwarenessUser = {
  id: string;
  name: string;
  color: string;
  selectedId: string | null;
};

type AwarenessState = {
  user?: AwarenessUser;
};

type AwarenessChangeHandler = () => void;

type PresencePayload = {
  clientId: number;
  user: AwarenessUser;
};

type JoinMessage = {
  type: 'join';
  roomId: string;
  roomKey: string;
  userId: string;
  userName: string;
  userColor: string;
};

type UpdateMessage = {
  type: 'update';
  update: string;
};

type PresenceMessage = {
  type: 'presence';
  user: AwarenessUser;
};

type CollaborationMessage = JoinMessage | UpdateMessage | PresenceMessage | { type: 'leave' };

type JoinedServerMessage = {
  type: 'joined';
  clientId: number;
  snapshot: string;
};

type UpdateServerMessage = {
  type: 'update';
  update: string;
};

type PresenceServerMessage = {
  type: 'presence';
  users: PresencePayload[];
};

type ErrorServerMessage = {
  type: 'error';
  message: string;
};

type ServerMessage = JoinedServerMessage | UpdateServerMessage | PresenceServerMessage | ErrorServerMessage;

const encodeBase64Update = (update: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < update.length; i++) {
    binary += String.fromCharCode(update[i]);
  }
  return btoa(binary);
};

const decodeBase64Update = (encoded: string): Uint8Array => {
  const binary = atob(encoded);
  const decoded = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    decoded[i] = binary.charCodeAt(i);
  }
  return decoded;
};

const isAwarenessUser = (value: unknown): value is AwarenessUser => {
  if (!value || typeof value !== 'object') return false;
  const user = value as Record<string, unknown>;
  return (
    typeof user.id === 'string' &&
    typeof user.name === 'string' &&
    typeof user.color === 'string' &&
    (typeof user.selectedId === 'string' || user.selectedId === null)
  );
};

const parseServerMessage = (raw: string): ServerMessage | null => {
  try {
    const parsed = JSON.parse(raw) as { type?: unknown; [key: string]: unknown };
    if (parsed.type === 'joined' && typeof parsed.clientId === 'number' && typeof parsed.snapshot === 'string') {
      return { type: 'joined', clientId: parsed.clientId, snapshot: parsed.snapshot };
    }
    if (parsed.type === 'update' && typeof parsed.update === 'string') {
      return { type: 'update', update: parsed.update };
    }
    if (parsed.type === 'presence' && Array.isArray(parsed.users)) {
      const users = parsed.users.filter((entry): entry is PresencePayload => {
        if (!entry || typeof entry !== 'object') return false;
        const payload = entry as { clientId?: unknown; user?: unknown };
        return typeof payload.clientId === 'number' && isAwarenessUser(payload.user);
      });
      return { type: 'presence', users };
    }
    if (parsed.type === 'error' && typeof parsed.message === 'string') {
      return { type: 'error', message: parsed.message };
    }
    return null;
  } catch {
    return null;
  }
};

class ProviderAwareness {
  private localState: AwarenessState = {};
  private readonly states = new Map<number, AwarenessState>();
  private readonly listeners = new Set<AwarenessChangeHandler>();
  private localClientId: number | null = null;
  private readonly provider: ServerCollaborationProvider;

  constructor(provider: ServerCollaborationProvider) {
    this.provider = provider;
  }

  setLocalClientId(clientId: number): void {
    this.localClientId = clientId;
    if (!this.states.has(clientId)) {
      this.states.set(clientId, {});
    }
    this.emitChange();
  }

  clear(): void {
    this.localState = {};
    this.states.clear();
    this.localClientId = null;
    this.emitChange();
  }

  setLocalStateField(field: 'user', value: AwarenessUser): void {
    if (field !== 'user') return;
    this.localState = { ...this.localState, [field]: value };

    if (this.localClientId !== null) {
      this.states.set(this.localClientId, this.localState);
    }

    this.provider.sendMessage({ type: 'presence', user: value });
    this.emitChange();
  }

  applyRemoteUsers(users: PresencePayload[]): void {
    const nextStates = new Map<number, AwarenessState>();

    users.forEach(({ clientId, user }) => {
      nextStates.set(clientId, { user });
    });

    if (this.localClientId !== null && this.localState.user) {
      nextStates.set(this.localClientId, this.localState);
    }

    this.states.clear();
    nextStates.forEach((value, key) => {
      this.states.set(key, value);
    });

    this.emitChange();
  }

  getStates(): Map<number, AwarenessState> {
    return new Map(this.states);
  }

  getLocalUser(): AwarenessUser | null {
    return this.localState.user ?? null;
  }

  on(event: 'change', handler: AwarenessChangeHandler): void {
    if (event === 'change') this.listeners.add(handler);
  }

  off(event: 'change', handler: AwarenessChangeHandler): void {
    if (event === 'change') this.listeners.delete(handler);
  }

  clearListeners(): void {
    this.listeners.clear();
  }

  private emitChange(): void {
    this.listeners.forEach((listener) => listener());
  }
}

class ServerCollaborationProvider {
  private ws: WebSocket | null = null;
  private pendingUpdates: string[] = [];
  private isJoined = false;
  private readonly onDocUpdate: (update: Uint8Array, origin: unknown) => void;
  private readonly roomId: string;
  private readonly roomKey: string;
  private readonly user: { id: string; name: string; color: string };

  readonly awareness: ProviderAwareness;

  constructor(roomId: string, roomKey: string, user: { id: string; name: string; color: string }) {
    this.roomId = roomId;
    this.roomKey = roomKey;
    this.user = user;
    this.awareness = new ProviderAwareness(this);
    this.onDocUpdate = (update, origin) => {
      if (origin === REMOTE_SYNC_ORIGIN) return;
      const encodedUpdate = encodeBase64Update(update);
      if (!this.isJoined || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.pendingUpdates.push(encodedUpdate);
        return;
      }
      this.sendMessage({ type: 'update', update: encodedUpdate });
    };

    ydoc.on('update', this.onDocUpdate);
    this.connect();
  }

  private connect(): void {
    const wsUrlFromEnv = import.meta.env.VITE_COLLAB_WS_URL as string | undefined;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = wsUrlFromEnv || `${wsProtocol}//${window.location.host}/collaboration`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.sendMessage({
        type: 'join',
        roomId: this.roomId,
        roomKey: this.roomKey,
        userId: this.user.id,
        userName: this.user.name,
        userColor: this.user.color,
      });
    };

    this.ws.onmessage = (event) => {
      const message = parseServerMessage(String(event.data));
      if (!message) return;

      if (message.type === 'joined') {
        this.isJoined = true;
        console.log('[sqlmodel] Joined room, clientId:', message.clientId);

        if (typeof message.clientId === 'number') {
          this.awareness.setLocalClientId(message.clientId);
        }

        if (typeof message.snapshot === 'string' && message.snapshot.length > 0) {
          console.log('[sqlmodel] Received snapshot of', message.snapshot.length, 'bytes');
          try {
            const decoded = decodeBase64Update(message.snapshot);
            console.log('[sqlmodel] Decoded snapshot is', decoded.length, 'bytes, applying to ydoc');
            Y.applyUpdate(ydoc, decoded, REMOTE_SYNC_ORIGIN);
            console.log('[sqlmodel] Snapshot applied successfully');
          } catch (error) {
            console.warn('[sqlmodel] Failed to apply room snapshot:', error);
          }
        } else {
          console.log('[sqlmodel] No snapshot data received from server');
        }

        this.flushPendingUpdates();
        const localUser = this.awareness.getLocalUser();
        if (localUser) {
          this.sendMessage({ type: 'presence', user: localUser });
        }
        return;
      }

      if (message.type === 'update' && typeof message.update === 'string') {
        try {
          const decoded = decodeBase64Update(message.update);
          Y.applyUpdate(ydoc, decoded, REMOTE_SYNC_ORIGIN);
        } catch (error) {
          console.warn('[sqlmodel] Failed to apply collaboration update:', error);
        }
        return;
      }

      if (message.type === 'presence') {
        this.awareness.applyRemoteUsers(message.users);
        return;
      }

      if (message.type === 'error' && typeof message.message === 'string') {
        console.warn('[sqlmodel] Collaboration error:', message.message);
      }
    };

    this.ws.onclose = () => {
      this.isJoined = false;
    };
  }

  sendMessage(message: CollaborationMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(message));
  }

  private flushPendingUpdates(): void {
    if (!this.isJoined || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.pendingUpdates.forEach((update) => {
      this.sendMessage({ type: 'update', update });
    });
    this.pendingUpdates = [];
  }

  destroy(): void {
    ydoc.off('update', this.onDocUpdate);
    this.awareness.clearListeners();
    this.sendMessage({ type: 'leave' });
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pendingUpdates = [];
    this.isJoined = false;
    this.awareness.clear();
  }
}

// Singleton Y.Doc
export const ydoc = new Y.Doc();

// Y.Maps for each synced collection (keyed by item ID → serialized JSON)
export const yDataModels = ydoc.getMap<string>('dataModels');
export const yEntities = ydoc.getMap<string>('entities');
export const yRelationships = ydoc.getMap<string>('relationships');
export const yEntityGroups = ydoc.getMap<string>('entityGroups');
export const yTables = ydoc.getMap<string>('tables');
export const yForeignKeys = ydoc.getMap<string>('foreignKeys');
export const yTableGroups = ydoc.getMap<string>('tableGroups');
export const yNodeLayouts = ydoc.getMap<string>('nodeLayouts');
export const yTableLayouts = ydoc.getMap<string>('tableLayouts');
export const yDatabaseDescriptions = ydoc.getMap<string>('databaseDescriptions');
export const ySchemaDescriptions = ydoc.getMap<string>('schemaDescriptions');

let provider: ServerCollaborationProvider | null = null;

export function getCollaborationProvider(): ServerCollaborationProvider | null {
  return provider;
}

/** Clear all shared Y.Maps. Must be called before creating providers for a new
 *  room so stale data from the previous session doesn't bleed into the new room. */
export function clearYDoc(): void {
  ydoc.transact(() => {
    yDataModels.clear();
    yEntities.clear();
    yRelationships.clear();
    yEntityGroups.clear();
    yTables.clear();
    yForeignKeys.clear();
    yTableGroups.clear();
    yNodeLayouts.clear();
    yTableLayouts.clear();
    yDatabaseDescriptions.clear();
    ySchemaDescriptions.clear();
  });
}

export function initProviders(
  roomId: string,
  roomKey: string,
  user: { id: string; name: string; color: string },
): ServerCollaborationProvider {
  if (provider) {
    provider.destroy();
    provider = null;
  }

  clearYDoc();

  provider = new ServerCollaborationProvider(roomId, roomKey, user);
  return provider;
}

export function teardownProviders(): void {
  if (provider) {
    provider.destroy();
    provider = null;
  }
}
