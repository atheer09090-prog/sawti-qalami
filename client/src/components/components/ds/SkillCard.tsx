import type { ComponentType } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressBar } from "./ProgressBar";
import { skillClass, type Skill } from "./helpers";

interface Props {
  skill: Skill;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  description: string;
  progress?: number;
  cta: string;
  to: string;
  index?: number;
  /** وسوم المواضيع (محتوى تعليمي) */
  tags?: string[];
}

/** بطاقة مهارة (عنصر تفاعلي واحد = رابط واحد، بلا أزرار متداخلة). */
export function SkillCard({ skill, icon: Icon, title, description, progress, cta, to, index = 0, tags }: Props) {
  const [, setLocation] = useLocation();
  return (
    <a
      href={to}
      onClick={(e) => { if (!e.metaKey && !e.ctrlKey) { e.preventDefault(); setLocation(to); } }}
      className={cn("card card-interactive card-pad stagger-in group flex flex-col gap-4 text-right", skillClass(skill))}
      style={{ ["--i" as string]: index }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-14 place-items-center rounded-2xl bg-skill-soft text-skill transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
          <Icon size={28} strokeWidth={1.75} />
        </span>
        {progress !== undefined && <span className="badge badge-skill tabular-nums">{Math.round(progress)}%</span>}
      </div>
      <div className="flex-1">
        <h3 className="t-card-title text-text-primary">{title}</h3>
        <p className="t-small mt-1 text-text-secondary">{description}</p>
      </div>
      {tags && tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="مواضيع المهارة">
          {tags.map(t => <li key={t} className="badge badge-skill font-medium">{t}</li>)}
        </ul>
      )}
      {progress !== undefined && <ProgressBar value={progress} label={`تقدّمك في ${title}`} />}
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-skill-strong" style={{ color: "var(--skill-strong, var(--skill))" }}>
        {cta}
        <ArrowLeft size={16} strokeWidth={2} className="transition-transform duration-200 group-hover:-translate-x-1" aria-hidden />
      </span>
    </a>
  );
}
