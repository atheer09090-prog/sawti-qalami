import { cn } from "@/lib/utils";

/** شريط تقدم يتحرّك عند الظهور (transform فقط). يلوّنه class المهارة skill-* من الأب. */
export function ProgressBar({ value, label, large, className }: { value: number; label?: string; large?: boolean; className?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={className}>
      <div className="progress" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}
        style={large ? { height: "0.75rem" } : undefined}>
        <div className="progress-fill" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}
