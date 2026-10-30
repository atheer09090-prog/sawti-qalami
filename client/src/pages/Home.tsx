import { ActivityHeader } from "@/components/ActivityUI";
import { Brand } from "@/components/ProductUI";
import { BookOpen } from "lucide-react";
import { useLocation } from "wouter";

/**
 * صفحة "عن البرنامج" — تشرح للطالب أو ولي الأمر أو المعلم ما هو برنامج
 * "صوتي قلمي"، وهدفه، وكيف يعمل، بأسلوب تعليمي واضح وبلا مبالغة تسويقية.
 */
export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div dir="rtl" className="activity-page about-page">
      <div className="public-brand page-container"><Brand /></div>
      <ActivityHeader title="عَنِ الْبَرْنَامَجِ" description="تعرّف على صوتي قلمي، وخذ خطوتك الأولى في رحلة العربية." eyebrow="مساحة لصوتك وإبداع لقلمك" onBack={()=>setLocation("/")} backLabel="تسجيل الدخول" icon={BookOpen} />
      <div className="page-container about-sections">
        <section className="surface-card bg-white rounded-2xl p-5 shadow text-right">
          <h2 className="font-bold text-lg mb-2" style={{ color: "#075348" }}>ما هو برنامج "صوتي قلمي"؟</h2>
          <p className="text-gray-600 text-sm leading-loose">
            "صوتي قلمي" برنامج تعليمي إلكتروني موجّه لطلاب الصف السادس، يهدف إلى مساعدة الطالب على
            تطوير مهارتَي التحدّث والكتابة باللغة العربية الفصحى من خلال أنشطة تفاعلية وتغذية راجعة فورية،
            بدلاً من الاعتماد فقط على التصحيح اليدوي التقليدي في الفصل.
          </p>
        </section>

        <section className="surface-card bg-white rounded-2xl p-5 shadow text-right">
          <h2 className="font-bold text-lg mb-2" style={{ color: "#075348" }}>كيف يساعدني البرنامج؟</h2>
          <ul className="text-gray-600 text-sm space-y-2 leading-loose">
            <li>🎙️ <strong>مهارة التحدث:</strong> تسجّل صوتك وأنت تتحدث عن موضوع معيّن، ويحلَّل تسجيلك تلقائيًا لتقييم تحدّثك: وضوح الكلام وبناء الجمل وترابط الأفكار.</li>
            <li>✏️ <strong>مهارة الكتابة:</strong> تكتب نصًّا حول موضوع، وتحصل على تصحيح وتقييم للأخطاء الإملائية والنحوية وترتيب الأفكار.</li>
            <li>📚 <strong>التعلّم الذاتي:</strong> أنشطة وألعاب لغوية قصيرة (مثل الهمزة) لتدريبك على قواعد محددة بأسلوب تفاعلي.</li>
            <li>📊 <strong>سجل التقدّم:</strong> تُحفظ نتائج محاولاتك تلقائيًا لتتابع تطورك مع الوقت.</li>
          </ul>
        </section>

        <section className="surface-card bg-white rounded-2xl p-5 shadow text-right">
          <h2 className="font-bold text-lg mb-2" style={{ color: "#075348" }}>كيف يتم التقييم؟</h2>
          <p className="text-gray-600 text-sm leading-loose">
            بعد تسجيل صوتك أو كتابة نصّك، يحلّل النظام إجابتك آليًا وفق معايير لغوية محددة (مثل وضوح الكلام،
            بناء الجملة، تنوّع المفردات، وترابط الأفكار)، ثم يعرض لك نتيجة كل معيار على حدة إلى جانب النتيجة
            الكلية، مع نقاط قوة وملاحظات لتحسين أدائك في المرة القادمة. النتيجة تقريبية وتهدف إلى مساعدتك على
            التدرّب، وليست بديلاً عن تقييم معلمك. في التحدث يعتمد التقييم على النص الذي يتعرّف عليه النظام من تسجيلك، ولا يقيس مخارج الحروف.
          </p>
        </section>

        <button
          onClick={() => setLocation("/")}
          className="w-full py-3 rounded-xl text-white font-bold"
          style={{ background: "var(--primary)" }}
        >
          فهمت، لنبدأ 🚀
        </button>
      </div>
    </div>
  );
}
