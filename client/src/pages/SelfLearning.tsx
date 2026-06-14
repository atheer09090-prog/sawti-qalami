import { useState } from "react";
import { useLocation } from "wouter";
import { setState } from "@/lib/store";

const QUIZ = [
  { q: "مَا ضِدُّ كَلِمَةِ «حَزِينٌ»؟", options: ["غَاضِبٌ", "سَعِيدٌ", "خَائِفٌ", "مُتْعَبٌ"], correct: 1 },
  { q: "أَيُّ الْجُمَلِ صَحِيحَةٌ؟", options: ["ذَهَبَ الطَّالِبُ إِلَى الْمَدْرَسَةِ", "الطَّالِبُ ذَهَبَ مَدْرَسَةٍ", "ذَهَبَتْ مَدْرَسَةٌ الطَّالِبُ", "إِلَى ذَهَبَ مَدْرَسَةٍ"], correct: 0 },
  { q: "مَا مُفْرَدُ «كُتُبٌ»؟", options: ["كُتَيِّبٌ", "كِتَابٌ", "كَاتِبٌ", "مَكْتُوبٌ"], correct: 1 },
];

const WORD_ORDER = [
  { words: ["إِلَى", "ذَهَبَ", "الْمَدْرَسَةِ", "الطَّالِبُ"], answer: "الطَّالِبُ ذَهَبَ إِلَى الْمَدْرَسَةِ" },
];

const FILL_IN = [
  { sentence: "اللُّغَةُ الْعَرَبِيَّةُ لُغَةٌ ________ وَغَنِيَّةٌ بِمُفْرَدَاتِهَا", answer: "جَمِيلَةٌ" },
];

