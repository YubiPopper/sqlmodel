import { memo, useMemo } from 'react';
import { getBezierPath, getStraightPath, getSmoothStepPath, EdgeLabelRenderer, type EdgeProps } from 'reactflow';

const PARTICLE_COUNT = 4;
const ANIMATION_DURATION = 5; // seconds

interface AnimatedEdgeData {
  isHighlighted?: boolean;
  edgeType?: 'curved' | 'smoothstep' | 'straight' | 'step';
  [key: string]: any;
}

const AnimatedEdge = memo(({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerStart,
  markerEnd,
  data,
  interactionWidth,
  label,
  labelStyle,
  labelBgStyle,
}: EdgeProps<AnimatedEdgeData>) => {
  const edgeType = data?.edgeType || 'curved';
  
  // Compute the edge path based on edge type
  const [edgePath, labelX, labelY] = useMemo(() => {
    switch (edgeType) {
      case 'straight':
        return getStraightPath({ sourceX, sourceY, targetX, targetY });
      case 'smoothstep':
      case 'step':
        return getSmoothStepPath({
          sourceX, sourceY, targetX, targetY,
          sourcePosition, targetPosition,
          borderRadius: edgeType === 'smoothstep' ? 120 : 0,
        });
      case 'curved':
      default:
        return getBezierPath({
          sourceX, sourceY, targetX, targetY,
          sourcePosition, targetPosition,
        });
    }
  }, [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, edgeType]);

  const isHighlighted = data?.isHighlighted || false;

  return (
    <g>
      {/* Invisible wider path for easier interaction */}
      <path
        className="react-flow__edge-interaction"
        d={edgePath}
        fill="none"
        strokeWidth={interactionWidth || 20}
        stroke="transparent"
        style={{ cursor: 'context-menu' }}
      />
      
      {/* Main visible edge path */}
      <path
        className="react-flow__edge-path"
        d={edgePath}
        fill="none"
        style={{
          ...style,
          transition: 'stroke 0.3s ease, stroke-width 0.3s ease',
        }}
        markerStart={markerStart}
        markerEnd={markerEnd}
      />

      {/* Animated particles - only rendered when highlighted */}
      {isHighlighted && Array.from({ length: PARTICLE_COUNT }, (_, i) => (
        <ellipse
          key={i}
          rx={4}
          ry={1.5}
          fill="url(#particle-gradient)"
          opacity={0.6 + (i / PARTICLE_COUNT) * 0.4}
          filter="url(#particle-glow)"
        >
          <animateMotion
            dur={`${ANIMATION_DURATION}s`}
            repeatCount="indefinite"
            begin={`${-(ANIMATION_DURATION / PARTICLE_COUNT) * i}s`}
            path={edgePath}
            rotate="auto"
            calcMode="spline"
            keySplines="0.42, 0, 0.58, 1.0"
            keyTimes="0;1"
          />
        </ellipse>
      ))}

      {/* Edge label */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              padding: '4px 8px',
              borderRadius: '4px',
              // Map SVG label properties to CSS equivalents
              background: (labelBgStyle as any)?.fill,
              opacity: (labelBgStyle as any)?.fillOpacity,
              color: (labelStyle as any)?.fill,
              fontSize: (labelStyle as any)?.fontSize,
              fontWeight: (labelStyle as any)?.fontWeight,
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </g>
  );
});

AnimatedEdge.displayName = 'AnimatedEdge';

export default AnimatedEdge;
