import { createContext, useContext } from 'react';
import type { CollaborationSession, PersistedCollaborationRoom } from './types';

export interface CollaborationContextValue {
  session: CollaborationSession;
  isActive: boolean;
  roomId: string;
  connectedUsers: CollaborationSession['connectedUsers'];
  inviteLink: string | null;
  recentRooms: PersistedCollaborationRoom[];
  startCollaboration: () => Promise<void>;
  reopenRoom: (roomId: string, roomKey: string) => Promise<void>;
  stopSession: () => void;
}

export const CollaborationContext = createContext<CollaborationContextValue>({
  session: {
    roomId: '',
    roomKey: '',
    userId: '',
    userName: '',
    userColor: '',
    isActive: false,
    connectedUsers: [],
    isServerBacked: false,
  },
  isActive: false,
  roomId: '',
  connectedUsers: [],
  inviteLink: null,
  recentRooms: [],
  startCollaboration: async () => {},
  reopenRoom: async () => {},
  stopSession: () => {},
});

export const useCollaborationContext = () => useContext(CollaborationContext);
