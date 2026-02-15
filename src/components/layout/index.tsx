import React, { useEffect } from 'react';
import { useModelStore } from '../../store/useModelStore';
import { Navbar } from './Navbar';
import { LeftSidebar } from './Sidebar';
import { RightPanel } from './RightPanel';
import Canvas from '../Canvas';
import { StarRepoDialog } from '../ui/StarRepoDialog';
import { ExampleDialog } from '../ui/ExampleDialog';
import { AIDialog } from '../ui/AIDialog';
import { AISettingsDialog } from '../ui/AISettingsDialog';
import { AddTableDialog } from '../ui/AddTableDialog';

export const AppLayout: React.FC = () => {
  const colorMode = useModelStore(state => state.colorMode);
  const leftSidebarCollapsed = useModelStore(state => state.leftSidebarCollapsed);
  const setLeftSidebarCollapsed = useModelStore(state => state.setLeftSidebarCollapsed);
  const entities = useModelStore(state => state.entities);
  const tables = useModelStore(state => state.tables);
  const loadModelFromJSON = useModelStore(state => state.loadModelFromJSON);
  const loadDiagramFromCloud = useModelStore(state => state.loadDiagramFromCloud);
  
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

  // Load diagram from URL or default example
  useEffect(() => {
    const loadInitialData = async () => {
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
      
      // Load default example only if nothing is loaded and no URL diagram
      if (entities.length === 0 && tables.length === 0) {
        fetch('/examples/library.json')
          .then(res => res.json())
          .then(data => loadModelFromJSON(data))
          .catch(err => console.error('Failed to load default example:', err));
      }
    };
    
    loadInitialData();
  }, []); // Only run once on mount

  // Force sidebar state based on screen size on mount
  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    // On mobile, always collapse; on desktop, always expand
    setLeftSidebarCollapsed(isMobile);
  }, []); // Only run once on mount

  // Handle resize events to toggle sidebar
  useEffect(() => {
    let wasMobile = window.innerWidth <= 768;
    
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      
      // Only update if crossing the mobile/desktop boundary
      if (wasMobile !== isMobile) {
        setLeftSidebarCollapsed(isMobile);
        wasMobile = isMobile;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setLeftSidebarCollapsed]);

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
      }}>
        {/* Left Sidebar - Model Tree */}
        {!leftSidebarCollapsed && <LeftSidebar />}
        
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
