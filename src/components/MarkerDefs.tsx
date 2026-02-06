export const MarkerDefs = () => (
  <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
    <defs>
      {/* 1 (Mandatory One) - Vertical Bar with Circle */}
      <marker
        id="marker-1"
        markerWidth="24"
        markerHeight="20"
        refX="20"
        refY="10"
        orient="auto"
      >
        <circle cx="18" cy="10" r="5" stroke="#22c55e" strokeWidth="2" fill="none" />
        <line x1="10" y1="4" x2="10" y2="16" stroke="#22c55e" strokeWidth="2" />
        <text x="6" y="0" fontSize="10" fill="#22c55e" fontWeight="bold">1</text>
      </marker>

      {/* 0..1 (Optional One) - Circle + Bar */}
      <marker
        id="marker-0..1"
        markerWidth="24"
        markerHeight="20"
        refX="20"
        refY="10"
        orient="auto"
      >
        <circle cx="18" cy="10" r="5" stroke="#22c55e" strokeWidth="2" fill="none" />
        <line x1="10" y1="4" x2="10" y2="16" stroke="#22c55e" strokeWidth="2" />
      </marker>

      {/* 1..* (Mandatory Many) - Circle with crow's foot */}
      <marker
        id="marker-1..*"
        markerWidth="28"
        markerHeight="24"
        refX="24"
        refY="12"
        orient="auto"
      >
        <circle cx="22" cy="12" r="5" stroke="#22c55e" strokeWidth="2" fill="none" />
        <path d="M14,12 L6,5 M14,12 L6,19 M14,12 L6,12" stroke="#22c55e" strokeWidth="2" fill="none" />
        <text x="4" y="0" fontSize="10" fill="#22c55e" fontWeight="bold">n</text>
      </marker>

      {/* 0..* (Optional Many) - Circle + Crow's foot */}
      <marker
        id="marker-0..*"
        markerWidth="28"
        markerHeight="24"
        refX="24"
        refY="12"
        orient="auto"
      >
        <circle cx="22" cy="12" r="5" stroke="#22c55e" strokeWidth="2" fill="none" />
        <path d="M14,12 L6,5 M14,12 L6,19 M14,12 L6,12" stroke="#22c55e" strokeWidth="2" fill="none" />
        <text x="4" y="0" fontSize="10" fill="#22c55e" fontWeight="bold">n</text>
      </marker>

    </defs>
  </svg>
);
