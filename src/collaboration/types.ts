export interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  selectedId: string | null;
}

export interface PersistedCollaborationRoom {
  roomId: string;
  roomKey: string;
  createdAt: number;
  lastActiveAt: number;
  archivedAt: number | null;
  expiresAt: number;
}

export interface CollaborationSession {
  roomId: string;
  roomKey: string;
  userId: string;
  userName: string;
  userColor: string;
  isActive: boolean;
  connectedUsers: CollaborationUser[];
  isServerBacked: boolean;
}
