/**
 * Common utility to import a ParsedSchema into the model store.
 * Shared across all import dialogs (Rails, PostgreSQL, Prisma, Snowflake).
 *
 * Follows the same pattern as loadExample / loadModelFromJSON:
 * Build all data (tables, FKs, attributes) as plain objects with pre-generated IDs,
 * then set() the store ONCE, then autoLayout() in physical mode.
 */
import { v4 as uuidv4 } from 'uuid';
import { useModelStore } from '../../store/useModelStore';
import type { ParsedSchema } from './types';
import type { PhysicalTable, ForeignKey, Attribute } from '../../model/schemas';

export const importParsedSchema = (result: ParsedSchema): { success: boolean; tableCount: number; fkCount: number } => {
  const { tables: parsedTables } = result;

  if (parsedTables.length === 0) {
    return { success: false, tableCount: 0, fkCount: 0 };
  }

  // Build all data as plain objects with pre-generated UUIDs (like loadExample does)
  const tableIdMap = new Map<string, string>(); // parsedName → generated table ID
  const builtTables: PhysicalTable[] = [];
  const builtForeignKeys: ForeignKey[] = [];

  // ── Pass 1: Build all tables and attributes ──
  for (const parsedTable of parsedTables) {
    const tableId = uuidv4();
    tableIdMap.set(parsedTable.name.toLowerCase(), tableId);

    const attributes: Attribute[] = parsedTable.columns.map(col => ({
      id: uuidv4(),
      name: col.name,
      dataType: col.dataType,
      isPrimaryKey: col.isPrimaryKey,
      isNullable: col.isNullable,
      isForeignKey: false,
    }));

    builtTables.push({
      id: tableId,
      name: parsedTable.name,
      database: parsedTable.database,
      schema: parsedTable.schema,
      attributes,
    });
  }

  // ── Pass 2: Build all foreign keys ──
  let fkCount = 0;
  for (const parsedTable of parsedTables) {
    const fromTableId = tableIdMap.get(parsedTable.name.toLowerCase());
    if (!fromTableId) continue;

    const fromTable = builtTables.find(t => t.id === fromTableId);
    if (!fromTable) continue;

    for (const fk of parsedTable.foreignKeys) {
      const toTableId = tableIdMap.get(fk.referencedTable.toLowerCase());
      if (!toTableId) continue;

      const toTable = builtTables.find(t => t.id === toTableId);
      if (!toTable) continue;

      const fromAttr = fromTable.attributes.find(
        a => a.name.toLowerCase() === fk.column.toLowerCase()
      );
      const toAttr = toTable.attributes.find(
        a => a.name.toLowerCase() === fk.referencedColumn.toLowerCase()
      );

      if (fromAttr && toAttr) {
        // Mark source attribute as FK
        fromAttr.isForeignKey = true;
        fromAttr.referencesTableId = toTableId;
        fromAttr.referencesAttributeId = toAttr.id;

        builtForeignKeys.push({
          id: uuidv4(),
          fromTableId,
          toTableId,
          fromAttributeId: fromAttr.id,
          toAttributeId: toAttr.id,
          fromCardinality: '0..*',
          toCardinality: '1',
          edgeType: 'curved',
        });
        fkCount++;
      }
    }
  }

  // ── Single atomic set() — matching the pattern used by loadExample ──
  // Merge with existing data (append tables/FKs, keep existing entities/relationships)
  const currentState = useModelStore.getState();
  const mergedTables = [...currentState.tables, ...builtTables];
  const mergedForeignKeys = [...currentState.foreignKeys, ...builtForeignKeys];

  // Keep existing table layouts, but ensure new tables get no pre-set layout
  // so autoLayout will position them fresh via dagre
  const existingLayouts = { ...currentState.tableLayouts };
  // (New tables have no entries in existingLayouts — dagre will assign positions)

  useModelStore.setState({
    tables: mergedTables,
    foreignKeys: mergedForeignKeys,
    tableLayouts: existingLayouts,
    selectedId: null,
    multiSelectedTableIds: [],
  });

  // Auto-layout: run in physical mode with entity overlay disabled,
  // so the standard dagre layout positions ALL tables (not just entity-grouped ones).
  const store = useModelStore.getState();
  const previousViewMode = store.viewMode;
  const previousOverlay = store.showEntityOverlay;

  // Temporarily switch to physical view with overlay off for clean dagre layout
  store.setViewMode('physical');
  if (previousOverlay) {
    useModelStore.getState().setShowEntityOverlay(false);
  }
  useModelStore.getState().autoLayout();

  // Restore overlay and view mode
  if (previousOverlay) {
    useModelStore.getState().setShowEntityOverlay(true);
  }
  if (previousViewMode !== 'physical') {
    useModelStore.getState().setViewMode(previousViewMode);
  }

  return { success: true, tableCount: builtTables.length, fkCount };
};
