import { useEffect } from 'react';
import { CheckCircle2, Share2, Save } from 'lucide-react';
import { useModelStore } from '../../store/useModelStore';

interface ToastProps {
  message: string;
  type?: 'success' | 'share' | 'save';
  duration?: number;
  onClose: () => void;
}

export const Toast = ({ message, type = 'success', duration = 3000, onClose }: ToastProps) => {
  const colorMode = useModelStore(state => state.colorMode);
  const isDark = colorMode === 'dark';

  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'share':
        return <Share2 size={18} />;
      case 'save':
        return <Save size={18} />;
      default:
        return <CheckCircle2 size={18} />;
    }
  };

  const getGradient = () => {
    switch (type) {
      case 'share':
        return 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)';
      case 'save':
        return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      default:
        return 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 20px',
        background: isDark ? '#161b22' : '#ffffff',
        border: isDark ? '1px solid #30363d' : '1px solid #e2e8f0',
        borderRadius: '10px',
        boxShadow: isDark
          ? '0 8px 24px rgba(0, 0, 0, 0.6)'
          : '0 8px 24px rgba(0, 0, 0, 0.12)',
        animation: 'fadeInUp 0.3s ease-out',
        maxWidth: '90vw',
      }}
    >
      {/* Icon with gradient */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: getGradient(),
          color: '#ffffff',
          flexShrink: 0,
        }}
      >
        {getIcon()}
      </div>

      {/* Message */}
      <span
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: isDark ? '#e6edf3' : '#1f2937',
          letterSpacing: '0.2px',
        }}
      >
        {message}
      </span>
    </div>
  );
};
