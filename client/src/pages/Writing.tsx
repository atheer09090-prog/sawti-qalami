import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { evaluateWriting, getWritingTopics, describeError } from "@/lib/api";
import { playSound, stopSound, playEffect, stopAll, audioFile } from "@/lib/audio";
import { setState } from "@/lib/store";
import { ResultSkeleton } from "@/components/ResultSkeleton";
import {
  AlertCircle, ArrowLeft, CheckCircle2, Dices, Gamepad2, Lightbulb, MessageSquareText, PenLine, Pin, ScanSearch, Sparkles, X,
} from "lucide-react";
import { Btn, CriterionTile, ErrorState, ProcessingState, ProgressBar, ResultList, ScoreCard, SectionHeader, PageHeader } from "@/components/ds";
import { DICTATION_QUESTIONS } from "@/lib/dictation-data";

/* ── Writing topics ── */
const DEFAULT_TOPICS = [
  { id: "home", title: "وَصْفُ الْمَنْزِلِ", icon: "🏠", image: "/assets/topics/home.jpg", hints: ["الْمَوْقِعُ وَالْحَيُّ", "الشَّكْلُ الْخَارِجِيُّ", "الْغُرَفُ", "مَا يُمَيِّزُهُ"] },
  { id: "neighborhood", title: "وَصْفُ النَّخْلَةِ", icon: "🌴", image: "/assets/topics/palm-tree.jpg", hints: ["مَوْقِعُ النَّخْلَةِ", "شَكْلُهَا", "فَوَائِدُهَا", "أَهَمِّيَّتُهَا"] },
  { id: "mosque", title: "وَصْفُ الْمَسْجِدِ", icon: "🕌", image: "/assets/topics/mosque.jpg", hints: ["الشَّكْلُ الْمَعْمَارِيُّ", "الأَجْوَاءُ الرُّوحَانِيَّةُ", "الْخَدَمَاتُ", "الأَهَمِّيَّةُ"] },
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
      ctx.font = "600 13px 'IBM Plex Sans Arabic', sans-serif";
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
    <div dir="rtl" className="page-container page-section skill-writing">
      <PageHeader skill="writing" icon={Dices} title="رِحْلَةُ الإِمْلَاءِ" description="أَدِرِ الْعَجَلَةَ — اخْتَرِ الْكِتَابَةَ الصَّحِيحَةَ"
        back={{ label: "مَهَارَةُ الْكِتَابَةِ", onClick: onBack }} />
      <div className="mx-auto max-w-xl">
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
              <span key={type} className="badge">{type}</span>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center mb-4">🎯 فِئَاتُ الأَسْئِلَةِ ({DICTATION_QUESTIONS.length} سُؤَالٌ)</p>
          <Btn size="lg" block icon={Dices} onClick={() => setPhase("wheel")}>ابْدَأِ الرِّحْلَةَ!</Btn>
        </div>
      </div>
    </div>
  );

  /* ── Wheel ── */
  if (phase === "wheel") return (
    <div dir="rtl" className="page-container page-section skill-writing">
      <PageHeader skill="writing" icon={Dices} title="رِحْلَةُ الإِمْلَاءِ"
        back={{ label: "مَهَارَةُ الْكِتَابَةِ", onClick: onBack }}
        actions={<span className="badge badge-skill tabular-nums">{correct} ✓ / {total}</span>} />
      <ProgressBar className="mb-6" value={(total / DICTATION_QUESTIONS.length) * 100} label="تقدمك في الأسئلة" />
      <div className="mx-auto max-w-xl">
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
    <div dir="rtl" className="page-container page-section skill-writing">
      <PageHeader skill="writing" icon={Dices} title="رِحْلَةُ الإِمْلَاءِ"
        back={{ label: "مَهَارَةُ الْكِتَابَةِ", onClick: () => setPhase("wheel") }}
        actions={<span className="badge badge-skill tabular-nums">{correct} ✓ / {total}</span>} />
      <ProgressBar className="mb-6" value={(total / DICTATION_QUESTIONS.length) * 100} label="تقدمك في الأسئلة" />
      <div className="mx-auto max-w-xl">
        <div className="bg-white rounded-2xl overflow-hidden shadow">
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100">
            <span className="text-xs font-bold px-2 py-1 rounded-full text-white"
              style={{ background: TYPE_COLORS[currentQ.type] || "#6b7280" }}>{currentQ.type}</span>
            <p className="text-sm text-gray-400">سُؤَالٌ {currentIdx + 1} مِنْ {DICTATION_QUESTIONS.length}</p>
          </div>
          {/* Image or Emoji */}
          <div className="relative">
            {currentQ.img ? (
              <img src={currentQ.img} alt="" className="w-full h-52 object-cover" />
            ) : (
              <div className="w-full h-52 flex items-center justify-center" style={{ background: "#fef3e2" }}>
                <span className="text-8xl">{currentQ.emoji}</span>
              </div>
            )}
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
function errorCountLabel(n: number): string {
  if (n === 1) return "خَطَأٌ وَاحِدٌ";
  if (n === 2) return "خَطَأَانِ";
  if (n >= 3 && n <= 10) return `${n} أَخْطَاءٍ`;
  return `${n} خَطَأً`;
}

function WritingResult({ result, originalText, contextSuggestions }: { result: any; originalText: string; contextSuggestions: Array<{original: string; suggested: string; rule: string}> }) {
  const [activeError, setActiveError] = useState<number | null>(null);

  /** نافذة التصحيح: بطاقة فاتحة تظهر أسفل الشاشة (بدل مربع داكن)، تُغلق بالنقر خارجها أو Esc. */
  function renderPopover(err: { wrong: string; correct: string; explanation: string }) {
    const close = (e: { stopPropagation: () => void }) => { e.stopPropagation(); setActiveError(null); };
    return (
      <>
        <div className="fixed inset-0 z-40" onClick={close} />
        <span role="dialog" aria-label="تصحيح الكلمة" className="menu-enter card fixed inset-x-0 bottom-4 z-50 mx-auto block p-4 text-right shadow-lg"
          style={{ width: "min(340px, 92vw)" }} onKeyDown={(e) => { if (e.key === "Escape") setActiveError(null); }}>
          <span className="mb-2 flex items-center gap-2 text-base font-bold">
            <span className="text-error line-through decoration-2">{err.wrong}</span>
            <ArrowLeft size={15} className="text-text-muted" aria-hidden />
            <span className="text-success">{err.correct}</span>
          </span>
          <span className="t-small mb-2 flex gap-2 text-text-secondary"><Pin size={15} className="mt-1.5 shrink-0" aria-hidden />{err.explanation}</span>
          <span className="t-small block rounded-lg bg-success-soft px-3 py-2 text-success">اكْتُبْ: <strong>{err.correct}</strong></span>
          <button type="button" onClick={close} className="btn btn-ghost btn-sm mt-2 w-full"><X size={15} aria-hidden /> إِغْلَاقٌ</button>
        </span>
      </>
    );
  }

  function renderAnnotatedText() {
    if (errors.length === 0) {
      return <span className="text-text-primary">{originalText}</span>;
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
    const markClass = "rounded bg-error-soft px-0.5 text-error underline decoration-wavy decoration-error underline-offset-4";
    return (
      <span className="font-reading text-lg" style={{ lineHeight: 2.3 }}>
        {words.map((word, i) => {
          const stripD = (s: string) => s.replace(/[\u064B-\u065F\u0670]/g, "");
          const cleanWord = stripD(word.replace(/[.,،؛:!؟٣٢١٠0-9]/g, ""));
          // خطأ متعدد الكلمات
          const multiError = multiWordErrorMap.get(i);
          const inMulti = multiWordErrorRanges.has(i) && !multiWordErrorMap.has(i);
          if (inMulti) return <span key={i} className={markClass}>{word}</span>;
          const error = multiError || errors.find(e => !e.wrong?.includes(" ") && (e.wrong === cleanWord || stripD(e.wrong) === cleanWord));
          if (error && word.trim()) {
            const isOpen = activeError === i;
            return (
              <span key={i} className="relative inline-block">
                <span role="button" tabIndex={0} aria-label={`تصحيح كلمة ${word}`} className={`${markClass} cursor-pointer`}
                  onClick={() => setActiveError(isOpen ? null : i)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveError(isOpen ? null : i); } }}
                >{word}</span>
                {isOpen && renderPopover(error)}
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

  // القائمة الموحّدة للأخطاء: أخطاء الباكند + كشف محلي إضافي (نفس القائمة تُستخدم للعداد،
  // ولقائمة "الأخطاء المكتشفة"، ولتمييز الكلمات في النص — لضمان تطابق الأرقام في كل مكان
  const errors: any[] = (() => {
    const backendErrors: Array<{ wrong: string; correct: string; explanation: string }> = result.errors || [];
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
      { wrong: "الوان",   correct: "ألوان",   explanation: "همزة قطع في أوّل الكلمة" },
      { wrong: "الوانها", correct: "ألوانها", explanation: "همزة قطع في أوّل الكلمة" },
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
      words.some(w => {
        const clean = stripDiacritics(w.replace(/[.,،؛:!؟٣٢١٠0-9]/g, ""));
        return clean === fix.wrong ||
          clean === "و" + fix.wrong ||
          clean === "ف" + fix.wrong ||
          clean === "ل" + fix.wrong ||
          clean === "ب" + fix.wrong;
      })
    );
    const backendWrongs = new Set(backendErrors.map(e => e.wrong));
    return [...backendErrors, ...localErrors.filter(e => !backendWrongs.has(e.wrong))];
  })();

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

  const friendlyImprovement = (s: string) => s
    // Convert generic "صحح N خطأ" messages to friendlier Arabic
    .replace(/صحح\s*(\d+)\s*خط[أا]\s*إملائي/g, (_, n) => {
      const num = parseInt(n, 10);
      if (num === 1) return "لَدَيْكَ خَطَأٌ إِمْلَائِيٌّ وَاحِدٌ — اضْغَطْ عَلَى الْكَلِمَاتِ الْحَمْرَاءِ لِمَعْرِفَتِهِ";
      if (num === 2) return "لَدَيْكَ خَطَأَانِ إِمْلَائِيَّانِ — اضْغَطْ عَلَى الْكَلِمَاتِ الْحَمْرَاءِ لِمَعْرِفَتِهِمَا";
      if (num <= 10) return `لَدَيْكَ ${num} أَخْطَاءٍ إِمْلَائِيَّةٍ — اضْغَطْ عَلَى الْكَلِمَاتِ الْحَمْرَاءِ لِمَعْرِفَتِهَا`;
      return `لَدَيْكَ ${num} خَطَأً إِمْلَائِيًّا — اضْغَطْ عَلَى الْكَلِمَاتِ الْحَمْرَاءِ لِمَعْرِفَتِهَا`;
    })
    .replace(/أضف\s*(\d+)\s*كلمة/g, (_, n) => `أَضِفْ ${n} كَلِمَاتٍ عَلَى الْأَقَلِّ لِإِثْرَاءِ النَّصِّ`)
    .replace(/أضف\s*أدوات\s*ربط/g, "أَضِفْ أَدَوَاتِ رَبْطٍ بَيْنَ الْجُمَلِ")
    .replace(/استخدم\s*علامات\s*الترقيم/g, "اسْتَخْدِمْ عَلَامَاتِ التَّرْقِيمِ بِشَكْلٍ صَحِيحٍ (. ، ؟ !)")
    .replace(/وسّع\s*المفردات/gi, "حَاوِلْ اسْتِخْدَامَ كَلِمَاتٍ أَكْثَرَ تَنَوُّعاً وَثَرَاءً");

  return (
    <div className="mt-8 space-y-4 text-right page-enter" aria-live="polite">
      <SectionHeader title="نَتِيجَةُ التَّقْيِيمِ" description="هَذَا مَا حَلَّلَهُ النِّظَامُ مِنْ نَصِّكَ." />
      <ScoreCard score={overall} feedback={result.feedback || result.general_feedback} title="نَتِيجَةُ التَّقْيِيمِ" />

      <div className="grid gap-3 sm:grid-cols-3">
        <CriterionTile index={0} icon={PenLine} label="الْإِمْلَاءُ" value={spelling} />
        <CriterionTile index={1} icon={ScanSearch} label="التَّرْكِيبُ" value={structure} />
        <CriterionTile index={2} icon={MessageSquareText} label="الْمُحْتَوَى" value={contentS} />
      </div>

      {/* النص مع تمييز الأخطاء */}
      <section className="card card-pad">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="t-card-title text-text-primary">نَصُّكَ مَعَ تَمْيِيزِ الْأَخْطَاءِ</h3>
          {errors.length > 0 && <span className="badge badge-error">{errorCountLabel(errors.length)}</span>}
        </div>
        <div className="rounded-xl border border-border bg-surface-subtle/60 p-4" dir="rtl">{renderAnnotatedText()}</div>
        {errors.length > 0 && <p className="t-caption mt-2 text-center text-text-muted">اضْغَطْ عَلَى الْكَلِمَاتِ الْمُلَوَّنَةِ بِالْأَحْمَرِ لِرُؤْيَةِ التَّصْحِيحِ.</p>}
      </section>

      {errors.length > 0 && (
        <ResultList tone="error" icon={AlertCircle} title="الْأَخْطَاءُ الْإِمْلَائِيَّةُ الْمُكْتَشَفَةُ">
          <ul className="space-y-2">
            {errors.map((err: any, i: number) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-subtle px-3.5 py-2.5">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="text-error line-through decoration-2">{err.wrong}</span>
                  <ArrowLeft size={14} className="text-text-muted" aria-hidden />
                  <span className="text-success">{err.correct}</span>
                </span>
                <span className="t-small text-text-secondary">{err.explanation}</span>
              </li>
            ))}
          </ul>
        </ResultList>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {result.strengths?.length > 0 && (
          <ResultList tone="success" icon={CheckCircle2} title="نِقَاطُ الْقُوَّةِ">
            <ul className="t-body space-y-1 text-text-secondary">
              {result.strengths.map((x: string, i: number) => <li key={i} className="flex gap-2"><CheckCircle2 size={16} className="mt-2 shrink-0 text-success" aria-hidden />{x}</li>)}
            </ul>
          </ResultList>
        )}
        {result.improvements?.length > 0 && (
          <ResultList tone="warning" icon={Lightbulb} title="اقْتِرَاحَاتُ التَّحْسِينِ">
            <ul className="t-body space-y-1 text-text-secondary">
              {result.improvements.map((x: string, i: number) => <li key={i} className="flex gap-2"><Lightbulb size={16} className="mt-2 shrink-0 text-warning" aria-hidden />{friendlyImprovement(x)}</li>)}
            </ul>
          </ResultList>
        )}
      </div>

      {/* اقتراحات السياق */}
      {contextSuggestions.length > 0 && (
        <ResultList tone="warning" icon={Sparkles} title="اقْتِرَاحَاتٌ أُسْلُوبِيَّةٌ">
          <ul className="space-y-2">
            {contextSuggestions.map((s, i) => (
              <li key={i} className="rounded-xl bg-surface-subtle px-3.5 py-2.5">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="text-error line-through decoration-2">{s.original}</span>
                  <ArrowLeft size={14} className="text-text-muted" aria-hidden />
                  <span className="text-success">{s.suggested}</span>
                </span>
                <span className="t-small mt-0.5 flex gap-1.5 text-text-secondary"><Pin size={14} className="mt-1.5 shrink-0" aria-hidden />{s.rule}</span>
              </li>
            ))}
          </ul>
        </ResultList>
      )}
    </div>
  );
}

/* ── Main Writing Page ── */
export default function Writing() {
  const [, setLocation] = useLocation();
  const [view, setView] = useState<"topics"|"dictation"|"writing">("topics");
  const [topics, setTopics] = useState(DEFAULT_TOPICS);
  const [selectedTopic, setSelectedTopic] = useState<typeof DEFAULT_TOPICS[0] | null>(null);

  useEffect(() => {
    getWritingTopics().then(data => {
      if (!data || !Array.isArray(data)) return;
      // ندمج بيانات الباكند مع الافتراضية: نُبقي على حقل الصورة (وأي حقل محلي جديد)
      // بدل فقدانه عند استبدال كامل بنسخة الباكند الأقدم التي لا تحتوي عليه.
      const merged = data.map((backendTopic: any) => {
        const local = DEFAULT_TOPICS.find(t => t.id === backendTopic.id);
        return local ? { ...local, ...backendTopic, image: backendTopic.image || local.image } : backendTopic;
      });
      for (const local of DEFAULT_TOPICS) {
        if (!merged.some((m: any) => m.id === local.id)) merged.push(local);
      }
      setTopics(merged);
    });
  }, []);
  const [text, setText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [contextSuggestions, setContextSuggestions] = useState<Array<{original: string; suggested: string; rule: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [writeError, setWriteError] = useState("");

  useEffect(() => {
    if (!selectedTopic) return;
    playSound(audioFile("/assets/lesson-writing-intro.mp3"), 0.5);
    // No cleanup on unmount — sound persists when navigating
  }, [selectedTopic?.id]);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const sentenceCount = text.split(/[.!؟]/).filter(s => s.trim()).length;

  async function handleEvaluate() {
    if (wordCount < 10) return; // الزر معطَّل أصلًا قبل الوصول لهذا الحد، فلا حاجة لتنبيه منبثق
    setLoading(true);
    setWriteError("");
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
    } catch (e) {
      // لا نُظهِر نتيجةً وَهْمِيَّةً عند فشل الاتصال بالخادم — كانت التجربة
      // السابقة تعرض تقييمًا إيجابيًا مُلَفَّقًا (75%) وتحفظه في تقدُّم
      // الطالب الفعلي حتى لو تعطَّل الخادم، وهذا يُفسِد دقّة سجلّ تقدُّمه.
      setWriteError(describeError(e, "تَعَذَّرَ الِاتِّصَالُ بِالْخَادِمِ لِتَقْيِيمِ نَصِّكَ. تَحَقَّقْ مِنِ اتِّصَالِكَ بِالإِنْتَرْنِتِ وَحَاوِلْ مَرَّةً أُخْرَى."));
    }
    setLoading(false);
  }

  /* Dictation view */
  if (view === "dictation") return <DictationGame onBack={() => setView("topics")} />;

  /* Writing view */
  if (view === "writing" && selectedTopic) return (
    <div className="page-container page-section skill-writing">
      <PageHeader skill="writing" icon={PenLine} title={selectedTopic.title} description="اكْتُبْ نَصَّكَ ثُمَّ اضْغَطْ تَقْيِيمَ الْكِتَابَةِ."
        back={{ label: "اخْتَرْ مَوْضُوعًا آخَرَ", onClick: () => { setView("topics"); setResult(null); setText(""); stopAll(); } }} />

      <div className="grid items-start gap-6 lg:grid-cols-5">
        {/* مساحة الكتابة */}
        <section className="card card-pad lg:col-span-3" aria-label="مساحة الكتابة">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="badge badge-skill"><Pin size={14} aria-hidden /> اسْتَعِنْ بِهَذِهِ الْعَنَاصِرِ</span>
            {selectedTopic.hints.map(h => <span key={h} className="badge">{h}</span>)}
          </div>
          <label htmlFor="writing-area" className="sr-only">نص الكتابة</label>
          <textarea id="writing-area" value={text} onChange={(e) => setText(e.target.value)} placeholder="اكْتُبْ هُنَا..."
            className="textarea font-reading !text-xl" style={{ minHeight: 300, lineHeight: 2.1 }} />
          <div className="mt-3 flex items-center justify-between text-sm text-text-secondary">
            <span>{sentenceCount} جُمَلٌ</span>
            <span className="tabular-nums"><strong className="text-text-primary">{wordCount}</strong> / 200 كَلِمَةٌ</span>
          </div>
          <div className="progress mt-1.5 mb-4" aria-hidden>
            <div className="h-full rounded-full bg-skill" style={{ width: `${Math.min(wordCount / 200 * 100, 100)}%`, transition: "width 300ms var(--ease-out)" }} />
          </div>

          {writeError && <ErrorState className="mb-3" message={writeError} onRetry={handleEvaluate} />}
          {wordCount > 0 && wordCount < 10 && (
            <p className="alert alert-warning mb-3 !py-2 text-sm">اكْتُبْ {10 - wordCount} كَلِمَاتٍ إِضَافِيَّةٍ عَلَى الْأَقَلِّ لِتَتَمَكَّنَ مِنَ التَّقْيِيمِ.</p>
          )}
          <Btn size="lg" block loading={loading} disabled={wordCount < 10} icon={ScanSearch} onClick={handleEvaluate}>
            {loading ? "جَارٍ التَّقْيِيمُ..." : "تَقْيِيمُ الْكِتَابَةِ"}
          </Btn>
        </section>

        {/* صورة الموضوع */}
        {selectedTopic.image && (
          <div className="card overflow-hidden bg-writing-soft lg:sticky lg:top-24 lg:col-span-2" style={{ aspectRatio: "16/9" }}>
            <img src={selectedTopic.image} alt={selectedTopic.title} className="size-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
        )}
      </div>

      {loading && <ProcessingState className="mt-8" icon={PenLine} title="جَارٍ تَحْلِيلُ نَصِّكَ..." description="قَدْ يَسْتَغْرِقُ ذَلِكَ عِدَّةَ ثَوَانٍ." />}
      {result && !loading && <WritingResult result={result} originalText={text} contextSuggestions={contextSuggestions} />}
    </div>
  );

  /* Topics view (default) */
  return (
    <div className="page-container page-section skill-writing">
      <PageHeader skill="writing" icon={PenLine} title="مَهَارَةُ الْكِتَابَةِ" description="طَوِّرْ أُسْلُوبَكَ الْكِتَابِيَّ وَإِبْدَاعَكَ اللُّغَوِيَّ."
        back={{ label: "الْمَهَارَاتُ", to: "/skills" }} />

      <SectionHeader title="أَلْعَابٌ تَفَاعُلِيَّةٌ" description="تَدَرَّبْ عَلَى الْإِمْلَاءِ وَالْهَمْزَةِ بِطَرِيقَةٍ مُمْتِعَةٍ." />
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <button type="button" onClick={() => setLocation("/writing-games")}
          className="card card-interactive card-pad stagger-in group flex items-center gap-4 text-right">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-learning-soft text-learning transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105"><Gamepad2 size={28} strokeWidth={1.75} /></span>
          <span className="flex-1">
            <span className="mb-1 flex items-center gap-2"><h3 className="t-card-title text-text-primary">أَلْعَابُ الْهَمْزَةِ</h3></span>
            <span className="t-small block text-text-secondary">هَمْزَةٌ مُتَوَسِّطَةٌ • هَمْزَةٌ مُتَطَرِّفَةٌ • تَحَدِّي سَرِيعٌ</span>
          </span>
          <ArrowLeft size={18} className="shrink-0 text-text-muted transition-transform group-hover:-translate-x-1" aria-hidden />
        </button>
        <button type="button" onClick={() => setView("dictation")} style={{ ["--i" as string]: 1 }}
          className="card card-interactive card-pad stagger-in group flex items-center gap-4 text-right">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-writing-soft text-writing transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105"><Dices size={28} strokeWidth={1.75} /></span>
          <span className="flex-1">
            <h3 className="t-card-title text-text-primary">رِحْلَةُ الْإِمْلَاءِ</h3>
            <span className="t-small block text-text-secondary">أَدِرِ الْفَجَلَةَ وَاخْتَرِ الْكِتَابَةَ الصَّحِيحَةَ لِلْكَلِمَاتِ</span>
          </span>
          <ArrowLeft size={18} className="shrink-0 text-text-muted transition-transform group-hover:-translate-x-1" aria-hidden />
        </button>
      </div>

      <SectionHeader title="مَوَاضِيعُ الْكِتَابَةِ" description="اخْتَرْ مَوْضُوعًا وَاكْتُبْ حَتَّى 200 كَلِمَةٍ." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {topics.map((t, i) => (
          <button key={t.id} type="button" style={{ ["--i" as string]: i }}
            onClick={() => { setSelectedTopic(t); setView("writing"); }}
            className="card card-interactive card-pad stagger-in group flex flex-col gap-3 text-right">
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-14 place-items-center rounded-2xl bg-skill-soft text-3xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">{t.icon}</span>
              <span className="badge badge-skill">حَتَّى 200 كَلِمَةٍ</span>
            </div>
            <h3 className="t-card-title flex-1 text-text-primary">{t.title}</h3>
            <ul className="flex flex-wrap gap-1.5">{t.hints.map(h => <li key={h} className="badge">{h}</li>)}</ul>
          </button>
        ))}
      </div>
    </div>
  );
}
