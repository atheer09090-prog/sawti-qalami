import type { ComponentType, ReactNode } from "react";
import { AlertCircle, RotateCw } from "lucide-react";
import { Btn } from "./Btn";
import { cn } from "@/lib/utils";

/** حالة فارغة: أيقونة + عنوان + وصف + إجراء. */
export function EmptyState({ icon: Icon, title, description, action, className }: {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>; title: string; description?: string; action?: ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-10 text-center", className)}>
      <span className="mb-4 grid size-16 place-items-center rounded-2xl bg-surface-subtle text-text-muted"><Icon size={30} strokeWidth={1.5} /></span>
      <h3 className="t-card-title text-text-primary">{title}</h3>
      {description && <p className="t-small mt-1 max-w-sm text-text-secondary">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** حالة معالجة (تحليل صوت/تقييم): أيقونة نابضة + نص + نقاط متحركة. */
export function ProcessingState({ icon: Icon, title, description, className }: {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>; title: string; description?: string; className?: string;
}) {
  return (
    <div role="status" aria-live="polite" className={cn("card card-pad flex flex-col items-center py-10 text-center", className)}>
      <span className="relative mb-5 grid size-16 place-items-center rounded-full bg-skill-soft text-skill">
        <span className="absolute inset-0 rounded-full bg-skill-soft" style={{ animation: "pulse-ring 1.6s ease-out infinite" }} aria-hidden />
        <Icon size={30} strokeWidth={1.75} />
      </span>
      <h3 className="t-card-title text-text-primary">{title}</h3>
      {description && <p className="t-small mt-1 text-text-secondary">{description}</p>}
      <div className="dot-loader mt-4 text-skill" aria-hidden><span /><span /><span /></div>
    </div>
  );
}

/** خطأ مضمَّن مع إعادة المحاولة. */
export function ErrorState({ message, onRetry, retryLabel = "حاول مرة أخرى", className }: {
  message: ReactNode; onRetry?: () => void; retryLabel?: string; className?: string;
}) {
  return (
    <div role="alert" className={cn("alert alert-error items-center", className)}>
      <AlertCircle size={22} strokeWidth={1.75} className="shrink-0" aria-hidden />
      <p className="flex-1 leading-relaxed">{message}</p>
      {onRetry && <Btn variant="danger-soft" size="sm" icon={RotateCw} onClick={onRetry}>{retryLabel}</Btn>}
    </div>
  );
}

/** تنبيه عام: success / warning / info. */
export function Notice({ tone, children, icon: Icon, className }: {
  tone: "success" | "warning" | "info" | "error"; children: ReactNode; icon?: ComponentType<{ size?: number; strokeWidth?: number }>; className?: string;
}) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("alert", `alert-${tone}`, className)}>
      {Icon && <Icon size={20} strokeWidth={1.75} />}
      <div className="flex-1">{children}</div>
    </div>
  );
}
