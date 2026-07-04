import { useState, useRef, useEffect } from "react";
import { getGames } from "@/lib/api";
import { useLocation } from "wouter";
import { playEffect, stopAll, audioFile } from "@/lib/audio";

/* ══════════════════════════════════════════════════════
   DATA
   ══════════════════════════════════════════════════════ */
const DEFAULT_MIDDLE_HAMZA = [
  { before: "س", after: "ال",   correct: "ؤ", opts: ["ؤ","ئ","أ","ء"], hint: "الهمزة على واو لأن ما قبلها ضمة", word: "سؤال", emoji: "❔" },
  { before: "يَس", after: "ل",  correct: "أ", opts: ["أ","ئ","ؤ","ء"], hint: "الهمزة على ألف لأن ما قبلها ساكن وما بعدها مفتوح", word: "يسأل", emoji: "🗣️" },
  { before: "رَ", after: "س",   correct: "أ", opts: ["أ","ئ","ؤ","ء"], hint: "الهمزة على ألف لأن ما قبلها فتحة", word: "رأس", emoji: "🧠" },
  { before: "مَ", after: "ذَن", correct: "أ", opts: ["أ","ئ","ؤ","ء"], hint: "الهمزة على ألف لأن ما قبلها ساكن وقبله فتح", word: "مأذن", emoji: "🕌" },
  { before: "بِ", after: "ر",   correct: "ئ", opts: ["ئ","ؤ","أ","ء"], hint: "الهمزة على نبرة لأن ما قبلها كسرة", word: "بئر", emoji: "💧" },
  { before: "فُ", after: "اد",  correct: "ؤ", opts: ["ؤ","ئ","أ","ء"], hint: "الهمزة على واو لأن ما قبلها ضمة", word: "فؤاد", emoji: "❤️" },
  { before: "تَ", after: "خُذ", correct: "أ", opts: ["أ","ئ","ؤ","ء"], hint: "الهمزة على ألف لأن ما قبلها فتحة", word: "تأخذ", emoji: "✋" },
  { before: "مَسْ", after: "لة",correct: "أ", opts: ["أ","ئ","ؤ","ء"], hint: "الهمزة على ألف لأن ما قبلها ساكن وما بعدها مفتوح", word: "مسألة", emoji: "📐" },
  { before: "هَ", after: "لة",  correct: "ئ", opts: ["ئ","ؤ","أ","ء"], hint: "الهمزة على نبرة لأن ما قبلها كسرة", word: "هيئة", emoji: "👥" },
  { before: "لُ", after: "لُؤ", correct: "ؤ", opts: ["ؤ","ئ","أ","ء"], hint: "الهمزة على واو لأن ما قبلها ضمة", word: "لؤلؤ", emoji: "💎" },
];

const DEFAULT_END_HAMZA = [
  { word: "سماء",   type: "ء",  rule: "ما قبلها ألف مد", emoji: "☁️" },
  { word: "شيء",    type: "ء",  rule: "ما قبلها ياء ساكنة", emoji: "📦" },
  { word: "ضوء",    type: "ء",  rule: "ما قبلها واو ساكنة", emoji: "💡" },
  { word: "بطء",    type: "ء",  rule: "ما قبلها ساكن", emoji: "🐢" },
  { word: "دفء",    type: "ء",  rule: "ما قبلها ساكن", emoji: "🔥" },
  { word: "جزء",    type: "ء",  rule: "ما قبلها ساكن", emoji: "🧩" },
  { word: "مبدأ",   type: "أ",  rule: "ما قبلها فتحة", emoji: "🎯" },
  { word: "ملجأ",   type: "أ",  rule: "ما قبلها فتحة", emoji: "🏠" },
  { word: "منشأ",   type: "أ",  rule: "ما قبلها فتحة", emoji: "🏗️" },
  { word: "لجأ",    type: "أ",  rule: "ما قبلها فتحة", emoji: "🏃" },
  { word: "امرؤ",   type: "ؤ",  rule: "ما قبلها ضمة", emoji: "🧍" },
  { word: "تساؤل",  type: "ؤ",  rule: "ما قبلها ضمة", emoji: "❓" },
];

const SORT_CATEGORIES = [
  { id: "أ",  label: "همزة على ألف",   color: "#1a5c2a", bg: "#dcf5e7", example: "مبدأ" },
  { id: "ؤ",  label: "همزة على واو",   color: "#1d4ed8", bg: "#dbeafe", example: "امرؤ" },
  { id: "ء",  label: "همزة على السطر", color: "#b45309", bg: "#fef3e2", example: "سماء" },
];

