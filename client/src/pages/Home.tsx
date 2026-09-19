import { useLocation } from "wouter";

/**
 * صفحة "عن المنصة" — تشرح للطالب أو ولي الأمر أو المعلم ما هي منصة
 * "صوتي قلمي"، وهدفها، وكيف تعمل، بأسلوب تعليمي واضح وبلا مبالغة تسويقية.
 */
export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "#f5f0e8", minHeight: "100vh" }}>
      <div className="p-4" style={{ background: "linear-gradient(135deg, #1a5c2a 0%, #2d7a3e 100%)" }}>
        <button onClick={() => setLocation("/")} className="text-green-200 text-sm mb-2">← تسجيل الدخول</button>
        <div className="flex items-center gap-2">
          <img src="/assets/logo.png" alt="" className="w-9 h-9 object-contain" />
          <h1 className="text-2xl font-bold text-white">عَنِ الْمَنَصَّةِ</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <section className="bg-white rounded-2xl p-5 shadow text-right">
          <h2 className="font-bold text-lg mb-2" style={{ color: "#1a5c2a" }}>ما هي منصة "صوتي قلمي"؟</h2>
          <p className="text-gray-600 text-sm leading-loose">
            "صوتي قلمي" منصة تعليمية إلكترونية موجّهة لطلاب الصف السادس، تهدف إلى مساعدة الطالب على
            تطوير مهارتَي التحدّث والكتابة باللغة العربية الفصحى من خلال أنشطة تفاعلية وتغذية راجعة فورية،
            بدلاً من الاعتماد فقط على التصحيح اليدوي التقليدي في الفصل.
          </p>
        </section>

        <section className="bg-white rounded-2xl p-5 shadow text-right">
          <h2 className="font-bold text-lg mb-2" style={{ color: "#1a5c2a" }}>كيف تساعدني المنصة؟</h2>
          <ul className="text-gray-600 text-sm space-y-2 leading-loose">
            <li>🎙️ <strong>مهارة التحدث:</strong> تسجّل صوتك وأنت تتحدث عن موضوع معيّن، ويحلَّل تسجيلك تلقائيًا لتقييم النطق وبناء الجمل وترابط الأفكار.</li>
            <li>✏️ <strong>مهارة الكتابة:</strong> تكتب نصًّا حول موضوع، وتحصل على تصحيح وتقييم للأخطاء الإملائية والنحوية وترتيب الأفكار.</li>
            <li>📚 <strong>التعلّم الذاتي:</strong> أنشطة وألعاب لغوية قصيرة (مثل الهمزة) لتدريبك على قواعد محددة بأسلوب تفاعلي.</li>
            <li>📊 <strong>سجل التقدّم:</strong> تُحفظ نتائج محاولاتك تلقائيًا لتتابع تطورك مع الوقت.</li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl p-5 shadow text-right">
          <h2 className="font-bold text-lg mb-2" style={{ color: "#1a5c2a" }}>كيف يتم التقييم؟</h2>
          <p className="text-gray-600 text-sm leading-loose">
            بعد تسجيل صوتك أو كتابة نصّك، يحلّل النظام إجابتك آليًا وفق معايير لغوية محددة (مثل وضوح النطق،
            بناء الجملة، تنوّع المفردات، وترابط الأفكار)، ثم يعرض لك نتيجة كل معيار على حدة إلى جانب النتيجة
            الكلية، مع نقاط قوة وملاحظات لتحسين أدائك في المرة القادمة. النتيجة تقريبية وتهدف إلى مساعدتك على
            التدرّب، وليست بديلاً عن تقييم معلمك.
          </p>
        </section>

        <button
          onClick={() => setLocation("/")}
          className="w-full py-3 rounded-xl text-white font-bold"
          style={{ background: "linear-gradient(135deg, #1a5c2a, #2d7a3e)" }}
        >
          فهمت، لنبدأ 🚀
        </button>
      </div>
    </div>
  );
}
