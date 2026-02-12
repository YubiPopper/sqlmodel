import React, { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { NavbarBrand } from './NavbarBrand';
import { ViewModeToggle } from './ViewModeToggle';
import { NavbarActions } from './NavbarActions';
import { GlobalSettings } from './GlobalSettings';
import { AuthButton } from './AuthButton';
import { SaveShareButtons } from './SaveShareButtons';

export const Navbar: React.FC = () => {
  const colorMode = useModelStore(state => state.colorMode);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [triggerSave, setTriggerSave] = useState(false);
  const [triggerSaveAs, setTriggerSaveAs] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const isDark = colorMode === 'dark';

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileMenuOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('header')
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  return (
    <>
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
        {/* Left Section: Brand + Actions + View Mode Toggle */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? '4px' : '8px',
          flex: '1 1 auto', 
          minWidth: '0',
        }}>
          <NavbarBrand />
          {!isMobile && (
            <>
              <NavbarActions />
              <ViewModeToggle />
            </>
          )}
          {isMobile && <ViewModeToggle />}
        </div>

        {/* Right Section: Global Settings or Mobile Menu */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          flex: isMobile ? '0 0 auto' : '1 1 auto', 
          minWidth: '0',
          justifyContent: 'flex-end',
        }}>
          {!isMobile && (
            <>
              <SaveShareButtons 
                onSaveClick={() => setTriggerSave(true)} 
                onSaveAsClick={() => setTriggerSaveAs(true)}
              />
              <AuthButton 
                triggerSave={triggerSave} 
                triggerSaveAs={triggerSaveAs}
                onSaveComplete={() => setTriggerSave(false)} 
                onSaveAsComplete={() => setTriggerSaveAs(false)}
              />
              <GlobalSettings />
            </>
          )}
          {isMobile && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '44px',
                height: '44px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: isDark ? '#e6edf3' : '#1f2937',
                borderRadius: '8px',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? '#30363d' : '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {isMobile && isMobileMenuOpen && (
        <>
          {/* Backdrop - lighter so canvas is still visible */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              top: '56px',
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.2)',
              zIndex: 98,
              animation: 'fadeIn 0.15s ease',
            }}
          />
          <div
            ref={mobileMenuRef}
            style={{
              position: 'absolute',
              top: '56px',
              left: 0,
              right: 0,
              background: isDark 
                ? '#161b22'
                : '#ffffff',
              borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
              boxShadow: isDark
                ? '0 8px 16px rgba(0, 0, 0, 0.4)'
                : '0 8px 16px rgba(0, 0, 0, 0.15)',
              zIndex: 99,
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              maxHeight: '60vh',
              overflowY: 'auto',
              animation: 'slideDown 0.15s ease',
            }}
          >
            {/* Actions */}
            <div>
              <NavbarActions onActionComplete={() => setIsMobileMenuOpen(false)} isMobile={true} />
            </div>

            {/* Divider */}
            <div style={{
              height: '1px',
              background: isDark ? '#30363d' : '#e5e7eb',
              margin: '4px 0',
            }} />

            {/* Save & Share Buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0', gap: '8px' }}>
              <SaveShareButtons 
                onSaveClick={() => setTriggerSave(true)} 
                onSaveAsClick={() => setTriggerSaveAs(true)}
              />
            </div>

            {/* Divider */}
            <div style={{
              height: '1px',
              background: isDark ? '#30363d' : '#e5e7eb',
              margin: '4px 0',
            }} />

            {/* Auth Button */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
              <AuthButton 
                triggerSave={triggerSave} 
                triggerSaveAs={triggerSaveAs}
                onSaveComplete={() => setTriggerSave(false)} 
                onSaveAsComplete={() => setTriggerSaveAs(false)}
              />
            </div>

            {/* Divider */}
            <div style={{
              height: '1px',
              background: isDark ? '#30363d' : '#e5e7eb',
              margin: '4px 0',
            }} />

            {/* Global Settings */}
            <div>
              <GlobalSettings isMobile={true} onActionComplete={() => setIsMobileMenuOpen(false)} />
            </div>
          </div>
        </>
      )}
    </>
  );
};

export { NavbarBrand } from './NavbarBrand';
export { ViewModeToggle } from './ViewModeToggle';
export { NavbarActions } from './NavbarActions';
export { GlobalSettings } from './GlobalSettings';
