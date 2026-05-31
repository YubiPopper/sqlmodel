import React, { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { NavbarBrand } from './NavbarBrand';
import { ViewModeToggle } from './ViewModeToggle';
import { NavbarActions } from './NavbarActions';
import { GlobalSettings } from './GlobalSettings';
import { SaveShareButtons } from './SaveShareButtons';
import { PresenceAvatars } from './PresenceAvatars';
import { CollaborationDialog } from '../../ui/CollaborationDialog';
import { useCollaborationContext } from '../../../collaboration/CollaborationContext';

export const Navbar: React.FC = () => {
  const colorMode = useModelStore(state => state.colorMode);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const isDark = colorMode === 'dark';
  const {
    isActive,
    session,
    inviteLink,
    recentRooms,
    personalModels,
    activePersonalModelId,
    startCollaboration,
    reopenRoom,
    createPersonalModel,
    openPersonalModel,
    saveActivePersonalModel,
    stopSession,
  } = useCollaborationContext();
  const [showCollabDialog, setShowCollabDialog] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 830;
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
              {isActive && (
                <PresenceAvatars
                  users={session.connectedUsers}
                  selfColor={session.userColor}
                  selfName={session.userName}
                  onClick={() => setShowCollabDialog(true)}
                />
              )}
              <SaveShareButtons />
              <GlobalSettings />
            </>
          )}
          {isMobile && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsMobileMenuOpen(!isMobileMenuOpen);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
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
              background: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.25)',
              backdropFilter: 'blur(2px)',
              zIndex: 98,
              animation: 'fadeIn 0.15s ease-out forwards',
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
                ? 'linear-gradient(180deg, #1a1f26 0%, #161b22 100%)'
                : 'linear-gradient(180deg, #ffffff 0%, #fafbfc 100%)',
              borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
              boxShadow: isDark
                ? '0 10px 30px rgba(0, 0, 0, 0.6), 0 1px 3px rgba(0, 0, 0, 0.4)'
                : '0 10px 30px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.08)',
              zIndex: 99,
              padding: '16px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              maxHeight: '65vh',
              overflowY: 'auto',
              overflowX: 'hidden',
              animation: 'menuSlideDown 0.15s ease-out forwards',
            }}
          >
            <NavbarActions onActionComplete={() => setIsMobileMenuOpen(false)} isMobile={true} />
            <SaveShareButtons isMobile={true} />
            <GlobalSettings isMobile={true} onActionComplete={() => setIsMobileMenuOpen(false)} />
          </div>
        </>
      )}
      {/* Collaboration Dialog (desktop presence avatars click) */}
      <CollaborationDialog
        isOpen={showCollabDialog}
        onClose={() => setShowCollabDialog(false)}
        session={session}
        inviteLink={inviteLink}
        recentRooms={recentRooms}
        personalModels={personalModels}
        activePersonalModelId={activePersonalModelId}
        onStart={startCollaboration}
        onReopenRoom={reopenRoom}
        onCreatePersonalModel={createPersonalModel}
        onOpenPersonalModel={openPersonalModel}
        onSavePersonalModel={saveActivePersonalModel}
        onStop={() => { stopSession(); setShowCollabDialog(false); }}
      />
    </>
  );
};

export { NavbarBrand } from './NavbarBrand';
export { ViewModeToggle } from './ViewModeToggle';
export { NavbarActions } from './NavbarActions';
export { GlobalSettings } from './GlobalSettings';
