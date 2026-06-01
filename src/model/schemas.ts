import { z } from 'zod';

export const CardinalitySchema = z.enum(['1', '0..1', '1..*', '0..*']);
export type Cardinality = z.infer<typeof CardinalitySchema>;

// Color options for entities and tables (can also be hex color)
export const ColorSchema = z.string().optional();
export type Color = z.infer<typeof ColorSchema>;

// Project - top-level grouping above data models
export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Project = z.infer<typeof ProjectSchema>;

// Data Model - grouping above conceptual entities
export const DataModelSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  name: z.string(),
  description: z.string().optional(),
  color: ColorSchema,
});
export type DataModel = z.infer<typeof DataModelSchema>;

// Column/attribute definition for physical tables
export const AttributeSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  dataType: z.string(), // e.g. 'int', 'varchar', 'boolean'
  description: z.string().optional(),
  isPrimaryKey: z.boolean().default(false),
  isNullable: z.boolean().default(false),
  isForeignKey: z.boolean().default(false),
  referencesTableId: z.string().uuid().optional(), // FK reference
  referencesAttributeId: z.string().uuid().optional(), // FK reference column
});
export type Attribute = z.infer<typeof AttributeSchema>;

// Conceptual Entity - high-level business concept
export const EntitySchema = z.object({
  id: z.string().uuid(),
  dataModelId: z.string().uuid().optional(),
  name: z.string(),
  description: z.string().optional(),
  color: ColorSchema,
});
export type Entity = z.infer<typeof EntitySchema>;

// Entity Group - grouping of entities in conceptual view
export const EntityGroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  entityIds: z.array(z.string().uuid()).default([]),
  // Style options
  borderStyle: z.enum(['dashed', 'solid', 'dotted']).default('dashed'),
  borderColor: z.string().optional(), // hex color
  backgroundColor: z.string().optional(), // hex color
  borderWidth: z.number().default(2),
});
export type EntityGroup = z.infer<typeof EntityGroupSchema>;

// Table Group - grouping of tables in physical view
export const TableGroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  tableIds: z.array(z.string().uuid()).default([]),
  // Style options
  borderStyle: z.enum(['dashed', 'solid', 'dotted']).default('dashed'),
  borderColor: z.string().optional(), // hex color
  backgroundColor: z.string().optional(), // hex color
  borderWidth: z.number().default(2),
});
export type TableGroup = z.infer<typeof TableGroupSchema>;

// Physical Table - optionally linked to a conceptual entity
export const PhysicalTableSchema = z.object({
  id: z.string().uuid(),
  entityId: z.string().uuid().optional(), // Optional parent conceptual entity
  name: z.string(), // Table name (can differ from entity name)
  database: z.string().optional(), // Optional database name
  schema: z.string().optional(), // Optional schema name
  attributes: z.array(AttributeSchema).default([]),
  color: ColorSchema,
});
export type PhysicalTable = z.infer<typeof PhysicalTableSchema>;

// Conceptual Relationship - entity-to-entity
export const RelationshipSchema = z.object({
  id: z.string().uuid(),
  relationshipType: z.enum(['entity', 'dataModel']).optional(),
  fromEntityId: z.string().uuid().optional(),
  toEntityId: z.string().uuid().optional(),
  fromDataModelId: z.string().uuid().optional(),
  toDataModelId: z.string().uuid().optional(),
  label: z.string(),
  fromCardinality: CardinalitySchema,
  toCardinality: CardinalitySchema,
  // For conceptual view - which side of box to connect
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});
export type Relationship = z.infer<typeof RelationshipSchema>;

// Foreign Key - physical table-to-table link
export const ForeignKeySchema = z.object({
  id: z.string().uuid(),
  fromTableId: z.string().uuid(), // Table containing the FK column
  toTableId: z.string().uuid(), // Table being referenced (usually has PK)
  fromAttributeId: z.string().uuid(), // FK column
  toAttributeId: z.string().uuid(), // PK column being referenced
  fromCardinality: CardinalitySchema,
  toCardinality: CardinalitySchema,
  // Optional: link to parent conceptual relationship
  relationshipId: z.string().uuid().optional(),
  // Edge routing options
  edgeType: z.enum(['curved', 'smoothstep', 'straight', 'step']).optional(),
});
export type ForeignKey = z.infer<typeof ForeignKeySchema>;

export const ConceptualSchema = z.object({
  dataModels: z.array(DataModelSchema).optional().default([]),
  entities: z.array(EntitySchema),
  relationships: z.array(RelationshipSchema),
  groups: z.array(EntityGroupSchema).optional().default([]),
});
export type ConceptualData = z.infer<typeof ConceptualSchema>;

export const PhysicalSchema = z.object({
  tables: z.array(PhysicalTableSchema),
  foreignKeys: z.array(ForeignKeySchema),
  tableGroups: z.array(TableGroupSchema).optional().default([]),
});
export type PhysicalData = z.infer<typeof PhysicalSchema>;

export const NodeLayoutSchema = z.object({
  entityId: z.string().uuid().optional(), // For conceptual view
  tableId: z.string().uuid().optional(),  // For physical view
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
});
export type NodeLayout = z.infer<typeof NodeLayoutSchema>;

export const EdgeLayoutSchema = z.object({
  relationshipId: z.string().uuid().optional(), // For conceptual view
  foreignKeyId: z.string().uuid().optional(),   // For physical view
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});
export type EdgeLayout = z.infer<typeof EdgeLayoutSchema>;

export const ViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
});
export type Viewport = z.infer<typeof ViewportSchema>;

export const LayoutSchema = z.object({
  nodes: z.array(NodeLayoutSchema),
  edges: z.array(EdgeLayoutSchema).optional(), // React Flow edges might have layout state
  viewport: ViewportSchema,
});
export type LayoutData = z.infer<typeof LayoutSchema>;
