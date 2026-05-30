import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Database, FolderOpen, Layers, Search, Table } from 'lucide-react';
import { useModelStore } from '../../store/useModelStore';

type PaletteItemType = 'data-model' | 'group' | 'entity' | 'table' | 'database' | 'schema';

interface PaletteItem {
  key: string;
  type: PaletteItemType;
  label: string;
  description?: string;
  searchText: string;
  count?: number;
  nodeId?: string;
  databaseName?: string;
  schemaName?: string;
  tableIds?: string[];
  entityIds?: string[];
  hidden?: boolean;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const TYPE_META: Record<
  PaletteItemType,
  { label: string; icon: React.ReactNode; color: string }
> = {
  'data-model': { label: 'Data Model', icon: <Layers size={14} />, color: '#8b5cf6' },
  group: { label: 'Group', icon: <FolderOpen size={14} />, color: '#f59e0b' },
  entity: { label: 'Entity', icon: <Box size={14} />, color: '#3b82f6' },
  table: { label: 'Table', icon: <Table size={14} />, color: '#10b981' },
  database: { label: 'Database', icon: <Database size={14} />, color: '#ec4899' },
  schema: { label: 'Schema', icon: <Layers size={14} />, color: '#6366f1' },
};

const formatNamespace = (value?: string) => value || 'unassigned';
const displayNamespace = (value?: string) => (value && value.trim() ? value : 'Unassigned');

const scoreItem = (item: PaletteItem, query: string) => {
  const normalizedLabel = item.label.toLowerCase();
  const normalizedText = item.searchText.toLowerCase();

  if (!query) return 0;
  if (normalizedLabel === query) return 0;
  if (normalizedLabel.startsWith(query)) return 1;
  if (normalizedLabel.includes(query)) return 2;
  if (normalizedText.includes(query)) return 3;
  return 4;
};

const deferNavigation = (callback: () => void) => {
  requestAnimationFrame(() => requestAnimationFrame(callback));
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    colorMode,
    dataModels,
    entities,
    entityGroups,
    tables,
    hiddenEntityIds,
    hiddenTableIds,
    databaseDescriptions,
    schemaDescriptions,
    navigateToNodeCallback,
    centerDatabaseCallback,
    centerSchemaCallback,
    setSelected,
    setViewMode,
    toggleEntityVisibility,
    toggleTableVisibility,
  } = useModelStore();

