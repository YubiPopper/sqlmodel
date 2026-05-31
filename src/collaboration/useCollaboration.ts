import { useEffect, useRef, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  CollaborationSession,
  CollaborationUser,
  PersistedCollaborationRoom,
  PersonalModelSummary,
} from './types';
import { initProviders, teardownProviders, getCollaborationProvider } from './ydoc';
import { initSync, teardownSync } from './sync';
import { useModelStore } from '../store/useModelStore';
import {
  createCollaborationRoom,
  joinCollaborationRoom,
  listCollaborationRooms,
  renameCollaborationRoom,
  type CollaborationRoom,
} from './api';

const USER_COLORS = [
  '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
  '#ec4899', '#ef4444', '#14b8a6', '#f97316',
];

const PERSONAL_MODELS_KEY = 'sqlmodel-personal-models-v1';
const ACTIVE_PERSONAL_MODEL_KEY = 'sqlmodel-active-personal-model-id';

type ModelSnapshot = {
  conceptual: {
    dataModels: ReturnType<typeof useModelStore.getState>['dataModels'];
    entities: ReturnType<typeof useModelStore.getState>['entities'];
    relationships: ReturnType<typeof useModelStore.getState>['relationships'];
    groups: ReturnType<typeof useModelStore.getState>['entityGroups'];
  };
  physical: {
    tables: ReturnType<typeof useModelStore.getState>['tables'];
    foreignKeys: ReturnType<typeof useModelStore.getState>['foreignKeys'];
    tableGroups: ReturnType<typeof useModelStore.getState>['tableGroups'];
  };
  databaseDescriptions: ReturnType<typeof useModelStore.getState>['databaseDescriptions'];
  schemaDescriptions: ReturnType<typeof useModelStore.getState>['schemaDescriptions'];
  nodeLayouts: ReturnType<typeof useModelStore.getState>['nodeLayouts'];
  tableLayouts: ReturnType<typeof useModelStore.getState>['tableLayouts'];
  viewport: ReturnType<typeof useModelStore.getState>['viewport'];
  viewMode: ReturnType<typeof useModelStore.getState>['viewMode'];
};

type PersonalModelRecord = PersonalModelSummary & {
  snapshot: ModelSnapshot;
};

function buildModelSnapshot(): ModelSnapshot {
  const state = useModelStore.getState();
  return {
    conceptual: {
      dataModels: state.dataModels,
      entities: state.entities,
      relationships: state.relationships,
      groups: state.entityGroups,
    },
    physical: {
      tables: state.tables,
      foreignKeys: state.foreignKeys,
      tableGroups: state.tableGroups,
    },
    databaseDescriptions: state.databaseDescriptions,
    schemaDescriptions: state.schemaDescriptions,
    nodeLayouts: state.nodeLayouts,
    tableLayouts: state.tableLayouts,
    viewport: state.viewport,
    viewMode: state.viewMode,
  };
}

function readPersonalModelRecords(): PersonalModelRecord[] {
  try {
    const raw = localStorage.getItem(PERSONAL_MODELS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is PersonalModelRecord => (
      entry &&
      typeof entry.id === 'string' &&
      typeof entry.name === 'string' &&
      typeof entry.updatedAt === 'number' &&
      typeof entry.snapshot === 'object'
    ));
  } catch {
    return [];
  }
}

function writePersonalModelRecords(records: PersonalModelRecord[]): void {
  localStorage.setItem(PERSONAL_MODELS_KEY, JSON.stringify(records));
}

