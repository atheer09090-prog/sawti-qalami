import { useEffect, useState } from "react";
import { submitSus, getMySus } from "@/lib/api";

/**
 * استبيان System Usability Scale (SUS) الرسمي — 10 عبارات، مقياس 1-5،
 * مع طريقة الحساب المعيارية (Brooke, 1996). يُستخدم لتقييم تجربة
 * استخدام المنصة تقييمًا علميًا قابلًا للاستشهاد به بحثيًا، بدل تقييم
 * نجوم بسيط بلا أساس.
 */
const ITEMS = [
  "أَعْتَقِدُ أَنَّنِي سَأَرْغَبُ فِي اسْتِخْدَامِ هَذِهِ الْمَنَصَّةِ بِشَكْلٍ مُتَكَرِّرٍ.",
  "وَجَدْتُ أَنَّ هَذِهِ الْمَنَصَّةَ مُعَقَّدَةٌ أَكْثَرَ مِنَ اللَّازِمِ.",
  "اعْتَقَدْتُ أَنَّ الْمَنَصَّةَ سَهْلَةُ الِاسْتِخْدَامِ.",
  "أَعْتَقِدُ أَنَّنِي سَأَحْتَاجُ إِلَى مُسَاعَدَةِ شَخْصٍ آخَرَ لِأَتَمَكَّنَ مِنِ اسْتِخْدَامِ هَذِهِ الْمَنَصَّةِ.",
  "وَجَدْتُ أَنَّ الْوَظَائِفَ الْمُخْتَلِفَةَ فِي هَذِهِ الْمَنَصَّةِ مُتَكَامِلَةٌ بِشَكْلٍ جَيِّدٍ.",
  "اعْتَقَدْتُ أَنَّ هُنَاكَ الْكَثِيرَ مِنَ التَّنَاقُضِ (عَدَمِ الِاتِّسَاقِ) فِي هَذِهِ الْمَنَصَّةِ.",
  "أَتَخَيَّلُ أَنَّ مُعْظَمَ الطُّلَّابِ سَيَتَعَلَّمُونَ اسْتِخْدَامَ هَذِهِ الْمَنَصَّةِ بِسُرْعَةٍ كَبِيرَةٍ.",
  "وَجَدْتُ أَنَّ الْمَنَصَّةَ مُرْهِقَةٌ (ثَقِيلَةٌ) فِي الِاسْتِخْدَامِ.",
  "شَعَرْتُ بِثِقَةٍ كَبِيرَةٍ أَثْنَاءَ اسْتِخْدَامِ الْمَنَصَّةِ.",
  "احْتَجْتُ إِلَى تَعَلُّمِ أَشْيَاءَ كَثِيرَةٍ قَبْلَ أَنْ أَتَمَكَّنَ مِنْ مُتَابَعَةِ اسْتِخْدَامِ هَذِهِ الْمَنَصَّةِ.",
];

const SCALE = [
  { v: 1, label: "لَا أُوَافِقُ بِشِدَّةٍ" },
  { v: 2, label: "لَا أُوَافِقُ" },
  { v: 3, label: "مُحَايِدٌ" },
  { v: 4, label: "أُوَافِقُ" },
  { v: 5, label: "أُوَافِقُ بِشِدَّةٍ" },
];

