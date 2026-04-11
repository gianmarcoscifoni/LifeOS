'use client';

export function NebulaBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      style={{ backgroundColor: '#0A0415' }}
    >
      {/* Orb 1 — deep purple, top-left */}
      <div
        style={{
          position: 'absolute',
          width: 700,
          height: 700,
          top: -200,
          left: -150,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #3B0D7A 0%, transparent 70%)',
          filter: 'blur(90px)',
          opacity: 0.6,
          animation: 'drift1 24s ease-in-out infinite alternate, hueShift 20s linear infinite',
        }}
      />

      {/* Orb 2 — amethyst, bottom-right */}
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          bottom: -120,
          right: -100,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #6B21A8 0%, transparent 70%)',
          filter: 'blur(90px)',
          opacity: 0.55,
          animation: 'drift2 30s ease-in-out infinite alternate, hueShift 26s linear infinite',
        }}
      />

      {/* Orb 3 — gold, center — very subtle */}
      <div
        style={{
          position: 'absolute',
          width: 450,
          height: 450,
          top: '45%',
          left: '55%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #C9A84C 0%, transparent 70%)',
          filter: 'blur(100px)',
          opacity: 0.14,
          animation: 'drift3 20s ease-in-out infinite alternate',
        }}
      />

      {/* Noise grain overlay for depth */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          opacity: 0.025,
          mixBlendMode: 'overlay',
        }}
      />
    </div>
  );
}
