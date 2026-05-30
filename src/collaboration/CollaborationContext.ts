import { createContext, useContext } from 'react';
import type { CollaborationSession } from './types';

export interface CollaborationContextValue {
  session: CollaborationSession;
  isActive: boolean;
  roomId: string;
  connectedUsers: CollaborationSession['connectedUsers'];
  inviteLink: string | null;
  startCollaboration: () => void;
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
  startCollaboration: () => {},
  stopSession: () => {},
});

export const useCollaborationContext = () => useContext(CollaborationContext);
