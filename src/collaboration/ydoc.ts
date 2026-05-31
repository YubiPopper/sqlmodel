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

class ProviderAwareness {
  private localState: AwarenessState = {};
  private readonly states = new Map<number, AwarenessState>();
  private readonly listeners = new Set<AwarenessChangeHandler>();
  private localClientId: number | null = null;

  constructor(private readonly provider: ServerCollaborationProvider) {}

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

  on(event: 'change', handler: AwarenessChangeHandler): void {
    if (event === 'change') this.listeners.add(handler);
  }

  off(event: 'change', handler: AwarenessChangeHandler): void {
    if (event === 'change') this.listeners.delete(handler);
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

  readonly awareness: ProviderAwareness;

  constructor(
    private readonly roomId: string,
    private readonly roomKey: string,
    private readonly user: { id: string; name: string; color: string },
  ) {
    this.awareness = new ProviderAwareness(this);
    this.onDocUpdate = (update, origin) => {
      if (origin === REMOTE_SYNC_ORIGIN) return;
      const encodedUpdate = btoa(String.fromCharCode(...update));
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
    const wsUrl = wsUrlFromEnv || (() => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${window.location.host}/collaboration`;
    })();

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
      let message: any;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }

      if (!message || typeof message.type !== 'string') return;

      if (message.type === 'joined') {
        this.isJoined = true;

        if (typeof message.clientId === 'number') {
          this.awareness.setLocalClientId(message.clientId);
        }

        if (typeof message.snapshot === 'string' && message.snapshot.length > 0) {
          try {
            const decoded = Uint8Array.from(atob(message.snapshot), (c) => c.charCodeAt(0));
            Y.applyUpdate(ydoc, decoded, REMOTE_SYNC_ORIGIN);
          } catch (error) {
            console.warn('[sqlmodel] Failed to apply room snapshot:', error);
          }
        }

        this.flushPendingUpdates();
        if (this.awareness.getStates().size > 0) {
          const localState = Array.from(this.awareness.getStates().values())[0]?.user;
          if (localState) {
            this.sendMessage({ type: 'presence', user: localState });
          }
        }
        return;
      }

      if (message.type === 'update' && typeof message.update === 'string') {
        try {
          const decoded = Uint8Array.from(atob(message.update), (c) => c.charCodeAt(0));
          Y.applyUpdate(ydoc, decoded, REMOTE_SYNC_ORIGIN);
        } catch (error) {
          console.warn('[sqlmodel] Failed to apply collaboration update:', error);
        }
        return;
      }

      if (message.type === 'presence' && Array.isArray(message.users)) {
        this.awareness.applyRemoteUsers(
          message.users.filter((entry: any) => typeof entry?.clientId === 'number' && entry?.user),
        );
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
