import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONES = {
  primary: "bg-primary-soft text-primary",
  writing: "bg-writing-soft text-writing",
  learning: "bg-learning-soft text-learning",
  reward: "bg-reward-soft text-reward",
  neutral: "bg-surface-subtle text-text-secondary",
} as const;

interface Props {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: keyof typeof TONES;
  index?: number;
  className?: string;
}

/** بطاقة إحصاء: أيقونة ← رقم كبير ← وصف. */
export function StatCard({ icon: Icon, label, value, hint, tone = "primary", index = 0, className }: Props) {
  return (
    <div className={cn("card card-pad stagger-in flex items-center gap-4", className)} style={{ ["--i" as string]: index }}>
      <span className={cn("grid size-12 shrink-0 place-items-center rounded-xl", TONES[tone])}>
        <Icon size={24} strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="t-small text-text-secondary">{label}</p>
        <p className="text-2xl font-bold leading-tight tabular-nums text-text-primary">{value}</p>
        {hint && <p className="t-caption text-text-muted">{hint}</p>}
      </div>
    </div>
  );
}
