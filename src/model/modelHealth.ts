import type { Entity, ForeignKey, PhysicalTable, Relationship } from './schemas';

export type ModelHealthSeverity = 'error' | 'warning';

export interface ModelHealthIssue {
  id: string;
  severity: ModelHealthSeverity;
  title: string;
  description: string;
  targetId?: string;
  targetViewMode?: 'data-model' | 'conceptual' | 'physical';
}

const normalizeKey = (value?: string) => (value || 'unassigned').trim().toLowerCase();

const formatNamespace = (table: PhysicalTable) => {
  const database = table.database?.trim() || 'unassigned';
  const schema = table.schema?.trim() || 'unassigned';
  return `${database}.${schema}`;
};

export const getModelHealthIssues = ({
  entities,
  relationships,
  tables,
  foreignKeys,
}: {
  entities: Entity[];
  relationships: Relationship[];
  tables: PhysicalTable[];
  foreignKeys: ForeignKey[];
}): ModelHealthIssue[] => {
  const issues: ModelHealthIssue[] = [];
  const tableMap = new Map(tables.map((table) => [table.id, table]));
  const tableCountByEntityId = new Map<string, number>();

  tables.forEach((table) => {
    if (table.entityId) {
      tableCountByEntityId.set(table.entityId, (tableCountByEntityId.get(table.entityId) || 0) + 1);
    }

    if (!table.attributes.some((attribute) => attribute.isPrimaryKey)) {
      issues.push({
        id: `table-no-pk-${table.id}`,
        severity: 'warning',
        title: `Table "${table.name}" has no primary key`,
        description: `Add a primary key column to ${table.name} in ${formatNamespace(table)}.`,
        targetId: table.id,
        targetViewMode: 'physical',
      });
    }
  });

  const duplicateTables = new Map<string, PhysicalTable[]>();
  tables.forEach((table) => {
    const key = [normalizeKey(table.database), normalizeKey(table.schema), normalizeKey(table.name)].join('::');
    const existing = duplicateTables.get(key) || [];
    existing.push(table);
    duplicateTables.set(key, existing);
  });

  duplicateTables.forEach((group) => {
    if (group.length < 2) return;

    const [firstTable] = group;
    const namespace = formatNamespace(firstTable);
    issues.push({
      id: `duplicate-table-${group.map((table) => table.id).join('-')}`,
      severity: 'error',
      title: `Duplicate table name "${firstTable.name}"`,
      description: `${group.length} tables share the name "${firstTable.name}" in ${namespace}.`,
      targetId: firstTable.id,
      targetViewMode: 'physical',
    });
  });

  foreignKeys.forEach((foreignKey) => {
    const sourceTable = tableMap.get(foreignKey.fromTableId);
    const targetTable = tableMap.get(foreignKey.toTableId);

    if (!sourceTable || !targetTable) {
      issues.push({
        id: `foreign-key-missing-table-${foreignKey.id}`,
        severity: 'error',
        title: 'Foreign key points to a missing table',
        description: 'Reconnect or remove this foreign key because one of its tables no longer exists.',
        targetId: foreignKey.id,
        targetViewMode: 'physical',
      });
      return;
    }

    const sourceColumn = sourceTable.attributes.find((attribute) => attribute.id === foreignKey.fromAttributeId);
    const targetColumn = targetTable.attributes.find((attribute) => attribute.id === foreignKey.toAttributeId);

    if (sourceColumn && targetColumn) return;

    const missingParts = [
      !sourceColumn ? `${sourceTable.name}.${foreignKey.fromAttributeId}` : null,
      !targetColumn ? `${targetTable.name}.${foreignKey.toAttributeId}` : null,
    ].filter(Boolean);

    issues.push({
      id: `foreign-key-missing-column-${foreignKey.id}`,
      severity: 'error',
      title: 'Foreign key points to a missing column',
      description: `Missing column reference${missingParts.length > 1 ? 's' : ''}: ${missingParts.join(', ')}.`,
      targetId: foreignKey.id,
      targetViewMode: 'physical',
    });
  });

  relationships.forEach((relationship) => {
    if (relationship.label.trim()) return;

    issues.push({
      id: `relationship-unnamed-${relationship.id}`,
      severity: 'warning',
      title: 'Relationship is unnamed',
      description: 'Add a label so the relationship meaning is clear in the conceptual model.',
      targetId: relationship.id,
      targetViewMode: relationship.relationshipType === 'dataModel' ? 'data-model' : 'conceptual',
    });
  });

  entities.forEach((entity) => {
    if ((tableCountByEntityId.get(entity.id) || 0) > 0) return;

    issues.push({
      id: `entity-no-table-${entity.id}`,
      severity: 'warning',
      title: `Entity "${entity.name}" has no linked table`,
      description: `Create or link a physical table for ${entity.name}.`,
      targetId: entity.id,
      targetViewMode: 'conceptual',
    });
  });

  return issues.sort((left, right) => {
    if (left.severity !== right.severity) {
      return left.severity === 'error' ? -1 : 1;
    }

    return left.title.localeCompare(right.title);
  });
};