export default function SelfLearning() {
  const [, setLocation] = useLocation();
  const [activity, setActivity] = useState<string | null>(null);
  const [quizIdx, setQuizIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [wordAnswer, setWordAnswer] = useState("");
  const [fillAnswer, setFillAnswer] = useState("");
  const [checked, setChecked] = useState(false);

  function handleQuizAnswer(idx: number) {
    setSelected(idx);
    if (idx === QUIZ[quizIdx].correct) setScore(s => s + 1);
    setTimeout(() => {
      if (quizIdx < QUIZ.length - 1) { setQuizIdx(q => q + 1); setSelected(null); }
      else { setDone(true); setState(prev => ({ ...prev, selfLearningProgress: Math.max(prev.selfLearningProgress, Math.round(score / QUIZ.length * 100)) })); }
    }, 1000);
  }

  if (!activity) return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "#f5f0e8", minHeight: "100vh" }}>
      <div className="p-4" style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)" }}>
        <button onClick={() => setLocation("/skills")} className="text-blue-200 text-sm mb-2">← الْمَهَارَاتُ</button>
        <div className="flex justify-between items-center">
          <span className="text-3xl p-2 bg-blue-800 rounded-xl">📚</span>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-white">مَهَارَةُ التَّعَلُّمِ الذَّاتِيِّ</h1>
            <p className="text-blue-200 text-sm">اكْتَشِفْ وَتَعَلَّمْ بِاسْتِقْلَالِيَّةٍ وَإِبْدَاعٍ</p>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h2 className="text-right font-bold text-lg mb-4 text-blue-800">🎯 اخْتَرْ نَشَاطًا:</h2>
        <div className="flex flex-col gap-3">
          {[
            { id: "quiz", icon: "🧠", title: "اخْتَبِرْ مَعْلُومَاتِكَ", desc: "أَسْئِلَةٌ تَفَاعُلِيَّةٌ لِقِيَاسِ مُسْتَوَاكَ" },
            { id: "order", icon: "🔤", title: "رَتِّبِ الْكَلِمَاتِ", desc: "رَتِّبِ الْكَلِمَاتِ لِتَكُونَ جُمْلَةً صَحِيحَةً" },
            { id: "fill", icon: "✏️", title: "أَكْمِلِ الْجُمْلَةَ", desc: "أَكْمِلِ الْجُمَلَ النَّاقِصَةَ بِالْكَلِمَةِ الْمُنَاسِبَةِ" },
          ].map(a => (
            <button key={a.id} onClick={() => setActivity(a.id)}
              className="p-4 bg-white rounded-xl shadow text-right hover:shadow-md transition-all flex justify-between items-center">
              <span className="text-4xl p-2 rounded-xl" style={{ background: "#dbeafe" }}>{a.icon}</span>
              <div><h3 className="font-bold text-blue-800">{a.title}</h3><p className="text-gray-500 text-sm">{a.desc}</p></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "#f5f0e8", minHeight: "100vh" }}>
      <div className="p-4 bg-blue-700">
        <button onClick={() => { setActivity(null); setQuizIdx(0); setSelected(null); setScore(0); setDone(false); setChecked(false); }}
          className="text-blue-200 text-sm">← الْعَوْدَةُ</button>
        <h1 className="text-white font-bold text-lg text-right mt-1">مَهَارَةُ التَّعَلُّمِ الذَّاتِيِّ</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {activity === "quiz" && !done && (
          <div className="bg-white rounded-2xl p-5 shadow">
            <div className="w-full h-2 bg-gray-200 rounded-full mb-4">
              <div className="h-2 rounded-full bg-blue-600 transition-all" style={{ width: `${(quizIdx / QUIZ.length) * 100}%` }} />
            </div>
            <p className="text-right text-sm text-gray-500 mb-3">السُّؤَالُ {quizIdx + 1} مِنْ {QUIZ.length}</p>
            <h2 className="text-right font-bold text-lg text-blue-800 mb-4">{QUIZ[quizIdx].q}</h2>
            <div className="flex flex-col gap-2">
              {QUIZ[quizIdx].options.map((opt, i) => (
                <button key={i} onClick={() => selected === null && handleQuizAnswer(i)}
                  className={`p-3 rounded-xl text-right transition-all border-2 ${selected === i ? (i === QUIZ[quizIdx].correct ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50") : "border-gray-200 bg-white hover:border-blue-300"}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {activity === "quiz" && done && (
          <div className="bg-white rounded-2xl p-5 shadow text-center">
            <p className="text-4xl mb-3">🎉</p>
            <h2 className="font-bold text-xl text-blue-800 mb-2">أَحْسَنْتَ!</h2>
            <p className="text-gray-600">نَتِيجَتُكَ: {score} / {QUIZ.length}</p>
            <button onClick={() => { setQuizIdx(0); setSelected(null); setScore(0); setDone(false); }}
              className="mt-4 px-6 py-2 bg-blue-700 text-white rounded-xl font-bold">إِعَادَةُ الِاخْتِبَارِ</button>
          </div>
        )}

        {activity === "order" && (
          <div className="bg-white rounded-2xl p-5 shadow">
            <h2 className="text-right font-bold text-lg text-blue-800 mb-2">🔤 رَتِّبِ الْكَلِمَاتِ</h2>
            <div className="bg-green-50 rounded-xl p-3 text-right mb-4">
              <p className="text-sm font-semibold text-green-800">الْكَلِمَاتُ: «{WORD_ORDER[0].words.join(" – ")}»</p>
            </div>
            <textarea value={wordAnswer} onChange={e => setWordAnswer(e.target.value)}
              placeholder="اكْتُبِ الْجُمْلَةَ الصَّحِيحَةَ هُنَا..."
              className="w-full h-24 p-3 rounded-xl border-2 border-gray-200 text-right resize-none focus:border-blue-500 focus:outline-none mb-3"
              style={{ fontFamily: "'Cairo', sans-serif" }} />
            <button onClick={() => setChecked(true)} className="w-full py-3 bg-green-700 text-white rounded-xl font-bold">✅ تَحَقَّقْ</button>
            {checked && <p className={`mt-3 text-center font-bold ${wordAnswer.trim() === WORD_ORDER[0].answer ? "text-green-600" : "text-red-500"}`}>
              {wordAnswer.trim() === WORD_ORDER[0].answer ? "✅ صَحِيحٌ! أَحْسَنْتَ!" : `❌ الإِجَابَةُ الصَّحِيحَةُ: ${WORD_ORDER[0].answer}`}
            </p>}
          </div>
        )}

        {activity === "fill" && (
          <div className="bg-white rounded-2xl p-5 shadow">
            <h2 className="text-right font-bold text-lg text-purple-800 mb-2">✏️ أَكْمِلِ الْجُمْلَةَ</h2>
            <div className="bg-purple-50 rounded-xl p-3 text-right mb-4">
              <p className="font-semibold text-purple-800">«{FILL_IN[0].sentence}»</p>
            </div>
            <input value={fillAnswer} onChange={e => setFillAnswer(e.target.value)}
              placeholder="أَكْمِلِ الْفَرَاغَ..."
              className="w-full p-3 rounded-xl border-2 border-gray-200 text-right focus:border-purple-500 focus:outline-none mb-3"
              style={{ fontFamily: "'Cairo', sans-serif" }} />
            <button onClick={() => setChecked(true)} className="w-full py-3 bg-purple-700 text-white rounded-xl font-bold">✅ تَحَقَّقْ</button>
            {checked && <p className={`mt-3 text-center font-bold ${fillAnswer.trim().includes("جميل") ? "text-green-600" : "text-amber-600"}`}>
              {fillAnswer.trim().includes("جميل") ? "✅ أَحْسَنْتَ!" : `💡 إِجَابَةٌ مُقْتَرَحَةٌ: ${FILL_IN[0].answer}`}
            </p>}
          </div>
        )}
      </div>
    </div>
  );
}
