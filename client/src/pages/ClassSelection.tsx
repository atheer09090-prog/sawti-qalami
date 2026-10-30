import { useLocation } from "wouter";
import { Check, GraduationCap } from "lucide-react";
import { ActivityHeader, StudentAvatar } from "@/components/ActivityUI";
import { getState, setState } from "@/lib/store";
const CLASSES = ["السادس ١", "السادس ٢", "السادس ٣", "السادس ٤"];
export default function ClassSelection() {
  const [, setLocation] = useLocation(); const student = getState();
  function handleClass(grade: string) { setState(prev => ({ ...prev, grade })); setLocation("/dashboard"); }
  return <div className="activity-page" dir="rtl"><ActivityHeader title="فصلك، وبداية رحلتك." eyebrow="بيانات التعلّم" description="اختر فصلك الدراسي لتكمل رحلتك مع صوتي قلمي." backLabel="الرئيسية" onBack={()=>setLocation("/dashboard")} icon={GraduationCap} />
    <div className="activity-body activity-body--narrow"><div className="student-identity"><StudentAvatar avatar={student.avatar} /><div><h2>{student.name || "مرحبًا بك"}</h2><p>{student.grade}</p></div></div>
    <h2 className="activity-section-title">اخْتَرْ فَصْلَكَ</h2><div className="class-choice-grid">{CLASSES.map(grade=><button key={grade} className="class-choice" aria-pressed={student.grade===grade} onClick={()=>handleClass(grade)}><GraduationCap size={28} strokeWidth={1.4} aria-hidden="true" /><strong>{grade}</strong><span>{student.grade===grade?<><Check size={14} /> فصلك الحالي</>:"اختر الفصل"}</span></button>)}</div></div>
  </div>;
}
