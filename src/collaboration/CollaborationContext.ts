import { createContext, useContext } from 'react';
import type { CollaborationSession, PersistedCollaborationRoom, PersonalModelSummary } from './types';

export interface CollaborationContextValue {
  session: CollaborationSession;
  isActive: boolean;
  modelId: string;
  connectedUsers: CollaborationSession['connectedUsers'];
  inviteLink: string | null;
  recentRooms: PersistedCollaborationRoom[];
  personalModels: PersonalModelSummary[];
  activePersonalModelId: string | null;
  startCollaboration: (modelName: string) => Promise<void>;
  reopenRoom: (roomId: string, roomKey: string) => Promise<void>;
  createPersonalModel: (name: string) => void;
  renameCurrentModel: (name: string) => Promise<void>;
  openPersonalModel: (modelId: string) => void;
  saveActivePersonalModel: () => void;
  stopSession: () => void;
}

export const CollaborationContext = createContext<CollaborationContextValue>({
  session: {
    modelId: '',
    modelKey: '',
    modelName: '',
    userId: '',
    userName: '',
    userColor: '',
    isActive: false,
    connectedUsers: [],
    isServerBacked: false,
  },
  isActive: false,
  modelId: '',
  connectedUsers: [],
  inviteLink: null,
  recentRooms: [],
  personalModels: [],
  activePersonalModelId: null,
  startCollaboration: async () => {},
  reopenRoom: async () => {},
  createPersonalModel: () => {},
  renameCurrentModel: async () => {},
  openPersonalModel: () => {},
  saveActivePersonalModel: () => {},
  stopSession: () => {},
});

export const useCollaborationContext = () => useContext(CollaborationContext);
