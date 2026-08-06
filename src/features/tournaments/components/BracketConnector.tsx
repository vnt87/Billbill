import React from 'react';

interface BracketConnectorProps {
  /** Sequential match number to display on the connector line */
  matchNumber?: number;
  /** 'pair' connects 2 preceding matches to 1 match; 'single' connects 1 to 1 */
  type?: 'pair' | 'single';
  className?: string;
}

export const BracketConnector: React.FC<BracketConnectorProps> = ({
  matchNumber,
  type = 'pair',
  className = '',
}) => {
  if (type === 'single') {
    return (
      <div className={`relative flex items-center justify-center w-8 sm:w-10 h-full ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
          <line
            x1="0"
            y1="50"
            x2="100"
            y2="50"
            className="stroke-slate-300 dark:stroke-slate-700"
            strokeWidth="2"
          />
        </svg>
        {matchNumber !== undefined && (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-1 py-0.5 z-10 border border-slate-200 dark:border-slate-800 rounded">
            {matchNumber}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center w-8 sm:w-10 h-full ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
        {/* Top horizontal leg */}
        <path
          d="M 0,25 L 50,25"
          className="stroke-slate-300 dark:stroke-slate-700"
          strokeWidth="2"
          fill="none"
        />
        {/* Vertical joining bar */}
        <path
          d="M 50,25 L 50,75"
          className="stroke-slate-300 dark:stroke-slate-700"
          strokeWidth="2"
          fill="none"
        />
        {/* Bottom horizontal leg */}
        <path
          d="M 0,75 L 50,75"
          className="stroke-slate-300 dark:stroke-slate-700"
          strokeWidth="2"
          fill="none"
        />
        {/* Output horizontal stem to next round match */}
        <path
          d="M 50,50 L 100,50"
          className="stroke-slate-300 dark:stroke-slate-700"
          strokeWidth="2"
          fill="none"
        />
      </svg>

      {/* Match number pill positioned on the output stem */}
      {matchNumber !== undefined && (
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 z-10 shadow-xs">
          {matchNumber}
        </span>
      )}
    </div>
  );
};
