import { Link } from "wouter";
import { LearningCards } from "@/components/ProductUI";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { getState, setState, StudentData, logout } from "@/lib/store";
import { playSound, stopSound, setGender, stopAll, audioFile } from "@/lib/audio";
import { submitReview } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import { OnboardingTour } from "@/components/OnboardingTour";
import { SusSurvey } from "@/components/SusSurvey";

/* ── Welcome Popup ── */
function WelcomePopup({ name, onClose }: { name: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        className="program-dialog bg-white rounded-3xl p-8 text-center shadow-md mx-4"
        style={{ maxWidth: 340, animation: "popIn 0.35s ease-out" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-6xl mb-4">👋</div>
        <h2
          style={{ fontFamily: "var(--font-brand)", color: "#075348", fontSize: "1.6rem", fontWeight: 700, lineHeight: 1.3 }}
          dir="rtl"
        >
          مَرْحَباً يَا بَطَلَ اللُّغَةِ الْعَرَبِيَّةِ!
        </h2>
        <p className="text-gray-500 mt-2 mb-1" style={{ fontFamily: "var(--font-brand)" }} dir="rtl">
          هَيَّا نَتَعَلَّمُ وَنُبْدِعُ مَعًا ✨
        </p>
        <p
          className="text-amber-600 text-sm cursor-pointer mt-4 font-bold"
          style={{ fontFamily: "var(--font-brand)" }}
          onClick={onClose}
        >
          انْقُرْ لِلْمُتَابَعَةِ
        </p>
      </div>
      <style>{`
        @keyframes popIn {
          from { transform: scale(0.97); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function getLabel(v: number) {
  if (v >= 80) return "مُمْتَازٌ ⭐";
  if (v >= 60) return "جَيِّدٌ جِدًّا ⭐";
  if (v >= 40) return "يَحْتَاجُ تَطْوِيرًا ⭐";
  return "ابْدَأْ رِحْلَتَكَ";
}

/* ── ⭐ قيّم البرنامج ── */
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1 justify-center">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} onClick={() => onChange(i)} className="text-3xl leading-none">
          <span style={{ color: i <= value ? "#c6a260" : "#e5e7eb" }}>★</span>
        </button>
      ))}
    </div>
  );
}

function RatingModal({ studentName, onClose }: { studentName: string; onClose: () => void }) {
  const [quality, setQuality] = useState(0);
  const [ease, setEase] = useState(0);
  const [benefit, setBenefit] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!quality || !ease || !benefit) return;
    setSubmitting(true);
    const ok = await submitReview({ student: studentName, quality, ease, benefit, comment: comment.trim() });
    setSubmitting(false);
    if (ok) setDone(true);
    else toast.error("تعذّر إرسال تقييمك. تحقّق من اتصالك بالإنترنت وحاول مرة أخرى.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div className="program-dialog bg-white rounded-3xl p-6 shadow-md w-full max-w-sm" dir="rtl" onClick={e => e.stopPropagation()}>
        {!done ? (
          <>
            <h2 className="text-center font-bold text-lg mb-4" style={{ color: "#075348", fontFamily: "var(--font-brand)" }}>
              ⭐ قَيِّمْ تَجْرِبَتَكَ مَعَ الْبَرْنَامَجِ
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-center text-sm text-gray-500 mb-1">جَوْدَةُ الْمُحْتَوَى</p>
                <StarPicker value={quality} onChange={setQuality} />
              </div>
              <div>
                <p className="text-center text-sm text-gray-500 mb-1">سُهُولَةُ الِاسْتِخْدَامِ</p>
                <StarPicker value={ease} onChange={setEase} />
              </div>
              <div>
                <p className="text-center text-sm text-gray-500 mb-1">مِقْدَارُ الْفَائِدَةِ</p>
                <StarPicker value={benefit} onChange={setBenefit} />
              </div>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                placeholder="شَارِكْنَا رَأْيَكَ (اِخْتِيَارِيٌّ)..."
                className="w-full h-20 p-3 rounded-xl border-2 border-gray-200 text-right resize-none focus:border-green-500 focus:outline-none text-sm"
                style={{ fontFamily: "var(--font-brand)" }} />
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={onClose} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-gray-500 font-bold">إِلْغَاءٌ</button>
              <button onClick={handleSubmit} disabled={!quality || !ease || !benefit || submitting}
                className="flex-1 py-2.5 rounded-xl text-white font-bold disabled:opacity-40"
                style={{ background: "#075348" }}>
                {submitting ? "..." : "إِرْسَالٌ"}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-5xl mb-3">🌟</p>
            <p className="font-bold text-lg" style={{ color: "#075348" }}>شُكْرًا لَكَ عَلَى رَأْيِكَ!</p>
            <p className="text-gray-500 text-sm mt-1">يُسَاعِدُنَا تَقْيِيمُكَ عَلَى تَطْوِيرِ الْبَرْنَامَجِ بِاسْتِمْرَارٍ.</p>
            <button onClick={onClose} className="mt-4 px-6 py-2 rounded-xl text-white font-bold" style={{ background: "#075348" }}>
              إِغْلَاقٌ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

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

    // Restore gender from avatar
    const av = s.avatar || "boy1";
    setGender(av === "girl1" || av === "girl2" ? "female" : "male");

    // الجولة التعريفية: تُعرض مرة واحدة فقط لكل طالب (وليس لكل جلسة
    // متصفح كالترحيب)، ويمكن فتحها مرة أخرى لاحقًا من زر "؟" في الأعلى.
    if (!s.onboardingSeen) {
      setShowTour(true);
      return; // لا داعي لعرض الترحيب أيضًا فوق الجولة في نفس الزيارة
    }

    // Play welcome ONCE per browser session (not once ever)
    const sessionKey = `welcome_session_${s.name}`;
    const alreadyShown = sessionStorage.getItem(sessionKey);
    if (!alreadyShown) {
      sessionStorage.setItem(sessionKey, "1");
      playSound(audioFile("/assets/welcome.mp3"), 0.5);
      const t = setTimeout(() => setShowPopup(true), 500);
      return () => { clearTimeout(t); };
    }
    // Already shown this session — no sound, no popup
  }, []);

  function finishTour() {
    setState((prev) => ({ ...prev, onboardingSeen: true }));
    setStudent((prev) => ({ ...prev, onboardingSeen: true }));
    setShowTour(false);
  }

  const chartData = [
    { name: "التَّحَدُّث", value: student.speakingProgress, fill: "#075348" },
    { name: "الْكِتَابَة", value: student.writingProgress, fill: "#b79c69" },
    { name: "التَّعَلُّم", value: student.selfLearningProgress, fill: "#8b9d78" },
  ];

  return (
    <div
      dir="rtl"
      style={{ fontFamily: "var(--font-brand)", minHeight: "100vh" }}
    >
      {showTour && <OnboardingTour onFinish={finishTour} />}
      {showPopup && <WelcomePopup name={student.name} onClose={() => setShowPopup(false)} />}
      <div className="page-container studio-dashboard">
        <header className="studio-welcome"><div><p className="studio-eyebrow">مساحتك للتعلّم · {student.grade}</p><h1>مرحبًا، {student.name}<span>مساحة لصوتك وإبداع لقلمك</span></h1><p>هَيَّا نَتَعَلَّمُ وَنُبْدِعُ مَعًا</p><Link href="/skills" className="studio-text-link">اختر تدريبك اليوم <span aria-hidden="true">↖</span></Link></div><div className="studio-art" aria-hidden="true"><img src="/assets/learning-together.webp" alt="" /><span className="studio-art-label">أتعلم · أبدع · أغير</span></div></header>
        <div className="studio-stats" aria-label="ملخص تقدمك">
          {[{ label: "نقاطي", value: student.points }, { label: "نجومي", value: student.stars }, { label: "الدروس المكتملة", value: student.completedLessons.length }, { label: "التقدم العام", value: `${Math.round((student.speakingProgress + student.writingProgress + student.selfLearningProgress) / 3)}%` }].map(stat => <div key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}
        </div>
        <div className="studio-content"><section className="studio-practice"><div className="studio-section-heading"><div><p className="studio-eyebrow">خطوتك التالية</p><h2>ماذا ستبدع اليوم؟</h2></div><Link href="/skills">كل المسارات ←</Link></div><LearningCards /></section>
        <aside className="studio-progress"><div className="studio-section-heading"><div><p className="studio-eyebrow">كل محاولة تصنع فرقًا</p><h2>أثر تعلّمك</h2></div></div><ResponsiveContainer width="100%" height={185}><BarChart data={chartData} margin={{ top: 12, right: 4, left: -25, bottom: 0 }}><XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "var(--font-brand)" }} axisLine={false} tickLine={false} /><YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={30}>{chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}</Bar></BarChart></ResponsiveContainer><div className="progress-legend">{chartData.map(d => <div key={d.name}><span>{d.name}</span><strong>{d.value}%</strong></div>)}</div><Link className="studio-report-link" href="/assessments">اطّلع على نتائجك <span aria-hidden="true">←</span></Link></aside></div>
        {student.teacherComment && <section className="surface-card p-6 mt-6"><h2 className="text-lg font-semibold mb-2">ملاحظة معلمك</h2><p>{student.teacherComment}</p></section>}
        <div className="flex flex-wrap justify-center gap-3 py-8"><button className="sawti-btn-outline" onClick={() => setShowTour(true)}>دليل الاستخدام</button><button className="sawti-btn-outline" onClick={() => setShowRating(true)}>قيّم تجربتك</button></div>
      </div>

      {showRating && <SusSurvey onClose={() => setShowRating(false)} />}
    </div>
  );
}