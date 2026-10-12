import { useLocation } from "wouter";
import { BarChart3, BookOpen, ClipboardCheck, Mic, PenLine } from "lucide-react";
import { Btn, PageHeader } from "@/components/ds";

/**
 * صفحة "عن البرنامج" — تشرح للطالب أو ولي الأمر أو المعلم ما هو برنامج
 * "صوتي قلمي"، وهدفه، وكيف يعمل، بأسلوب تعليمي واضح وبلا مبالغة تسويقية.
 */
const FEATURES = [
  { icon: Mic, tone: "bg-primary-soft text-primary", title: "مهارة التحدث", text: "تسجّل صوتك وأنت تتحدث عن موضوع معيّن، ويحلَّل تسجيلك تلقائيًا لتقييم تحدّثك: وضوح الكلام وبناء الجمل وترابط الأفكار." },
  { icon: PenLine, tone: "bg-writing-soft text-writing", title: "مهارة الكتابة", text: "تكتب نصًّا حول موضوع، وتحصل على تصحيح وتقييم للأخطاء الإملائية والنحوية وترتيب الأفكار." },
  { icon: BookOpen, tone: "bg-learning-soft text-learning", title: "التعلّم الذاتي", text: "أنشطة وألعاب لغوية قصيرة (مثل الهمزة) لتدريبك على قواعد محددة بأسلوب تفاعلي." },
  { icon: BarChart3, tone: "bg-reward-soft text-reward", title: "سجل التقدّم", text: "تُحفظ نتائج محاولاتك تلقائيًا لتتابع تطورك مع الوقت." },
];

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div dir="rtl" className="min-h-screen">
      <div className="border-b border-border bg-white/90">
        <div className="page-container flex h-16 items-center gap-2.5">
          <img src="/assets/logo.png" alt="" className="size-10 object-contain" />
          <span className="text-lg font-bold text-primary">صوتي قلمي</span>
        </div>
      </div>

      <div className="page-container page-narrow page-section">
        <PageHeader icon={ClipboardCheck} title="عَنِ الْبَرْنَامَجِ" back={{ label: "تسجيل الدخول", to: "/" }} />

        <div className="space-y-4">
          <section className="card card-pad stagger-in" style={{ ["--i" as string]: 0 }}>
            <h2 className="t-section mb-2 text-primary">ما هو برنامج "صوتي قلمي"؟</h2>
            <p className="t-body text-text-secondary">
              "صوتي قلمي" برنامج تعليمي إلكتروني موجّه لطلاب الصف السادس، يهدف إلى مساعدة الطالب على
              تطوير مهارتَي التحدّث والكتابة باللغة العربية الفصحى من خلال أنشطة تفاعلية وتغذية راجعة فورية،
              بدلاً من الاعتماد فقط على التصحيح اليدوي التقليدي في الفصل.
            </p>
          </section>

          <section className="card card-pad stagger-in" style={{ ["--i" as string]: 1 }}>
            <h2 className="t-section mb-4 text-primary">كيف يساعدني البرنامج؟</h2>
            <ul className="space-y-4">
              {FEATURES.map(({ icon: Icon, tone, title, text }) => (
                <li key={title} className="flex gap-3.5">
                  <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={22} strokeWidth={1.75} /></span>
                  <p className="t-body text-text-secondary"><strong className="font-semibold text-text-primary">{title}:</strong> {text}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="card card-pad stagger-in" style={{ ["--i" as string]: 2 }}>
            <h2 className="t-section mb-2 text-primary">كيف يتم التقييم؟</h2>
            <p className="t-body text-text-secondary">
              بعد تسجيل صوتك أو كتابة نصّك، يحلّل النظام إجابتك آليًا وفق معايير لغوية محددة (مثل وضوح الكلام،
              بناء الجملة، تنوّع المفردات، وترابط الأفكار)، ثم يعرض لك نتيجة كل معيار على حدة إلى جانب النتيجة
              الكلية، مع نقاط قوة وملاحظات لتحسين أدائك في المرة القادمة. النتيجة تقريبية وتهدف إلى مساعدتك على
              التدرّب، وليست بديلاً عن تقييم معلمك. في التحدث يعتمد التقييم على النص الذي يتعرّف عليه النظام من تسجيلك، ولا يقيس مخارج الحروف.
            </p>
          </section>

          <Btn size="lg" block onClick={() => setLocation("/")}>فهمت، لنبدأ</Btn>
        </div>
      </div>
    </div>
  );
}
