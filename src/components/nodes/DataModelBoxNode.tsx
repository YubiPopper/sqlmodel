import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useModelStore } from '../../store/useModelStore';

interface DataModelBoxNodeData {
  name: string;
  color?: string;
  width: number;
  height: number;
  entityCount: number;
  isSelected?: boolean;
}

const getModelAccentColor = (color: string | undefined, isDark: boolean): string => {
  if (!color) {
    return isDark ? '#64748b' : '#94a3b8';
  }

  const namedColors: Record<string, string> = {
    bronze: '#8b5a3c',
    silver: '#94a3b8',
    gold: '#d4af37',
    red: '#dc2626',
    orange: '#ea580c',
    green: '#16a34a',
    teal: '#0d9488',
    blue: '#2563eb',
    indigo: '#4f46e5',
    purple: '#9333ea',
    pink: '#db2777',
  };

  if (color.startsWith('#')) {
    return color;
  }

  return namedColors[color] || (isDark ? '#64748b' : '#94a3b8');
};

const DataModelBoxNode = memo(({ data }: NodeProps<DataModelBoxNodeData>) => {
  const [hoverSide, setHoverSide] = useState<'top' | 'right' | 'bottom' | 'left' | null>(null);
  const colorMode = useModelStore((state) => state.colorMode);
  const isDark = colorMode === 'dark';
  const accent = getModelAccentColor(data.color, isDark);
  const handleBaseStyle = {
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: isDark ? '#4ade80' : '#22c55e',
    border: `1.5px solid ${isDark ? '#22c55e' : '#16a34a'}`,
    opacity: 0,
    transition: 'transform 0.15s ease',
    zIndex: 30,
  } as const;

  return (
    <div
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const localX = event.clientX - rect.left;
        const localY = event.clientY - rect.top;
        const distTop = localY;
        const distBottom = rect.height - localY;
        const distLeft = localX;
        const distRight = rect.width - localX;
        const minDist = Math.min(distTop, distBottom, distLeft, distRight);
        const threshold = 22;

        if (minDist > threshold) {
          setHoverSide(null);
          return;
        }

        if (minDist === distTop) setHoverSide('top');
        else if (minDist === distRight) setHoverSide('right');
        else if (minDist === distBottom) setHoverSide('bottom');
        else setHoverSide('left');
      }}
      onMouseLeave={() => setHoverSide(null)}
      style={{
        width: data.width,
        height: data.height,
        borderRadius: '12px',
        border: isDark ? `2px solid ${accent}` : `2px solid ${accent}`,
        background: isDark
          ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
        boxShadow: data.isSelected
          ? (isDark
              ? '0 0 0 1px rgba(59, 130, 246, 0.35), 0 8px 24px rgba(0, 0, 0, 0.6), 0 4px 12px rgba(59, 130, 246, 0.2)'
              : '0 0 0 1px rgba(59, 130, 246, 0.3), 0 8px 24px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(59, 130, 246, 0.15)')
          : (isDark
              ? '0 4px 16px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)'
              : '0 4px 16px rgba(0, 0, 0, 0.06), 0 2px 6px rgba(0, 0, 0, 0.04)'),
        position: 'relative',
        cursor: 'grab',
        transition: 'all 0.2s ease',
      }}
    >
      <Handle type="source" position={Position.Top} id="top" style={{ ...handleBaseStyle, top: -8, opacity: hoverSide === 'top' ? 0.95 : 0 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ ...handleBaseStyle, right: -8, opacity: hoverSide === 'right' ? 0.95 : 0 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ ...handleBaseStyle, bottom: -8, opacity: hoverSide === 'bottom' ? 0.95 : 0 }} />
      <Handle type="source" position={Position.Left} id="left" style={{ ...handleBaseStyle, left: -8, opacity: hoverSide === 'left' ? 0.95 : 0 }} />

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: isDark ? '#60a5fa' : '#1e40af',
            textAlign: 'center',
            letterSpacing: '0.2px',
            maxWidth: '90%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {data.name}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: isDark ? '#93c5fd' : '#334155',
            opacity: 0.95,
            fontWeight: 500,
          }}
        >
          {data.entityCount} {data.entityCount === 1 ? 'entity' : 'entities'}
        </div>
      </div>
    </div>
  );
});

DataModelBoxNode.displayName = 'DataModelBoxNode';

export default DataModelBoxNode;
