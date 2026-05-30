import { useEffect, useRef, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { CollaborationSession, CollaborationUser } from './types';
import type { RecentCollaborationRoom } from './CollaborationContext';
import { initProviders, teardownProviders, getWebrtcProvider } from './ydoc';
import { initSync, teardownSync } from './sync';
import { useModelStore } from '../store/useModelStore';

// ─── Palette of user colors ─────────────────────────────────────────────────
const USER_COLORS = [
  '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
  '#ec4899', '#ef4444', '#14b8a6', '#f97316',
];
const RECENT_ROOMS_KEY = 'sqlmodel-collab-recent-rooms';
const MAX_RECENT_ROOMS = 8;

function getOrCreateUserId(): string {
  const key = 'sqlmodel-collab-user-id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(key, id);
  }
  return id;
}

// ─── Suffix generation (unbiased, no modulo on crypto output) ────────────────
// Rejection sampling: generate a 10-bit value (0-1023), reject if >= 1000.
function getUnbiasedUserSuffix(): number {
  let value: number;
  do {
    value = crypto.getRandomValues(new Uint16Array(1))[0] & 0x3ff; // 0–1023
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

function getRoomFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('room');
}

function setRoomInUrl(roomId: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set('room', roomId);
  window.history.pushState({}, '', url.toString());
}

function removeRoomFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('room');
  window.history.pushState({}, '', url.toString());
}

function getRecentRooms(): RecentCollaborationRoom[] {
  const saved = localStorage.getItem(RECENT_ROOMS_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved) as RecentCollaborationRoom[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((room) => room && typeof room.roomId === 'string' && typeof room.lastVisitedAt === 'number')
      .slice(0, MAX_RECENT_ROOMS);
  } catch {
    return [];
  }
}

function saveRecentRoom(roomId: string): RecentCollaborationRoom[] {
  const updatedRooms = [
    { roomId, lastVisitedAt: Date.now() },
    ...getRecentRooms().filter((room) => room.roomId !== roomId),
  ].slice(0, MAX_RECENT_ROOMS);
  localStorage.setItem(RECENT_ROOMS_KEY, JSON.stringify(updatedRooms));
  return updatedRooms;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useCollaboration() {
  const roomFromUrl = getRoomFromUrl();
  const initialRoomRef = useRef(roomFromUrl);
  const [recentRooms, setRecentRooms] = useState<RecentCollaborationRoom[]>(() => getRecentRooms());
  const [session, setSession] = useState<CollaborationSession>({
    roomId: roomFromUrl ?? '',
    userId: getOrCreateUserId(),
    userName: getOrCreateUserName(),
    userColor: getUserColor(getOrCreateUserId()),
    isActive: false,
    connectedUsers: [],
  });

  const setCollaboratorSelections = useModelStore((s) => s.setCollaboratorSelections);
  const selectedId = useModelStore((s) => s.selectedId);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  // Keep awareness up-to-date whenever local selection changes
  useEffect(() => {
    if (!session.isActive) return;
    const provider = getWebrtcProvider();
    if (!provider) return;
    provider.awareness.setLocalStateField('user', {
      id: session.userId,
      name: session.userName,
      color: session.userColor,
      selectedId,
    });
  }, [selectedId, session.isActive, session.userId, session.userName, session.userColor]);

  const startSession = useCallback((roomId: string, isJoining = false) => {
    const userId = getOrCreateUserId();
    const userName = getOrCreateUserName();
    const userColor = getUserColor(userId);

    setRoomInUrl(roomId);
    setRecentRooms(saveRecentRoom(roomId));

    const provider = initProviders(roomId);
    initSync(isJoining);

    // Set local awareness
    provider.awareness.setLocalStateField('user', {
      id: userId,
      name: userName,
      color: userColor,
      selectedId: selectedIdRef.current,
    });

    // Listen for awareness changes from peers
    const handleAwareness = () => {
      const states = provider.awareness.getStates();
      const users: CollaborationUser[] = [];
      const selections: Record<number, CollaborationUser & { selectedId: string | null }> = {};

      states.forEach((state, clientId) => {
        const u = state.user as (CollaborationUser & { selectedId: string | null }) | undefined;
        if (!u || u.id === userId) return;
        users.push({ id: u.id, name: u.name, color: u.color, selectedId: u.selectedId });
        selections[clientId] = { ...u };
      });

      setCollaboratorSelections(selections);
      setSession((prev) => ({ ...prev, connectedUsers: users }));
    };

    provider.awareness.on('change', handleAwareness);
    handleAwareness();

    setSession({
      roomId,
      userId,
      userName,
      userColor,
      isActive: true,
      connectedUsers: [],
    });
  }, [setCollaboratorSelections]);

  const stopSession = useCallback(() => {
    teardownSync();
    teardownProviders();
    removeRoomFromUrl();
    setCollaboratorSelections({});
    setSession((prev) => ({
      ...prev,
      roomId: '',
      isActive: false,
      connectedUsers: [],
    }));
  }, [setCollaboratorSelections]);

  const startCollaboration = useCallback(() => {
    const roomId = uuidv4();
    startSession(roomId);
  }, [startSession]);

  const reopenRoom = useCallback((roomId: string) => {
    startSession(roomId);
  }, [startSession]);

  const inviteLink = session.isActive
    ? (() => {
        const url = new URL(window.location.href);
        url.searchParams.set('room', session.roomId);
        return url.toString();
      })()
    : null;

  // Auto-join if ?room= param present on mount
  useEffect(() => {
    if (initialRoomRef.current) {
      startSession(initialRoomRef.current, true); // isJoining=true: don't push local model into shared doc
    }
    return () => {
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
    recentRooms,
    startCollaboration,
    reopenRoom,
    stopSession,
  };
}
