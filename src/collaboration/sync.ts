import { useModelStore } from '../store/useModelStore';
import {
  ydoc,
  yDataModels,
  yEntities,
  yRelationships,
  yEntityGroups,
  yTables,
  yForeignKeys,
  yTableGroups,
  yNodeLayouts,
  yTableLayouts,
  yDatabaseDescriptions,
  ySchemaDescriptions,
} from './ydoc';

// Guards to prevent circular updates
let isSyncingFromYjs = false;
let isSyncingToYjs = false;

// Debounce timer for layout updates
let layoutDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapToArray<T>(ymap: ReturnType<typeof ydoc.getMap<string>>): T[] {
  const result: T[] = [];
  ymap.forEach((value) => {
    try {
      result.push(JSON.parse(value) as T);
    } catch (err) {
      console.warn('[sqlmodel] Failed to parse Yjs map entry:', err);
    }
  });
  return result;
}

function recordFromMap(ymap: ReturnType<typeof ydoc.getMap<string>>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  ymap.forEach((value, key) => {
    try {
      result[key] = JSON.parse(value);
    } catch (err) {
      console.warn('[sqlmodel] Failed to parse Yjs map entry for key', key, ':', err);
    }
  });
  return result;
}

function syncArrayToMap<T extends { id: string }>(
  ymap: ReturnType<typeof ydoc.getMap<string>>,
  items: T[],
): void {
  const currentKeys = new Set(ymap.keys());
  const newKeys = new Set(items.map((i) => i.id));

  // Remove deleted items
  currentKeys.forEach((key) => {
    if (!newKeys.has(key)) ymap.delete(key);
  });

  // Upsert existing/new items (only if changed to reduce traffic)
  items.forEach((item) => {
    const serialized = JSON.stringify(item);
    if (ymap.get(item.id) !== serialized) {
      ymap.set(item.id, serialized);
    }
  });
}

function syncRecordToMap(
  ymap: ReturnType<typeof ydoc.getMap<string>>,
  record: Record<string, unknown>,
): void {
  const currentKeys = new Set(ymap.keys());
  const newKeys = new Set(Object.keys(record));

  currentKeys.forEach((key) => {
    if (!newKeys.has(key)) ymap.delete(key);
  });

  Object.entries(record).forEach(([key, value]) => {
    const serialized = JSON.stringify(value);
    if (ymap.get(key) !== serialized) {
      ymap.set(key, serialized);
    }
  });
}

// ─── Zustand → Yjs ──────────────────────────────────────────────────────────

function pushStoreToYjs(): void {
  if (isSyncingFromYjs) return;
  isSyncingToYjs = true;
  const state = useModelStore.getState();
  try {
    ydoc.transact(() => {
      syncArrayToMap(yDataModels, state.dataModels);
      syncArrayToMap(yEntities, state.entities);
      syncArrayToMap(yRelationships, state.relationships);
      syncArrayToMap(yEntityGroups, state.entityGroups);
      syncArrayToMap(yTables, state.tables);
      syncArrayToMap(yForeignKeys, state.foreignKeys);
      syncArrayToMap(yTableGroups, state.tableGroups);
      syncRecordToMap(yNodeLayouts, state.nodeLayouts as Record<string, unknown>);
      syncRecordToMap(yTableLayouts, state.tableLayouts as Record<string, unknown>);
      syncRecordToMap(yDatabaseDescriptions, state.databaseDescriptions as Record<string, unknown>);
      syncRecordToMap(ySchemaDescriptions, state.schemaDescriptions as Record<string, unknown>);
    });
  } finally {
    isSyncingToYjs = false;
  }
}

const LAYOUT_SYNC_DEBOUNCE_MS = 80;

function pushStoreToYjsDebounced(): void {
  if (layoutDebounceTimer) clearTimeout(layoutDebounceTimer);
  layoutDebounceTimer = setTimeout(pushStoreToYjs, LAYOUT_SYNC_DEBOUNCE_MS);
}

// ─── Yjs → Zustand ──────────────────────────────────────────────────────────

