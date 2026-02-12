import { useState, useEffect } from 'react';
import { Star, X, Github } from 'lucide-react';
import { useModelStore } from '../../store/useModelStore';

const STORAGE_KEY = 'sqlmodel-star-dialog-dismissed';
const REPO_URL = 'https://github.com/sqlmodel/sqlmodel';

export const StarRepoDialog = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const colorMode = useModelStore(state => state.colorMode);
  const isDark = colorMode === 'dark';

  useEffect(() => {
    // Check if user has already dismissed the dialog
    const dismissed = localStorage.getItem(STORAGE_KEY);
    
    if (!dismissed) {
      // Show dialog after a short delay (better UX)
      const timer = setTimeout(() => {
        setIsVisible(true);
        setMounted(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    // Wait for animation to complete before unmounting
    setTimeout(() => setMounted(false), 200);
  };

  const handleStarClick = () => {
    window.open(REPO_URL, '_blank', 'noopener,noreferrer');
    handleDismiss();
  };

  if (!mounted) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        animation: isVisible ? 'fadeIn 0.2s ease-out' : 'fadeOut 0.2s ease-in',
        opacity: isVisible ? 1 : 0,
      }}
      onClick={handleDismiss}
    >
      <div
        style={{
          background: isDark 
            ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' 
            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '12px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: isDark
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(59, 130, 246, 0.1)'
            : '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
          overflow: 'hidden',
          animation: isVisible ? 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)' : 'slideDown 0.2s ease-in',
          transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative top bar */}
        <div style={{
          height: '4px',
          background: 'linear-gradient(90deg, #3b82f6 0%, #22c55e 100%)',
        }} />

        {/* Header */}
        <div style={{
          padding: '18px 20px 16px',
          borderBottom: isDark ? '1px solid rgba(51, 65, 85, 0.5)' : '1px solid rgba(226, 232, 240, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #22c55e 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.25)',
            }}>
              <Star size={16} color="white" fill="white" />
            </div>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: '17px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #3b82f6 0%, #22c55e 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.02em',
              }}>
                Support SQLModel
              </h2>
              <p style={{
                margin: '2px 0 0 0',
                fontSize: '11px',
                color: isDark ? '#94a3b8' : '#64748b',
                fontWeight: 400,
              }}>
                Help us grow this open-source tool
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Close dialog"
            style={{
              background: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.6)',
              border: 'none',
              padding: '10px',
              cursor: 'pointer',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#94a3b8' : '#64748b',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? 'rgba(51, 65, 85, 0.8)' : 'rgba(226, 232, 240, 0.9)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.6)';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          <p style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            lineHeight: '1.6',
            color: isDark ? '#cbd5e1' : '#475569',
          }}>
            SQLModel helps teams build better data models with visual ERDs and automated context for data warehouses.
          </p>
          
          <p style={{
            margin: '0 0 20px 0',
            fontSize: '13px',
            lineHeight: '1.5',
            color: isDark ? '#94a3b8' : '#64748b',
          }}>
            If you find it useful, consider giving us a star on GitHub, it helps the project grow! ⭐
          </p>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            <button
              onClick={handleStarClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 16px',
                border: 'none',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #22c55e 100%)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.25)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(34, 197, 94, 0.25)';
              }}
            >
              <Github size={18} />
              <span>Star on GitHub</span>
            </button>

            <button
              onClick={handleDismiss}
              style={{
                padding: '10px 16px',
                border: 'none',
                background: 'transparent',
                color: isDark ? '#94a3b8' : '#64748b',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                borderRadius: '8px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(226, 232, 240, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
