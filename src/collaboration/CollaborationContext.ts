import { createContext, useContext } from 'react';
import type { CollaborationSession } from './types';

export interface RecentCollaborationRoom {
  roomId: string;
  lastVisitedAt: number;
}

export interface CollaborationContextValue {
  session: CollaborationSession;
  isActive: boolean;
  roomId: string;
  connectedUsers: CollaborationSession['connectedUsers'];
  inviteLink: string | null;
  recentRooms: RecentCollaborationRoom[];
  startCollaboration: () => void;
  reopenRoom: (roomId: string) => void;
  stopSession: () => void;
}

export const CollaborationContext = createContext<CollaborationContextValue>({
  session: {
    roomId: '',
    userId: '',
    userName: '',
    userColor: '',
    isActive: false,
    connectedUsers: [],
  },
  isActive: false,
  roomId: '',
  connectedUsers: [],
  inviteLink: null,
  recentRooms: [],
  startCollaboration: () => {},
  reopenRoom: () => {},
  stopSession: () => {},
});

export const useCollaborationContext = () => useContext(CollaborationContext);