  const isDark = colorMode === 'dark';

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  const items = useMemo<PaletteItem[]>(() => {
    const entityLookup = new Map(entities.map(entity => [entity.id, entity]));
    const tablesByEntity = new Map<string, number>();
    tables.forEach(table => {
      if (table.entityId) {
        tablesByEntity.set(table.entityId, (tablesByEntity.get(table.entityId) || 0) + 1);
      }
    });

    const dataModelItems: PaletteItem[] = dataModels.map(model => ({
      key: `data-model:${model.id}`,
      type: 'data-model',
      label: model.name,
      description: model.description,
      searchText: [model.name, model.description].filter(Boolean).join(' '),
      count: entities.filter(entity => entity.dataModelId === model.id).length,
      nodeId: model.id,
    }));

    const groupItems: PaletteItem[] = entityGroups.map(group => {
      const groupEntityNames = group.entityIds
        .map(entityId => entityLookup.get(entityId)?.name)
        .filter((name): name is string => Boolean(name));

      const hiddenCount = group.entityIds.filter(entityId => hiddenEntityIds.has(entityId)).length;

      return {
        key: `group:${group.id}`,
        type: 'group',
        label: group.name,
        description: groupEntityNames.slice(0, 3).join(', ') || 'Entity group',
        searchText: [group.name, ...groupEntityNames].join(' '),
        count: group.entityIds.length,
        nodeId: group.id,
        entityIds: group.entityIds,
        hidden: hiddenCount > 0 && hiddenCount === group.entityIds.length,
      };
    });

    const entityItems: PaletteItem[] = entities.map(entity => {
      const dataModelName = entity.dataModelId
        ? dataModels.find(model => model.id === entity.dataModelId)?.name
        : undefined;

      return {
        key: `entity:${entity.id}`,
        type: 'entity',
        label: entity.name,
        description: [dataModelName, entity.description].filter(Boolean).join(' • '),
        searchText: [entity.name, entity.description, dataModelName].filter(Boolean).join(' '),
        count: tablesByEntity.get(entity.id),
        nodeId: entity.id,
        hidden: hiddenEntityIds.has(entity.id),
      };
    });

    const tableItems: PaletteItem[] = tables.map(table => {
      const entityName = table.entityId ? entityLookup.get(table.entityId)?.name : undefined;
      const databaseName = formatNamespace(table.database);
      const schemaName = formatNamespace(table.schema);

      return {
        key: `table:${table.id}`,
        type: 'table',
        label: table.name,
        description: [entityName, `${displayNamespace(table.database)} / ${displayNamespace(table.schema)}`]
          .filter(Boolean)
          .join(' • '),
        searchText: [
          table.name,
          entityName,
          databaseName,
          schemaName,
          databaseDescriptions[databaseName],
          schemaDescriptions[`${databaseName}.${schemaName}`],
        ]
          .filter(Boolean)
          .join(' '),
        count: table.attributes.length,
        nodeId: table.id,
        hidden: hiddenTableIds.has(table.id),
      };
    });

    const databaseMap = new Map<string, { tableIds: string[]; schemaNames: Set<string> }>();
    const schemaMap = new Map<string, { tableIds: string[]; databaseName: string; schemaName: string }>();

    tables.forEach(table => {
      const databaseName = formatNamespace(table.database);
      const schemaName = formatNamespace(table.schema);

      const databaseEntry = databaseMap.get(databaseName) || { tableIds: [], schemaNames: new Set<string>() };
      databaseEntry.tableIds.push(table.id);
      databaseEntry.schemaNames.add(schemaName);
      databaseMap.set(databaseName, databaseEntry);

      const schemaKey = `${databaseName}.${schemaName}`;
      const schemaEntry = schemaMap.get(schemaKey) || { tableIds: [], databaseName, schemaName };
      schemaEntry.tableIds.push(table.id);
      schemaMap.set(schemaKey, schemaEntry);
    });

    const databaseItems: PaletteItem[] = Array.from(databaseMap.entries()).map(([databaseName, entry]) => ({
      key: `database:${databaseName}`,
      type: 'database',
      label: displayNamespace(databaseName),
      description: databaseDescriptions[databaseName] || `${entry.schemaNames.size} schema${entry.schemaNames.size === 1 ? '' : 's'}`,
      searchText: [
        databaseName,
        displayNamespace(databaseName),
        databaseDescriptions[databaseName],
        ...Array.from(entry.schemaNames),
      ]
        .filter(Boolean)
        .join(' '),
      count: entry.tableIds.length,
      databaseName,
      tableIds: entry.tableIds,
      hidden: entry.tableIds.every(tableId => hiddenTableIds.has(tableId)),
    }));

    const schemaItems: PaletteItem[] = Array.from(schemaMap.values()).map(entry => ({
      key: `schema:${entry.databaseName}.${entry.schemaName}`,
      type: 'schema',
      label: displayNamespace(entry.schemaName),
      description:
        schemaDescriptions[`${entry.databaseName}.${entry.schemaName}`] ||
        `${displayNamespace(entry.databaseName)} database`,
      searchText: [
        entry.schemaName,
        displayNamespace(entry.schemaName),
        entry.databaseName,
        displayNamespace(entry.databaseName),
        schemaDescriptions[`${entry.databaseName}.${entry.schemaName}`],
      ]
        .filter(Boolean)
        .join(' '),
      count: entry.tableIds.length,
      databaseName: entry.databaseName,
      schemaName: entry.schemaName,
      tableIds: entry.tableIds,
      hidden: entry.tableIds.every(tableId => hiddenTableIds.has(tableId)),
    }));

    return [...dataModelItems, ...groupItems, ...entityItems, ...tableItems, ...databaseItems, ...schemaItems];
  }, [
    dataModels,
    databaseDescriptions,
    entities,
    entityGroups,
    hiddenEntityIds,
    hiddenTableIds,
    schemaDescriptions,
    tables,
  ]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const nextItems = items
      .filter(item => !normalizedQuery || item.searchText.toLowerCase().includes(normalizedQuery))
      .sort((left, right) => {
        const scoreDiff = scoreItem(left, normalizedQuery) - scoreItem(right, normalizedQuery);
        if (scoreDiff !== 0) return scoreDiff;
        return left.label.localeCompare(right.label);
      });

    return nextItems.slice(0, 30);
  }, [items, query]);
  const selectedIndex = filteredItems.length === 0 ? 0 : Math.min(activeIndex, filteredItems.length - 1);

  const handleSelect = (item: PaletteItem) => {
    if (item.type === 'data-model' && item.nodeId) {
      setViewMode('data-model');
      setSelected(item.nodeId);
      onClose();
      deferNavigation(() => navigateToNodeCallback?.(item.nodeId!));
      return;
    }

    if (item.type === 'entity' && item.nodeId) {
      if (hiddenEntityIds.has(item.nodeId)) {
        toggleEntityVisibility(item.nodeId);
      }
      setViewMode('conceptual');
      setSelected(item.nodeId);
      onClose();
      deferNavigation(() => navigateToNodeCallback?.(item.nodeId!));
      return;
    }

    if (item.type === 'group' && item.nodeId) {
      item.entityIds?.forEach(entityId => {
        if (hiddenEntityIds.has(entityId)) {
          toggleEntityVisibility(entityId);
        }
      });
      setViewMode('conceptual');
      setSelected(item.nodeId);
      onClose();

      const targetEntityId = item.entityIds?.find(Boolean);
      if (targetEntityId) {
        deferNavigation(() => navigateToNodeCallback?.(targetEntityId));
      }
      return;
    }

    if (item.type === 'table' && item.nodeId) {
      if (hiddenTableIds.has(item.nodeId)) {
        toggleTableVisibility(item.nodeId);
      }
      setViewMode('physical');
      setSelected(item.nodeId);
      onClose();
      deferNavigation(() => navigateToNodeCallback?.(item.nodeId!));
      return;
    }

    if (item.type === 'database' && item.databaseName) {
      item.tableIds?.forEach(tableId => {
        if (hiddenTableIds.has(tableId)) {
          toggleTableVisibility(tableId);
        }
      });

      const anchorTableId = item.tableIds?.[0];
      setViewMode('physical');
      if (anchorTableId) {
        setSelected(anchorTableId);
      }
      onClose();

      if (anchorTableId) {
        deferNavigation(() => {
          centerDatabaseCallback?.(item.databaseName!);
          if (!centerDatabaseCallback) {
            navigateToNodeCallback?.(anchorTableId);
          }
        });
      }
      return;
    }

    if (item.type === 'schema' && item.databaseName && item.schemaName) {
      item.tableIds?.forEach(tableId => {
        if (hiddenTableIds.has(tableId)) {
          toggleTableVisibility(tableId);
        }
      });

      const anchorTableId = item.tableIds?.[0];
      setViewMode('physical');
      if (anchorTableId) {
        setSelected(anchorTableId);
      }
      onClose();

      if (anchorTableId) {
        deferNavigation(() => {
          centerSchemaCallback?.(item.databaseName!, item.schemaName!);
          if (!centerSchemaCallback) {
            navigateToNodeCallback?.(anchorTableId);
          }
        });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: isDark ? 'rgba(1, 4, 9, 0.72)' : 'rgba(15, 23, 42, 0.24)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '10vh',
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(680px, calc(100vw - 32px))',
          maxHeight: '70vh',
          overflow: 'hidden',
          borderRadius: '16px',
          background: isDark ? '#161b22' : '#ffffff',
          border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
          boxShadow: isDark
            ? '0 24px 64px rgba(0, 0, 0, 0.45)'
            : '0 24px 64px rgba(15, 23, 42, 0.16)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 18px',
            borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
          }}
        >
          <Search size={16} style={{ color: isDark ? '#8b949e' : '#6b7280', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveIndex(index => (filteredItems.length === 0 ? 0 : (index + 1) % filteredItems.length));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex(index =>
                  filteredItems.length === 0 ? 0 : (index - 1 + filteredItems.length) % filteredItems.length
                );
              } else if (event.key === 'Enter') {
                event.preventDefault();
                const activeItem = filteredItems[selectedIndex];
                if (activeItem) {
                  handleSelect(activeItem);
                }
              } else if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
              }
            }}
            placeholder="Search entities, tables, schemas, databases, groups..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '15px',
              color: isDark ? '#e6edf3' : '#111827',
            }}
          />
          <div
            style={{
              fontSize: '11px',
              color: isDark ? '#8b949e' : '#6b7280',
              padding: '4px 8px',
              borderRadius: '6px',
              border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
              background: isDark ? '#0d1117' : '#f9fafb',
            }}
          >
            Esc
          </div>
        </div>

        <div style={{ overflowY: 'auto', padding: '8px' }}>
          {filteredItems.length === 0 ? (
            <div
              style={{
                padding: '28px 16px',
                textAlign: 'center',
                color: isDark ? '#8b949e' : '#6b7280',
                fontSize: '13px',
              }}
            >
              No matches found
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const meta = TYPE_META[item.type];
              const isActive = index === selectedIndex;

              return (
                <button
                  key={item.key}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handleSelect(item)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isActive
                      ? (isDark ? 'rgba(99, 102, 241, 0.16)' : 'rgba(99, 102, 241, 0.1)')
                      : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f3f4f6',
                      color: meta.color,
                      flexShrink: 0,
                    }}
                  >
                    {meta.icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: isDark ? '#e6edf3' : '#111827',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.label}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          color: meta.color,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          flexShrink: 0,
                        }}
                      >
                        {meta.label}
                      </span>
                      {item.hidden && (
                        <span
                          style={{
                            fontSize: '10px',
                            color: isDark ? '#fbbf24' : '#b45309',
                            flexShrink: 0,
                          }}
                        >
                          hidden
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <div
                        style={{
                          marginTop: '2px',
                          fontSize: '11px',
                          color: isDark ? '#8b949e' : '#6b7280',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.description}
                      </div>
                    )}
                  </div>

                  {typeof item.count === 'number' && (
                    <span
                      style={{
                        fontSize: '11px',
                        color: isDark ? '#8b949e' : '#6b7280',
                        padding: '4px 8px',
                        borderRadius: '999px',
                        background: isDark ? '#0d1117' : '#f3f4f6',
                        flexShrink: 0,
                      }}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
