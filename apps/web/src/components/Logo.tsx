"use client";

// SVG recreation of the YourBestPeer logo:
// - Left-facing head silhouette
// - Geometric low-poly brain/network inside
// - Purple → blue → cyan gradient

export function LogoIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ybp-grad" x1="10" y1="90" x2="90" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#7c3aed" />
          <stop offset="45%"  stopColor="#4f46e5" />
          <stop offset="80%"  stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>

      {/* ── Head profile (left-facing) ── */}
      <path
        d="
          M 64 7
          C 80 7 90 19 90 37
          C 90 53 83 64 76 70
          L 72 79
          C 68 85 60 89 52 87
          C 44 85 38 78 37 70
          C 36 63 38 57 37 51
          C 36 46 34 42 36 37
          C 37 33 36 29 34 25
          C 33 21 35 15 40 11
          C 45 7 54 6 64 7
          Z
        "
        stroke="url(#ybp-grad)"
        strokeWidth="2.8"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />

      {/* ── Geometric brain — outer ring ── */}
      {/*   Centre: (63, 37)   radius ≈ 22   */}
      <polygon
        points="63,15 80,23 87,37 80,51 63,59 46,51 39,37 46,23"
        stroke="url(#ybp-grad)"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="none"
      />

      {/* ── Spokes from centre to each outer vertex ── */}
      {[
        [63, 15], [80, 23], [87, 37], [80, 51],
        [63, 59], [46, 51], [39, 37], [46, 23],
      ].map(([x, y], i) => (
        <line
          key={i}
          x1="63" y1="37"
          x2={x}  y2={y}
          stroke="url(#ybp-grad)"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.65"
        />
      ))}

      {/* ── Inner cross-diagonals (alternate vertices) ── */}
      <line x1="63" y1="15" x2="80" y2="51" stroke="url(#ybp-grad)" strokeWidth="1" opacity="0.4" />
      <line x1="80" y1="23" x2="46" y2="51" stroke="url(#ybp-grad)" strokeWidth="1" opacity="0.4" />
      <line x1="87" y1="37" x2="46" y2="23" stroke="url(#ybp-grad)" strokeWidth="1" opacity="0.4" />
      <line x1="63" y1="59" x2="39" y2="37" stroke="url(#ybp-grad)" strokeWidth="1" opacity="0.4" />

      {/* ── Vertex dots ── */}
      {[
        [63, 15], [80, 23], [87, 37], [80, 51],
        [63, 59], [46, 51], [39, 37], [46, 23],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2.4" fill="url(#ybp-grad)" />
      ))}

      {/* ── Centre dot ── */}
      <circle cx="63" cy="37" r="2.8" fill="url(#ybp-grad)" />
    </svg>
  );
}

export function LogoFull({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoIcon className="h-8 w-8 shrink-0" />
      <span className="font-bold text-foreground tracking-tight">YourBestPeer</span>
    </div>
  );
}
