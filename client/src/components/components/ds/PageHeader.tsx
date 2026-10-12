import type { ComponentType, ReactNode } from "react";
import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { skillClass, type Skill } from "./helpers";

interface Props {
  title: ReactNode;
  description?: ReactNode;
  icon?: ComponentType<{ size?: number; strokeWidth?: number }>;
  skill?: Skill;
  /** رجوع واضح: يُظهر "إلى أين؟" بدل سهم مبهم. */
  back?: { label: string; to?: string; onClick?: () => void };
  actions?: ReactNode;
  className?: string;
}

/** رأس الصفحة الموحّد: رجوع ← عنوان ← وصف ← إجراء رئيسي. */
export function PageHeader({ title, description, icon: Icon, skill, back, actions, className }: Props) {
  const [, setLocation] = useLocation();
  return (
    <header className={cn("mb-6 md:mb-8 page-enter", skillClass(skill), className)}>
      {back && (
        <button
          type="button"
          onClick={() => (back.onClick ? back.onClick() : setLocation(back.to || "/dashboard"))}
          className="group mb-3 -mr-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary"
        >
          <ArrowRight size={16} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
          {back.label}
        </button>
      )}
      <div className="flex flex-wrap items-start gap-4">
        {Icon && (
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-skill-soft text-skill md:size-14">
            <Icon size={26} strokeWidth={1.75} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="t-page-title text-text-primary">{title}</h1>
          {description && <p className="t-body mt-1 text-text-secondary">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function SectionHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="t-section text-text-primary">{title}</h2>
        {description && <p className="t-small text-text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}
