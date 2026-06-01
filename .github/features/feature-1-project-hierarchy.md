# Feature 1: Introduce Project Hierarchy and Project-Based Storage

## Objective
Refactor the application structure so that **Projects** become the top-level container. A project can contain one or more **Data Models**, and each Data Model contains its existing Conceptual and Physical views and related objects.

## Functional Requirements

### Data Structure Changes
- Create a new top-level entity called **Project**.
- A Project can contain multiple **Data Models**.
- A Data Model retains its existing structure:
  - Conceptual View
  - Physical View
  - Associated entities, relationships, and other model objects

### Navigation / Left Sidebar
- Replace the current top-level Data Model navigation with a Project-based hierarchy.
- The left sidebar should display Projects as collapsible tree nodes.
- Expanding a Project should reveal its child Data Models.
- Expanding a Data Model should reveal its Conceptual View, Physical View, and any existing child objects.
- Users should be able to:
  - Create Projects
  - Rename Projects
  - Delete Projects
  - Create Data Models within a Project
  - Move between Projects and Data Models

### Storage Behavior
- If the user is **not authenticated**:
  - Projects and all child data should be stored in browser Local Storage.
  - Existing local persistence behavior should continue to work.

- If the user **is authenticated**:
  - Projects and all child data should be stored in the server-side database.
  - The database becomes the authoritative source of truth.
  - Changes should be persisted through API calls.
  - Local Storage should not be treated as the primary data source.

### Migration Requirements
- Existing standalone Data Models should be automatically migrated into a default Project during upgrade.
- No existing user data should be lost during migration.

### Suggested Entity Structure

```typescript
interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  dataModels: DataModel[];
}

interface DataModel {
  id: string;
  name: string;
  conceptualView: ConceptualView;
  physicalView: PhysicalView;
}
```
