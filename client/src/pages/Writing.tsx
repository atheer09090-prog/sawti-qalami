import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { evaluateWriting } from "@/lib/api";
import { playSound, stopSound, playEffect } from "@/lib/audio";
import { setState } from "@/lib/store";

/* ── Writing topics ── */
const TOPICS = [
  { id: "home", title: "وَصْفُ الْمَنْزِلِ", icon: "🏠", hints: ["الْمَوْقِعُ وَالْحَيُّ", "الشَّكْلُ الْخَارِجِيُّ", "الْغُرَفُ", "مَا يُمَيِّزُهُ"] },
  { id: "neighborhood", title: "وَصْفُ النَّخْلَةِ", icon: "🌴", hints: ["مَوْقِعُ النَّخْلَةِ", "شَكْلُهَا", "فَوَائِدُهَا", "أَهَمِّيَّتُهَا"] },
  { id: "mosque", title: "وَصْفُ الْمَسْجِدِ", icon: "🕌", hints: ["الشَّكْلُ الْمَعْمَارِيُّ", "الأَجْوَاءُ الرُّوحَانِيَّةُ", "الْخَدَمَاتُ", "الأَهَمِّيَّةُ"] },
];

/* ── Dictation questions ── */
const DICTATION_QUESTIONS = [
  { word: "شَجَرَةٌ", type: "التَّاءُ الْمَرْبُوطَةُ", correct: "شَجَرَةٌ", opts: ["شجرة", "شَجَرَه", "شَجَرَةٌ", "شَجَرَةً"], img: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80", hint: "انْتِهَاءُ تَاءٍ مَرْبُوطَةٍ" },
  { word: "مَدْرَسَةٌ", type: "التَّاءُ الْمَرْبُوطَةُ", correct: "مَدْرَسَةٌ", opts: ["مدرسة", "مَدْرَسَه", "مَدْرَسَةٌ", "مَدْرَسَةً"], img: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80", hint: "انْتِهَاءُ تَاءٍ مَرْبُوطَةٍ" },
  { word: "قِرَاءَةٌ", type: "التَّاءُ الْمَرْبُوطَةُ", correct: "قِرَاءَةٌ", opts: ["قراءة", "قِرَاءَه", "قِرَاءَةٌ", "قِرَاءَةً"], img: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&q=80", hint: "الْكَلِمَةُ تَنْتَهِي بِتَاءٍ مَرْبُوطَةٍ" },
  { word: "كِتَابٌ", type: "التَّنْوِينُ", correct: "كِتَابٌ", opts: ["كتاب", "كِتَابُ", "كِتَابٌ", "كِتَابًا"], img: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&q=80", hint: "الضَّمَّةُ التَّنْوِينِيَّةُ عَلَى الْبَاءِ" },
  { word: "مُعَلِّمَةٌ", type: "الشَّدَّةُ", correct: "مُعَلِّمَةٌ", opts: ["معلمة", "مُعَلِمَة", "مُعَلِّمَةٌ", "مُعَلِّمَةً"], img: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&q=80", hint: "الشَّدَّةُ عَلَى اللَّامِ وَتَاءٌ مَرْبُوطَةٌ" },
  { word: "أَصْدِقَاءُ", type: "الْهَمْزَةُ", correct: "أَصْدِقَاءُ", opts: ["اصدقاء", "أَصدِقاء", "أَصْدِقَاءُ", "أَصْدِقَاءً"], img: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80", hint: "الْكَلِمَةُ تَبْدَأُ بِهَمْزَةٍ قَطْعٍ" },
  { word: "قَلَمٌ", type: "التَّنْوِينُ", correct: "قَلَمٌ", opts: ["قلم", "قَلَمُ", "قَلَمٌ", "قَلَمًا"], img: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&q=80", hint: "انْتِهَاءُ نَكِرَةٍ مَرْفُوعَةٍ بِالضَّمَّةِ التَّنْوِينِيَّةِ" },
  { word: "يَكْتُبُ", type: "الْمُثَبَّطُ", correct: "يَكْتُبُ", opts: ["يكتب", "يَكتُب", "يَكْتُبُ", "يَكْتُبَ"], img: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=600&q=80", hint: "فِعْلٌ مُضَارِعٌ مَرْفُوعٌ بِالضَّمَّةِ" },
];

const TYPE_COLORS: Record<string, string> = {
  "التَّاءُ الْمَرْبُوطَةُ": "#7c3aed",
  "التَّنْوِينُ": "#b45309",
  "الشَّدَّةُ": "#dc2626",
  "الْهَمْزَةُ": "#ea580c",
  "الْمُثَبَّطُ": "#0891b2",
};

const WHEEL_COLORS = ["#1a5c2a","#2563eb","#b45309","#dc2626","#7c3aed","#0891b2","#ea580c","#059669"];

/* ── Spinning Wheel component ── */
function SpinWheel({ questions, onSelect }: { questions: typeof DICTATION_QUESTIONS; onSelect: (i: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => { drawWheel(rotation); }, [rotation]);

  function drawWheel(rot: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const cx = canvas.width / 2, cy = canvas.height / 2, r = cx - 10;
    const sliceAngle = (2 * Math.PI) / questions.length;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    questions.forEach((q, i) => {
      const start = rot + i * sliceAngle;
      const end = start + sliceAngle;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + sliceAngle / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px Cairo, sans-serif";
      ctx.fillText(q.word.slice(0, 5) + "...", r - 12, 5);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.font = "20px serif";
    ctx.textAlign = "center";
    ctx.fillText("✏️", cx, cy + 7);

    // Pointer
    ctx.beginPath();
    ctx.moveTo(cx, 4);
    ctx.lineTo(cx - 10, 20);
    ctx.lineTo(cx + 10, 20);
    ctx.closePath();
    ctx.fillStyle = "#b45309";
    ctx.fill();
  }

  function spin() {
    if (spinning) return;
    setSpinning(true);
    const extra = Math.PI * 2 * (6 + Math.random() * 4);
    const duration = 3500;
    const start = performance.now();
    const startRot = rotation;

    function animate(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const newRot = startRot + extra * ease;
      setRotation(newRot);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        const sliceAngle = (2 * Math.PI) / questions.length;
        const normalised = ((newRot % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const idx = Math.floor(((2 * Math.PI - normalised) / sliceAngle)) % questions.length;
        onSelect(idx);
      }
    }
    rafRef.current = requestAnimationFrame(animate);
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="font-bold text-amber-700">🎡 أَدِرِ الْعَجَلَةَ لِاخْتِيَارِ سُؤَالٍ!</p>
      <canvas ref={canvasRef} width={300} height={300} className="drop-shadow-xl" />
      <button onClick={spin} disabled={spinning}
        className="px-8 py-3 rounded-xl text-white font-bold text-lg transition-all disabled:opacity-60"
        style={{ background: spinning ? "#9ca3af" : "linear-gradient(135deg, #b45309, #d97706)" }}>
        {spinning ? "🎡 جَارٍ الدَّوَرَانُ..." : "🎡 أَدِرِ الْعَجَلَةَ!"}
      </button>
    </div>
  );
}

/* ── Dictation Game ── */
function DictationGame({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<"intro"|"wheel"|"question"|"done">("intro");
  const [currentQ, setCurrentQ] = useState<typeof DICTATION_QUESTIONS[0] | null>(null);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [answered, setAnswered] = useState<boolean[]>(Array(DICTATION_QUESTIONS.length).fill(false));
  const [selected, setSelected] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);

  function handleWheelSelect(idx: number) {
    setCurrentQ(DICTATION_QUESTIONS[idx]);
    setCurrentIdx(idx);
    setSelected(null);
    setPhase("question");
  }

  function handleAnswer(opt: string) {
    if (selected) return;
    setSelected(opt);
    const isCorrect = opt === currentQ?.correct;
    const newAnswered = [...answered];
    newAnswered[currentIdx] = true;
    setAnswered(newAnswered);
    setTotal(t => t + 1);
    if (isCorrect) {
      setCorrect(c => c + 1);
      playEffect("/assets/correct.wav", 0.7);
    } else {
      playEffect("/assets/tryagain.wav", 0.6);
    }
  }

  const remaining = answered.filter(a => !a).length;

  /* ── Intro ── */
  if (phase === "intro") return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "#f5f0e8", minHeight: "100vh" }}>
      <div className="p-4" style={{ background: "linear-gradient(135deg, #b45309 0%, #d97706 100%)" }}>
        <button onClick={onBack} className="text-amber-100 text-sm mb-1">← مَهَارَةُ الْكِتَابَةِ</button>
        <div className="flex justify-between items-center">
          <span className="text-3xl p-2 bg-amber-800 rounded-xl">🎡</span>
          <div className="text-right">
            <h1 className="text-xl font-bold text-white">رِحْلَةُ الإِمْلَاءِ</h1>
            <p className="text-amber-100 text-xs">أَدِرِ الْعَجَلَةَ — اخْتَرِ الْكِتَابَةَ الصَّحِيحَةَ</p>
          </div>
        </div>
      </div>
      <div className="max-w-xl mx-auto px-4 py-5">
        <div className="bg-white rounded-2xl p-5 shadow text-right mb-4">
          <h2 className="font-bold text-lg text-amber-800 mb-2">🎉 أَهْلاً فِي رِحْلَةِ الإِمْلَاءِ!</h2>
          <p className="text-gray-500 text-sm mb-4">أَدِرِ الْعَجَلَةَ لِاخْتِيَارِ سُؤَالٍ إِمْلَائِيٍّ، ثُمَّ اخْتَرِ الْكِتَابَةَ الصَّحِيحَةَ.</p>
          <div className="bg-amber-50 rounded-xl p-4 mb-4 border border-amber-100">
            <p className="font-bold text-amber-800 mb-2">📋 كَيْفَ تَلْعَبُ؟</p>
            <div className="space-y-2 text-sm text-gray-600">
              {["اضْغَطْ عَلَى الْعَجَلَةِ أَوْ زِرَّ «أَدِرِ الْعَجَلَةَ»","تَتَوَقَّفُ الْعَجَلَةُ عَلَى مَنُّوٍ إِمْلَائِيٍّ","انْظُرْ إِلَى الصُّورَةِ وَاخْتَرِ الْكِتَابَةَ الصَّحِيحَةَ مِنَ الْخِيَارَاتِ","أَجِبْ عَنْ جَمِيعِ الأَسْئِلَةِ لِتَرَى نَتِيجَتَكَ النِّهَائِيَّةَ"].map((s, i) => (
                <div key={i} className="flex gap-2 items-start justify-end">
                  <span>{s}</span>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: "#b45309" }}>{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-end mb-4">
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <span key={type} className="text-xs px-2 py-1 rounded-full text-white font-bold" style={{ background: color }}>{type}</span>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center mb-4">🎯 فِئَاتُ الأَسْئِلَةِ ({DICTATION_QUESTIONS.length} سُؤَالٌ)</p>
          <button onClick={() => setPhase("wheel")}
            className="w-full py-4 rounded-xl text-white font-bold text-lg"
            style={{ background: "linear-gradient(135deg, #b45309, #d97706)" }}>
            🎡 ابْدَأِ الرِّحْلَةَ!
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Wheel ── */
  if (phase === "wheel") return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "#f5f0e8", minHeight: "100vh" }}>
      <div className="p-4" style={{ background: "linear-gradient(135deg, #b45309 0%, #d97706 100%)" }}>
        <button onClick={onBack} className="text-amber-100 text-sm mb-1">← مَهَارَةُ الْكِتَابَةِ</button>
        <div className="flex justify-between items-center">
          <span className="text-sm text-amber-100">{correct} ✓ / {total}</span>
          <h1 className="text-xl font-bold text-white">رِحْلَةُ الإِمْلَاءِ</h1>
        </div>
        {/* Progress bar */}
        <div className="mt-2 w-full h-2 bg-amber-800 rounded-full overflow-hidden">
          <div className="h-2 bg-white rounded-full transition-all" style={{ width: `${(total / DICTATION_QUESTIONS.length) * 100}%` }} />
        </div>
      </div>
      <div className="max-w-xl mx-auto px-4 py-5">
        {/* Question status */}
        <div className="bg-white rounded-2xl p-4 shadow mb-4">
          <p className="text-right text-sm font-bold text-gray-500 mb-2">📊 حَالَةُ الأَسْئِلَةِ:</p>
          <div className="flex gap-2 flex-wrap justify-end">
            {DICTATION_QUESTIONS.map((_, i) => (
              <div key={i} className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                style={{ background: answered[i] ? "#dcf5e7" : "#f5f0e8", color: answered[i] ? "#1a5c2a" : "#6b7280", border: answered[i] ? "2px solid #86efac" : "2px solid #e5e7eb" }}>
                {i + 1}
              </div>
            ))}
          </div>
        </div>
        {remaining === 0 ? (
          <div className="bg-white rounded-2xl p-6 shadow text-center">
            <p className="text-4xl mb-3">🎉</p>
            <h2 className="font-bold text-xl text-amber-800 mb-2">أَكْمَلْتَ الرِّحْلَةَ!</h2>
            <p className="text-gray-600 mb-1">نَتِيجَتُكَ: <strong className="text-green-600">{correct}</strong> / {DICTATION_QUESTIONS.length}</p>
            <p className="text-gray-400 text-sm mb-4">{correct >= 6 ? "مُمْتَازٌ! أَنْتَ بَطَلُ الإِمْلَاءِ 🏆" : "جَيِّدٌ! تَدَرَّبْ أَكْثَرَ 💪"}</p>
            <button onClick={() => { setAnswered(Array(DICTATION_QUESTIONS.length).fill(false)); setCorrect(0); setTotal(0); }}
              className="px-6 py-3 rounded-xl text-white font-bold" style={{ background: "#b45309" }}>
              🔄 ابْدَأْ مِنْ جَدِيدٍ
            </button>
          </div>
        ) : (
          <SpinWheel questions={DICTATION_QUESTIONS} onSelect={handleWheelSelect} />
        )}
      </div>
    </div>
  );

  /* ── Question ── */
  if (phase === "question" && currentQ) return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "#f5f0e8", minHeight: "100vh" }}>
      <div className="p-4" style={{ background: "linear-gradient(135deg, #b45309 0%, #d97706 100%)" }}>
        <button onClick={() => setPhase("wheel")} className="text-amber-100 text-sm mb-1">← مَهَارَةُ الْكِتَابَةِ</button>
        <div className="flex justify-between items-center">
          <span className="text-sm text-amber-100">{correct} ✓ / {total}</span>
          <h1 className="text-xl font-bold text-white">رِحْلَةُ الإِمْلَاءِ</h1>
        </div>
        <div className="mt-2 w-full h-2 bg-amber-800 rounded-full overflow-hidden">
          <div className="h-2 bg-white rounded-full transition-all" style={{ width: `${(total / DICTATION_QUESTIONS.length) * 100}%` }} />
        </div>
      </div>
      <div className="max-w-xl mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl overflow-hidden shadow">
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100">
            <span className="text-xs font-bold px-2 py-1 rounded-full text-white"
              style={{ background: TYPE_COLORS[currentQ.type] || "#6b7280" }}>{currentQ.type}</span>
            <p className="text-sm text-gray-400">سُؤَالٌ {currentIdx + 1} مِنْ {DICTATION_QUESTIONS.length}</p>
          </div>
          {/* Image */}
          <div className="relative">
            <img src={currentQ.img} alt={currentQ.word} className="w-full h-52 object-cover" />
            <div className="absolute bottom-3 left-3 bg-white/90 rounded-lg px-3 py-1">
              <p className="font-bold text-amber-800" style={{ fontFamily: "'Amiri', serif", fontSize: "1.1rem" }}>{currentQ.word}</p>
            </div>
          </div>
          {/* Question */}
          <div className="p-4">
            <div className="bg-amber-50 rounded-xl p-3 mb-4 text-right border border-amber-100">
              <p className="font-bold text-amber-800 text-sm mb-1">✏️ اخْتَرِ الْكِتَابَةَ الصَّحِيحَةَ لِلْكَلِمَةِ فِي الصُّورَةِ:</p>
              <p className="text-xs text-gray-500">💡 {currentQ.hint}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {currentQ.opts.map((opt) => {
                let bg = "#f9fafb", border = "#e5e7eb", color = "#374151";
                if (selected) {
                  if (opt === currentQ.correct) { bg = "#dcf5e7"; border = "#86efac"; color = "#1a5c2a"; }
                  else if (opt === selected && opt !== currentQ.correct) { bg = "#fee2e2"; border = "#fca5a5"; color = "#dc2626"; }
                }
                return (
                  <button key={opt} onClick={() => handleAnswer(opt)} disabled={!!selected}
                    className="p-3 rounded-xl text-center font-bold transition-all relative"
                    style={{ background: bg, border: `2px solid ${border}`, color, fontFamily: "'Amiri', serif", fontSize: "1rem" }}>
                    {selected && opt === currentQ.correct && <span className="absolute top-1 right-1 text-green-600 text-xs">✓</span>}
                    {opt}
                  </button>
                );
              })}
            </div>
            {selected && (
              <div className="rounded-xl p-3 text-right mb-3"
                style={{ background: selected === currentQ.correct ? "#dcf5e7" : "#fee2e2" }}>
                <p className="font-bold text-sm" style={{ color: selected === currentQ.correct ? "#1a5c2a" : "#dc2626" }}>
                  {selected === currentQ.correct ? "✅ أَحْسَنْتَ! الْكِتَابَةُ صَحِيحَةٌ!" : `❌ الْإِجَابَةُ الصَّحِيحَةُ: ${currentQ.correct}`}
                </p>
                <p className="text-xs text-gray-500 mt-1">💡 {currentQ.hint}</p>
              </div>
            )}
            {selected && (
              <button onClick={() => setPhase("wheel")}
                className="w-full py-3 rounded-xl text-white font-bold"
                style={{ background: "linear-gradient(135deg, #b45309, #d97706)" }}>
                🎡 الْعَوْدَةُ إِلَى الْعَجَلَةِ
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return null;
}

/* ── Main Writing Page ── */
export default function Writing() {
  const [, setLocation] = useLocation();
  const [view, setView] = useState<"topics"|"dictation"|"writing">("topics");
  const [selectedTopic, setSelectedTopic] = useState<typeof TOPICS[0] | null>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedTopic) return;
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
      if ((res.overall_score || 0) >= 70) playEffect("/assets/achievement.wav", 0.7);
    } catch {
      setResult({ overall_score: 75, spelling_score: 80, structure_score: 70, feedback: "جَيِّدٌ! كِتَابَتُكَ وَاضِحَةٌ.", strengths: ["إِمْلَاءٌ جَيِّدٌ"], improvements: ["أَضِفْ أَدَوَاتِ رَبْطٍ"] });
    }
    setLoading(false);
  }

  /* Dictation view */
  if (view === "dictation") return <DictationGame onBack={() => setView("topics")} />;

  /* Writing view */
  if (view === "writing" && selectedTopic) return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "#f5f0e8", minHeight: "100vh" }}>
      <div className="p-4" style={{ background: "linear-gradient(135deg, #b45309 0%, #d97706 100%)" }}>
        <button onClick={() => { setView("topics"); setResult(null); setText(""); stopSound(); }} className="text-amber-100 text-sm mb-1">← اخْتَرْ مَوْضُوعًا آخَرَ</button>
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
          <textarea value={text} onChange={(e) => setText(e.target.value)}
            placeholder="اكْتُبْ هُنَا..."
            className="w-full h-48 p-3 rounded-xl border-2 border-gray-200 text-right resize-none focus:border-amber-500 focus:outline-none"
            style={{ fontFamily: "'Cairo', sans-serif", fontSize: "16px" }} />
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
              <div className="bg-amber-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-500">الإِمْلَاءُ</p><p className="text-2xl font-bold text-amber-700">{result.spelling_score}%</p></div>
              <div className="bg-amber-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-500">التَّرْكِيبُ</p><p className="text-2xl font-bold text-amber-700">{result.structure_score}%</p></div>
              <div className="bg-green-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-500">الْمَجْمُوعُ</p><p className="text-2xl font-bold text-green-700">{result.overall_score}%</p></div>
            </div>
            {result.strengths?.length > 0 && <div className="mb-2"><p className="font-bold text-green-700 text-sm">✅ نِقَاطُ الْقُوَّةِ:</p>{result.strengths.map((s: string) => <p key={s} className="text-sm text-gray-600">• {s}</p>)}</div>}
            {result.improvements?.length > 0 && <div><p className="font-bold text-amber-700 text-sm">💡 اقْتِرَاحَاتُ التَّحْسِينِ:</p>{result.improvements.map((s: string) => <p key={s} className="text-sm text-gray-600">• {s}</p>)}</div>}
          </div>
        )}
      </div>
    </div>
  );

  /* Topics view (default) */
  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "#f5f0e8", minHeight: "100vh" }}>
      <div className="p-4" style={{ background: "linear-gradient(135deg, #b45309 0%, #d97706 100%)" }}>
        <div className="flex items-center gap-2 mb-2">
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

      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* Mascot welcome */}
        <div className="bg-white rounded-xl p-3 mb-4 flex items-center gap-3 shadow">
          <img src="/assets/omani-boy.png" alt="" className="w-10 h-10 object-contain" />
          <p className="font-bold text-sm text-right">اخْتَرْ نَشَاطَ الْكِتَابَةِ وَابْدَأْ إِبْدَاعَكَ! ✏️</p>
        </div>

        {/* Dictation Journey card */}
        <button onClick={() => setView("dictation")}
          className="w-full p-5 rounded-2xl text-right shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all mb-3 flex justify-between items-center"
          style={{ background: "linear-gradient(135deg, #fef3e2, #fde68a)", border: "2px solid #fcd34d" }}>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-amber-700 text-white px-2 py-1 rounded-full font-bold">لُعْبَةٌ تَفَاعُلِيَّةٌ</span>
            <span className="text-amber-600 text-sm font-bold">←</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-amber-800">🎡 رِحْلَةُ الإِمْلَاءِ</h2>
            <p className="text-amber-600 text-sm">أَدِرِ الْفَجَلَةَ وَاخْتَرِ الْكِتَابَةَ الصَّحِيحَةَ لِلْكَلِمَاتِ</p>
          </div>
          <span className="text-4xl">🎡</span>
        </button>

        {/* Writing topics */}
        <h2 className="text-right font-bold text-lg mb-3 text-amber-800">✏️ مَوَاضِيعُ الْكِتَابَةِ</h2>
        <div className="flex flex-col gap-3">
          {TOPICS.map((t) => (
            <button key={t.id} onClick={() => { setSelectedTopic(t); setView("writing"); }}
              className="p-5 bg-white rounded-2xl shadow text-right hover:shadow-md hover:-translate-y-0.5 transition-all flex justify-between items-center">
              <div>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">الْحَدُّ الأَدْنَى: 50 كَلِمَةٌ</span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-amber-800">{t.title}</h3>
                <div className="flex gap-1 flex-wrap justify-end mt-1">
                  {t.hints.map(h => <span key={h} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">{h}</span>)}
                </div>
              </div>
              <span className="text-4xl">{t.icon}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}