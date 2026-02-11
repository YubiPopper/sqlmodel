import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useModelStore } from '../../store/useModelStore';
import { X, GitBranch, Snowflake, Grid3x3 } from 'lucide-react';

interface LayoutAlgorithmDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export type LayoutAlgorithm = 'left-right' | 'snowflake' | 'compact';

export const LayoutAlgorithmDialog: React.FC<LayoutAlgorithmDialogProps> = ({ isOpen, onClose }) => {
  const colorMode = useModelStore(state => state.colorMode);
  const layoutAlgorithm = useModelStore(state => state.layoutAlgorithm);
  const setLayoutAlgorithm = useModelStore(state => state.setLayoutAlgorithm);
  const autoLayout = useModelStore(state => state.autoLayout);
  const [hoveredAlgo, setHoveredAlgo] = useState<LayoutAlgorithm | null>(null);

  if (!isOpen) return null;

  const handleSelectAlgorithm = (algorithm: LayoutAlgorithm) => {
    setLayoutAlgorithm(algorithm);
    autoLayout();
    onClose();
  };

  const algorithms: Array<{
    id: LayoutAlgorithm;
    icon: React.ReactNode;
    title: string;
    description: string;
    number: number;
  }> = [
    {
      id: 'left-right',
      icon: <GitBranch size={22} strokeWidth={2} />,
      title: 'Left-right',
      description: 'Arrange tables from left to right based on their relationship direction. Ideal for diagrams with long relationship lineage like ETL pipelines.',
      number: 1,
    },
    {
      id: 'snowflake',
      icon: <Snowflake size={22} strokeWidth={2} />,
      title: 'Snowflake',
      description: 'Arrange tables top-to-bottom in a radial pattern, placing key entities at the center. Optimized for star and snowflake schema data warehouses.',
      number: 2,
    },
    {
      id: 'compact',
      icon: <Grid3x3 size={22} strokeWidth={2} />,
      title: 'Compact',
      description: 'Minimize whitespace with tight vertical clustering. Best for small diagrams where space efficiency is important.',
      number: 3,
    },
  ];

  const isDark = colorMode === 'dark';

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        background: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: isDark ? '#1e293b' : '#ffffff',
          borderRadius: '12px',
          width: '520px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: isDark
            ? '0 20px 40px rgba(0, 0, 0, 0.8)'
            : '0 20px 40px rgba(15, 23, 42, 0.12)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 20px 16px',
            borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: isDark ? '#f1f5f9' : '#0f172a',
            }}
          >
            Choose auto arrange algorithm
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: isDark ? '#64748b' : '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? '#334155' : '#f1f5f9';
              e.currentTarget.style.color = isDark ? '#cbd5e1' : '#475569';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = isDark ? '#64748b' : '#94a3b8';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: '16px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {algorithms.map((algo, index) => {
            const isSelected = layoutAlgorithm === algo.id;
            const isHovered = hoveredAlgo === algo.id;

            return (
              <div
                key={algo.id}
                onClick={() => handleSelectAlgorithm(algo.id)}
                onMouseEnter={() => setHoveredAlgo(algo.id)}
                onMouseLeave={() => setHoveredAlgo(null)}
                style={{
                  padding: '16px',
                  marginBottom: index < algorithms.length - 1 ? '10px' : '0',
                  borderRadius: '8px',
                  border: `2px solid ${
                    isSelected
                      ? '#6366f1'
                      : isDark
                      ? '#334155'
                      : '#e2e8f0'
                  }`,
                  background: isSelected
                    ? isDark
                      ? 'rgba(99, 102, 241, 0.08)'
                      : 'rgba(99, 102, 241, 0.05)'
                    : isDark
                    ? '#0f172a'
                    : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'center',
                }}
                onMouseOver={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = isDark ? '#475569' : '#cbd5e1';
                    e.currentTarget.style.background = isDark ? '#1e293b' : '#f8fafc';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = isDark ? '#334155' : '#e2e8f0';
                    e.currentTarget.style.background = isDark ? '#0f172a' : '#ffffff';
                  }
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    color: isSelected ? '#6366f1' : isDark ? '#94a3b8' : '#64748b',
                    flexShrink: 0,
                    display: 'flex',
                  }}
                >
                  {algo.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: isSelected
                        ? '#6366f1'
                        : isDark
                        ? '#f1f5f9'
                        : '#0f172a',
                      marginBottom: '4px',
                    }}
                  >
                    {algo.title}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: isDark ? '#94a3b8' : '#64748b',
                      lineHeight: '1.5',
                    }}
                  >
                    {algo.description}
                  </div>
                </div>

                {/* Number Badge */}
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    background: isSelected
                      ? '#6366f1'
                      : isDark
                      ? '#334155'
                      : '#e2e8f0',
                    color: isSelected
                      ? '#ffffff'
                      : isDark
                      ? '#94a3b8'
                      : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {algo.number}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};
