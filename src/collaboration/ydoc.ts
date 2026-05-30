import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';

// Singleton Y.Doc
export const ydoc = new Y.Doc();

// Y.Maps for each synced collection (keyed by item ID → serialized JSON)
export const yDataModels = ydoc.getMap<string>('dataModels');
export const yEntities = ydoc.getMap<string>('entities');
export const yRelationships = ydoc.getMap<string>('relationships');
export const yEntityGroups = ydoc.getMap<string>('entityGroups');
export const yTables = ydoc.getMap<string>('tables');
export const yForeignKeys = ydoc.getMap<string>('foreignKeys');
export const yTableGroups = ydoc.getMap<string>('tableGroups');
export const yNodeLayouts = ydoc.getMap<string>('nodeLayouts');
export const yTableLayouts = ydoc.getMap<string>('tableLayouts');
export const yDatabaseDescriptions = ydoc.getMap<string>('databaseDescriptions');
export const ySchemaDescriptions = ydoc.getMap<string>('schemaDescriptions');

let webrtcProvider: WebrtcProvider | null = null;
let indexeddbProvider: IndexeddbPersistence | null = null;

export function getWebrtcProvider(): WebrtcProvider | null {
  return webrtcProvider;
}

export function initProviders(roomId: string): WebrtcProvider {
  if (webrtcProvider) {
    webrtcProvider.destroy();
    webrtcProvider = null;
  }
  if (indexeddbProvider) {
    indexeddbProvider.destroy();
    indexeddbProvider = null;
  }

  indexeddbProvider = new IndexeddbPersistence(`sqlmodel-collab-${roomId}`, ydoc);
  webrtcProvider = new WebrtcProvider(roomId, ydoc, {
    signaling: [
      'wss://y-webrtc-signaling-eu.fly.dev',
      'wss://y-webrtc-signaling-us.fly.dev',
    ],
  });

  return webrtcProvider;
}

export function teardownProviders(): void {
  if (webrtcProvider) {
    webrtcProvider.destroy();
    webrtcProvider = null;
  }
  if (indexeddbProvider) {
    indexeddbProvider.destroy();
    indexeddbProvider = null;
  }
}
