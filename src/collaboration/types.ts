export interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  selectedId: string | null;
}

export interface PersistedCollaborationRoom {
  modelId: string;
  modelKey: string;
  modelName: string;
  createdAt: number;
  lastActiveAt: number;
  archivedAt: number | null;
  expiresAt: number;
}

export interface PersonalModelSummary {
  id: string;
  name: string;
  updatedAt: number;
}

export interface CollaborationSession {
  modelId: string;
  modelKey: string;
  modelName: string;
  userId: string;
  userName: string;
  userColor: string;
  isActive: boolean;
  connectedUsers: CollaborationUser[];
  isServerBacked: boolean;
}
