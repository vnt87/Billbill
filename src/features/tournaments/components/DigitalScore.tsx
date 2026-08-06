interface DigitalScoreProps {
  value: number | null;
  label: string;
  accent: 'home' | 'away';
}

export function DigitalScore({ value, label, accent }: DigitalScoreProps) {
  const displayValue = value === null ? '--' : String(value).padStart(2, '0');

  return (
    <div className={`scoreboard-digit scoreboard-digit--${accent}`}>
      <div className="scoreboard-digit__label">{label}</div>
      <div className="scoreboard-digit__window" aria-label={`${label}: ${value ?? 'not set'}`}>
        {displayValue.split('').map((digit, index) => (
          <span className="scoreboard-digit__character" key={`${digit}-${index}`} aria-hidden="true">
            {digit}
          </span>
        ))}
      </div>
    </div>
  );
}
