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

/** Clear all shared Y.Maps. Must be called before creating providers for a new
 *  room so that stale data from the previous session doesn't bleed in. */
export function clearYDoc(): void {
  ydoc.transact(() => {
    yDataModels.clear();
    yEntities.clear();
    yRelationships.clear();
    yEntityGroups.clear();
    yTables.clear();
    yForeignKeys.clear();
    yTableGroups.clear();
    yNodeLayouts.clear();
    yTableLayouts.clear();
    yDatabaseDescriptions.clear();
    ySchemaDescriptions.clear();
  });
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

  // Clear in-memory ydoc so stale data from a previous session doesn't persist
  // into the new room's IndexedDB before the real host data arrives via WebRTC.
  clearYDoc();

  indexeddbProvider = new IndexeddbPersistence(`sqlmodel-collab-${roomId}`, ydoc);

  // VITE_SIGNALING_URL must be set to your deployed signaling server.
  // If env is not set, default to same-origin /signaling so a single
  // deployment can serve both app assets and signaling.
  const signalingUrlFromEnv = import.meta.env.VITE_SIGNALING_URL as string | undefined;
  const signalingUrl = signalingUrlFromEnv || (() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.host}/signaling`;
  })();

  webrtcProvider = new WebrtcProvider(roomId, ydoc, {
    signaling: [signalingUrl],
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
