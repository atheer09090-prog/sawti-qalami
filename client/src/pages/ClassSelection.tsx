import { useLocation } from "wouter";
import { Check, School } from "lucide-react";
import { getState, setState } from "@/lib/store";
import { PageHeader, avatarSrc } from "@/components/ds";
import { cn } from "@/lib/utils";

const CLASSES = [
  "السادس ١", "السادس ٢", "السادس ٣", "السادس ٤",
];

export default function ClassSelection() {
  const [, setLocation] = useLocation();
  const student = getState();

  function handleClass(cls: string) {
    setState(prev => ({ ...prev, grade: cls }));
    setLocation("/dashboard");
  }

  return (
    <div dir="rtl" className="page-container page-narrow page-section">
      <PageHeader icon={School} title="تَحْدِيدُ الْفَصْلِ" description="اخْتَرْ فَصْلَكَ الدِّرَاسِيَّ."
        back={{ label: "الرَّئِيسِيَّةُ", to: "/dashboard" }} />

      <section className="card card-pad mb-6 flex items-center gap-3.5">
        <img src={avatarSrc(student.avatar)} alt="" className="size-14 rounded-full border-2 border-primary bg-white object-contain" />
        <div>
          <p className="font-semibold text-text-primary">{student.name}</p>
          <p className="t-small text-text-muted">{student.grade}</p>
        </div>
      </section>

      <h2 className="t-section mb-3 text-text-primary">اخْتَرْ فَصْلَكَ</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="الفصل الدراسي">
        {CLASSES.map((cls, i) => {
          const isSelected = student.grade === cls;
          return (
            <button key={cls} type="button" role="radio" aria-checked={isSelected} onClick={() => handleClass(cls)} style={{ ["--i" as string]: i }}
              className={cn("card card-interactive stagger-in flex min-h-[88px] flex-col items-center justify-center gap-1 p-4",
                isSelected && "!border-primary !bg-primary-soft")}>
              <span className="font-semibold text-text-primary">{cls}</span>
              {isSelected && <span className="badge badge-primary"><Check size={13} strokeWidth={2.5} aria-hidden /> فَصْلُكَ</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