function summarizePersonalModels(records: PersonalModelRecord[]): PersonalModelSummary[] {
  return records
    .map(({ id, name, updatedAt }) => ({ id, name, updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function trimModelName(input: string, fallback: string): string {
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function getOrCreateUserId(): string {
  const key = 'sqlmodel-collab-user-id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(key, id);
  }
  return id;
}

function getUnbiasedUserSuffix(): number {
  let value: number;
  do {
    value = crypto.getRandomValues(new Uint16Array(1))[0] & 0x3ff;
  } while (value >= 1000);
  return value;
}

function getOrCreateUserName(): string {
  const key = 'sqlmodel-collab-user-name';
  let name = localStorage.getItem(key);
  if (!name) {
    name = `User ${String(getUnbiasedUserSuffix()).padStart(3, '0')}`;
    localStorage.setItem(key, name);
  }
  return name;
}

function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

function getRoomFromUrl(): { roomId: string; roomKey: string } | null {
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get('model') ?? params.get('room');
  const roomKey = params.get('key');
  if (!roomId || !roomKey) return null;
  return { roomId, roomKey };
}

function setRoomInUrl(roomId: string, roomKey: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set('model', roomId);
  url.searchParams.delete('room');
  url.searchParams.set('key', roomKey);
  window.history.pushState({}, '', url.toString());
}

function removeRoomFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('model');
  url.searchParams.delete('room');
  url.searchParams.delete('key');
  window.history.pushState({}, '', url.toString());
}

function toPersistedRoom(room: CollaborationRoom): PersistedCollaborationRoom {
  return {
    modelId: room.modelId,
    modelKey: room.modelKey,
    modelName: room.modelName,
    createdAt: room.createdAt,
    lastActiveAt: room.lastActiveAt,
    archivedAt: room.archivedAt,
    expiresAt: room.expiresAt,
  };
}

export function useCollaboration() {
  const roomFromUrl = getRoomFromUrl();
  const initialRoomRef = useRef(roomFromUrl);

  const userId = getOrCreateUserId();
  const userName = getOrCreateUserName();
  const userColor = getUserColor(userId);

  const [rooms, setRooms] = useState<PersistedCollaborationRoom[]>([]);
  const [personalModels, setPersonalModels] = useState<PersonalModelSummary[]>([]);
  const [activePersonalModelId, setActivePersonalModelId] = useState<string | null>(() =>
    localStorage.getItem(ACTIVE_PERSONAL_MODEL_KEY),
  );
  const [session, setSession] = useState<CollaborationSession>({
    modelId: roomFromUrl?.roomId ?? '',
    modelKey: roomFromUrl?.roomKey ?? '',
    modelName: 'Shared Model',
    userId,
    userName,
    userColor,
    isActive: false,
    connectedUsers: [],
    isServerBacked: false,
  });

  const setCollaboratorSelections = useModelStore((s) => s.setCollaboratorSelections);
  const selectedId = useModelStore((s) => s.selectedId);
  const selectedIdRef = useRef(selectedId);
  const awarenessHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    const records = readPersonalModelRecords();
    if (records.length === 0) {
      const now = Date.now();
      const defaultRecord: PersonalModelRecord = {
        id: uuidv4(),
        name: 'My Model',
        updatedAt: now,
        snapshot: buildModelSnapshot(),
      };
      writePersonalModelRecords([defaultRecord]);
      setPersonalModels([{ id: defaultRecord.id, name: defaultRecord.name, updatedAt: defaultRecord.updatedAt }]);
      setActivePersonalModelId(defaultRecord.id);
      localStorage.setItem(ACTIVE_PERSONAL_MODEL_KEY, defaultRecord.id);
      return;
    }

    setPersonalModels(summarizePersonalModels(records));
    const activeModelId = localStorage.getItem(ACTIVE_PERSONAL_MODEL_KEY);
    if (activeModelId && records.some((record) => record.id === activeModelId)) {
      setActivePersonalModelId(activeModelId);
    } else {
      setActivePersonalModelId(records[0].id);
      localStorage.setItem(ACTIVE_PERSONAL_MODEL_KEY, records[0].id);
    }
  }, []);

  const refreshRooms = useCallback(async () => {
    try {
      const persistedRooms = await listCollaborationRooms(userId);
      setRooms(persistedRooms.map(toPersistedRoom));
    } catch (error) {
      console.warn('[sqlmodel] Failed to fetch collaboration rooms:', error);
    }
  }, [userId]);

  const persistActivePersonalModel = useCallback(() => {
    if (!activePersonalModelId || session.isActive) return;
    const records = readPersonalModelRecords();
    const modelIndex = records.findIndex((record) => record.id === activePersonalModelId);
    if (modelIndex === -1) return;
    const updatedAt = Date.now();
    records[modelIndex] = {
      ...records[modelIndex],
      updatedAt,
      snapshot: buildModelSnapshot(),
    };
    writePersonalModelRecords(records);
    setPersonalModels(summarizePersonalModels(records));
  }, [activePersonalModelId, session.isActive]);

  const renameCurrentModel = useCallback(async (name: string) => {
    const nextName = trimModelName(name, session.isActive ? session.modelName || 'Shared Model' : 'My Model');

    if (session.isActive) {
      if (!session.modelId || !session.modelKey) return;
      const updatedRoom = await renameCollaborationRoom(session.modelId, session.modelKey, userId, nextName);
      setSession((prev) => ({ ...prev, modelName: updatedRoom.modelName }));
      await refreshRooms();
      return;
    }

    if (!activePersonalModelId) return;
    const records = readPersonalModelRecords();
    const modelIndex = records.findIndex((record) => record.id === activePersonalModelId);
    if (modelIndex === -1) return;

    records[modelIndex] = {
      ...records[modelIndex],
      name: nextName,
      updatedAt: Date.now(),
    };
    writePersonalModelRecords(records);
    setPersonalModels(summarizePersonalModels(records));
  }, [activePersonalModelId, refreshRooms, session.isActive, session.modelId, session.modelKey, session.modelName, userId]);

  useEffect(() => {
    let cancelled = false;
    void listCollaborationRooms(userId)
      .then((persistedRooms) => {
        if (!cancelled) {
          setRooms(persistedRooms.map(toPersistedRoom));
        }
      })
      .catch((error) => {
        console.warn('[sqlmodel] Failed to fetch collaboration rooms:', error);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!session.isActive) return;
    const provider = getCollaborationProvider();
    if (!provider) return;

    provider.awareness.setLocalStateField('user', {
      id: session.userId,
      name: session.userName,
      color: session.userColor,
      selectedId,
    });
  }, [selectedId, session.isActive, session.userId, session.userName, session.userColor]);

  const startSession = useCallback(async (
    modelId: string,
    modelKey: string,
    modelNameHint: string,
    isJoining = false,
    shouldRefresh = false,
  ) => {
    const userIdForSession = getOrCreateUserId();
    const userNameForSession = getOrCreateUserName();
    const userColorForSession = getUserColor(userIdForSession);

    // Clean up previous awareness handler if it exists
    const oldProvider = getCollaborationProvider();
    if (oldProvider && awarenessHandlerRef.current) {
      oldProvider.awareness.off('change', awarenessHandlerRef.current);
      awarenessHandlerRef.current = null;
    }

    const joined = await joinCollaborationRoom(modelId, modelKey, userIdForSession);
    const resolvedModelName = trimModelName(joined.modelName || modelNameHint, 'Shared Model');

    setRoomInUrl(modelId, modelKey);
    setActivePersonalModelId(null);
    localStorage.removeItem(ACTIVE_PERSONAL_MODEL_KEY);

    const provider = initProviders(modelId, modelKey, {
      id: userIdForSession,
      name: userNameForSession,
      color: userColorForSession,
    });

    initSync(isJoining);

    provider.awareness.setLocalStateField('user', {
      id: userIdForSession,
      name: userNameForSession,
      color: userColorForSession,
      selectedId: selectedIdRef.current,
    });

    const handleAwareness = () => {
      const states = provider.awareness.getStates();
      const users: CollaborationUser[] = [];
      const selections: Record<number, { id: string; name: string; color: string; selectedId: string | null }> = {};

      states.forEach((state, clientId) => {
        const u = state.user;
        if (!u || u.id === userIdForSession) return;
        users.push({ id: u.id, name: u.name, color: u.color, selectedId: u.selectedId });
        selections[clientId] = { ...u };
      });

      setCollaboratorSelections(selections);
      setSession((prev) => ({ ...prev, connectedUsers: users }));
    };

    // Store the handler for cleanup on next session or stop
    awarenessHandlerRef.current = handleAwareness;
    provider.awareness.on('change', handleAwareness);
    handleAwareness();

    setSession({
      modelId,
      modelKey,
      modelName: resolvedModelName,
      userId: userIdForSession,
      userName: userNameForSession,
      userColor: userColorForSession,
      isActive: true,
      connectedUsers: [],
      isServerBacked: true,
    });

    await refreshRooms();

    // Refresh page after a brief delay for manual joins/reopens
    // This ensures clean state and consistent data
    if (shouldRefresh) {
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  }, [refreshRooms, setCollaboratorSelections]);

  const stopSession = useCallback(() => {
    // Prevent the mount-only URL-join effect from re-joining after the user explicitly leaves
    initialRoomRef.current = null;
    const provider = getCollaborationProvider();
    if (provider && awarenessHandlerRef.current) {
      provider.awareness.off('change', awarenessHandlerRef.current);
      awarenessHandlerRef.current = null;
    }
    teardownSync();
    teardownProviders();
    removeRoomFromUrl();
    setCollaboratorSelections({});
    setSession((prev) => ({
      ...prev,
      modelId: '',
      modelKey: '',
      modelName: '',
      isActive: false,
      connectedUsers: [],
      isServerBacked: false,
    }));
  }, [setCollaboratorSelections]);

  const startCollaboration = useCallback(async (modelName: string) => {
    persistActivePersonalModel();
    const userIdForSession = getOrCreateUserId();
    const room = await createCollaborationRoom(userIdForSession, trimModelName(modelName, 'Shared Model'));
    await startSession(room.modelId, room.modelKey, room.modelName, false, true);
  }, [persistActivePersonalModel, startSession]);

  const reopenRoom = useCallback(async (roomId: string, roomKey: string) => {
    persistActivePersonalModel();
    const knownRoom = rooms.find((room) => room.modelId === roomId);
    await startSession(roomId, roomKey, knownRoom?.modelName ?? 'Shared Model', true, true);
  }, [persistActivePersonalModel, rooms, startSession]);

  const createPersonalModel = useCallback((name: string) => {
    if (!session.isActive) {
      persistActivePersonalModel();
    }
    const record: PersonalModelRecord = {
      id: uuidv4(),
      name: trimModelName(name, `Personal Model ${personalModels.length + 1}`),
      updatedAt: Date.now(),
      snapshot: buildModelSnapshot(),
    };
    const records = [record, ...readPersonalModelRecords()];
    writePersonalModelRecords(records);
    setPersonalModels(summarizePersonalModels(records));
    setActivePersonalModelId(record.id);
    localStorage.setItem(ACTIVE_PERSONAL_MODEL_KEY, record.id);
  }, [personalModels.length, persistActivePersonalModel, session.isActive]);

  const openPersonalModel = useCallback((modelId: string) => {
    const records = readPersonalModelRecords();
    const record = records.find((entry) => entry.id === modelId);
    if (!record) return;
    if (session.isActive) {
      stopSession();
    } else {
      persistActivePersonalModel();
    }
    useModelStore.getState().loadModelFromJSON(record.snapshot);
    setActivePersonalModelId(modelId);
    localStorage.setItem(ACTIVE_PERSONAL_MODEL_KEY, modelId);
  }, [persistActivePersonalModel, session.isActive, stopSession]);

  const inviteLink = session.isActive
    ? (() => {
        const url = new URL(window.location.href);
        url.searchParams.set('model', session.modelId);
        url.searchParams.delete('room');
        url.searchParams.set('key', session.modelKey);
        return url.toString();
      })()
    : null;

  // Keep a ref to the latest startSession so the mount-only effect never needs it as a dep
  const startSessionRef = useRef(startSession);
  useEffect(() => {
    startSessionRef.current = startSession;
  }, [startSession]);

  // Mount-only: auto-join when the page loads with ?model= / ?room= in the URL.
  // Must NOT depend on any state/callback so it never re-fires after stopSession.
  useEffect(() => {
    const initial = initialRoomRef.current;
    if (initial) {
      void startSessionRef.current(initial.roomId, initial.roomKey, 'Shared Model', true, false);
    }
    return () => {
      const provider = getCollaborationProvider();
      if (provider && awarenessHandlerRef.current) {
        provider.awareness.off('change', awarenessHandlerRef.current);
        awarenessHandlerRef.current = null;
      }
      teardownSync();
      teardownProviders();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    session,
    isActive: session.isActive,
    modelId: session.modelId,
    connectedUsers: session.connectedUsers,
    inviteLink,
    recentRooms: rooms,
    personalModels,
    activePersonalModelId,
    startCollaboration,
    reopenRoom,
    createPersonalModel,
    renameCurrentModel,
    openPersonalModel,
    saveActivePersonalModel: persistActivePersonalModel,
    stopSession,
  };
}
