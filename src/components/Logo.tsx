'use client';

type LogoProps = {
  className?: string;
  size?: number;
  showPoweredBy?: boolean;
  /** Optional subtitle below main title (e.g. "Management System") */
  subtitle?: string;
  /** Short title on small screens (e.g. dashboard header under notch) */
  compact?: boolean;
};

export function Logo({ className = '', size = 36, showPoweredBy = true, subtitle, compact = false }: LogoProps) {
  return (
    <span className={`inline-block ${className}`}>
      {compact ? (
        <>
          <span
            className="font-semibold tracking-tight block sm:hidden max-w-[42vw] truncate text-black dark:text-white"
            style={{ fontSize: size }}
          >
            DrinkatHR
          </span>
          <span
            className="font-semibold tracking-tight hidden sm:block text-black dark:text-white"
            style={{ fontSize: size }}
          >
            DrinkatHR — Management System
          </span>
        </>
      ) : (
        <span
          className="font-semibold tracking-tight block text-black dark:text-white"
          style={{ fontSize: size }}
        >
          DrinkatHR — Management System
        </span>
      )}
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
