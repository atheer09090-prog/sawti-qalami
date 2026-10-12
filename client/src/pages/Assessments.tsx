import { useLocation } from "wouter";
import { BarChart3, Lightbulb, MessageCircle, Mic, PenLine, Rocket, Star, Target, Trophy } from "lucide-react";
import { getState } from "@/lib/store";
import { Btn, EmptyState, Notice, PageHeader, ProgressBar, avatarSrc, skillClass, type Skill } from "@/components/ds";

function getGrade(v: number) {
  if (v >= 90) return { label: "مُمْتَازٌ", badge: "badge-success" };
  if (v >= 80) return { label: "جَيِّدٌ جِدًّا", badge: "badge-info" };
  if (v >= 70) return { label: "جَيِّدٌ", badge: "badge-warning" };
  if (v >= 60) return { label: "مَقْبُولٌ", badge: "badge-warning" };
  return { label: "يَحْتَاجُ تَطْوِيرًا", badge: "badge-error" };
}

export default function Assessments() {
  const [, setLocation] = useLocation();
  const student = getState();

  const skills: { id: Skill; name: string; value: number; icon: typeof Mic }[] = [
    { id: "speaking", name: "التَّحَدُّثُ", value: student.speakingProgress, icon: Mic },
    { id: "writing", name: "الْكِتَابَةُ", value: student.writingProgress, icon: PenLine },
    { id: "learning", name: "التَّعَلُّمُ الذَّاتِيُّ", value: student.selfLearningProgress, icon: Target },
  ];
  const hasActivity = skills.some(s => s.value > 0) || student.stars > 0 || student.points > 0;

  return (
    <div className="page-container page-section">
      <PageHeader icon={BarChart3} title="تَقْيِيمَاتِي" description="نَتَائِجُكَ وَتَقَدُّمُكَ." back={{ label: "الرَّئِيسِيَّةُ", to: "/dashboard" }} />

      <section className="card card-pad stagger-in mb-4 flex flex-wrap items-center justify-between gap-4" style={{ ["--i" as string]: 0 }}>
        <div className="flex items-center gap-3.5">
          <img src={avatarSrc(student.avatar)} alt="" className="size-16 rounded-full border-2 border-primary bg-white object-contain" />
          <div>
            <h2 className="t-section text-text-primary">{student.name || "الطَّالِبُ"}</h2>
            <p className="t-small text-text-secondary">{student.grade}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-reward-soft px-4 py-2.5">
            <Star size={22} strokeWidth={1.75} fill="currentColor" className="text-reward" aria-hidden />
            <div><p className="text-xl font-bold leading-tight tabular-nums text-text-primary">{student.stars}</p><p className="t-caption text-text-secondary">النُّجُومُ</p></div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl bg-primary-soft px-4 py-2.5">
            <Trophy size={22} strokeWidth={1.75} className="text-primary" aria-hidden />
            <div><p className="text-xl font-bold leading-tight tabular-nums text-text-primary">{student.points}</p><p className="t-caption text-text-secondary">النُّقَاطُ</p></div>
          </div>
        </div>
      </section>

      <Notice tone="info" icon={Lightbulb} className="mb-6">
        <p className="t-small">
          كُلُّ نِسْبَةٍ أَدْنَاهُ تُمَثِّلُ <strong>أَفْضَلَ نَتِيجَةٍ حَقَّقْتَهَا</strong> فِي هَذِهِ الْمَهَارَةِ حَتَّى الْآنَ (وَلَيْسَتْ مُتَوَسِّطَ كُلِّ مُحَاوَلَاتِكَ)،
          حَتَّى تَتَشَجَّعَ عَلَى إِعَادَةِ الْمُحَاوَلَةِ دُونَ خَوْفٍ مِنْ خَفْضِ نَتِيجَتِكَ.
        </p>
      </Notice>

      {!hasActivity ? (
        <section className="card">
          <EmptyState icon={BarChart3} title="لَمْ تَبْدَأْ أَيَّ نَشَاطٍ بَعْدُ"
            description="سَتَظْهَرُ نَتَائِجُكَ هُنَا بَعْدَ أَوَّلِ تَدْرِيبٍ."
            action={<Btn icon={Rocket} onClick={() => setLocation("/skills")}>ابْدَأْ أَوَّلَ تَدْرِيبٍ</Btn>} />
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {skills.map((s, i) => {
            const grade = getGrade(s.value);
            const Icon = s.icon;
            return (
              <section key={s.id} className={`card card-pad stagger-in ${skillClass(s.id)}`} style={{ ["--i" as string]: i + 1 }}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-skill-soft text-skill"><Icon size={22} strokeWidth={1.75} /></span>
                    <h3 className="t-card-title text-text-primary">{s.name}</h3>
                  </div>
                  <span className={`badge ${grade.badge}`}>{grade.label}</span>
                </div>
                <ProgressBar value={s.value} large label={`نتيجتك في ${s.name}`} />
                <p className="mt-2 text-end text-lg font-bold tabular-nums" style={{ color: "var(--skill-strong, var(--skill))" }}>{s.value}%</p>
              </section>
            );
          })}
        </div>
      )}

      {student.teacherComment && (
        <section className="card card-pad stagger-in mt-4 flex gap-3.5" style={{ ["--i" as string]: 4 }}>
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><MessageCircle size={22} strokeWidth={1.75} /></span>
          <div>
            <h3 className="t-card-title text-primary">تَعْلِيقُ الْمُعَلِّمِ</h3>
            <p className="t-body mt-0.5 text-text-secondary">{student.teacherComment}</p>
          </div>
        </section>
      )}
    </div>
  );
}
