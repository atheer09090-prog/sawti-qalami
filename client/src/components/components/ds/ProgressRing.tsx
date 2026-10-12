import { useEffect, useState } from "react";

interface Props { value: number; size?: number; stroke?: number; color?: string; label?: string; }

/** حلقة تقدّم/درجة دائرية مع عدّاد يتحرك بنعومة عند الظهور. */
export function ProgressRing({ value, size = 120, stroke = 10, color = "var(--skill, var(--primary))", label }: Props) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(v));
    return () => cancelAnimationFrame(id);
  }, [v]);
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}
      role="img" aria-label={label ? `${label}: ${v}%` : `${v}%`}>
      <svg width={size} height={size} className="-rotate-90 -scale-x-100" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-subtle)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)}
          style={{ transition: "stroke-dashoffset 900ms var(--ease-out)" }} />
      </svg>
      <span className="absolute text-center font-bold tabular-nums text-text-primary" style={{ fontSize: size * 0.28 }}>
        {v}<span className="text-text-muted" style={{ fontSize: size * 0.14 }}>%</span>
      </span>
    </div>
  );
}
