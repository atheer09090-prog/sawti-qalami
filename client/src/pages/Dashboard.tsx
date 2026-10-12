import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Award, CheckCircle2, Layers, MessageSquareHeart, Mic, PenLine, Rocket, Sparkles, Star, Target, Trophy } from "lucide-react";
import { getState, setState, StudentData } from "@/lib/store";
import { playSound, setGender, audioFile } from "@/lib/audio";
import { OnboardingTour } from "@/components/OnboardingTour";
import { SusSurvey } from "@/components/SusSurvey";
import { Btn, SectionHeader, SkillCard, StatCard, ProgressRing, avatarSrc, skillClass, type Skill } from "@/components/ds";

/* ── نافذة الترحيب (مرة واحدة لكل جلسة متصفح) ── */
function WelcomePopup({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="welcome-title" onClick={onClose}>
      <div className="modal w-full max-w-sm p-8 text-center" onClick={e => e.stopPropagation()}>
        <span className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary"><Sparkles size={32} strokeWidth={1.75} /></span>
        <h2 id="welcome-title" className="font-reading text-primary" style={{ fontSize: "1.6rem", fontWeight: 700, lineHeight: 1.5 }}>
          مَرْحَباً يَا بَطَلَ اللُّغَةِ الْعَرَبِيَّةِ!
        </h2>
        <p className="t-body mt-2 text-text-secondary">هَيَّا نَتَعَلَّمُ وَنُبْدِعُ مَعًا</p>
        <Btn className="mt-6" block size="lg" onClick={onClose} autoFocus>هَيَّا نَبْدَأْ</Btn>
      </div>
    </div>
  );
}

function getLabel(v: number) {
  if (v >= 80) return "مُمْتَازٌ";
  if (v >= 60) return "جَيِّدٌ جِدًّا";
  if (v >= 40) return "يَحْتَاجُ تَطْوِيرًا";
  return "ابْدَأْ رِحْلَتَكَ";
}

