# SQLModel - Data Modeling Tool

## Project Overview
React/TypeScript application for creating conceptual and physical database models with ERD visualization. Built with React Flow for canvas interaction, Zustand for state management, and Zod for schema validation.

## Architecture

### State Management (Zustand + Persistence)
- **Single source of truth**: [src/store/useModelStore.ts](../src/store/useModelStore.ts) manages entities, relationships, layouts, and viewport state
- **Auto-persisted** to localStorage via `zustand/middleware/persist` under key `sqlmodel-storage`
- **State structure**: Entities and relationships stored separately from layout (`nodeLayouts` Record by ID)
- Access state in components using selector pattern: `const entities = useModelStore(state => state.entities)`

### Domain Model ([src/model/schemas.ts](../src/model/schemas.ts))
- **Zod schemas** define all types: Entity, Relationship, Attribute, Cardinality, NodeLayout, etc.
- **Two view modes**: 
  - `conceptual` - high-level entities with description boxes
  - `physical` - table-style with columns, data types, PK/FK indicators
- **Cardinality markers**: `'1'`, `'0..1'`, `'1..*'`, `'0..*'` rendered as custom SVG markers in [src/components/MarkerDefs.tsx](../src/components/MarkerDefs.tsx)
- **Relationships** can link specific attributes via `sourceAttributeId`/`targetAttributeId` (used in physical view for FK connections)

### React Flow Integration
- **Canvas component** ([src/components/Canvas.tsx](../src/components/Canvas.tsx)) transforms store data into React Flow nodes/edges
- **Custom node type**: `EntityNode` ([src/components/nodes/EntityNode.tsx](../src/components/nodes/EntityNode.tsx)) renders differently per view mode
- **Physical view handles**: Each attribute row renders 4 connection handles (`source-{attrId}`, `target-{attrId}`, etc.) for precise column-to-column relationships
- **Auto-layout**: Uses `dagre` library in `useModelStore.autoLayout()` with LR (left-to-right) orientation
  - Accessible via floating control panel at bottom-center of canvas
  - Collapsible UI with chevron button (slides left when hidden)
  - Automatically positions nodes with proper spacing (nodesep: 80px, ranksep: 120px)
  - Calls `fitView()` after layout for optimal viewport
- **Node dimensions** calculated dynamically in auto-layout based on view mode and attribute count

## Key Patterns

### Component Organization
- **Panels**: `LeftPanel` (entity list), `RightPanel` (property editor for selected entity/relationship)
- **Toolbar**: Main actions (add entity, save/load JSON, toggle view mode, auto-layout)
- **Confirmation dialogs**: Reusable `ConfirmationDialog` component for destructive actions (delete entity/relationship)

### State Updates
- Store actions handle cascade deletes: deleting an entity removes connected relationships
- Position updates happen via `setNodePosition` on React Flow drag events
- Selection managed both in store (`selectedId`) and React Flow's `selected` prop (synced bidirectionally)

### Styling Approach
- **Inline styles** dominate for layout and component-specific styling
- **Global styles** in [src/index.css](../src/index.css) for button defaults and body setup
- **Conditional styling** via `clsx` for selected states
- **No CSS modules or styled-components** - keep consistent with inline approach

### Data Persistence
- **Save/Load**: Exports/imports JSON with `{ conceptual, layout }` structure
- **Persistence key**: `sqlmodel-storage` in localStorage (automatically handled by Zustand middleware)
- **Example data**: `loadExample()` action provides library-loan system demo

## Development Workflow

### Running the app
```bash
npm run dev      # Start Vite dev server (HMR enabled)
npm run build    # TypeScript compile + Vite production build
npm run preview  # Preview production build
npm run lint     # ESLint check
```

### Adding New Features
1. **New entity/relationship properties**: Update Zod schemas in `schemas.ts`, then add UI in `RightPanel`
2. **New visual elements**: Check if custom SVG markers needed in `MarkerDefs.tsx`
3. **View modes**: Handle both conceptual and physical rendering in `EntityNode` component
4. **Store actions**: Always consider cascade effects and maintain referential integrity

### Common Tasks
- **Attribute editing**: Currently only in RightPanel for selected entity - no inline editing on canvas
- **Handle positioning**: When adding attribute-level features, use naming convention `{type}-{attributeId}` for React Flow handles
- **Layout calculations**: Dagre graph uses node dimensions - update in `autoLayout()` if node rendering changes

## Dependencies of Note
- **reactflow v11**: Canvas/node rendering and connection handling
- **dagre**: Auto-layout algorithm for entity positioning
- **zustand v5**: Lightweight state management with persistence
- **zod v4**: Runtime schema validation and TypeScript type inference
- **lucide-react**: Icon library (Plus, Trash2, Lock icons)
- **html-to-image**: Used for canvas export (check Toolbar implementation)
- **uuid**: Entity/relationship ID generation

## TypeScript Configuration
- **Project references**: `tsconfig.json` splits app code (`tsconfig.app.json`) and build config (`tsconfig.node.json`)
- **Strict mode disabled**: No `strict: true` in current setup
- Use Zod's `z.infer<>` for deriving TypeScript types from schemas

## Testing & Validation
- **Validation warnings**: Duplicate entity names and relationships flagged in RightPanel (non-blocking)
- **No test framework** currently configured
- **Schema validation**: Zod schemas provide runtime validation when loading JSON files
