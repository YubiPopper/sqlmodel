# Feature 2: Shared Projects and Real-Time Collaboration

## Objective
Allow authenticated users to share Projects with other users and collaborate on them in real time.

## Functional Requirements

### Authentication Requirement
- Sharing functionality must only be available to authenticated users.
- Anonymous/local projects cannot be shared.

### Shared Project Model
- Add a project-level property indicating whether a project is shared.

Example:

```typescript
interface Project {
  id: string;
  name: string;
  isShared: boolean;
  ownerId: string;
  collaborators: string[];
}
```

### Project Sharing
- Project owners can invite other registered users to collaborate.
- Collaborators receive access to the entire Project and all contained Data Models.
- Permissions should initially support:
  - Owner
  - Collaborator

### Real-Time Collaboration
- Shared Projects must support real-time updates.
- The server/database is the single source of truth.
- Changes made by one user should automatically propagate to all connected collaborators.
- Real-time synchronization should include:
  - Project changes
  - Data Model changes
  - Conceptual View changes
  - Physical View changes
  - Entity and relationship updates

### Recommended Technical Approach
- Use WebSockets or Socket.IO for real-time synchronization.
- Maintain project state on the server.
- Broadcast updates to all connected users with access to the Project.
- Implement optimistic UI updates where appropriate.

### Sidebar Indicators
- Shared Projects should be visually distinguishable in the left sidebar.
- Add a shared indicator/icon next to shared Projects.
- The indicator should only appear when:
  - `project.isShared === true`

### Persistence Rules
- Shared Projects must always be stored in the server-side database.
- Shared Projects must never be stored solely in Local Storage.
- Authentication is required before a Project can be converted into a shared Project.

### User Experience
- User creates a Project.
- User signs in.
- User selects “Share Project”.
- User invites collaborators.
- Project receives a shared status indicator in the sidebar.
- Multiple users can edit the Project simultaneously and see updates in real time.

## Acceptance Criteria

- Users can create and manage Projects containing multiple Data Models.
- Sidebar displays Projects as collapsible containers.
- Anonymous users use Local Storage persistence.
- Authenticated users use server/database persistence.
- Authenticated users can share Projects.
- Shared Projects display a visual shared indicator.
- Multiple users can edit shared Projects simultaneously.
- Changes synchronize across all connected users in real time.
- Server-side data remains the authoritative source of truth for shared Projects.
