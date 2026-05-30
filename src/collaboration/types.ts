export interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  selectedId: string | null;
}

export interface CollaborationSession {
  roomId: string;
  userId: string;
  userName: string;
  userColor: string;
  isActive: boolean;
  connectedUsers: CollaborationUser[];
}
