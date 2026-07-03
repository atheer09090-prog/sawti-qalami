import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { evaluateWriting } from "@/lib/api";
import { playSound, stopSound, playEffect, stopAll, audioFile } from "@/lib/audio";
import { setState } from "@/lib/store";
import { DICTATION_QUESTIONS } from "@/lib/dictation-data";

/* ── Writing topics ── */
const TOPICS = [
  { id: "home", title: "وَصْفُ الْمَنْزِلِ", icon: "🏠", hints: ["الْمَوْقِعُ وَالْحَيُّ", "الشَّكْلُ الْخَارِجِيُّ", "الْغُرَفُ", "مَا يُمَيِّزُهُ"] },
  { id: "neighborhood", title: "وَصْفُ النَّخْلَةِ", icon: "🌴", hints: ["مَوْقِعُ النَّخْلَةِ", "شَكْلُهَا", "فَوَائِدُهَا", "أَهَمِّيَّتُهَا"] },
  { id: "mosque", title: "وَصْفُ الْمَسْجِدِ", icon: "🕌", hints: ["الشَّكْلُ الْمَعْمَارِيُّ", "الأَجْوَاءُ الرُّوحَانِيَّةُ", "الْخَدَمَاتُ", "الأَهَمِّيَّةُ"] },
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
    // If already answered, auto-spin again to find an unanswered question
    if (answered[idx]) {
      const unanswered = DICTATION_QUESTIONS.map((_, i) => i).filter(i => !answered[i]);
      if (unanswered.length === 0) { setPhase("done" as any); return; }
      const next = unanswered[Math.floor(Math.random() * unanswered.length)];
      setCurrentQ(DICTATION_QUESTIONS[next]);
      setCurrentIdx(next);
    } else {
      setCurrentQ(DICTATION_QUESTIONS[idx]);
      setCurrentIdx(idx);
    }
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
      playEffect(audioFile("/assets/correct.mp3"), 0.7);
    } else {
      playEffect(audioFile("/assets/tryagain.mp3"), 0.6);
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
            <img src={currentQ.img} alt="" className="w-full h-52 object-cover" />
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
                className="w-full py-3 rounded-xl text-white font-bold mb-2"
                style={{ background: "linear-gradient(135deg, #b45309, #d97706)" }}>
                🎡 الْعَوْدَةُ إِلَى الْعَجَلَةِ
              </button>
            )}
            {!selected && (
              <button onClick={() => { setSelected(null); setPhase("wheel"); }}
                className="w-full py-2 rounded-xl text-amber-700 font-bold text-sm border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 transition-all">
                ↩️ تَخَطَّ هَذَا السُّؤَالَ وَعُدْ لِلْعَجَلَةِ
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return null;
}


/* ── Explainable Writing Result Component ── */
function WritingResult({ result, originalText }: { result: any; originalText: string }) {
  const [activeError, setActiveError] = useState<number | null>(null);

  function renderAnnotatedText() {
    // Build errors from backend errors array OR extract from text locally
    let errors: Array<{ wrong: string; correct: string; explanation: string }> =
      (result.errors && result.errors.length > 0) ? result.errors : [];

    // Always run local detection to catch what backend misses
    {
      const stripDiacritics = (s: string) => s.replace(/[\u064B-\u065F\u0670]/g, "");

      const commonFixes: Array<{ wrong: string; correct: string; explanation: string }> = [
        // همزة القطع في أول الكلمة
        { wrong: "ايضا",    correct: "أيضاً",   explanation: "همزة قطع في أوّل الكلمة" },
        { wrong: "ايضاً",   correct: "أيضاً",   explanation: "همزة قطع في أوّل الكلمة" },
        { wrong: "اشجار",   correct: "أشجار",   explanation: "همزة قطع في أوّل الكلمة" },
        { wrong: "العاب",   correct: "ألعاب",   explanation: "همزة قطع في أوّل الكلمة" },
        { wrong: "اطفال",   correct: "أطفال",   explanation: "همزة قطع في أوّل الكلمة" },
        { wrong: "اكثر",    correct: "أكثر",    explanation: "همزة قطع في أوّل الكلمة" },
        { wrong: "اجمل",    correct: "أجمل",    explanation: "همزة قطع في أوّل الكلمة" },
        { wrong: "امام",    correct: "أمام",    explanation: "همزة قطع في أوّل الكلمة" },
        { wrong: "اسرتي",   correct: "أسرتي",   explanation: "همزة قطع في أوّل الكلمة" },
        { wrong: "احيانا",  correct: "أحياناً", explanation: "همزة قطع وتنوين" },
        { wrong: "اولا",    correct: "أولاً",   explanation: "همزة قطع في أوّل الكلمة" },
        { wrong: "اخيرا",   correct: "أخيراً",  explanation: "همزة قطع في أوّل الكلمة" },
        { wrong: "اصدقاء",  correct: "أصدقاء",  explanation: "همزة قطع في أوّل الكلمة" },
        { wrong: "ابي",     correct: "أبي",     explanation: "همزة قطع في أوّل الكلمة" },
        { wrong: "امي",     correct: "أمي",     explanation: "همزة قطع في أوّل الكلمة" },
        { wrong: "وايضا",   correct: "وأيضاً",  explanation: "همزة قطع وتنوين" },
        { wrong: "والعاب",  correct: "وألعاب",  explanation: "همزة قطع في أوّل الكلمة" },
        { wrong: "واشجار",  correct: "وأشجار",  explanation: "همزة قطع في أوّل الكلمة" },
        // حرف الجر
        { wrong: "علي",     correct: "على",     explanation: "حرف الجر يُكتب بألف مقصورة" },
        { wrong: "الي",     correct: "إلى",     explanation: "همزة قطع وألف مقصورة" },
        { wrong: "اليهم",   correct: "إليهم",   explanation: "همزة القطع في أوّل الكلمة" },
        // اسم الإشارة
        { wrong: "هاذا",    correct: "هذا",     explanation: "اسم الإشارة لا يحتوي ألفاً" },
        { wrong: "هاذه",    correct: "هذه",     explanation: "اسم الإشارة لا يحتوي ألفاً" },
        { wrong: "ذالك",    correct: "ذلك",     explanation: "اسم الإشارة بدون ألف" },
        // حروف عطف وأدوات
        { wrong: "لاكن",    correct: "لكن",     explanation: "حرف العطف بدون ألف" },
        { wrong: "لأكن",    correct: "لكن",     explanation: "حرف العطف بدون ألف" },
        { wrong: "دائما",   correct: "دائماً",  explanation: "تنوين في آخر الكلمة" },
        // التاء المربوطة — الأسماء والصفات
        { wrong: "ولايه",   correct: "ولاية",   explanation: "الاسم ينتهي بتاء مربوطة لا هاء" },
        { wrong: "حديقه",   correct: "حديقة",   explanation: "الاسم ينتهي بتاء مربوطة لا هاء" },
        { wrong: "جميله",   correct: "جميلة",   explanation: "الصفة تنتهي بتاء مربوطة لا هاء" },
        { wrong: "كبيره",   correct: "كبيرة",   explanation: "الصفة تنتهي بتاء مربوطة لا هاء" },
        { wrong: "صغيره",   correct: "صغيرة",   explanation: "الصفة تنتهي بتاء مربوطة لا هاء" },
        { wrong: "واسعه",   correct: "واسعة",   explanation: "الصفة تنتهي بتاء مربوطة لا هاء" },
        { wrong: "طويله",   correct: "طويلة",   explanation: "الصفة تنتهي بتاء مربوطة لا هاء" },
        { wrong: "قصيره",   correct: "قصيرة",   explanation: "الصفة تنتهي بتاء مربوطة لا هاء" },
        { wrong: "كثيره",   correct: "كثيرة",   explanation: "الصفة تنتهي بتاء مربوطة لا هاء" },
        { wrong: "قليله",   correct: "قليلة",   explanation: "الصفة تنتهي بتاء مربوطة لا هاء" },
        { wrong: "متنوعه",  correct: "متنوعة",  explanation: "الصفة تنتهي بتاء مربوطة لا هاء" },
        { wrong: "مدرسه",   correct: "مدرسة",   explanation: "الاسم ينتهي بتاء مربوطة لا هاء" },
        { wrong: "غرفه",    correct: "غرفة",    explanation: "الاسم ينتهي بتاء مربوطة لا هاء" },
        { wrong: "شجره",    correct: "شجرة",    explanation: "الاسم ينتهي بتاء مربوطة لا هاء" },
        { wrong: "مدينه",   correct: "مدينة",   explanation: "الاسم ينتهي بتاء مربوطة لا هاء" },
        { wrong: "قريه",    correct: "قرية",    explanation: "الاسم ينتهي بتاء مربوطة لا هاء" },
        { wrong: "نافذه",   correct: "نافذة",   explanation: "الاسم ينتهي بتاء مربوطة لا هاء" },
        { wrong: "طاوله",   correct: "طاولة",   explanation: "الاسم ينتهي بتاء مربوطة لا هاء" },
        { wrong: "سياره",   correct: "سيارة",   explanation: "الاسم ينتهي بتاء مربوطة لا هاء" },
        { wrong: "عائله",   correct: "عائلة",   explanation: "الاسم ينتهي بتاء مربوطة لا هاء" },
        { wrong: "مكتبه",   correct: "مكتبة",   explanation: "الاسم ينتهي بتاء مربوطة لا هاء" },
        { wrong: "صاله",    correct: "صالة",    explanation: "الاسم ينتهي بتاء مربوطة لا هاء" },
        { wrong: "طيبه",    correct: "طيبة",    explanation: "الصفة تنتهي بتاء مربوطة لا هاء" },
        { wrong: "عظيمه",   correct: "عظيمة",   explanation: "الصفة تنتهي بتاء مربوطة لا هاء" },
        { wrong: "كثيره",   correct: "كثيرة",   explanation: "الصفة تنتهي بتاء مربوطة لا هاء" },
        { wrong: "شجره",    correct: "شجرة",    explanation: "الاسم ينتهي بتاء مربوطة لا هاء" },
        { wrong: "نخله",    correct: "نخلة",    explanation: "الاسم ينتهي بتاء مربوطة لا هاء" },
        { wrong: "فرصه",    correct: "فرصة",    explanation: "الاسم ينتهي بتاء مربوطة لا هاء" },
        { wrong: "رياضه",   correct: "رياضة",   explanation: "الاسم ينتهي بتاء مربوطة لا هاء" },
        { wrong: "قصه",     correct: "قصة",     explanation: "الاسم ينتهي بتاء مربوطة لا هاء" },
        { wrong: "لعبه",    correct: "لعبة",    explanation: "الاسم ينتهي بتاء مربوطة لا هاء" },
        { wrong: "رحله",    correct: "رحلة",    explanation: "الاسم ينتهي بتاء مربوطة لا هاء" },
        { wrong: "جزيره",   correct: "جزيرة",   explanation: "الاسم ينتهي بتاء مربوطة لا هاء" },
        { wrong: "مزرعه",   correct: "مزرعة",   explanation: "الاسم ينتهي بتاء مربوطة لا هاء" },
        { wrong: "منطقه",   correct: "منطقة",   explanation: "الاسم ينتهي بتاء مربوطة لا هاء" },
      ];

      const words = originalText.split(/\s+/);
      const localErrors = commonFixes.filter(fix =>
        fix.explanation && words.some(w => {
          const clean = stripDiacritics(w.replace(/[.,،؛:!؟٣٢١٠0-9]/g, ""));
          // Match exact or with common prefixes وفلب
          return clean === fix.wrong ||
            clean === "و" + fix.wrong ||
            clean === "ف" + fix.wrong ||
            clean === "ل" + fix.wrong ||
            clean === "ب" + fix.wrong;
        })
      );
      // Merge with backend errors, avoid duplicates
      const backendWrongs = new Set(errors.map(e => e.wrong));
      errors = [...errors, ...localErrors.filter(e => !backendWrongs.has(e.wrong))];
    }

    if (errors.length === 0) {
      return <span className="text-gray-700 leading-relaxed">{originalText}</span>;
    }
    const words = originalText.split(/(\s+)/);
    // بناء قائمة الكلمات التي تنتمي لخطأ متعدد الكلمات
    const multiWordErrorRanges = new Set<number>();
    const multiWordErrorMap = new Map<number, {wrong:string,correct:string,explanation:string}>();
    errors.filter(e => e.wrong && e.wrong.includes(" ")).forEach(e => {
      const idx = originalText.indexOf(e.wrong);
      if (idx === -1) return;
      // نحسب index الكلمة في مصفوفة words
      let pos = 0, start = -1;
      for (let wi = 0; wi < words.length; wi++) {
        if (pos === idx) start = wi;
        if (start !== -1) {
          multiWordErrorRanges.add(wi);
          if (!multiWordErrorMap.has(start)) multiWordErrorMap.set(start, e);
        }
        pos += words[wi].length;
        if (start !== -1 && pos >= idx + e.wrong.length) break;
      }
    });
    return (
      <span className="leading-loose text-base" style={{ fontFamily: "'Cairo', sans-serif" }}>
        {words.map((word, i) => {
          const stripD = (s: string) => s.replace(/[\u064B-\u065F\u0670]/g, "");
          const cleanWord = stripD(word.replace(/[.,،؛:!؟٣٢١٠0-9]/g, ""));
          // خطأ متعدد الكلمات
          const multiError = multiWordErrorMap.get(i);
          const inMulti = multiWordErrorRanges.has(i) && !multiWordErrorMap.has(i);
          if (inMulti) return <span key={i} className="underline decoration-wavy decoration-red-500 px-0.5 rounded" style={{ background: "#fee2e2", color: "#dc2626" }}>{word}</span>;
          if (multiError && word.trim()) {
            const isOpen = activeError === i;
            return (
              <span key={i} className="relative inline-block">
                <span
                  className="underline decoration-wavy decoration-red-500 cursor-pointer px-0.5 rounded"
                  style={{ background: "#fee2e2", color: "#dc2626" }}
                  onClick={() => setActiveError(isOpen ? null : i)}
                >{word}</span>
                {isOpen && (
                  <span className="absolute bottom-full right-0 mb-1 z-10 bg-gray-900 text-white text-xs rounded-xl p-3 text-right shadow-2xl"
                    style={{ minWidth: "220px", maxWidth: "260px" }}>
                    <span className="flex items-center gap-2 mb-2">
                      <span className="line-through text-red-400 font-bold text-sm">{multiError.wrong}</span>
                      <span className="text-gray-400">←</span>
                      <span className="text-green-400 font-bold text-sm">{multiError.correct}</span>
                    </span>
                    <span className="block text-yellow-200 text-xs mb-2 leading-relaxed">📌 {multiError.explanation}</span>
                    <span className="block bg-gray-800 rounded-lg p-2 text-xs leading-relaxed text-gray-300">
                      ✍️ اكتب: <span className="text-green-300 font-bold">{multiError.correct}</span>
                    </span>
                    <span className="block text-gray-500 text-xs mt-2 cursor-pointer text-center" onClick={(e) => { e.stopPropagation(); setActiveError(null); }}>✕ إغلاق</span>
                  </span>
                )}
              </span>
            );
          }
          const error = multiError || errors.find(e => !e.wrong?.includes(" ") && (e.wrong === cleanWord || stripD(e.wrong) === cleanWord));
          if (error && word.trim()) {
            const isOpen = activeError === i;
            return (
              <span key={i} className="relative inline-block">
                <span
                  className="underline decoration-wavy decoration-red-500 cursor-pointer px-0.5 rounded"
                  style={{ background: "#fee2e2", color: "#dc2626" }}
                  onClick={() => setActiveError(isOpen ? null : i)}
                >{word}</span>
                {isOpen && (
                  <span className="absolute bottom-full right-0 mb-1 z-10 bg-gray-900 text-white text-xs rounded-xl p-3 text-right shadow-2xl"
                    style={{ minWidth: "220px", maxWidth: "260px" }}>
                    {/* الخطأ والصحيح */}
                    <span className="flex items-center gap-2 mb-2">
                      <span className="line-through text-red-400 font-bold text-sm">{error.wrong}</span>
                      <span className="text-gray-400">←</span>
                      <span className="text-green-400 font-bold text-sm">{error.correct}</span>
                    </span>
                    {/* الشرح */}
                    <span className="block text-yellow-200 text-xs mb-2 leading-relaxed">📌 {error.explanation}</span>
                    {/* طريقة الكتابة */}
                    <span className="block bg-gray-800 rounded-lg p-2 text-xs leading-relaxed text-gray-300">
                      ✍️ اكتب: <span className="text-green-300 font-bold">{error.correct}</span>
                    </span>
                    <span className="block text-gray-500 text-xs mt-2 cursor-pointer text-center" onClick={(e) => { e.stopPropagation(); setActiveError(null); }}>✕ إغلاق</span>
                  </span>
                )}
              </span>
            );
          }
          return <span key={i}>{word}</span>;
        })}
      </span>
    );
  }

  const overall  = result.overall_score  ?? result.overall  ?? 0;
  const structure= result.structure_score?? result.structure?? 0;
  const contentS = result.content_score  ?? result.content  ?? structure;
  const errors: any[] = result.errors || [];

  // حساب درجة الإملاء الفعلية بناءً على الأخطاء المكتشفة
  function calcSpellingScore() {
    const apiScore = result.spelling_score ?? result.spelling ?? 0;
    // نحسب الأخطاء الإملائية المكتشفة محلياً
    const stripDiacritics = (s: string) => s.replace(/[\u064B-\u065F\u0670]/g, "");
    const words = originalText.split(/\s+/).filter(Boolean);
    const totalWords = words.length || 1;
    // نعد كم خطأ إملائي موجود في النص
    const spellingErrorCount = errors.filter(e =>
      e.explanation?.includes("همزة") ||
      e.explanation?.includes("تاء مربوطة") ||
      e.explanation?.includes("ألف") ||
      e.explanation?.includes("إملاء") ||
      e.explanation?.includes("تنوين")
    ).length;
    if (spellingErrorCount === 0) return apiScore;
    // كل خطأ يخصم نسبة من الدرجة بحسب حجم النص
    const penalty = Math.min(spellingErrorCount * Math.max(8, Math.round(60 / totalWords)), 60);
    return Math.max(apiScore - penalty, apiScore * 0.4);
  }

  const spelling = Math.round(calcSpellingScore());

  return (
    <div className="bg-white rounded-2xl shadow mt-4 overflow-hidden text-right">
      {/* Score header */}
      <div className="p-5" style={{ background: overall >= 70 ? "linear-gradient(135deg,#dcf5e7,#f0fdf4)" : "linear-gradient(135deg,#fef3e2,#fffbeb)" }}>
        <div className="flex justify-between items-center mb-3">
          <div className="flex gap-1">
            {[1,2,3,4,5].map(i => (
              <span key={i} style={{ color: i <= Math.ceil(overall/20) ? "#f5c842" : "#d1d5db", fontSize: "20px" }}>★</span>
            ))}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">📊 نَتِيجَةُ التَّقْيِيمِ</p>
            <p className="text-4xl font-bold" style={{ color: overall >= 70 ? "#1a5c2a" : "#b45309" }}>{overall}%</p>
          </div>
        </div>
        <p className="text-gray-700 text-sm">{result.feedback || result.general_feedback}</p>
      </div>

      {/* Score breakdown */}
      <div className="p-4 border-b border-gray-100">
        <p className="font-bold text-gray-700 mb-3">📈 تَفْصِيلُ الدَّرَجَاتِ:</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "الإِمْلَاءُ",   value: spelling,  color: "#b45309", bg: "#fef3e2" },
            { label: "التَّرْكِيبُ",  value: structure, color: "#7c3aed", bg: "#ede9f5" },
            { label: "الْمُحْتَوَى", value: contentS,  color: "#1d4ed8", bg: "#dbeafe" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ background: bg }}>
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className="text-2xl font-bold" style={{ color }}>{value}%</p>
              <div className="w-full h-1.5 bg-white rounded-full mt-1.5 overflow-hidden">
                <div className="h-1.5 rounded-full" style={{ width: `${value}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Annotated text */}
      <div className="p-4 border-b border-gray-100">
        <p className="font-bold text-gray-700 mb-2">
          🔍 نَصُّكَ مَعَ تَمْيِيزِ الأَخْطَاءِ:
          {errors.length > 0 && (
            <span className="mr-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
              {errors.length} خَطَأٌ
            </span>
          )}
        </p>
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 leading-relaxed" dir="rtl">
          {renderAnnotatedText()}
        </div>
        {errors.length > 0 && (
          <p className="text-xs text-gray-400 mt-1 text-center">💡 اضْغَطْ عَلَى الْكَلِمَاتِ الْحَمْرَاءِ لِرُؤْيَةِ التَّصْحِيحِ</p>
        )}
      </div>

      {/* Errors list */}
      {errors.length > 0 && (
        <div className="p-4 border-b border-gray-100">
          <p className="font-bold text-red-700 mb-3">❌ الأَخْطَاءُ الإِمْلَائِيَّةُ الْمُكْتَشَفَةُ:</p>
          <div className="space-y-2">
            {errors.map((err: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                <p className="text-xs text-gray-500">{err.explanation}</p>
                <div className="flex items-center gap-2 text-sm font-bold">
                  <span className="text-green-600">{err.correct}</span>
                  <span className="text-gray-400">←</span>
                  <span className="text-red-500 line-through">{err.wrong}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths & improvements */}
      <div className="p-4">
        {result.strengths?.length > 0 && (
          <div className="mb-3">
            <p className="font-bold text-green-700 text-sm mb-2">✅ نِقَاطُ الْقُوَّةِ:</p>
            <div className="space-y-1">
              {result.strengths.map((s: string, i: number) => (
                <div key={i} className="flex items-start gap-2 bg-green-50 rounded-lg px-3 py-2">
                  <span className="text-green-500">•</span>
                  <p className="text-sm text-gray-700">{s}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {result.improvements?.length > 0 && (
          <div>
            <p className="font-bold text-amber-700 text-sm mb-2">💡 اقْتِرَاحَاتُ التَّحْسِينِ:</p>
            <div className="space-y-1">
              {result.improvements.map((s: string, i: number) => {
                // Convert generic "صحح N خطأ" messages to friendlier Arabic
                const friendly = s
                  .replace(/صحح\s*(\d+)\s*خط[أا]\s*إملائي/g, (_, n) =>
                    n === "1" ? "لَدَيْكَ خَطَأٌ إِمْلَائِيٌّ وَاحِدٌ — اضْغَطْ عَلَى الْكَلِمَاتِ الْحَمْرَاءِ لِمَعْرِفَتِهِ" :
                    `لَدَيْكَ ${n} أَخْطَاءٍ إِمْلَائِيَّةٍ — اضْغَطْ عَلَى الْكَلِمَاتِ الْحَمْرَاءِ لِمَعْرِفَتِهَا`)
                  .replace(/أضف\s*(\d+)\s*كلمة/g, (_, n) => `أَضِفْ ${n} كَلِمَاتٍ عَلَى الْأَقَلِّ لِإِثْرَاءِ النَّصِّ`)
                  .replace(/أضف\s*أدوات\s*ربط/g, "أَضِفْ أَدَوَاتِ رَبْطٍ بَيْنَ الْجُمَلِ")
                  .replace(/استخدم\s*علامات\s*الترقيم/g, "اسْتَخْدِمْ عَلَامَاتِ التَّرْقِيمِ بِشَكْلٍ صَحِيحٍ (. ، ؟ !)")
                  .replace(/وسّع\s*المفردات/gi, "حَاوِلْ اسْتِخْدَامَ كَلِمَاتٍ أَكْثَرَ تَنَوُّعاً وَثَرَاءً");
                return (
                  <div key={i} className="flex items-start gap-2 bg-amber-50 rounded-lg px-3 py-2">
                    <span className="text-amber-500">•</span>
                    <p className="text-sm text-gray-700">{friendly}</p>
                  </div>
                );
              })}
              {/* Show detected errors list if any */}
              {(result.errors?.length > 0) && (
                <div className="bg-red-50 rounded-lg px-3 py-2 mt-1">
                  <p className="text-xs font-bold text-red-600 mb-1">🔴 الْأَخْطَاءُ الْمُكْتَشَفَةُ:</p>
                  {result.errors.map((e: any, i: number) => (
                    <p key={i} className="text-xs text-gray-700 mb-0.5">
                      • <span className="line-through text-red-500">{e.wrong}</span> ← <span className="text-green-600 font-bold">{e.correct}</span> <span className="text-gray-400">({e.explanation})</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
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
    playSound(audioFile("/assets/lesson-writing-intro.mp3"), 0.5);
    // No cleanup on unmount — sound persists when navigating
  }, [selectedTopic?.id]);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const sentenceCount = text.split(/[.!؟]/).filter(s => s.trim()).length;

  async function handleEvaluate() {
    if (wordCount < 10) return alert("الرجاء كتابة 10 كلمات على الأقل");
    setLoading(true);
    try {
      const res = await evaluateWriting(text, 20, 0, selectedTopic?.id || "");
      setResult(res);
      const score = res.overall_score || 0;
      const newStars = score >= 90 ? 5 : score >= 70 ? 4 : score >= 50 ? 3 : score >= 30 ? 2 : 1;
      setState((prev) => ({
        ...prev,
        writingProgress: Math.max(prev.writingProgress, score),
        stars: Math.max(prev.stars, newStars),
        points: prev.points + Math.round(score / 10),
      }));
      if (score >= 70) playEffect(audioFile("/assets/achievement.mp3"), 0.7);
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
        <button onClick={() => { setView("topics"); setResult(null); setText(""); stopAll(); }} className="text-amber-100 text-sm mb-1">← اخْتَرْ مَوْضُوعًا آخَرَ</button>
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
        {result && !loading && <WritingResult result={result} originalText={text} />}
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

        {/* Writing Games card */}
        <button onClick={() => setLocation("/writing-games")}
          className="w-full p-5 rounded-2xl text-right shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all mb-3 flex justify-between items-center"
          style={{ background: "linear-gradient(135deg, #ede9f5, #ddd6fe)", border: "2px solid #c4b5fd" }}>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-purple-700 text-white px-2 py-1 rounded-full font-bold">أَلْعَابٌ تَفَاعُلِيَّةٌ</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-purple-800">🎮 أَلْعَابُ الْهَمْزَةِ</h2>
            <p className="text-purple-600 text-sm">هَمْزَةٌ مُتَوَسِّطَةٌ • هَمْزَةٌ مُتَطَرِّفَةٌ • تَحَدِّي سَرِيعٌ</p>
          </div>
          <span className="text-4xl">🎮</span>
        </button>

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