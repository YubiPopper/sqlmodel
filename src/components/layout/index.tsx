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
import { CommandPalette } from './CommandPalette';
import { useCollaboration } from '../../collaboration/useCollaboration';
import { CollaborationContext } from '../../collaboration/CollaborationContext';

export const AppLayout: React.FC = () => {
  const colorMode = useModelStore(state => state.colorMode);
  const leftSidebarCollapsed = useModelStore(state => state.leftSidebarCollapsed);
  const toggleLeftSidebar = useModelStore(state => state.toggleLeftSidebar);
  const entities = useModelStore(state => state.entities);
  const tables = useModelStore(state => state.tables);
  const loadModelFromJSON = useModelStore(state => state.loadModelFromJSON);
  
  // Dialog states from store
  const showExampleDialog = useModelStore(state => state.showExampleDialog);
  const setShowExampleDialog = useModelStore(state => state.setShowExampleDialog);
  const showAIDialog = useModelStore(state => state.showAIDialog);
  const setShowAIDialog = useModelStore(state => state.setShowAIDialog);
  const showAISettingsDialog = useModelStore(state => state.showAISettingsDialog);
  const setShowAISettingsDialog = useModelStore(state => state.setShowAISettingsDialog);
  const showAddTableDialog = useModelStore(state => state.showAddTableDialog);
  const setShowAddTableDialog = useModelStore(state => state.setShowAddTableDialog);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandPaletteSession, setCommandPaletteSession] = useState(0);
  
  const isDark = colorMode === 'dark';

  // Collaboration — initialized once at layout level, shared via context
  const collaboration = useCollaboration();

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
    const loadInitialData = () => {
      // Check for URL import
      if (hasUrlImportParam || urlImport.status === 'loading' || urlImport.status === 'success') return;

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
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPaletteSession(session => session + 1);
        setShowCommandPalette(true);
      } else if (event.key === 'Escape') {
        setShowCommandPalette(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sidebar is hidden by default (leftSidebarCollapsed: true in store)
  // User toggles it manually via the navbar sidebar icon

  return (
    <CollaborationContext.Provider value={collaboration}>
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
        {!leftSidebarCollapsed && (
          <LeftSidebar
            onOpenCommandPalette={() => {
              setCommandPaletteSession(session => session + 1);
              setShowCommandPalette(true);
            }}
          />
        )}
        
        {/* Sidebar toggle - always visible outside the sidebar */}
        <Tooltip content={leftSidebarCollapsed ? 'Open sidebar' : 'Close sidebar'} placement="right">
          <button
            onClick={toggleLeftSidebar}
            style={{
              position: 'absolute',
              top: '12px',
              left: leftSidebarCollapsed ? '12px' : '260px',
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
      <CommandPalette
        key={commandPaletteSession}
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />
    </div>
    </CollaborationContext.Provider>
  );
};

export { Navbar } from './Navbar';
export { LeftSidebar } from './Sidebar';
export { RightPanel } from './RightPanel';
