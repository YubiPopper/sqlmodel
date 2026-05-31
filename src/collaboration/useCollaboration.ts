import { useEffect, useRef, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { CollaborationSession, CollaborationUser, PersistedCollaborationRoom } from './types';
import { initProviders, teardownProviders, getCollaborationProvider } from './ydoc';
import { initSync, teardownSync } from './sync';
import { useModelStore } from '../store/useModelStore';
import {
  createCollaborationRoom,
  joinCollaborationRoom,
  listCollaborationRooms,
  type CollaborationRoom,
} from './api';

const USER_COLORS = [
  '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
  '#ec4899', '#ef4444', '#14b8a6', '#f97316',
];

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
  const roomId = params.get('room');
  const roomKey = params.get('key');
  if (!roomId || !roomKey) return null;
  return { roomId, roomKey };
}

function setRoomInUrl(roomId: string, roomKey: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set('room', roomId);
  url.searchParams.set('key', roomKey);
  window.history.pushState({}, '', url.toString());
}

function removeRoomFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('room');
  url.searchParams.delete('key');
  window.history.pushState({}, '', url.toString());
}

function toPersistedRoom(room: CollaborationRoom): PersistedCollaborationRoom {
  return {
    roomId: room.roomId,
    roomKey: room.roomKey,
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
  const [session, setSession] = useState<CollaborationSession>({
    roomId: roomFromUrl?.roomId ?? '',
    roomKey: roomFromUrl?.roomKey ?? '',
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

  const refreshRooms = useCallback(async () => {
    try {
      const persistedRooms = await listCollaborationRooms(userId);
      setRooms(persistedRooms.map(toPersistedRoom));
    } catch (error) {
      console.warn('[sqlmodel] Failed to fetch collaboration rooms:', error);
    }
  }, [userId]);

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

  const startSession = useCallback(async (roomId: string, roomKey: string, isJoining = false, shouldRefresh = false) => {
    const userIdForSession = getOrCreateUserId();
    const userNameForSession = getOrCreateUserName();
    const userColorForSession = getUserColor(userIdForSession);

    // Clean up previous awareness handler if it exists
    const oldProvider = getCollaborationProvider();
    if (oldProvider && awarenessHandlerRef.current) {
      oldProvider.awareness.off('change', awarenessHandlerRef.current);
      awarenessHandlerRef.current = null;
    }

    await joinCollaborationRoom(roomId, roomKey, userIdForSession);

    setRoomInUrl(roomId, roomKey);

    const provider = initProviders(roomId, roomKey, {
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
      roomId,
      roomKey,
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
      roomId: '',
      roomKey: '',
      isActive: false,
      connectedUsers: [],
      isServerBacked: false,
    }));
  }, [setCollaboratorSelections]);

  const startCollaboration = useCallback(async () => {
    const userIdForSession = getOrCreateUserId();
    const room = await createCollaborationRoom(userIdForSession);
    await startSession(room.roomId, room.roomKey, false, true);
  }, [startSession]);

  const reopenRoom = useCallback(async (roomId: string, roomKey: string) => {
    await startSession(roomId, roomKey, true, true);
  }, [startSession]);

  const inviteLink = session.isActive
    ? (() => {
        const url = new URL(window.location.href);
        url.searchParams.set('room', session.roomId);
        url.searchParams.set('key', session.roomKey);
        return url.toString();
      })()
    : null;

  useEffect(() => {
    if (initialRoomRef.current) {
      void startSession(initialRoomRef.current.roomId, initialRoomRef.current.roomKey, true, false);
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
  }, [startSession]);

  return {
    session,
    isActive: session.isActive,
    roomId: session.roomId,
    connectedUsers: session.connectedUsers,
    inviteLink,
    recentRooms: rooms,
    startCollaboration,
    reopenRoom,
    stopSession,
  };
}
