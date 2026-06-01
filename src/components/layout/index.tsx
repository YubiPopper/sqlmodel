import React, { useEffect, useState } from 'react';
import { PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { useModelStore } from '../../store/useModelStore';
import { Navbar } from './Navbar';
import { LeftSidebar } from './Sidebar';
import { RightPanel } from './RightPanel';
import Canvas from '../Canvas';
import { Tooltip } from '../shared/Tooltip';
import { StarRepoDialog } from '../ui/StarRepoDialog';
import { ExampleDialog } from '../ui/ExampleDialog';
import { AIDialog } from '../ui/AIDialog';
import { AISettingsDialog } from '../ui/AISettingsDialog';
import { AddTableDialog } from '../ui/AddTableDialog';
import { useUrlImport } from '../../hooks/useUrlImport';

export const AppLayout: React.FC = () => {
  const colorMode = useModelStore(state => state.colorMode);
  const leftSidebarCollapsed = useModelStore(state => state.leftSidebarCollapsed);
  const toggleLeftSidebar = useModelStore(state => state.toggleLeftSidebar);
  const entities = useModelStore(state => state.entities);
  const projects = useModelStore(state => state.projects);
  const currentProjectId = useModelStore(state => state.currentProjectId);
  const dataModels = useModelStore(state => state.dataModels);
  const relationships = useModelStore(state => state.relationships);
  const entityGroups = useModelStore(state => state.entityGroups);
  const foreignKeys = useModelStore(state => state.foreignKeys);
  const tableGroups = useModelStore(state => state.tableGroups);
  const nodeLayouts = useModelStore(state => state.nodeLayouts);
  const tableLayouts = useModelStore(state => state.tableLayouts);
  const databaseDescriptions = useModelStore(state => state.databaseDescriptions);
  const schemaDescriptions = useModelStore(state => state.schemaDescriptions);
  const viewMode = useModelStore(state => state.viewMode);
  const viewport = useModelStore(state => state.viewport);
  const user = useModelStore(state => state.user);
  const workspaceDiagramId = useModelStore(state => state.workspaceDiagramId);
  const tables = useModelStore(state => state.tables);
  const loadModelFromJSON = useModelStore(state => state.loadModelFromJSON);
  const loadDiagramFromCloud = useModelStore(state => state.loadDiagramFromCloud);
  const syncWorkspaceToCloud = useModelStore(state => state.syncWorkspaceToCloud);
  
  // Dialog states from store
  const showExampleDialog = useModelStore(state => state.showExampleDialog);
  const setShowExampleDialog = useModelStore(state => state.setShowExampleDialog);
  const showAIDialog = useModelStore(state => state.showAIDialog);
  const setShowAIDialog = useModelStore(state => state.setShowAIDialog);
  const showAISettingsDialog = useModelStore(state => state.showAISettingsDialog);
  const setShowAISettingsDialog = useModelStore(state => state.setShowAISettingsDialog);
  const showAddTableDialog = useModelStore(state => state.showAddTableDialog);
  const setShowAddTableDialog = useModelStore(state => state.setShowAddTableDialog);
  
  const isDark = colorMode === 'dark';

  // URL import: auto-import schema from ?url= or /p/ path on startup
  const urlImport = useUrlImport();

  // Auto-dismiss toast after a few seconds
  const [toastVisible, setToastVisible] = useState(false);
  useEffect(() => {
    // Only show toast when there's an actual message (skip session-guard cache hits)
    if (urlImport.status === 'loading' && urlImport.message) {
      setToastVisible(true);
    } else if ((urlImport.status === 'success' || urlImport.status === 'error') && urlImport.message) {
      setToastVisible(true);
      const timer = setTimeout(() => setToastVisible(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [urlImport.status, urlImport.message]);

  // Check if a URL import was requested (before the hook effect runs)
  const hasUrlImportParam = Boolean(
    new URLSearchParams(window.location.search).get('url') ||
    window.location.pathname.startsWith('/p/')
  );

  // Load diagram from URL or default example
  useEffect(() => {
    const loadInitialData = async () => {
      // Skip loading defaults if a URL import is pending, in progress, or completed
      if (hasUrlImportParam || urlImport.status === 'loading' || urlImport.status === 'success') return;

      // Check for diagram ID in URL
      const urlParams = new URLSearchParams(window.location.search);
      const diagramId = urlParams.get('diagram');
      
      if (diagramId) {
        try {
          await loadDiagramFromCloud(diagramId);
          return; // Don't load default example if URL diagram loads
        } catch (error) {
          console.error('Failed to load diagram from URL:', error);
        }
      }
      
      // Load default example only if nothing is loaded and no URL import
      if (entities.length === 0 && tables.length === 0) {
        fetch('/examples/library.json')
          .then(res => res.json())
          .then(data => loadModelFromJSON(data))
          .catch(err => console.error('Failed to load default example:', err));
      }
    };
    
    loadInitialData();
  }, [urlImport.status]); // Re-run when URL import status changes

  useEffect(() => {
    if (!user || !workspaceDiagramId) return;

    const timer = setTimeout(() => {
      void syncWorkspaceToCloud();
    }, 750);

    return () => clearTimeout(timer);
  }, [
    user,
    workspaceDiagramId,
    projects,
    currentProjectId,
    dataModels,
    entities,
    relationships,
    entityGroups,
    tables,
    foreignKeys,
    tableGroups,
    nodeLayouts,
    tableLayouts,
    databaseDescriptions,
    schemaDescriptions,
    viewMode,
    viewport,
    syncWorkspaceToCloud,
  ]);

  // Sidebar is hidden by default (leftSidebarCollapsed: true in store)
  // User toggles it manually via the navbar sidebar icon

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: isDark ? '#0d1117' : '#f5f5f5',
    }}>
      {/* Top Navbar */}
      <Navbar />
      
      {/* Main Content Area */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Left Sidebar - Model Tree */}
        {!leftSidebarCollapsed && <LeftSidebar />}
        
        {/* Sidebar toggle - always visible outside the sidebar */}
        <Tooltip content={leftSidebarCollapsed ? 'Open sidebar' : 'Close sidebar'} placement="right">
          <button
            onClick={toggleLeftSidebar}
            style={{
              position: 'absolute',
              top: '12px',
              left: leftSidebarCollapsed ? '12px' : '292px',
              zIndex: 10,
              padding: '7px',
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#8b949e' : '#6b7280',
              transition: 'left 0.15s ease, background 0.15s ease, color 0.15s ease',
              minHeight: 'unset',
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? 'rgba(110, 118, 129, 0.15)' : 'rgba(0, 0, 0, 0.06)';
              e.currentTarget.style.color = isDark ? '#e6edf3' : '#1f2937';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = isDark ? '#8b949e' : '#6b7280';
            }}
          >
            {leftSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </Tooltip>

        {/* Center - Canvas */}
        <main style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <Canvas />
        </main>
        
        {/* Right Panel - Properties Inspector */}
        <RightPanel />
      </div>
      
      {/* URL Import Toast */}
      {toastVisible && urlImport.status !== 'idle' && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10001,
          padding: '10px 20px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          animation: 'fadeInUp 0.3s ease-out',
          background: urlImport.status === 'loading'
            ? (isDark ? '#1c2333' : '#eff6ff')
            : urlImport.status === 'success'
              ? (isDark ? '#0d2818' : '#f0fdf4')
              : (isDark ? '#2d1418' : '#fef2f2'),
          color: urlImport.status === 'loading'
            ? (isDark ? '#58a6ff' : '#2563eb')
            : urlImport.status === 'success'
              ? (isDark ? '#3fb950' : '#16a34a')
              : (isDark ? '#f85149' : '#dc2626'),
          border: `1px solid ${
            urlImport.status === 'loading'
              ? (isDark ? '#1f3a5f' : '#bfdbfe')
              : urlImport.status === 'success'
                ? (isDark ? '#1a4731' : '#bbf7d0')
                : (isDark ? '#4a1d22' : '#fecaca')
          }`,
          whiteSpace: 'nowrap',
        }}>
          {urlImport.status === 'loading' && (
            <div style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          )}
          {urlImport.message}
        </div>
      )}

      {/* Star Repo Dialog */}
      <StarRepoDialog />
      
      {/* Global Dialogs */}
      <ExampleDialog 
        isOpen={showExampleDialog} 
        onClose={() => setShowExampleDialog(false)} 
      />
      <AIDialog
        isOpen={showAIDialog}
        onClose={() => setShowAIDialog(false)}
        onOpenSettings={() => {
          setShowAIDialog(false);
          setShowAISettingsDialog(true);
        }}
      />
      <AISettingsDialog
        isOpen={showAISettingsDialog}
        onClose={() => setShowAISettingsDialog(false)}
      />
      <AddTableDialog
        isOpen={showAddTableDialog}
        onClose={() => setShowAddTableDialog(false)}
        onOpenAISettings={() => {
          setShowAddTableDialog(false);
          setShowAISettingsDialog(true);
        }}
      />
    </div>
  );
};

export { Navbar } from './Navbar';
export { LeftSidebar } from './Sidebar';
export { RightPanel } from './RightPanel';
