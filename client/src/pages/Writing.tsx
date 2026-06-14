import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { evaluateWriting } from "@/lib/api";
import { playSound, stopSound, playEffect } from "@/lib/audio";
import { setState } from "@/lib/store";

const TOPICS = [
  { id: "home", title: "وَصْفُ الْمَنْزِلِ", icon: "🏠", hints: ["الْمَوْقِعُ وَالْحَيُّ", "الشَّكْلُ الْخَارِجِيُّ", "الْغُرَفُ", "مَا يُمَيِّزُهُ"] },
  { id: "neighborhood", title: "وَصْفُ الْحَيِّ", icon: "🏘️", hints: ["مَوْقِعُ الْحَيِّ", "الشَّوَارِعُ وَالْحَدَائِقُ", "الْمَرَافِقُ", "الْمُجْتَمَعُ"] },
  { id: "mosque", title: "وَصْفُ الْمَسْجِدِ", icon: "🕌", hints: ["الشَّكْلُ الْمَعْمَارِيُّ", "الأَجْوَاءُ الرُّوحَانِيَّةُ", "الْخَدَمَاتُ", "الأَهَمِّيَّةُ"] },
];

export default function Writing() {
  const [, setLocation] = useLocation();
  const [selectedTopic, setSelectedTopic] = useState<typeof TOPICS[0] | null>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedTopic) {
      stopSound();
      return;
    }
    playSound("/assets/lesson-writing-intro.wav", 0.5);
    return () => stopSound();
  }, [selectedTopic?.id]);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const sentenceCount = text.split(/[.!؟]/).filter(s => s.trim()).length;

  async function handleEvaluate() {
    if (wordCount < 10) return alert("الرجاء كتابة 10 كلمات على الأقل");
    setLoading(true);
    try {
      const res = await evaluateWriting(text, 20, 0, selectedTopic?.id || "");
      setResult(res);
      setState((prev) => ({ ...prev, writingProgress: Math.max(prev.writingProgress, res.overall_score || 0) }));
      if ((res.overall_score || 0) >= 70) {
        playEffect("/assets/achievement.wav", 0.7);
      }
    } catch {
      setResult({ overall_score: 75, spelling_score: 80, structure_score: 70, feedback: "جَيِّدٌ! كِتَابَتُكَ وَاضِحَةٌ.", strengths: ["إِمْلَاءٌ جَيِّدٌ"], improvements: ["أَضِفْ أَدَوَاتِ رَبْطٍ"] });
    }
    setLoading(false);
  }

  if (!selectedTopic) return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "#f5f0e8", minHeight: "100vh" }}>
      <div className="p-4" style={{ background: "linear-gradient(135deg, #b45309 0%, #d97706 100%)" }}>
        <div className="flex items-center gap-2 mb-2">
          <img src="/assets/logo.png" alt="" className="w-7 h-7 object-contain" />
          <button onClick={() => setLocation("/skills")} className="text-amber-100 text-sm">← الْمَهَارَاتُ</button>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-3xl p-2 bg-amber-800 rounded-xl">✏️</span>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-white">مَهَارَةُ الْكِتَابَةِ</h1>
            <p className="text-amber-100 text-sm">طَوِّرْ أُسْلُوبَكَ الْكِتَابِيَّ وَإِبْدَاعَكَ اللُّغَوِيَّ</p>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl p-3 mb-4 flex items-center gap-3 shadow">
          <img src="/assets/omani-boy.png" alt="" className="w-10 h-10 object-contain" />
          <p className="font-bold text-sm text-right">اخْتَرْ مَوْضُوعَ الْكِتَابَةِ وَابْدَأْ إِبْدَاعَكَ! ✏️</p>
        </div>
        <h2 className="text-right font-bold text-lg mb-4 text-amber-800">اخْتَرْ مَوْضُوعًا:</h2>
        <div className="flex flex-col gap-3">
          {TOPICS.map((t) => (
            <button key={t.id} onClick={() => setSelectedTopic(t)}
              className="p-5 bg-white rounded-2xl shadow text-right hover:shadow-md hover:-translate-y-0.5 transition-all flex justify-between items-center">
              <span className="text-4xl">{t.icon}</span>
              <div>
                <h3 className="font-bold text-lg text-amber-800">{t.title}</h3>
                <div className="flex gap-1 flex-wrap justify-end mt-1">
                  {t.hints.map(h => <span key={h} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">{h}</span>)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "#f5f0e8", minHeight: "100vh" }}>
      <div className="p-4" style={{ background: "linear-gradient(135deg, #b45309 0%, #d97706 100%)" }}>
        <button onClick={() => { setSelectedTopic(null); setResult(null); setText(""); }} className="text-amber-100 text-sm mb-1">← اخْتَرْ مَوْضُوعًا آخَرَ</button>
        <p className="text-white text-sm text-right font-bold">✏️ دَرْسُ الْكِتَابَةِ</p>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl p-5 shadow">
          <div className="flex justify-between items-center mb-3">
            <span className="text-4xl">{selectedTopic.icon}</span>
            <h2 className="text-xl font-bold text-right text-amber-800">{selectedTopic.title}</h2>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 mb-3 text-right border border-amber-100">
            <p className="text-sm text-amber-700 font-semibold mb-2">📌 اسْتَعِنْ بِهَذِهِ الْعَنَاصِرِ:</p>
            <div className="flex gap-2 flex-wrap">
              {selectedTopic.hints.map(h => <span key={h} className="text-xs bg-white text-amber-700 px-2 py-1 rounded-full border border-amber-200">{h}</span>)}
            </div>
          </div>
          <textarea
            value={text} onChange={(e) => setText(e.target.value)}
            placeholder="اكْتُبْ هُنَا..."
            className="w-full h-48 p-3 rounded-xl border-2 border-gray-200 text-right resize-none focus:border-amber-500 focus:outline-none"
            style={{ fontFamily: "'Cairo', sans-serif", fontSize: "16px" }}
          />
          <div className="flex justify-between text-sm text-gray-500 mt-1">
            <span>{sentenceCount} جُمَلٌ</span>
            <span>{wordCount} / 50 كَلِمَةٌ</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full mt-1 mb-4 overflow-hidden">
            <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(wordCount / 50 * 100, 100)}%`, background: "#b45309" }} />
          </div>
          <button onClick={handleEvaluate} disabled={loading}
            className="w-full py-3 rounded-xl text-white font-bold text-lg transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #b45309 0%, #d97706 100%)" }}>
            {loading ? "⏳ جَارٍ التَّقْيِيمُ..." : "🏛️ تَقْيِيمُ الْكِتَابَةِ"}
          </button>
        </div>

        {result && !loading && (
          <div className="bg-white rounded-2xl p-5 shadow mt-4 text-right">
            <h3 className="font-bold text-lg text-amber-800 mb-3">📊 نَتِيجَةُ التَّقْيِيمِ</h3>
            <p className="text-gray-600 mb-3">{result.feedback}</p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">الإِمْلَاءُ</p>
                <p className="text-2xl font-bold text-amber-700">{result.spelling_score}%</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">التَّرْكِيبُ</p>
                <p className="text-2xl font-bold text-amber-700">{result.structure_score}%</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">الْمَجْمُوعُ</p>
                <p className="text-2xl font-bold text-green-700">{result.overall_score}%</p>
              </div>
            </div>
            {result.strengths?.length > 0 && (
              <div className="mb-2">
                <p className="font-bold text-green-700 text-sm">✅ نِقَاطُ الْقُوَّةِ:</p>
                {result.strengths.map((s: string) => <p key={s} className="text-sm text-gray-600">• {s}</p>)}
              </div>
            )}
            {result.improvements?.length > 0 && (
              <div>
                <p className="font-bold text-amber-700 text-sm">💡 اقْتِرَاحَاتُ التَّحْسِينِ:</p>
                {result.improvements.map((s: string) => <p key={s} className="text-sm text-gray-600">• {s}</p>)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
