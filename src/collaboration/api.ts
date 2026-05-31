export interface CollaborationRoom {
  modelId: string;
  modelKey: string;
  modelName: string;
  createdAt: number;
  lastActiveAt: number;
  archivedAt: number | null;
  expiresAt: number;
}

type RawCollaborationModel = Partial<CollaborationRoom> & {
  roomId?: string;
  roomKey?: string;
};

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

function normalizeModel(raw: RawCollaborationModel): CollaborationRoom {
  return {
    modelId: typeof raw.modelId === 'string' ? raw.modelId : String(raw.roomId ?? ''),
    modelKey: typeof raw.modelKey === 'string' ? raw.modelKey : String(raw.roomKey ?? ''),
    modelName: typeof raw.modelName === 'string' ? raw.modelName : 'Shared Model',
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    lastActiveAt: typeof raw.lastActiveAt === 'number' ? raw.lastActiveAt : Date.now(),
    archivedAt: typeof raw.archivedAt === 'number' ? raw.archivedAt : null,
    expiresAt: typeof raw.expiresAt === 'number' ? raw.expiresAt : Date.now(),
  };
}

export async function createCollaborationRoom(userId: string, modelName: string): Promise<CollaborationRoom> {
  const response = await fetch(`${apiBaseUrl}/api/collaboration/models`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, modelName }),
  });
  const parsed = await parseResponse<RawCollaborationModel>(response);
  return normalizeModel(parsed);
}

export async function listCollaborationRooms(userId: string): Promise<CollaborationRoom[]> {
  const query = new URLSearchParams({ userId }).toString();
  const response = await fetch(`${apiBaseUrl}/api/collaboration/models?${query}`);
  const parsed = await parseResponse<{ models?: RawCollaborationModel[]; rooms?: RawCollaborationModel[] }>(response);
  const models = Array.isArray(parsed.models) ? parsed.models : (parsed.rooms ?? []);
  return models.map(normalizeModel);
}

export async function joinCollaborationRoom(roomId: string, roomKey: string, userId: string): Promise<CollaborationRoom> {
  const response = await fetch(`${apiBaseUrl}/api/collaboration/models/${roomId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modelKey: roomKey, userId }),
  });
  const parsed = await parseResponse<RawCollaborationModel>(response);
  return normalizeModel(parsed);
}

export async function renameCollaborationRoom(
  roomId: string,
  roomKey: string,
  userId: string,
  modelName: string,
): Promise<CollaborationRoom> {
  const response = await fetch(`${apiBaseUrl}/api/collaboration/models/${roomId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modelKey: roomKey, userId, modelName }),
  });
  const parsed = await parseResponse<RawCollaborationModel>(response);
  return normalizeModel(parsed);
}
