import React, { useEffect } from 'react';
import { useModelStore } from '../../store/useModelStore';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
}) => {
  const colorMode = useModelStore(state => state.colorMode);
  
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        onConfirm();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onCancel]);
  
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: colorMode === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: colorMode === 'dark' ? '#161b22' : 'white',
        borderRadius: '8px',
        padding: '24px',
        width: '400px',
        boxShadow: colorMode === 'dark' 
          ? '0 4px 12px rgba(0, 0, 0, 0.4)' 
          : '0 4px 12px rgba(0, 0, 0, 0.15)',
        border: colorMode === 'dark' ? '1px solid #30363d' : 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '18px', 
          fontWeight: 600,
          color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
        }}>{title}</h3>
        <p style={{ 
          margin: 0, 
          fontSize: '14px', 
          color: colorMode === 'dark' ? '#8b949e' : '#555', 
          lineHeight: '1.5' 
        }}>{message}</p>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
          <button 
            onClick={onCancel}
            style={{ 
              background: colorMode === 'dark' ? '#21262d' : 'transparent', 
              border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ccc', 
              color: colorMode === 'dark' ? '#e6edf3' : '#333' 
            }}
          >
            {cancelLabel}
          </button>
          <button 
            onClick={onConfirm}
            style={{ 
              background: isDestructive ? '#dc2626' : '#2563eb', 
              color: 'white',
              border: 'none'
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
