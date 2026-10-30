import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, BookOpen, ChartNoAxesCombined, Home, Layers, LogOut, Mic, PenLine, Star } from "lucide-react";
import { getState, subscribe, logout } from "@/lib/store";

export function Brand({ large = false }: { large?: boolean }) {
  return <img src="/assets/brand-logo-transparent.png" alt="صوتي قلمي — أتعلم، أبدع، أغير" className={large ? "brand-logo-large" : "brand-logo"} />;
}
export function ProductShell({ children }: { children: ReactNode }) {
  const [path, navigate] = useLocation();
  const [student, setStudent] = useState(getState);
  useEffect(() => subscribe(() => setStudent(getState())), []);
  useEffect(() => { setStudent(getState()); window.scrollTo(0, 0); }, [path]);
  const visible = path === "/class-selection" || path === "/dashboard" || path.startsWith("/skills") || path === "/assessments" || path === "/writing-games";
  const links = [{ to: "/dashboard", label: "الرئيسية", icon: Home }, { to: "/skills", label: "مسارات التعلم", icon: Layers }, { to: "/assessments", label: "تقدمي ونتائجي", icon: ChartNoAxesCombined }];
  return <>
    {visible && <header className="product-header" dir="rtl"><div className="product-nav-container">
      <Link href="/dashboard" aria-label="صوتي قلمي — الرئيسية" className="brand-link"><Brand /></Link>
      <nav className="product-nav" aria-label="التنقل الرئيسي">{links.map(({ to, label, icon: Icon }) => {
        const active = to === "/skills" ? path.startsWith(to) || path.startsWith("/writing-games") : path === to;
        return <Link key={to} href={to} aria-current={active ? "page" : undefined}><Icon size={19} aria-hidden="true" /><span>{label}</span></Link>;
      })}</nav>
      <div className="account-summary"><span className="reward-count"><Star size={16} aria-hidden="true" />{student.stars}</span><span className="account-name">{student.name}</span>
      <button type="button" className="icon-control" aria-label="تسجيل الخروج" title="تسجيل الخروج" onClick={() => { logout(); navigate("/"); }}><LogOut size={19} /></button></div>
    </div></header>}
    <div key={path} className={visible ? "route-enter has-product-nav" : "route-enter"}>{children}</div>
  </>;
}
export function PageHeader({ title, description, eyebrow, illustration }: { title: string; description?: string; eyebrow?: string; illustration?: "learning" | "landscape" }) {
  return <div className={`page-heading${illustration ? ` page-heading--${illustration}` : ""}`}>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p>{description}</p>}</div>;
}
export function ProgressMeter({ value, label }: { value: number; label: string }) {
  const n = Math.max(0, Math.min(100, value || 0));
  return <div className="progress-meter"><div className="progress-label"><span>{label}</span><strong>{n}%</strong></div><div role="progressbar" aria-label={label} aria-valuenow={n} aria-valuemin={0} aria-valuemax={100} className="progress-track"><span style={{ transform: `scaleX(${n / 100})` }} /></div></div>;
}
const journeys = [
  { key: "speakingProgress" as const, to: "/skills/speaking", title: "مهارة التحدث", description: "تَعَلَّمِ التَّعْبِيرَ الشَّفَهِيَّ وَالتَّحَدُّثَ بِثِقَةٍ", icon: Mic, tags: ["وَصْفُ رِحْلَةٍ صَيْفِيَّةٍ", "قِرَاءَةٌ مَنْشُورٌ تَوْعَوِيٌّ", "التَّعْبِيرُ عَنِ الرَّأْيِ"] },
  { key: "writingProgress" as const, to: "/skills/writing", title: "مهارة الكتابة", description: "طَوِّرْ أُسْلُوبَكَ الْكِتَابِيَّ وَإِبْدَاعَكَ اللُّغَوِيَّ", icon: PenLine, tags: ["وَصْفُ الْمَنْزِلِ", "وَصْفُ الْحَيِّ", "وَصْفُ الْمَسْجِدِ"] },
  { key: "selfLearningProgress" as const, to: "/skills/self-learning", title: "مهارة التعلم الذاتي", description: "اكْتَشِفْ وَتَعَلَّمْ بِاسْتِقْلَالِيَّةٍ وَإِبْدَاعٍ", icon: BookOpen, tags: ["تَقْيِيمُ الذَّاتِ", "الْبَحْثُ وَالِاسْتِكْشَافُ", "الْمَشَارِيعُ الإِبْدَاعِيَّةُ"] },
];
export function LearningCards({ detailed = false }: { detailed?: boolean }) {
  const student = getState();
  if (!detailed) return <div className="practice-paths">{journeys.map(({ key, to, title }, i) => <Link href={to} key={key} className={`practice-path practice-path--${i + 1}`}>
    <div className="practice-illustration" aria-hidden="true"><JourneyIllustration kind={i} /></div>
    <div className="practice-path-copy"><span className="practice-path-kicker">{["أفكارك تستحق أن تُسمع", "من فكرة إلى حكاية", "فضولك بداية الطريق"][i]}</span><h3>{title}</h3><p>{["عبّر عن رأيك، واحكِ بأسلوبك.", "اكتب، جرّب، واصنع نصّك الخاص.", "اسأل واكتشف، خطوة بخطوة."][i]}</p><ProgressMeter value={student[key]} label="تقدمك" /></div>
    <span className="practice-path-arrow" aria-label={student[key] ? "تابع التدريب" : "ابدأ التدريب"}><ArrowLeft size={21} aria-hidden="true" /></span>
  </Link>)}</div>;
  return <div className={`learning-grid ${detailed ? "learning-grid--paths" : "learning-grid--studio"}`}>{journeys.map(({ key, to, title, description, icon: Icon, tags }, i) => <Link href={to} key={key} className={`journey-card journey-card--${i + 1}`} style={{ animationDelay: `${i * 50}ms` }}>
    <div className="journey-top"><span className="journey-icon"><Icon size={25} strokeWidth={1.7} aria-hidden="true" /></span><span className="journey-number" aria-hidden="true">{["01", "02", "03"][i]}</span></div>
    <div className="journey-copy"><h2>{title}</h2><p>{description}</p>{detailed && <div className="journey-tags">{tags.map(t => <span key={t}>{t}</span>)}</div>}</div>
    {!detailed && i === 0 && <div className="voice-motif" aria-hidden="true">{[14,28,44,24,58,76,46,62,34,52,22,40,16].map((height,index) => <span key={index} style={{height}} />)}</div>}
    <div className="journey-bottom"><ProgressMeter value={student[key]} label="التقدم في المسار" /><span className="journey-action">{student[key] ? "تابع التدريب" : "ابدأ التدريب"}<ArrowLeft size={18} aria-hidden="true" /></span></div>
  </Link>)}</div>;

}
function JourneyIllustration({ kind }: { kind: number }) {
  return <svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
    {kind === 0 ? <><path d="M24 76C8 48 28 19 62 25c32-22 64 3 56 37 20 25-3 58-33 52-28 13-63-6-61-38Z" fill="#d5e6dc" /><path d="M42 44h55a12 12 0 0 1 12 12v27a12 12 0 0 1-12 12H69l-17 13 3-13H42a12 12 0 0 1-12-12V56a12 12 0 0 1 12-12Z" fill="#fffdf2" stroke="#7da293" strokeWidth="2" /><path d="M48 66v7m10-15v23m11-32v40m11-31v23m11-15v7" stroke="#256353" strokeWidth="5" strokeLinecap="round" /><circle cx="109" cy="35" r="6" fill="#c4a66e" /><path d="m24 100 5 5m-5 0 5-5" stroke="#c4a66e" strokeWidth="2" /></> : kind === 1 ? <><path d="M29 38c12-20 43-23 63-9 31-5 43 30 25 50 4 34-37 51-56 30-31 10-55-21-32-42-10-9-9-22 0-29Z" fill="#eee0c4" /><g transform="rotate(-9 70 70)"><rect x="33" y="30" width="66" height="84" rx="7" fill="#fffdf3" stroke="#bba578" strokeWidth="2" /><path d="M47 30v84" stroke="#e4cba4" strokeWidth="2" /><path d="M57 49h28M57 61h22M57 73h28M57 85h16" stroke="#b7c7b8" strokeWidth="3" strokeLinecap="round" /></g><path d="m78 94 23-49 8 4-23 49-10 9 2-13Z" fill="#327762" stroke="#1f594a" strokeWidth="2" /><path d="m78 94 8 4-10 9 2-13Z" fill="#d5b78b" /><path d="m24 46 5-8m-9 3 12 2" stroke="#b69b64" strokeWidth="2" strokeLinecap="round" /></> : <><path d="M21 76c-9-29 12-55 39-49 27-18 64 6 58 34 19 29-5 62-38 52-31 13-62-5-59-37Z" fill="#e0e6d4" /><path d="M70 54c-15-12-30-14-46-10v53c17-3 31 0 46 12 15-12 29-15 46-12V44c-16-4-31-2-46 10Z" fill="#fffdf3" stroke="#8b9f79" strokeWidth="2" strokeLinejoin="round" /><path d="M70 55v53M35 59c9 0 16 2 23 6M35 71c9 0 16 2 23 6M82 65c7-4 14-6 23-6M82 77c7-4 14-6 23-6" stroke="#b0bea0" strokeWidth="2" strokeLinecap="round" /><path d="m70 18 3 9 9 3-9 3-3 9-3-9-9-3 9-3 3-9Z" fill="#bf9d5e" /><circle cx="113" cy="27" r="3" fill="#8aa17d" /></>}
  </svg>;
}
export function EmptyState({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className="empty-state"><BookOpen size={28} aria-hidden="true" /><h3>{title}</h3><p>{description}</p>{children}</div>;
}
export function PageSkeleton() {
  return <div className="page-container skeleton-page" role="status" aria-label="جارٍ تحميل الصفحة"><span className="sr-only">جارٍ تحميل الصفحة</span><div className="skeleton-line" /><div className="skeleton-line short" /><div className="learning-grid">{[0, 1, 2].map(i => <div className="skeleton-card" key={i}><div className="skeleton-line" /><div className="skeleton-line short" /></div>)}</div></div>;
}
