import { forwardRef, type ButtonHTMLAttributes, type ComponentType } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "danger-soft";
type Size = "sm" | "md" | "lg";

export interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** أثناء التنفيذ: يظهر مؤشر ويُمنع الضغط المتكرر. */
  loading?: boolean;
  icon?: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  block?: boolean;
}

/** زر موحّد (Primary / Secondary / Outline / Ghost / Danger) بحالات hover/active/focus/disabled/loading. */
export const Btn = forwardRef<HTMLButtonElement, BtnProps>(function Btn(
  { variant = "primary", size = "md", loading, icon: Icon, block, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn("btn", `btn-${variant}`, size === "lg" && "btn-lg", size === "sm" && "btn-sm", block && "btn-block", className)}
      {...rest}
    >
      {loading ? <span className="spinner" aria-hidden /> : Icon ? <Icon size={size === "lg" ? 20 : 18} strokeWidth={1.9} /> : null}
      {children}
    </button>
  );
});
