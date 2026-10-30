import { useLocation } from "wouter";
import { ArrowLeft, AudioLines, BookOpen, ChartNoAxesCombined, PenLine, Star } from "lucide-react";
import { ActivityHeader, StudentAvatar } from "@/components/ActivityUI";
import { ProgressMeter, EmptyState } from "@/components/ProductUI";
import { getState } from "@/lib/store";
export default function Assessments() {
  const [, setLocation] = useLocation(); const student=getState();
  function getGrade(v: number) { if(v>=90)return "ممتاز";if(v>=80)return "جيد جدًا";if(v>=70)return "جيد";if(v>=60)return "مقبول";return v===0?"بانتظار محاولتك":"تابع التدريب"; }
  const skills=[{name:"التَّحَدُّثُ",value:student.speakingProgress,icon:AudioLines,to:"/skills/speaking"},{name:"الْكِتَابَةُ",value:student.writingProgress,icon:PenLine,to:"/skills/writing"},{name:"التَّعَلُّمُ الذَّاتِيُّ",value:student.selfLearningProgress,icon:BookOpen,to:"/skills/self-learning"}];
  return <div className="activity-page results-page" dir="rtl"><ActivityHeader title="كل محاولة، خطوة إلى الأمام." eyebrow="تقدمي ونتائجي" description="شاهد أثر تدريبك، واختر المهارة التي تريد مواصلة تطويرها." backLabel="الرئيسية" onBack={()=>setLocation("/dashboard")} icon={ChartNoAxesCombined} />
    <div className="page-container results-content"><section className="results-identity"><div className="student-identity"><StudentAvatar avatar={student.avatar} /><div><h2>{student.name||"الطالب"}</h2><p>{student.grade}</p></div></div><div className="result-rewards"><span><Star size={19} aria-hidden="true" /><strong>{student.stars}</strong> نجوم</span><span><strong>{student.points}</strong> نقطة</span><span><strong>{student.completedLessons.length}</strong> دروس مكتملة</span></div></section>
      {skills.every(s=>s.value===0)&&student.completedLessons.length===0&&<EmptyState title="ابدأ أول تدريب لك" description="ستظهر هنا نتائج محاولاتك، خطوة بخطوة."><button className="sawti-btn-primary mt-4" onClick={()=>setLocation("/skills")}>استكشف المهارات</button></EmptyState>}
      <p className="results-explainer">كل نسبة تمثّل <strong>أفضل نتيجة حققتها</strong> في المهارة حتى الآن. يمكنك إعادة المحاولة دون أن تنخفض أفضل نتائجك.</p>
      <div className="result-skills-grid">{skills.map(({icon:Icon,...skill})=><section key={skill.to} className="result-skill"><span className="result-skill-icon"><Icon size={27} strokeWidth={1.4} aria-hidden="true" /></span><span className="result-grade">{getGrade(skill.value)}</span><h2>{skill.name}</h2><strong className="result-skill-value">{skill.value}<small>%</small></strong><ProgressMeter value={skill.value} label="أفضل نتيجة" /><button onClick={()=>setLocation(skill.to)} className="speaking-lesson-action">تابع تدريبك <ArrowLeft size={18} /></button></section>)}</div>
      {student.teacherComment&&<section className="teacher-note"><p className="studio-eyebrow">معلمك يواكب رحلتك</p><h2>ملاحظة معلمك</h2><p>{student.teacherComment}</p></section>}
    </div>
  </div>;
}