const DEFAULT_QUICK_QUIZ = [
  { q: "أيّ كتابة صحيحة؟", opts: ["سؤال","سئال","سأال","سوال"], correct: "سؤال", explain: "الهمزة المتوسطة على واو لأن ما قبلها ضمة", emoji: "❔" },
  { q: "أيّ كتابة صحيحة؟", opts: ["هادئ","هادىء","هادِئ","هادؤ"], correct: "هادئ", explain: "الهمزة المتوسطة على نبرة لأن ما قبلها كسرة", emoji: "😌" },
  { q: "أيّ كتابة صحيحة؟", opts: ["مسأله","مسألة","مساله","مسالة"], correct: "مسألة", explain: "الهمزة على ألف وتاء مربوطة في الآخر", emoji: "📐" },
  { q: "أيّ كتابة صحيحة؟", opts: ["شيء","شئ","شيأ","شيؤ"], correct: "شيء", explain: "الهمزة المتطرفة على السطر لأن ما قبلها ياء ساكنة", emoji: "📦" },
  { q: "أيّ كتابة صحيحة؟", opts: ["سماء","سماأ","سمائ","سماؤ"], correct: "سماء", explain: "الهمزة المتطرفة على السطر لأن ما قبلها ألف مد", emoji: "☁️" },
  { q: "أيّ كتابة صحيحة؟", opts: ["ملجأ","ملجء","ملجئ","ملجؤ"], correct: "ملجأ", explain: "الهمزة المتطرفة على ألف لأن ما قبلها فتحة", emoji: "🏠" },
  { q: "أيّ كتابة صحيحة؟", opts: ["يقرأ","يقرء","يقرئ","يقرؤ"], correct: "يقرأ", explain: "الهمزة على ألف لأن ما قبلها فتحة", emoji: "📖" },
  { q: "أيّ كتابة صحيحة؟", opts: ["بئر","بأر","بؤر","بءر"], correct: "بئر", explain: "الهمزة المتوسطة على نبرة لأن ما قبلها كسرة", emoji: "💧" },
  { q: "أيّ كتابة صحيحة؟", opts: ["رأس","رءس","رؤس","رئس"], correct: "رأس", explain: "الهمزة المتوسطة على ألف لأن ما قبلها فتحة", emoji: "🧠" },
  { q: "أيّ كتابة صحيحة؟", opts: ["سئل","سأل","سؤل","سءل"], correct: "سئل", explain: "الهمزة المتوسطة على نبرة لأن ما قبلها كسرة مقدرة", emoji: "🗣️" },
];

function shuffleOpts<T extends { opts: string[] }>(q: T): T {
  return { ...q, opts: [...q.opts].sort(() => Math.random() - 0.5) };
}

/* ══════════════════════════════════════════════════════
   SHARED — Confetti burst on correct answer
   ══════════════════════════════════════════════════════ */
