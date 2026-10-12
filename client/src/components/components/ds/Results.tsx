import type { ComponentType, ReactNode } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressBar } from "./ProgressBar";
import { ProgressRing } from "./ProgressRing";

/** بطاقة النتيجة العامة: حلقة درجة + نجوم + تعليق عام. تظهر بحركة pop-in ناعمة. */
export function ScoreCard({ score, feedback, title = "النَّتِيجَةُ الْكُلِّيَّةُ" }: { score: number; feedback?: ReactNode; title?: string }) {
  const good = score >= 70;
  const stars = Math.ceil(Math.max(0, Math.min(100, score)) / 20);
  return (
    <section className={cn("card card-pad pop-in flex flex-col items-center gap-5 sm:flex-row", good ? "bg-success-soft/50" : "bg-warning-soft/60")}
      aria-label={title}>
      <ProgressRing value={score} size={112} stroke={11} color={good ? "var(--success)" : "var(--warning)"} label={title} />
      <div className="min-w-0 flex-1 text-center sm:text-start">
        <p className="t-small text-text-secondary">{title}</p>
        <div className="my-1 flex justify-center gap-0.5 sm:justify-start" aria-label={`${stars} من 5 نجوم`} role="img">
          {[1, 2, 3, 4, 5].map(i => (
            <Star key={i} size={22} strokeWidth={1.75} className={i <= stars ? "text-accent" : "text-border-strong"}
              fill={i <= stars ? "currentColor" : "none"}
              style={i <= stars ? { animation: `pop-in 400ms var(--ease-out) ${i * 70}ms both` } : undefined} />
          ))}
        </div>
        {feedback && <p className="t-body text-text-primary">{feedback}</p>}
      </div>
    </section>
  );
}

/** معيار تقييم واحد: أيقونة + اسم + نسبة + شريط + تلميح. */
export function CriterionTile({ icon: Icon, label, value, tip, index = 0 }: {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>; label: string; value: number; tip?: string; index?: number;
}) {
  return (
    <div className="card card-pad stagger-in !p-4" style={{ ["--i" as string]: index }}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <span className="grid size-8 place-items-center rounded-lg bg-skill-soft text-skill"><Icon size={17} strokeWidth={1.85} /></span>
          {label}
        </span>
        <span className="text-lg font-bold tabular-nums text-text-primary">{value}%</span>
      </div>
      <ProgressBar value={value} label={label} />
      {tip && <p className="t-caption mt-2 text-text-muted">{tip}</p>}
    </div>
  );
}

/** قائمة نتائج مُصنَّفة (نقاط القوة / اقتراحات / أخطاء) بنبرة لونية واضحة وأيقونة (لا يُعتمد على اللون وحده). */
export function ResultList({ tone, icon: Icon, title, children }: {
  tone: "success" | "warning" | "error"; icon: ComponentType<{ size?: number; strokeWidth?: number }>; title: string; children: ReactNode;
}) {
  const t = { success: "bg-success-soft text-success", warning: "bg-warning-soft text-warning", error: "bg-error-soft text-error" }[tone];
  return (
    <section className="card card-pad stagger-in">
      <h3 className="t-card-title mb-3 flex items-center gap-2.5 text-text-primary">
        <span className={cn("grid size-9 place-items-center rounded-lg", t)}><Icon size={19} strokeWidth={1.85} /></span>
        {title}
      </h3>
      {children}
    </section>
  );
}
