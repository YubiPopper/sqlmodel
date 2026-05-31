<p align="center">
  <img src="public/assets/sqlmodelblack.svg" alt="SQLModel Logo" width="120" />
</p>

<h1 align="center">SQLModel Enhanced</h1>

<p align="center">
  <strong>Visual data modeling for modern teams</strong>
</p>

<p align="center">
  Design data models, conceptual ERDs, and physical schemas with an intuitive canvas-based interface.<br/>
  Open source. Local-first by default. Optional cloud save and sharing when you want it.
</p>

<p align="center">
  <a href="https://sql.calvreid.co.uk"><strong>🚀 Try it now at sql.calvreid.co.uk →</strong></a>
</p>

> **👋 A Note from the Creator**
> 
> Hi, I'm Calv, a backend developer who specializes in integrations. Web development and Node.js aren't my strong suit, so SQLModel Enhanced is a side project I'm building with the help of GitHub Copilot AI. I'm learning as I go, and I'm excited to share this tool with the community!

---

## ✨ What is SQLModel Enhanced?

**SQLModel Enhanced** is an advanced fork of the open-source SQLModel data modeling tool, extended with real-time team collaboration, multi-database import support, and architectural enhancements for enterprise use.

Build and visualize complex database schemas with an intuitive canvas-based interface. Choose between three modeling approaches:
- **Data Model View** — Organize entities and relationships at the conceptual level
- **Conceptual ERD** — Design high-level entity relationships with descriptions
- **Physical Schema** — Define tables, columns, data types, keys, and constraints

SQLModel Enhanced enables teams to collaborate in real-time, import schemas from PostgreSQL, MySQL, Oracle, Snowflake, Prisma, and Rails, and automatically layout complex diagrams. Whether architecting new databases, documenting existing ones, or collaborating with your team, SQLModel Enhanced provides a unified workspace for all your data modeling needs.