function applyYjsToStore(): void {
  if (isSyncingToYjs) return;
  isSyncingFromYjs = true;
  try {
    useModelStore.setState({
      dataModels: mapToArray(yDataModels),
      entities: mapToArray(yEntities),
      relationships: mapToArray(yRelationships),
      entityGroups: mapToArray(yEntityGroups),
      tables: mapToArray(yTables),
      foreignKeys: mapToArray(yForeignKeys),
      tableGroups: mapToArray(yTableGroups),
      nodeLayouts: recordFromMap(yNodeLayouts) as Record<string, { x: number; y: number; width?: number; height?: number }>,
      tableLayouts: recordFromMap(yTableLayouts) as Record<string, { x: number; y: number; width?: number; height?: number }>,
      databaseDescriptions: recordFromMap(yDatabaseDescriptions) as Record<string, string>,
      schemaDescriptions: recordFromMap(ySchemaDescriptions) as Record<string, string>,
    });
  } finally {
    isSyncingFromYjs = false;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

let unsubscribeStore: (() => void) | null = null;
let ymapHandler: ((_evt: unknown) => void) | null = null;

/** Wire up bidirectional sync between Zustand and Yjs.
 * @param isJoining - true when joining an existing room from a link.
 *   Skips the initial local→Yjs push (which would pollute the shared doc with
 *   the joiner's unrelated local model) and clears the local store so the
 *   host's data flows in cleanly once WebRTC syncs.
 */
export function initSync(isJoining = false): void {
  if (isJoining) {
    // Clear local store so the host's Yjs state will replace it, not merge with it
    isSyncingFromYjs = true;
    try {
      useModelStore.setState({
        dataModels: [],
        entities: [],
        relationships: [],
        entityGroups: [],
        tables: [],
        foreignKeys: [],
        tableGroups: [],
        nodeLayouts: {},
        tableLayouts: {},
        databaseDescriptions: {},
        schemaDescriptions: {},
      });
    } finally {
      isSyncingFromYjs = false;
    }
  } else {
    // Host: push local model into the shared doc immediately
    pushStoreToYjs();
  }

  // Yjs → Zustand: observe all relevant maps
  const ymaps = [
    yDataModels, yEntities, yRelationships, yEntityGroups,
    yTables, yForeignKeys, yTableGroups,
    yNodeLayouts, yTableLayouts,
    yDatabaseDescriptions, ySchemaDescriptions,
  ];

  // Unobserve any previous handler before re-registering (prevents accumulation
  // on session restart or React StrictMode double-invoke).
  if (ymapHandler) {
    ymaps.forEach((m) => m.unobserve(ymapHandler!));
    ymapHandler = null;
  }

  ymapHandler = (_evt: unknown) => applyYjsToStore();
  ymaps.forEach((m) => m.observe(ymapHandler!));

  // Zustand → Yjs: subscribe to store changes
  unsubscribeStore = useModelStore.subscribe((state, prevState) => {
    if (isSyncingFromYjs) return;
    // Shallow-check if any synced collection changed
    const layoutChanged =
      state.nodeLayouts !== prevState.nodeLayouts ||
      state.tableLayouts !== prevState.tableLayouts;
    const dataChanged =
      state.dataModels !== prevState.dataModels ||
      state.entities !== prevState.entities ||
      state.relationships !== prevState.relationships ||
      state.entityGroups !== prevState.entityGroups ||
      state.tables !== prevState.tables ||
      state.foreignKeys !== prevState.foreignKeys ||
      state.tableGroups !== prevState.tableGroups ||
      state.databaseDescriptions !== prevState.databaseDescriptions ||
      state.schemaDescriptions !== prevState.schemaDescriptions;

    if (layoutChanged) {
      pushStoreToYjsDebounced();
    } else if (dataChanged) {
      pushStoreToYjs();
    }
  });
}

export function teardownSync(): void {
  if (unsubscribeStore) {
    unsubscribeStore();
    unsubscribeStore = null;
  }
  if (ymapHandler) {
    const ymaps = [
      yDataModels, yEntities, yRelationships, yEntityGroups,
      yTables, yForeignKeys, yTableGroups,
      yNodeLayouts, yTableLayouts,
      yDatabaseDescriptions, ySchemaDescriptions,
    ];
    ymaps.forEach((m) => m.unobserve(ymapHandler!));
    ymapHandler = null;
  }
  if (layoutDebounceTimer) {
    clearTimeout(layoutDebounceTimer);
    layoutDebounceTimer = null;
  }
}