const SKILLS: { id: Skill; to: string; icon: typeof Mic; title: string; description: string; key: keyof StudentData }[] = [
  { id: "speaking", to: "/skills/speaking", icon: Mic, title: "التَّحَدُّثُ", description: "تَحَدَّثْ عَنْ مَوْضُوعٍ وَسَيُحَلِّلُ النِّظَامُ تَسْجِيلَكَ.", key: "speakingProgress" },
  { id: "writing", to: "/skills/writing", icon: PenLine, title: "الْكِتَابَةُ", description: "اكْتُبْ نَصًّا وَاحْصُلْ عَلَى تَقْيِيمٍ وَتَصْحِيحٍ فَوْرِيٍّ.", key: "writingProgress" },
  { id: "learning", to: "/skills/self-learning", icon: Target, title: "التَّعَلُّمُ الذَّاتِيُّ", description: "حَدِّدْ هَدَفَكَ وَتَعَلَّمْ بِأُسْلُوبِكَ الْخَاصِّ.", key: "selfLearningProgress" },
];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [student, setStudent] = useState<StudentData>(getState());
  const [showPopup, setShowPopup] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const s = getState();
    if (!s.name) { setLocation("/"); return; }
    setStudent(s);

    // استعادة جنس الصوت من الأفاتار
    const av = s.avatar || "boy1";
    setGender(av === "girl1" || av === "girl2" ? "female" : "male");

    // الجولة التعريفية: مرة واحدة لكل طالب (تُحفَظ في حسابه)، وتُفتح لاحقًا من قائمة الحساب.
    if (!s.onboardingSeen) {
      setShowTour(true);
      return; // لا نعرض الترحيب فوق الجولة في نفس الزيارة
    }

    // الترحيب (صوت + نافذة) مرة واحدة لكل جلسة متصفح
    const sessionKey = `welcome_session_${s.name}`;
    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, "1");
      playSound(audioFile("/assets/welcome.mp3"), 0.5);
      const t = setTimeout(() => setShowPopup(true), 500);
      return () => clearTimeout(t);
    }
  }, []);

  function finishTour() {
    setState((prev) => ({ ...prev, onboardingSeen: true }));
    setStudent((prev) => ({ ...prev, onboardingSeen: true }));
    setShowTour(false);
  }

  const progress = {
    speaking: student.speakingProgress || 0,
    writing: student.writingProgress || 0,
    learning: student.selfLearningProgress || 0,
  };
  const overall = Math.round((progress.speaking + progress.writing + progress.learning) / 3);
  const completed = (student.completedLessons?.length || 0) + (student.selfLearning?.completedActivities || 0);

  // الخطوة التالية المقترحة = المهارة الأقل تقدّمًا (لا يوجد تتبّع لآخر نشاط)
  const next = [...SKILLS].sort((a, b) => progress[a.id] - progress[b.id])[0];
  const started = overall > 0;

  return (
    <div className="page-container page-section">
      {showTour && <OnboardingTour onFinish={finishTour} />}
      {showPopup && <WelcomePopup onClose={() => setShowPopup(false)} />}
      {showRating && <SusSurvey onClose={() => setShowRating(false)} />}

      {/* ── الترحيب ── */}
      <section className="card relative mb-6 overflow-hidden" aria-labelledby="hello">
        <div aria-hidden className="pointer-events-none absolute inset-y-0 start-0 w-2/3 opacity-[0.16] md:w-1/2"
          style={{ backgroundImage: "url('/assets/bg-main.png')", backgroundSize: "cover", backgroundPosition: "left center",
            maskImage: "linear-gradient(to right, black, transparent)", WebkitMaskImage: "linear-gradient(to right, black, transparent)" }} />
        <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="flex items-center gap-4 md:gap-5">
            <img src={avatarSrc(student.avatar)} alt="" className="size-16 shrink-0 rounded-full border-2 border-primary bg-white object-contain md:size-20" />
            <div className="min-w-0">
              <p className="t-caption text-text-muted">{student.grade}</p>
              <h1 id="hello" className="t-display text-text-primary">مَرْحَباً، {student.name} 👋</h1>
              <p className="t-body mt-1 text-text-secondary">أَنْتَ نَجْمٌ مُضِيءٌ فِي سَمَاءِ الْعِلْمِ وَالْمَعْرِفَةِ.</p>
            </div>
          </div>
          <Btn size="lg" icon={Rocket} className="md:shrink-0" onClick={() => setLocation(next.to)}>
            {started ? "تَابِعِ التَّدْرِيبَ" : "ابْدَأْ أَوَّلَ تَدْرِيبٍ"}
          </Btn>
        </div>
      </section>

      {/* ── ملخص التقدم ── */}
      <section aria-label="ملخص تقدمك" className="mb-8 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard index={0} icon={Star} tone="reward" label="النُّجُومُ" value={student.stars ?? 0} />
        <StatCard index={1} icon={Trophy} tone="primary" label="النِّقَاطُ" value={student.points ?? 0} />
        <StatCard index={2} icon={CheckCircle2} tone="learning" label="الْأَنْشِطَةُ الْمُكْتَمِلَةُ" value={completed} />
        <StatCard index={3} icon={Award} tone="writing" label="التَّقَدُّمُ الْعَامُّ" value={`${overall}%`} hint={getLabel(overall)} />
      </section>

      {/* ── الخطوة التالية ── */}
      <section className={`card card-pad mb-8 flex flex-col gap-5 sm:flex-row sm:items-center ${skillClass(next.id)}`} aria-label="الخطوة التالية">
        <ProgressRing value={progress[next.id]} size={92} stroke={9} label={next.title} />
        <div className="min-w-0 flex-1">
          <span className="badge badge-skill mb-1.5"><Sparkles size={14} aria-hidden /> الْخُطْوَةُ التَّالِيَةُ الْمُقْتَرَحَةُ</span>
          <h2 className="t-section text-text-primary">{next.title}</h2>
          <p className="t-small text-text-secondary">{started ? "هَذِهِ أَقَلُّ مَهَارَةٍ تَقَدُّمًا حَتَّى الْآنَ، وَسَتَرْتَفِعُ بِتَدْرِيبٍ قَصِيرٍ." : next.description}</p>
        </div>
        <Btn variant="secondary" size="lg" icon={ArrowLeft} className="sm:shrink-0" onClick={() => setLocation(next.to)}>
          {progress[next.id] > 0 ? "تَابِعْ" : "ابْدَأِ التَّدْرِيبَ"}
        </Btn>
      </section>

      {/* ── المهارات ── */}
      <section aria-label="المهارات">
        <SectionHeader title="الْمَهَارَاتُ" description="اخْتَرِ الْمَهَارَةَ الَّتِي تُرِيدُ التَّدَرُّبَ عَلَيْهَا."
          action={<Btn variant="ghost" size="sm" icon={Layers} onClick={() => setLocation("/skills")}>عَرْضُ الْكُلِّ</Btn>} />
        <div className="grid gap-4 md:grid-cols-3">
          {SKILLS.map((s, i) => (
            <SkillCard key={s.id} index={i} skill={s.id} icon={s.icon} title={s.title} description={s.description}
              progress={progress[s.id]} to={s.to} cta={progress[s.id] > 0 ? "تَابِعِ التَّدْرِيبَ" : "ابْدَأِ التَّدْرِيبَ"} />
          ))}
        </div>
      </section>

      {/* ── طلب التقييم (SUS) ── */}
      <section className="mt-8 flex flex-col items-start gap-3 rounded-[18px] border border-dashed border-border-strong bg-white/60 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="t-card-title text-text-primary">سَاعِدْنَا فِي تَحْسِينِ الْمَنَصَّةِ</h3>
          <p className="t-small text-text-secondary">قَيِّمْ تَجْرِبَتَكَ فِي دَقِيقَتَيْنِ، فَرَأْيُكَ يُهِمُّنَا.</p>
        </div>
        <Btn variant="outline" icon={MessageSquareHeart} onClick={() => setShowRating(true)}>قَيِّمْ تَجْرِبَتَكَ</Btn>
      </section>
    </div>
  );
}
