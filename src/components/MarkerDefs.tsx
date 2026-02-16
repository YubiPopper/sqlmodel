export const MarkerDefs = () => (
  <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
    <defs>
      {/* Particle effects for animated edges */}
      <radialGradient id="particle-gradient">
        <stop offset="0%" stopColor="#4ade80" stopOpacity="1" />
        <stop offset="50%" stopColor="#22c55e" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
      </radialGradient>
      <filter id="particle-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>

      {/* 1 (Mandatory One) - Squat wide filled triangle + bar */}
      <marker
        id="marker-1"
        markerWidth="18"
        markerHeight="22"
        refX="16"
        refY="11"
        orient="auto"
      >
        <polygon points="11,0 16,11 11,22" fill="#22c55e" stroke="none" />
        <line x1="9" y1="2" x2="9" y2="20" stroke="#22c55e" strokeWidth="2" />
      </marker>

      {/* 0..1 (Optional One) - Squat wide filled triangle + circle */}
      <marker
        id="marker-0..1"
        markerWidth="22"
        markerHeight="22"
        refX="20"
        refY="11"
        orient="auto"
      >
        <polygon points="15,0 20,11 15,22" fill="#22c55e" stroke="none" />
        <circle cx="7" cy="11" r="5" stroke="#22c55e" strokeWidth="1.5" fill="none" />
      </marker>

      {/* 1..* (Mandatory Many) - Squat wide filled triangle + double bar */}
      <marker
        id="marker-1..*"
        markerWidth="20"
        markerHeight="22"
        refX="18"
        refY="11"
        orient="auto"
      >
        <polygon points="13,0 18,11 13,22" fill="#22c55e" stroke="none" />
        <line x1="10" y1="2" x2="10" y2="20" stroke="#22c55e" strokeWidth="2" />
        <line x1="7" y1="2" x2="7" y2="20" stroke="#22c55e" strokeWidth="2" />
      </marker>

      {/* 0..* (Optional Many) - Squat wide filled triangle + circle */}
      <marker
        id="marker-0..*"
        markerWidth="22"
        markerHeight="22"
        refX="20"
        refY="11"
        orient="auto"
      >
        <polygon points="15,0 20,11 15,22" fill="#22c55e" stroke="none" />
        <circle cx="7" cy="11" r="5" stroke="#22c55e" strokeWidth="1.5" fill="none" />
      </marker>

    </defs>
  </svg>
);
