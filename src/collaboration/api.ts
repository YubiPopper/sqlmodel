export interface CollaborationRoom {
  roomId: string;
  roomKey: string;
  createdAt: number;
  lastActiveAt: number;
  archivedAt: number | null;
  expiresAt: number;
}

const resolveApiBaseUrl = (): string => {
  const fromEnv = import.meta.env.VITE_COLLAB_API_BASE_URL as string | undefined;
  return fromEnv ? fromEnv.replace(/\/$/, '') : '';
};

const apiBaseUrl = resolveApiBaseUrl();

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload?.error === 'string' ? payload.error : 'Collaboration request failed.');
  }
  return payload as T;
}

export async function createCollaborationRoom(userId: string): Promise<CollaborationRoom> {
  const response = await fetch(`${apiBaseUrl}/api/collaboration/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return parseResponse<CollaborationRoom>(response);
}

export async function listCollaborationRooms(userId: string): Promise<CollaborationRoom[]> {
  const query = new URLSearchParams({ userId }).toString();
  const response = await fetch(`${apiBaseUrl}/api/collaboration/rooms?${query}`);
  const parsed = await parseResponse<{ rooms: CollaborationRoom[] }>(response);
  return parsed.rooms;
}

export async function joinCollaborationRoom(roomId: string, roomKey: string, userId: string): Promise<CollaborationRoom> {
  const response = await fetch(`${apiBaseUrl}/api/collaboration/rooms/${roomId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomKey, userId }),
  });
  return parseResponse<CollaborationRoom>(response);
}