**Try it now**: [sql.calvreid.co.uk](https://sql.calvreid.co.uk)

**Original Project**: Built on the foundation of [SQLModel](https://sqlmodel.org) with enhanced features for collaborative team environments.

---

## 🚀 Enhanced Features

This fork extends the original SQLModel with powerful collaboration and import capabilities:

| Feature | Capability |
|---------|-----------|
| **Real-time Collaboration** | Multiple users can edit the same model simultaneously with WebSocket-based synchronization. Room-based persistence allows users to disconnect and rejoin without losing work. |
| **Advanced Import Formats** | Import database schemas from PostgreSQL, MySQL, Oracle, Snowflake, Rails, and Prisma—with automatic table, column, and relationship detection. |
| **Auto-layout Engine** | Automatically arrange complex ER diagrams with intelligent spacing using the dagre algorithm. One-click layout organization accessible from the floating control panel. |
| **Model Grouping** | Organize entities and tables into logical groups for better visualization of large, complex models. |
| **Multi-model Support** | Manage multiple databases and schemas within a single workspace with hierarchical sidebar navigation. |
| **Database Inspector** | Inspect and validate model integrity directly from the canvas with detailed data model analysis. |
| **Entity/Attribute-Level FK Relationships** | Create precise foreign key connections between specific columns, with rendering optimizations for large schemas. |
| **Server-backed Persistence** | Optional app server with collaboration room APIs for enterprise team deployments. |

---

## 🚀 Getting Started

### Quick Start (Hosted)

Visit **[sql.calvreid.co.uk](https://sql.calvreid.co.uk)** to start modeling immediately — no installation required.

### Run Locally

```bash
# Clone the repository
git clone https://github.com/yourusername/sqlmodel.git
cd sqlmodel

# Install dependencies
npm install

# Configure AI (optional)
cp .env.example .env
# Edit .env and add your OpenAI API key

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### AI Configuration (Optional)

SQLModel Enhanced includes AI-powered model generation with a default OpenAI-compatible setup.

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Get an API key from your chosen provider. SQLModel Enhanced supports OpenAI, Anthropic, and compatible custom endpoints.

3. Add your key to `.env`:
   ```env
   VITE_OPENAI_API_KEY=sk-your-key-here
   ```

**Note**: The AI key, provider, and model can be configured at runtime via the AI Settings dialog in the app. Environment variables are just a convenience default.

### Real-time Collaboration (Optional Server)

For team collaboration with persistent room storage:

```bash
# Start the collaboration server
npm run start
```

The server provides:
- **WebSocket endpoint** at `/collaboration` for real-time synchronization
- **Room persistence** — teams can disconnect and rejoin without losing changes
- **Configurable room retention** via environment variables:
  - `COLLAB_ROOM_ARCHIVE_MS` (default 7 days) — archive inactive rooms
  - `COLLAB_ROOM_TTL_MS` (default 30 days) — total room lifetime
  - `COLLAB_ROOM_CLEANUP_MS` (default 10 minutes) — cleanup interval

**Note**: Without the server, collaboration still works client-side with local browser persistence.

### Build for Production

```bash
npm run build
npm run preview
```

---

## 📖 How to Use

### 1. Create Entities (Conceptual View)

- Start in **Data Model** or **Conceptual** view, depending on how early you are in the design
- Click **+ Entity** or right-click the canvas to add entities
- Double-click an entity to edit its name and description
- Drag from entity edges to create relationships
- Use the arrow buttons on entity sides to quickly create linked entities

### 2. Organize Your Model

- Group related entities and tables with model groups for better visualization
- Use the **Auto-layout** feature (floating control panel at canvas bottom) to automatically arrange complex diagrams
- Use the sidebar hierarchy to navigate databases, schemas, and model sections
- Select a data model, entity, group, table, or relationship in the right panel to edit its properties

### 3. Define Relationships

- Connect entities by dragging from one to another
- Set cardinality (1, 0..1, 1..*, 0..*) in the right panel
- Double-click relationship lines to add labels

### 4. Generate Physical Tables

- Switch to **Physical View** using the toggle in the navbar
- Use **AI → Generate Tables** to auto-create tables from your conceptual model
- Or manually add tables with columns, primary keys, and data types

### 5. Import Existing Schemas

Import database schemas from various sources:
- **From URL**: Paste any GitHub/GitLab schema URL (Rails schema.rb, SQL files, Prisma, etc.)
  - GitHub blob URLs are automatically converted to raw URLs
  - Example: `github.com/user/repo/blob/main/db/schema.rb` works directly
- **From File**: Upload local SQL, Rails, Prisma, and other supported schema files
- **Advanced Format Support**: 
  - **PostgreSQL** — Full DDL with constraints and sequences
  - **MySQL** — Complete table definitions with keys and indices
  - **Oracle** — Schema with table and relationship extraction
  - **Snowflake** — Cloud warehouse schema import
  - **Prisma** — Schema.prisma file parsing and conversion
  - **Rails** — db/schema.rb with migration interpretation
- **Shareable Import Links**: Use `?url=` query params to share auto-importing diagrams

### 6. Create Foreign Keys

- In Physical View, drag from a column to another table's column
- Configure cardinality and relationship type in the inspector

### 7. Save and Export Your Work

- **Save JSON**: Export your complete model for backup or sharing
- **Cloud Diagrams**: Save and reopen diagrams from the cloud when signed in
- **Export SQL**: Generate CREATE TABLE statements
- **Export Image**: Save your diagram as PNG

### 8. AI-Powered Modeling

Click the **AI** button (✨) to:
- **Generate New Model**: Describe your system and AI creates entities, relationships, and tables
- **Enhance Model**: Add features to an existing model
- **Use Images**: Paste or upload a screenshot or diagram and let AI extract the structure
- **Smart Detection**: AI recognizes if you need OLTP (normalized) or Analytics (star schema) patterns

---

## 🛠️ Tech Stack

- **React 18** + **TypeScript** — Type-safe UI components
- **React Flow** — Canvas rendering, pan/zoom, node connections
- **Zustand** — Lightweight state management with persistence
- **Vite** — Fast development and optimized builds
- **Zod** — Runtime schema validation

---

## 📁 Project Structure

```
src/
├── collaboration/          # Real-time collaboration (WebSocket, Yjs)
│   ├── api.ts              # Collaboration API client
│   ├── sync.ts             # Document synchronization
│   ├── types.ts            # Collaboration types
│   └── useCollaboration.ts # Collaboration hook
├── components/
│   ├── Canvas.tsx          # Main diagram canvas
│   ├── nodes/              # Entity, Table, Group node components
│   ├── edges/              # Custom edge types (AnimatedEdge)
│   ├── layout/             # Navbar, Sidebar, Right Panel, Command Palette
│   └── ui/                 # Dialogs, menus, shared components
├── model/
│   ├── schemas.ts          # Zod schemas for all data types
│   └── modelHealth.ts      # Model validation and integrity checks
├── services/
│   ├── aiService.ts        # AI integration for model generation
│   └── parsers/            # Database schema parsers
│       ├── mysqlParser.ts
│       ├── postgresParser.ts
│       ├── oracleParser.ts
│       ├── snowflakeDDLParser.ts
│       ├── prismaParser.ts
│       └── railsParser.ts
├── store/
│   └── useModelStore.ts    # Zustand state management with persistence
└── hooks/
    ├── useUrlImport.ts     # URL-based schema import
    └── schemaUrlState.ts   # URL state management

app-server.mjs             # Node.js server for collaboration and APIs
signaling-server/          # WebRTC signaling server for P2P collaboration
└── server.js
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

```bash
# Run linting
npm run lint

# Type check
npx tsc --noEmit
```

---

## 📄 License

SQLModel is licensed under the Apache License Version 2.0.

---

## 🙏 Attribution

This is an enhanced fork of the SQLModel project. The original SQLModel was created to provide a modern, open-source data modeling experience for development teams worldwide.

**Original Project**: [sqlmodel.org](https://sqlmodel.org)

**This Fork Adds**: Real-time collaboration, multi-format database import (PostgreSQL, MySQL, Oracle, Snowflake, Prisma, Rails), auto-layout engine, model grouping, and enterprise server-backed persistence.

If you're interested in the original project or want to learn more about its architecture and development, please visit the main SQLModel repository.

---

<p align="center">
  <sub>Built with ❤️ for data architects, developers, and anyone who thinks in tables.</sub><br/>
  <sub><a href="https://sqlmodel.org">sqlmodel.org</a></sub>
</p>
