import { ArrowRight } from "lucide-react";

interface Props {
  onBack: () => void;
  /** عملات/موارد اللعبة (رموز اللعبة نفسها، لذلك تبقى emoji هنا كجزء من عالم اللعبة) */
  stats: { icon: string; value: number; label: string }[];
  /** لون الشريط الخلفي لينسجم مع مشهد اللعبة */
  tint?: string;
}

/** شريط علوي موحّد للألعاب الغامرة الثلاث: رجوع واضح + موارد اللعبة. */
export function GameTopBar({ onBack, stats, tint = "rgba(12,20,16,0.5)" }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 text-white backdrop-blur-sm md:px-6" style={{ background: tint }}>
      <button type="button" onClick={onBack}
        className="group inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-[15px] font-semibold transition-colors hover:bg-white/15">
        <ArrowRight size={18} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
        الْأَلْعَابُ
      </button>
      <div className="flex items-center gap-2" role="status" aria-label="موارد اللعبة">
        {stats.map(s => (
          <span key={s.label} title={s.label} aria-label={`${s.label}: ${s.value}`}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-white/15 px-3.5 text-[15px] font-bold tabular-nums">
            <span aria-hidden>{s.icon}</span>{s.value}
          </span>
        ))}
      </div>
    </div>
  );
}