function Confetti({ trigger }: { trigger: number }) {
  const [pieces, setPieces] = useState<Array<{ id: number; x: number; color: string; delay: number }>>([]);
  useEffect(() => {
    if (trigger === 0) return;
    const colors = ["#1a5c2a","#f5c842","#1d4ed8","#dc2626","#7c3aed","#d97706"];
    const newPieces = Array.from({ length: 18 }, (_, i) => ({
      id: Date.now() + i,
      x: 10 + Math.random() * 80,
      color: colors[i % colors.length],
      delay: Math.random() * 0.3,
    }));
    setPieces(newPieces);
    const t = setTimeout(() => setPieces([]), 1400);
    return () => clearTimeout(t);
  }, [trigger]);

  if (pieces.length === 0) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(p => (
        <div key={p.id} className="absolute top-0 w-2.5 h-2.5 rounded-sm"
          style={{
            left: `${p.x}%`, background: p.color,
            animation: `confettiFall 1.2s ease-in ${p.delay}s forwards`,
          }} />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(80vh) rotate(540deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   GAME 1 — مُحَقِّقُ الْهَمْزَةِ المتوسطة
   ══════════════════════════════════════════════════════ */
function MiddleHamzaGame({ onBack, data }: { onBack: () => void; data: typeof DEFAULT_MIDDLE_HAMZA }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [confettiTrig, setConfettiTrig] = useState(0);
  const [shake, setShake] = useState(false);
  const [questions] = useState(() => data.map(shuffleOpts));
  const [streak, setStreak] = useState(0);
  const [showStreak, setShowStreak] = useState(false);

  const q = questions[idx];
  const total = data.length;

  function handleAnswer(opt: string) {
    if (selected) return;
    setSelected(opt);
    if (opt === q.correct) {
      setScore(s => s + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      playEffect(audioFile("/assets/correct.mp3"), 0.7);
      setConfettiTrig(t => t + 1);
      if (newStreak >= 3) { setShowStreak(true); setTimeout(() => setShowStreak(false), 1500); }
    } else {
      setStreak(0);
      playEffect(audioFile("/assets/tryagain.mp3"), 0.6);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  }

  function next() {
    if (idx + 1 >= total) setDone(true);
    else { setIdx(i => i + 1); setSelected(null); }
  }

  if (done) {
    const pct = Math.round((score / total) * 100);
    const medal = pct >= 90 ? "🥇" : pct >= 70 ? "🥈" : pct >= 50 ? "🥉" : "💪";
    return (
      <div className="text-center py-8 px-4">
        <div className="text-8xl mb-3 animate-bounce">{medal}</div>
        <h3 className="font-bold text-4xl mb-1" style={{ color: "#1a5c2a" }}>{pct}%</h3>
        <p className="text-gray-500 mb-1">كَشَفْتَ {score} مِنْ {total} جَرِيمَةٍ إِمْلَائِيَّةٍ 🔍</p>
        <p className="font-bold text-lg mb-6" style={{ color: pct >= 70 ? "#1a5c2a" : "#b45309" }}>
          {pct >= 90 ? "مُحَقِّقٌ أُسْطُورِيٌّ! 🌟" : pct >= 70 ? "مُحَقِّقٌ مَاهِرٌ! 🎉" : "تَدَرَّبْ أَكْثَرَ وَسَتُتْقِنُهَا! 💪"}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setIdx(0); setSelected(null); setScore(0); setDone(false); setStreak(0); }}
            className="px-6 py-3 rounded-2xl text-white font-bold shadow-lg"
            style={{ background: "linear-gradient(135deg,#1a5c2a,#2d7a3e)" }}>🔄 تَحْقِيقٌ جَدِيدٌ</button>
          <button onClick={onBack}
            className="px-6 py-3 rounded-2xl border-2 font-bold"
            style={{ borderColor: "#1a5c2a", color: "#1a5c2a" }}>← رُجُوعٌ</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Confetti trigger={confettiTrig} />

      {/* Streak badge */}
      {showStreak && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-yellow-400 text-yellow-900 font-bold px-6 py-3 rounded-full text-lg shadow-xl animate-bounce">
          🔥 {streak} إِجَابَاتٍ مُتَتَالِيَةٍ!
        </div>
      )}

      {/* Header — detective theme */}
      <div className="rounded-2xl p-4 mb-4 text-right" style={{ background: "linear-gradient(135deg,#1a2a1a,#1a5c2a)" }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 font-bold text-sm">🔥 {streak}</span>
            <span className="text-green-300 text-sm">⭐ {score}/{total}</span>
          </div>
          <div className="text-right">
            <p className="text-green-200 text-xs">مُحَقِّقُ الْهَمْزَةِ 🔍</p>
            <p className="text-white font-bold text-sm">قَضِيَّةٌ {idx + 1} مِنْ {total}</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-2 bg-green-900 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${((idx) / total) * 100}%`, background: "linear-gradient(90deg,#4ade80,#22c55e)" }} />
        </div>
      </div>

      {/* Case file card */}
      <div className={`relative bg-white rounded-3xl shadow-xl mb-5 overflow-hidden transition-transform ${shake ? "animate-shake" : ""}`}
        style={{ border: "3px solid #1a5c2a" }}>
        {/* File header */}
        <div className="px-5 py-3 flex items-center justify-between" style={{ background: "#1a5c2a" }}>
          <span className="text-green-200 text-xs font-bold">مَلَفُّ الْقَضِيَّةِ #{String(idx + 1).padStart(2, "0")}</span>
          <span className="text-white text-lg">{q.emoji}</span>
        </div>
        {/* Torn paper effect */}
        <div className="px-5 pt-5 pb-3 text-center">
          <p className="text-xs text-gray-400 mb-3 font-bold tracking-wider">اكْتَشِفِ الْهَمْزَةَ الْمَفْقُودَةَ 🔍</p>
          {/* Word with blank — RTL: before (right) + hamza slot + after (left) */}
          <div className="flex items-center justify-center gap-1 mb-4" dir="rtl" style={{ fontFamily: "'Amiri', serif" }}>
            <span className="text-4xl font-bold text-gray-800">{q.before}</span>
            <span className="inline-flex items-center justify-center rounded-xl mx-1 transition-all text-3xl font-bold"
              style={{
                width: 56, height: 56,
                background: selected ? (selected === q.correct ? "#dcf5e7" : "#fee2e2") : "#fef3c7",
                border: `3px dashed ${selected ? (selected === q.correct ? "#1a5c2a" : "#dc2626") : "#f59e0b"}`,
                color: selected ? (selected === q.correct ? "#1a5c2a" : "#dc2626") : "#92400e",
              }}>
              {selected || "؟"}
            </span>
            <span className="text-4xl font-bold text-gray-800">{q.after}</span>
          </div>

          {selected && (
            <div className="rounded-2xl p-3 text-sm"
              style={{ background: selected === q.correct ? "#dcf5e7" : "#fee2e2" }}>
              <p className="font-bold" style={{ color: selected === q.correct ? "#1a5c2a" : "#dc2626" }}>
                {selected === q.correct ? `✅ صَحِيحٌ! الْكَلِمَةُ: ${q.word}` : `❌ الصَّحِيحُ: ${q.word}`}
              </p>
              <p className="text-gray-600 text-xs mt-1">💡 {q.hint}</p>
            </div>
          )}
        </div>
      </div>

      {/* Clue buttons */}
      <p className="text-center text-xs text-gray-400 mb-2 font-bold">اخْتَرِ الدَّلِيلَ الصَّحِيحَ:</p>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {q.opts.map(opt => {
          let bg = "white", border = "#e5e7eb", color = "#374151";
          if (selected) {
            if (opt === q.correct) { bg = "#dcf5e7"; border = "#1a5c2a"; color = "#1a5c2a"; }
            else if (opt === selected) { bg = "#fee2e2"; border = "#dc2626"; color = "#dc2626"; }
          }
          return (
            <button key={opt} onClick={() => handleAnswer(opt)} disabled={!!selected}
              className="py-5 rounded-2xl text-4xl font-bold shadow-md transition-all hover:-translate-y-1 active:scale-95"
              style={{ background: bg, border: `3px solid ${border}`, color, fontFamily: "'Amiri', serif" }}>
              {opt}
            </button>
          );
        })}
      </div>

      {selected && (
        <button onClick={next}
          className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg active:scale-[0.98] transition-all"
          style={{ background: "linear-gradient(135deg,#1a5c2a,#2d7a3e)" }}>
          {idx + 1 >= total ? "🏁 شَاهِدِ النَّتِيجَةَ" : "الْقَضِيَّةُ التَّالِيَةُ ←"}
        </button>
      )}

      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
        .animate-shake { animation: shake 0.4s; }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   GAME 2 — مَحَطَّةُ الْقِطَارِ: فَرْزُ الْهَمْزَةِ الْمُتَطَرِّفَةِ
   ══════════════════════════════════════════════════════ */
function EndHamzaGame({ onBack, data }: { onBack: () => void; data: typeof DEFAULT_END_HAMZA }) {
  const [words] = useState(() => [...data].sort(() => Math.random() - 0.5));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<{ correct: boolean; rule: string } | null>(null);
  const [done, setDone] = useState(false);
  const [confettiTrig, setConfettiTrig] = useState(0);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [flying, setFlying] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const current = words[currentIdx];

  function handleChoice(catId: string) {
    if (feedback) return;
    const isCorrect = catId === current.type;
    if (isCorrect) {
      setScore(s => s + 1);
      playEffect(audioFile("/assets/correct.mp3"), 0.7);
      setConfettiTrig(t => t + 1);
    } else {
      playEffect(audioFile("/assets/tryagain.mp3"), 0.6);
    }
    setFeedback({ correct: isCorrect, rule: current.rule });
  }

  function next() {
    setFeedback(null);
    if (currentIdx + 1 >= words.length) setDone(true);
    else setCurrentIdx(i => i + 1);
  }

  // Drag handlers
  function onDragStart(e: React.DragEvent) {
    e.dataTransfer.setData("text/plain", "word");
  }
  function onDrop(catId: string) {
    if (feedback) return;
    handleChoice(catId);
    setDragOverId(null);
  }

  if (done) {
    const pct = Math.round((score / words.length) * 100);
    return (
      <div className="text-center py-10">
        <div className="text-7xl mb-4 animate-bounce">{pct >= 75 ? "🏆" : pct >= 50 ? "⭐" : "💪"}</div>
        <h3 className="font-bold text-3xl mb-2" style={{ color: "#b45309" }}>{pct}%</h3>
        <p className="text-gray-500 mb-1">صَنَّفْتَ {score} مِنْ {words.length} كَلِمَةٍ بِشَكْلٍ صَحِيحٍ</p>
        <p className="text-gray-400 text-sm mb-6">
          {pct >= 75 ? "مُمْتَازٌ! أَتْقَنْتَ الْهَمْزَةَ الْمُتَطَرِّفَةَ! 🎉" : "تَدَرَّبْ أَكْثَرَ! 💪"}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-2xl text-white font-bold shadow-lg hover:scale-105 transition-transform"
            style={{ background: "linear-gradient(135deg,#b45309,#d97706)" }}>🔄 إِعَادَةٌ</button>
          <button onClick={onBack}
            className="px-6 py-3 rounded-2xl border-2 font-bold hover:bg-amber-50 transition-colors"
            style={{ borderColor: "#b45309", color: "#b45309" }}>← رُجُوعٌ</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Confetti trigger={confettiTrig} />

      {/* Train station header */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: "linear-gradient(135deg,#3d1a00,#92400e)" }}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-amber-300 font-bold text-sm">⭐ {score} / {words.length}</span>
          <div className="text-right">
            <p className="text-amber-200 text-xs">🚂 مَحَطَّةُ الْهَمْزَةِ</p>
            <p className="text-white font-bold text-sm">رَاكِبٌ {currentIdx + 1} مِنْ {words.length}</p>
          </div>
        </div>
        {/* Train progress */}
        <div className="relative h-3 bg-amber-900 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${(currentIdx / words.length) * 100}%`, background: "linear-gradient(90deg,#fbbf24,#f59e0b)" }} />
          <span className="absolute right-0 top-0 text-xs" style={{ transform: `translateX(${(currentIdx / words.length) * 100}%)` }}>🚂</span>
        </div>
      </div>

      {/* Word ticket card */}
      <div
        ref={cardRef}
        draggable={!feedback}
        onDragStart={onDragStart}
        className="bg-white rounded-3xl shadow-xl mb-5 overflow-hidden select-none"
        style={{ border: "3px solid #b45309", cursor: feedback ? "default" : "grab" }}
      >
        {/* Ticket header */}
        <div className="px-4 py-2 flex justify-between items-center" style={{ background: "#b45309" }}>
          <span className="text-amber-200 text-xs font-bold">🎫 تَذْكِرَةُ الرَّاكِبِ</span>
          <span className="text-white text-lg">{current.emoji}</span>
        </div>
        <div className="p-5 text-center">
          <p className="text-xs text-gray-400 mb-3">
            {feedback ? "" : "🚂 وَجِّهِ الرَّاكِبَ إِلَى مَحَطَّتِهِ الصَّحِيحَةِ"}
          </p>
          <p className="text-6xl font-bold mb-2" style={{ fontFamily: "'Amiri', serif", color: "#1a5c2a" }}>
            {current.word.slice(0, -1)}<span style={{ color: feedback ? (feedback.correct ? "#1a5c2a" : "#dc2626") : "#d97706" }}>
              {feedback ? current.word.slice(-1) : "؟"}
            </span>
          </p>
          {feedback && (
            <div className="mt-2 p-3 rounded-2xl text-sm"
              style={{ background: feedback.correct ? "#dcf5e7" : "#fee2e2" }}>
              <p className="font-bold" style={{ color: feedback.correct ? "#1a5c2a" : "#dc2626" }}>
                {feedback.correct ? "✅ وَصَلَ لِلْمَحَطَّةِ الصَّحِيحَةِ!" : `❌ الْمَحَطَّةُ الصَّحِيحَةُ: "${current.type}"`}
              </p>
              <p className="text-gray-600 mt-1 text-xs">💡 {feedback.rule}</p>
            </div>
          )}
        </div>
      </div>

      {/* Station platforms */}
      {!feedback && (
        <div className="grid grid-cols-3 gap-3">
          {SORT_CATEGORIES.map(cat => (
            <div
              key={cat.id}
              onDragOver={(e) => { e.preventDefault(); setDragOverId(cat.id); }}
              onDragLeave={() => setDragOverId(null)}
              onDrop={() => onDrop(cat.id)}
              onClick={() => handleChoice(cat.id)}
              className="rounded-2xl p-3 text-center cursor-pointer transition-all"
              style={{
                background: cat.bg,
                border: `3px ${dragOverId === cat.id ? "solid" : "dashed"} ${cat.color}`,
                transform: dragOverId === cat.id ? "scale(1.08)" : "scale(1)",
              }}
            >
              <div className="text-2xl mb-1">🚉</div>
              <div className="text-4xl font-bold mb-1" style={{ fontFamily: "'Amiri', serif", color: cat.color }}>{cat.id}</div>
              <p className="font-bold text-xs" style={{ color: cat.color }}>{cat.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">مثل: {cat.example}</p>
            </div>
          ))}
        </div>
      )}

      {feedback && (
        <button onClick={next}
          className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg mt-2"
          style={{ background: "linear-gradient(135deg,#92400e,#b45309)" }}>
          {currentIdx + 1 >= words.length ? "🏁 شَاهِدِ النَّتِيجَةَ" : "الرَّاكِبُ التَّالِي 🚂 ←"}
        </button>
      )}

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .animate-fadeIn { animation: fadeIn 0.3s; }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   GAME 3 — تحدي السرعة: عجلة الطاقة + مؤقّت بصري دائري
   ══════════════════════════════════════════════════════ */
function QuickQuizGame({ onBack, data }: { onBack: () => void; data: typeof DEFAULT_QUICK_QUIZ }) {
  const [questions] = useState(() => data.map(shuffleOpts));
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [done, setDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState(12);
  const [confettiTrig, setConfettiTrig] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (selected || done) return;
    setTimeLeft(12);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setSelected("__timeout__");
          setStreak(0);
          playEffect(audioFile("/assets/tryagain.mp3"), 0.6);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [idx, done]);

  function handleAnswer(opt: string) {
    if (selected) return;
    clearInterval(timerRef.current);
    setSelected(opt);
    if (opt === questions[idx].correct) {
      setScore(s => s + 1);
      setStreak(s => { const ns = s + 1; setMaxStreak(m => Math.max(m, ns)); return ns; });
      playEffect(audioFile("/assets/correct.mp3"), 0.7);
      setConfettiTrig(t => t + 1);
    } else {
      setStreak(0);
      playEffect(audioFile("/assets/tryagain.mp3"), 0.6);
    }
  }

  function next() {
    if (idx + 1 >= questions.length) setDone(true);
    else { setIdx(i => i + 1); setSelected(null); }
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="text-center py-10">
        <div className="text-7xl mb-4 animate-bounce">{pct >= 70 ? "🏆" : pct >= 50 ? "⚡" : "💪"}</div>
        <h3 className="font-bold text-3xl mb-1" style={{ color: "#7c3aed" }}>{pct}%</h3>
        <p className="text-gray-500 mb-1">{score} مِنْ {questions.length} إِجَابَاتٍ صَحِيحَةٍ</p>
        <p className="text-purple-600 font-bold text-sm mb-6">🔥 أَطْوَلُ سِلْسِلَةٍ: {maxStreak}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-2xl text-white font-bold shadow-lg hover:scale-105 transition-transform"
            style={{ background: "linear-gradient(135deg,#7c3aed,#9333ea)" }}>🔄 إِعَادَةٌ</button>
          <button onClick={onBack}
            className="px-6 py-3 rounded-2xl border-2 font-bold hover:bg-purple-50 transition-colors"
            style={{ borderColor: "#7c3aed", color: "#7c3aed" }}>← رُجُوعٌ</button>
        </div>
      </div>
    );
  }

  const q = questions[idx];
  const circumference = 2 * Math.PI * 26;
  const progress = (timeLeft / 12) * circumference;

  return (
    <div>
      <Confetti trigger={confettiTrig} />
      {/* Circular timer + streak */}
      <div className="flex justify-between items-center mb-4 px-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔥</span>
          <span className="font-bold text-purple-700">{streak}</span>
        </div>
        <span className="text-sm text-gray-400">{idx + 1} / {questions.length}</span>
        {/* Circular countdown */}
        <div className="relative w-16 h-16">
          <svg width="64" height="64" className="-rotate-90">
            <circle cx="32" cy="32" r="26" fill="none" stroke="#ede9f5" strokeWidth="6" />
            <circle cx="32" cy="32" r="26" fill="none"
              stroke={timeLeft <= 4 ? "#dc2626" : "#7c3aed"} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={circumference - progress}
              style={{ transition: "stroke-dashoffset 1s linear" }} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-bold text-lg"
            style={{ color: timeLeft <= 4 ? "#dc2626" : "#7c3aed" }}>
            {timeLeft}
          </span>
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-3xl p-6 shadow-lg mb-5 text-center" style={{ border: "3px solid #ede9f5" }}>
        <div className="text-5xl mb-3">{q.emoji}</div>
        <p className="text-sm text-gray-400 mb-4">{q.q}</p>
        <div className="grid grid-cols-2 gap-3">
          {q.opts.map((opt, i) => {
            let bg = "#f9fafb", border = "#e5e7eb", color = "#374151", scale = "scale(1)";
            if (selected) {
              if (opt === q.correct) { bg = "#ede9f5"; border = "#7c3aed"; color = "#7c3aed"; scale = "scale(1.05)"; }
              else if (opt === selected && opt !== q.correct) { bg = "#fee2e2"; border = "#dc2626"; color = "#dc2626"; }
            }
            return (
              <button key={opt + i} onClick={() => handleAnswer(opt)} disabled={!!selected}
                className="p-4 rounded-2xl text-xl font-bold shadow-sm transition-all hover:-translate-y-0.5"
                style={{ background: bg, border: `3px solid ${border}`, color, fontFamily: "'Amiri', serif", transform: scale }}>
                {opt}
              </button>
            );
          })}
        </div>
        {selected && (
          <div className="mt-4 p-3 rounded-2xl text-sm text-right animate-fadeIn"
            style={{ background: selected === q.correct ? "#ede9f5" : "#fee2e2" }}>
            <p className="font-bold" style={{ color: selected === q.correct ? "#7c3aed" : "#dc2626" }}>
              {selected === q.correct ? "✅ صَحِيحٌ!" : selected === "__timeout__" ? `⏱ انْتَهَى الْوَقْتُ! الصَّحِيحُ: ${q.correct}` : `❌ الصَّحِيحُ: ${q.correct}`}
            </p>
            <p className="text-gray-600 mt-1">💡 {q.explain}</p>
          </div>
        )}
      </div>

      {selected && (
        <button onClick={next}
          className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg hover:scale-[1.02] transition-transform"
          style={{ background: "linear-gradient(135deg,#7c3aed,#9333ea)" }}>
          {idx + 1 >= questions.length ? "🏁 شَاهِدِ النَّتِيجَةَ" : "التَّالِي ←"}
        </button>
      )}

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .animate-fadeIn { animation: fadeIn 0.3s; }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN PAGE — WritingGames (Menu)
   ══════════════════════════════════════════════════════ */
export default function WritingGames() {
  const [middleHamza, setMiddleHamza] = useState(DEFAULT_MIDDLE_HAMZA);
  const [endHamza, setEndHamza] = useState(DEFAULT_END_HAMZA);
  const [quickQuiz, setQuickQuiz] = useState(DEFAULT_QUICK_QUIZ);

  useEffect(() => {
    getGames().then(d => {
      if (!d) return;
      if (d.middle_hamza?.length) setMiddleHamza(d.middle_hamza);
      if (d.end_hamza?.length) setEndHamza(d.end_hamza);
      if (d.quick_quiz?.length) setQuickQuiz(d.quick_quiz);
    });
  }, []);
  const [, setLocation] = useLocation();
  const [activeGame, setActiveGame] = useState<"menu"|"middle"|"end"|"quiz">("menu");

  // No cleanup on unmount — sounds should persist when navigating to next page/question

  if (activeGame === "middle") return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "linear-gradient(180deg,#0f172a,#064e3b)", minHeight: "100vh" }}>
      <div className="p-4" style={{ background: "linear-gradient(135deg,#064e3b,#065f46)" }}>
        <button onClick={() => setActiveGame("menu")} className="text-emerald-300 text-sm mb-1">← عَالَمُ الْهَمْزَةِ</button>
        <h1 className="text-xl font-bold text-white text-right">🚀 مُغَامِرُ الْفَضَاءِ — الْهَمْزَةُ الْمُتَوَسِّطَةُ</h1>
      </div>
      <div className="max-w-xl mx-auto px-4 py-6">
        <MiddleHamzaGame onBack={() => setActiveGame("menu")} data={middleHamza} />
      </div>
    </div>
  );

  if (activeGame === "end") return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "linear-gradient(180deg,#1c1009,#78350f)", minHeight: "100vh" }}>
      <div className="p-4" style={{ background: "linear-gradient(135deg,#78350f,#92400e)" }}>
        <button onClick={() => setActiveGame("menu")} className="text-amber-300 text-sm mb-1">← عَالَمُ الْهَمْزَةِ</button>
        <h1 className="text-xl font-bold text-white text-right">🔍 مُحَقِّقُ الْهَمْزَةِ — الْهَمْزَةُ الْمُتَطَرِّفَةُ</h1>
      </div>
      <div className="max-w-xl mx-auto px-4 py-6">
        <EndHamzaGame onBack={() => setActiveGame("menu")} data={endHamza} />
      </div>
    </div>
  );

  if (activeGame === "quiz") return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "linear-gradient(180deg,#13001f,#3b0764)", minHeight: "100vh" }}>
      <div className="p-4" style={{ background: "linear-gradient(135deg,#3b0764,#6b21a8)" }}>
        <button onClick={() => setActiveGame("menu")} className="text-purple-300 text-sm mb-1">← عَالَمُ الْهَمْزَةِ</button>
        <h1 className="text-xl font-bold text-white text-right">⚡ بَطَلُ الْهَمْزَةِ — التَّحَدِّي النِّهَائِيُّ</h1>
      </div>
      <div className="max-w-xl mx-auto px-4 py-6">
        <QuickQuizGame onBack={() => setActiveGame("menu")} data={quickQuiz} />
      </div>
    </div>
  );

  // MENU
  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "#0f172a", minHeight: "100vh" }}>
      {/* Hero Header */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1a5c2a 100%)", paddingBottom: "2rem" }}>
        {/* Stars background */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}/>
        <div className="p-4 relative">
          <div className="flex items-center gap-2 mb-4">
            <img src="/assets/logo.png" alt="" className="w-7 h-7 object-contain" />
            <button onClick={() => setLocation("/skills/writing")} className="text-purple-300 text-sm">← مَهَارَةُ الْكِتَابَةِ</button>
          </div>
          <div className="text-center py-4">
            <div className="text-5xl mb-3">🌌</div>
            <h1 className="text-3xl font-bold text-white mb-1">عَالَمُ الْهَمْزَةِ</h1>
            <p className="text-purple-300 text-sm">ثَلَاثُ مُهِمَّاتٍ تَنْتَظِرُكَ — هَلْ أَنْتَ مُسْتَعِدٌّ؟</p>
          </div>
        </div>
        {/* Wave */}
        <svg viewBox="0 0 1440 40" className="absolute bottom-0 w-full" preserveAspectRatio="none">
          <path d="M0,40 C360,0 1080,40 1440,0 L1440,40 Z" fill="#0f172a"/>
        </svg>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6">

        {/* Mission 1 */}
        <div className="relative mb-3">
          <button onClick={() => setActiveGame("middle")}
            className="w-full text-right relative overflow-hidden rounded-3xl hover:-translate-y-1 transition-all duration-300 active:scale-95"
            style={{ background: "linear-gradient(135deg,#064e3b,#065f46,#059669)", boxShadow: "0 8px 32px rgba(6,78,59,0.5)" }}>
            {/* Animated grid */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
              backgroundSize: "20px 20px"
            }}/>
            {/* Big emoji background */}
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 text-8xl opacity-10 select-none">🚀</div>
            <div className="relative p-5 pr-6">
              <div className="flex justify-between items-start mb-2">
                <div className="flex gap-2">
                  <span className="bg-emerald-300 text-emerald-900 text-xs font-bold px-2 py-0.5 rounded-full">مُهِمَّةٌ ١</span>
                  <span className="bg-white bg-opacity-15 text-emerald-100 text-xs px-2 py-0.5 rounded-full border border-white border-opacity-20">١٠ أَسْئِلَة</span>
                </div>
                <span className="text-3xl">🚀</span>
              </div>
              <h2 className="text-white font-bold text-xl mb-1">مُغَامِرُ الْفَضَاءِ</h2>
              <p className="text-emerald-200 text-sm mb-3">أَصْلِحِ الْكَلِمَاتِ الْمَكْسُورَةَ وَأَنْقِذِ الْمَحَطَّةَ!</p>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-300 text-emerald-900 text-xs font-bold px-3 py-1.5 rounded-full">انْطَلِقْ! ←</span>
                <span className="text-emerald-300 text-xs">الْهَمْزَةُ الْمُتَوَسِّطَةُ 🌟</span>
              </div>
            </div>
          </button>
          {/* Connector */}
          <div className="flex flex-col items-center my-2">
            <div className="w-px h-5 bg-gradient-to-b from-emerald-500 to-amber-500"/>
            <div className="w-2 h-2 rounded-full bg-amber-400"/>
          </div>
        </div>

        {/* Mission 2 */}
        <div className="relative mb-3">
          <button onClick={() => setActiveGame("end")}
            className="w-full text-right relative overflow-hidden rounded-3xl hover:-translate-y-1 transition-all duration-300 active:scale-95"
            style={{ background: "linear-gradient(135deg,#78350f,#92400e,#b45309)", boxShadow: "0 8px 32px rgba(120,53,15,0.5)" }}>
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(255,255,255,0.4) 8px, rgba(255,255,255,0.4) 9px)",
            }}/>
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 text-8xl opacity-10 select-none">🔍</div>
            <div className="relative p-5 pr-6">
              <div className="flex justify-between items-start mb-2">
                <div className="flex gap-2">
                  <span className="bg-amber-300 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">مُهِمَّةٌ ٢</span>
                  <span className="bg-white bg-opacity-15 text-amber-100 text-xs px-2 py-0.5 rounded-full border border-white border-opacity-20">سَحْبٌ وَإِفْلَاتٌ</span>
                </div>
                <span className="text-3xl">🔍</span>
              </div>
              <h2 className="text-white font-bold text-xl mb-1">مُحَقِّقُ الْهَمْزَةِ</h2>
              <p className="text-amber-200 text-sm mb-3">صَنِّفِ الأَدِلَّةَ فِي الْمَلَفَّاتِ الصَّحِيحَةِ!</p>
              <div className="flex items-center gap-2">
                <span className="bg-amber-300 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-full">ابْدَأِ التَّحْقِيقَ! ←</span>
                <span className="text-amber-300 text-xs">الْهَمْزَةُ الْمُتَطَرِّفَةُ 🔎</span>
              </div>
            </div>
          </button>
          {/* Connector */}
          <div className="flex flex-col items-center my-2">
            <div className="w-px h-5 bg-gradient-to-b from-amber-500 to-purple-500"/>
            <div className="w-2 h-2 rounded-full bg-purple-400"/>
          </div>
        </div>

        {/* Mission 3 — Boss */}
        <div className="relative">
          <button onClick={() => setActiveGame("quiz")}
            className="w-full text-right relative overflow-hidden rounded-3xl hover:-translate-y-1 transition-all duration-300 active:scale-95"
            style={{ background: "linear-gradient(135deg,#3b0764,#6b21a8,#7c3aed)", boxShadow: "0 8px 32px rgba(109,40,217,0.5)" }}>
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: "radial-gradient(circle at 50% 50%, white 1px, transparent 1px)",
              backgroundSize: "25px 25px"
            }}/>
            {/* Crown */}
            <div className="absolute top-3 left-5 text-2xl opacity-60">👑</div>
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 text-8xl opacity-10 select-none">⚡</div>
            <div className="relative p-5 pr-6">
              <div className="flex justify-between items-start mb-2">
                <div className="flex gap-2">
                  <span className="bg-yellow-300 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">👑 التَّحَدِّي النِّهَائِيُّ</span>
                  <span className="bg-white bg-opacity-15 text-purple-100 text-xs px-2 py-0.5 rounded-full border border-white border-opacity-20">⏱ ١٢ ثَانِيَة</span>
                </div>
                <span className="text-3xl">⚡</span>
              </div>
              <h2 className="text-white font-bold text-xl mb-1">بَطَلُ الْهَمْزَةِ</h2>
              <p className="text-purple-200 text-sm mb-3">أَجِبْ بِأَسْرَعِ مَا يُمْكِنُكَ وَكُنِ الْبَطَلَ!</p>
              <div className="flex items-center gap-2">
                <span className="bg-yellow-300 text-yellow-900 text-xs font-bold px-3 py-1.5 rounded-full">ابْدَأِ الْمَعْرَكَةَ! ←</span>
                <span className="text-purple-300 text-xs">🔥 ١٠ أَسْئِلَة سَرِيعَة</span>
              </div>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}