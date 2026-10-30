import { ArrowLeft, BookOpen, PenLine } from "lucide-react";

export function SkillLibraryHeader({ kind, onBack }: { kind: "writing" | "self"; onBack: () => void }) {
  const writing = kind === "writing";
  const Icon = writing ? PenLine : BookOpen;
  return <>
    <button className="speaking-back" onClick={onBack}><ArrowLeft size={14} aria-hidden="true" /> مسارات التعلم</button>
    <header className={`skill-library-hero skill-library-hero--${kind}`}>
      <div><p className="studio-eyebrow">{writing ? "مَهَارَةُ الْكِتَابَةِ" : "مَهَارَةُ التَّعَلُّمِ الذَّاتِيِّ"}</p><h1>{writing ? "الأفكار تبدأ صغيرة." : "تعلّم بطريقتك."}<br /><span>{writing ? "وقلمك يمنحها حياة." : "وكل خطوة تصنع فرقًا."}</span></h1><p>{writing ? "اختر ما يلهمك، واكتب وصفك الخاص. أو ابدأ بتحدٍّ لغوي قصير." : "حدد هدفك، جرّب بنفسك، واكتشف ما يمكنك إنجازه."}</p></div>
      <div className="skill-library-art" aria-hidden="true"><span className="skill-art-sheet"><Icon size={64} strokeWidth={1.2} /></span><span className="skill-art-stroke" /><span className="skill-art-star">✧</span></div>
    </header>
  </>;
}
