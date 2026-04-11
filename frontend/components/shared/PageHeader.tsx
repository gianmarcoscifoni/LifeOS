interface PageHeaderProps {
  title: string;
  subtitle?: string;
  gradient?: string;
}

export function PageHeader({ title, subtitle, gradient = 'linear-gradient(135deg, #C084FC 0%, #E2E8F0 100%)' }: PageHeaderProps) {
  return (
    <div>
      <h1
        className="text-4xl font-syne font-extrabold tracking-hero"
        style={{
          background: gradient,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm font-inter mt-1" style={{ color: 'rgba(226,232,240,0.4)' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
