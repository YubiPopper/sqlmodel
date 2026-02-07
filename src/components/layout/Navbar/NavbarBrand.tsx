import React from 'react';
import { useModelStore } from '../../../store/useModelStore';

export const NavbarBrand: React.FC = () => {
  const colorMode = useModelStore(state => state.colorMode);
  const isDark = colorMode === 'dark';

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '6px',
      paddingRight: '16px',
      borderRight: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
      marginRight: '12px',
      flexShrink: 0,
    }}>
      <div style={{
        width: '28px',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <img 
          src={isDark ? '/assets/sqlmodelwhite.svg' : '/assets/sqlmodelblack.svg'}
          alt="SQLModel Logo"
          style={{ width: '24px', height: '24px' }}
        />
      </div>
      <div style={{ 
        fontWeight: 700, 
        fontSize: '16px',
        color: isDark ? '#e6edf3' : '#1f2937',
        letterSpacing: '0.3px',
        fontFamily: '"Rajdhani", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        whiteSpace: 'nowrap',
      }}>
        SQLModel
      </div>
    </div>
  );
};
