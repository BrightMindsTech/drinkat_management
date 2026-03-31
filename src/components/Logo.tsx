'use client';

type LogoProps = {
  className?: string;
  size?: number;
  showPoweredBy?: boolean;
  /** Optional subtitle below main title (e.g. "Management System") */
  subtitle?: string;
};

export function Logo({ className = '', size = 36, showPoweredBy = true, subtitle }: LogoProps) {
  return (
    <span className={`inline-block ${className}`}>
      <span
        className="font-semibold text-app-primary tracking-tight block"
        style={{ fontSize: size }}
      >
        Drinkat&apos;s Management System
      </span>
      {subtitle && (
        <span className="text-sm text-app-secondary mt-1 block">
          {subtitle}
        </span>
      )}
      {showPoweredBy && (
        <span className="text-xs text-app-muted mt-1 block">
          Powered by BMTechs
        </span>
      )}
    </span>
  );
}
