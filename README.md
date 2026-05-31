<p align="center">
  <img src="public/assets/sqlmodelblack.svg" alt="SQLModel Logo" width="120" />
</p>

<h1 align="center">SQLModel</h1>

<p align="center">
  <strong>Visual data modeling for modern teams</strong>
</p>

<p align="center">
  Design data models, conceptual ERDs, and physical schemas with an intuitive canvas-based interface.<br/>
  Open source. Local-first by default. Optional cloud save and sharing when you want it.
</p>

<p align="center">
  <img src="public/assets/sqlmodel.png" alt="SQLModel Screenshot" width="800" />
</p>

<p align="center">
  <a href="https://sqlmodel.org"><strong>🚀 Try it now at sqlmodel.org →</strong></a>
</p>

---

## ✨ What is SQLModel?

SQLModel is a **free, open-source data modeling tool** that helps you design data structures visually. Whether you're architecting a new application, documenting an existing database, or collaborating with your team on data design, SQLModel gives you a single workspace for data models, conceptual relationships, and physical database schemas. Try it at [sqlmodel.org](https://sqlmodel.org).

### Why SQLModel?

| Feature | Benefit |
|---------|---------|
| **Three Modeling Views** | Move between data model, conceptual ERD, and physical schema views as your design evolves |
| **AI-Powered Generation** | Describe your system in plain English or provide an image, then let AI generate or enhance complete models |
| **Privacy-First** | Works locally in your browser by default. Optional cloud save and diagram sharing for authenticated workflows. |
| **Flexible AI Providers** | Use OpenAI, Anthropic, or a custom compatible endpoint from the AI settings dialog |
| **Export Ready** | Generate SQL DDL scripts for PostgreSQL, MySQL, and more. Export diagrams as images. |
| **Modern UX** | Built with React Flow for smooth pan, zoom, and drag interactions. Dark/light mode. Keyboard shortcuts. |

---

## 🚀 Getting Started

### Quick Start (Hosted)

Visit **[sqlmodel.org](https://sqlmodel.org)** to start modeling immediately — no installation required.

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

SQLModel includes AI-powered model generation with a default OpenAI-compatible setup.

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Get an API key from your chosen provider. SQLModel supports OpenAI, Anthropic, and compatible custom endpoints.

3. Add your key to `.env`:
   ```env
   VITE_OPENAI_API_KEY=sk-your-key-here
   ```

**Note**: The AI key, provider, and model can be configured at runtime via the AI Settings dialog in the app. Environment variables are just a convenience default.

### Build for Production

```bash
npm run build
npm run preview
```

### Server-backed Collaboration

The app server (`npm run start`) now includes collaboration room APIs and a websocket endpoint at `/collaboration`.
Room documents are persisted on the server so users can disconnect and rejoin without losing shared state.
Room retention is controlled with optional env vars:

- `COLLAB_ROOM_ARCHIVE_MS` (default 7 days)
- `COLLAB_ROOM_TTL_MS` (default 30 days)
- `COLLAB_ROOM_CLEANUP_MS` (default 10 minutes)

---

## 📖 How to Use

### 1. Create Entities (Conceptual View)

- Start in **Data Model** or **Conceptual** view, depending on how early you are in the design
- Click **+ Entity** or right-click the canvas to add entities
- Double-click an entity to edit its name and description
- Drag from entity edges to create relationships
- Use the arrow buttons on entity sides to quickly create linked entities

### 2. Organize Your Model

- Group related entities and tables with model groups
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
├── components/
│   ├── Canvas.tsx          # Main diagram canvas
│   ├── nodes/              # Entity, Table, Group node components
│   ├── layout/             # Navbar, Sidebar, Right Panel
│   └── ui/                 # Dialogs, menus, shared components
├── model/
│   └── schemas.ts          # Zod schemas for all data types
├── services/
│   └── aiService.ts        # AI integration for model generation
└── store/
    └── useModelStore.ts    # Zustand state management
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

<p align="center">
  <sub>Built with ❤️ for data architects, developers, and anyone who thinks in tables.</sub><br/>
  <sub><a href="https://sqlmodel.org">sqlmodel.org</a></sub>
</p>