export function SusSurvey({ onClose }: { onClose: () => void }) {
  const [answers, setAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ score: number; band: { label: string; color: string } } | null>(null);
  const [previous, setPrevious] = useState<{ score: number; band: { label: string } } | null>(null);
  const [checkingPrevious, setCheckingPrevious] = useState(true);

  useEffect(() => {
    getMySus().then((r) => { setPrevious(r); setCheckingPrevious(false); });
  }, []);

  const allAnswered = answers.every((a) => a !== null);

  async function handleSubmit() {
    if (!allAnswered) return setError("الرجاء الإجابة على جميع العبارات العشر قبل الإرسال.");
    setError("");
    setSubmitting(true);
    const res = await submitSus(answers as number[], comment.trim());
    setSubmitting(false);
    if (!res.ok) return setError(res.error || "تعذّر إرسال التقييم، حاول مرة أخرى.");
    setResult({ score: res.score!, band: res.band! });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div dir="rtl" className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-lg my-8"
        style={{ fontFamily: "'Cairo', sans-serif" }} onClick={(e) => e.stopPropagation()}>

        {result ? (
          <div className="text-center py-4">
            <p className="text-5xl mb-3">🌟</p>
            <p className="font-bold text-lg mb-1" style={{ color: "#1a5c2a" }}>شُكْرًا لَكَ عَلَى تَقْيِيمِكَ!</p>
            <div className="my-4 py-4 rounded-2xl" style={{ background: "#f9fafb" }}>
              <p className="text-xs text-gray-400 mb-1">دَرَجَةُ قَابِلِيَّةِ الِاسْتِخْدَامِ (SUS)</p>
              <p className="text-4xl font-black" style={{ color: result.band.color }}>{result.score}<span className="text-lg text-gray-400">/100</span></p>
              <p className="font-bold mt-1" style={{ color: result.band.color }}>{result.band.label}</p>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">
              أَقَلُّ مِنْ 50: يَحْتَاجُ إِلَى تَحْسِينٍ · 50 إِلَى 70: مُتَوَسِّطٌ · أَكْثَرُ مِنْ 70: جَيِّدٌ إِلَى مُمْتَازٍ
            </p>
            <button onClick={onClose} className="mt-5 px-8 py-2.5 rounded-xl text-white font-bold"
              style={{ background: "#1a5c2a" }}>
              إِغْلَاقٌ
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-center font-bold text-lg mb-1" style={{ color: "#1a5c2a", fontFamily: "'Amiri', serif" }}>
              📋 قَيِّمْ تَجْرِبَتَكَ مَعَ الْمَنَصَّةِ
            </h2>
            <p className="text-center text-gray-400 text-xs mb-4">
              استبيان قابلية الاستخدام (10 عبارات) — إجاباتك تُستخدَم لتطوير المنصة بحثيًا
            </p>

            {!checkingPrevious && previous && (
              <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl p-2.5 text-center">
                <p className="text-xs text-blue-700">
                  سبق أن قيّمت تجربتك بنتيجة {previous.score}/100 ({previous.band.label}). يمكنك تحديث تقييمك أدناه.
                </p>
              </div>
            )}

            {error && (
              <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-2.5 text-center">
                <p className="text-red-600 text-sm">⚠️ {error}</p>
              </div>
            )}

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {ITEMS.map((item, i) => (
                <div key={i} className="border-b border-gray-100 pb-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">{i + 1}. {item}</p>
                  <div className="flex justify-between gap-1">
                    {SCALE.map((s) => (
                      <button
                        key={s.v}
                        onClick={() => setAnswers((prev) => prev.map((a, idx) => (idx === i ? s.v : a)))}
                        title={s.label}
                        className="flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-colors"
                        style={
                          answers[i] === s.v
                            ? { background: "#1a5c2a", borderColor: "#1a5c2a", color: "white" }
                            : { background: "white", borderColor: "#e5e7eb", color: "#9ca3af" }
                        }
                      >
                        {s.v}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                    <span>لَا أُوَافِقُ بِشِدَّةٍ</span>
                    <span>أُوَافِقُ بِشِدَّةٍ</span>
                  </div>
                </div>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="أَيُّ مُلَاحَظَاتٍ إِضَافِيَّةٍ؟ (اِخْتِيَارِيٌّ)"
              className="w-full h-16 p-3 mt-3 rounded-xl border-2 border-gray-200 text-right resize-none focus:border-green-500 focus:outline-none text-sm"
            />

            <div className="flex gap-2 mt-4">
              <button onClick={onClose} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-gray-500 font-bold">
                إِلْغَاءٌ
              </button>
              <button
                onClick={handleSubmit}
                disabled={!allAnswered || submitting}
                className="flex-1 py-2.5 rounded-xl text-white font-bold disabled:opacity-40"
                style={{ background: "#1a5c2a" }}
              >
                {submitting ? "جَارٍ الإِرْسَالُ..." : "إِرْسَالُ التَّقْيِيمِ"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
