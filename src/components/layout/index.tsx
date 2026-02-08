import React, { useEffect } from 'react';
import { useModelStore } from '../../store/useModelStore';
import { Navbar } from './Navbar';
import { LeftSidebar } from './Sidebar';
import { RightPanel } from './RightPanel';
import Canvas from '../Canvas';

export const AppLayout: React.FC = () => {
  const colorMode = useModelStore(state => state.colorMode);
  const leftSidebarCollapsed = useModelStore(state => state.leftSidebarCollapsed);
  const toggleLeftSidebar = useModelStore(state => state.toggleLeftSidebar);
  const entities = useModelStore(state => state.entities);
  const tables = useModelStore(state => state.tables);
  const loadModelFromJSON = useModelStore(state => state.loadModelFromJSON);
  const isDark = colorMode === 'dark';

  // Load library example on first load if nothing is loaded
  useEffect(() => {
    if (entities.length === 0 && tables.length === 0) {
      fetch('/examples/library.json')
        .then(res => res.json())
        .then(data => loadModelFromJSON(data))
        .catch(err => console.error('Failed to load default example:', err));
    }
  }, []); // Only run once on mount

  // Force sidebar state based on screen size on mount
  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    // On mobile, always collapse the sidebar on initial load
    if (isMobile && !leftSidebarCollapsed) {
      toggleLeftSidebar();
    }
    // On desktop, always expand the sidebar on initial load
    else if (!isMobile && leftSidebarCollapsed) {
      toggleLeftSidebar();
    }
  }, []); // Only run once on mount

  // Handle resize events to toggle sidebar
  useEffect(() => {
    let wasMobile = window.innerWidth <= 768;
    
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      
      // Only toggle if crossing the mobile/desktop boundary
      if (wasMobile !== isMobile) {
        toggleLeftSidebar();
        wasMobile = isMobile;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [toggleLeftSidebar]);

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
    </div>
  );
};

export { Navbar } from './Navbar';
export { LeftSidebar } from './Sidebar';
export { RightPanel } from './RightPanel';
