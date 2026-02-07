import React from 'react';
import { useModelStore } from '../../../store/useModelStore';
import { NavbarBrand } from './NavbarBrand';
import { ViewModeToggle } from './ViewModeToggle';
import { NavbarActions } from './NavbarActions';
import { GlobalSettings } from './GlobalSettings';

export const Navbar: React.FC = () => {
  const colorMode = useModelStore(state => state.colorMode);
  const isDark = colorMode === 'dark';

  return (
    <header
      style={{
        height: '56px',
        minHeight: '56px',
        background: isDark 
          ? 'linear-gradient(180deg, #161b22 0%, #0d1117 100%)'
          : 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)',
        borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        gap: '8px',
        boxShadow: isDark 
          ? '0 1px 3px rgba(0, 0, 0, 0.3)' 
          : '0 1px 3px rgba(0, 0, 0, 0.05)',
        zIndex: 100,
      }}
    >
      {/* Left Section: Brand + Actions */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        flex: '1 1 auto', 
        minWidth: '0',
      }}>
        <NavbarBrand />
        <NavbarActions />
      </div>

      {/* Center Section: View Mode Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        flexGrow: 0,
      }}>
        <ViewModeToggle />
      </div>

      {/* Right Section: Global Settings */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        flex: '1 1 auto', 
        minWidth: '0',
        justifyContent: 'flex-end',
      }}>
        <GlobalSettings />
      </div>
    </header>
  );
};

export { NavbarBrand } from './NavbarBrand';
export { ViewModeToggle } from './ViewModeToggle';
export { NavbarActions } from './NavbarActions';
export { GlobalSettings } from './GlobalSettings';
