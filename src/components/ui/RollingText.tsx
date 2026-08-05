import type { ReactNode } from 'react';

interface RollingTextProps {
  children: ReactNode;
  className?: string;
}

/** A compact, reduced-motion-friendly rolling label for buttons and tabs. */
export function RollingText({ children, className = '' }: RollingTextProps) {
  return (
    <span className={`rolling-text ${className}`.trim()}>
      <span className="rolling-text__copy">{children}</span>
      <span aria-hidden="true" className="rolling-text__copy rolling-text__copy--incoming">{children}</span>
    </span>
  );
}
