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


/* ══════════════════════════════════════════════════════
   TREASURE HUNT DATA — رحلة الكنز
   ══════════════════════════════════════════════════════ */

// الدرس الأول: الهمزة على نبرة — فرز البوابة
const GATE_SORT_WORDS = [
  { word: "بِئْرٌ",     correct: true,  reason: "ما قبلها كسرة" },
  { word: "ذِئْبٌ",     correct: true,  reason: "ما قبلها كسرة" },
  { word: "سُئِلَ",     correct: true,  reason: "ما بعدها كسرة" },
  { word: "فِئَةٌ",     correct: true,  reason: "ما قبلها كسرة" },
  { word: "مُطمَئِنٌّ", correct: true,  reason: "ما بعدها كسرة" },
  { word: "مِئذَنَةٌ",  correct: true,  reason: "ما بعدها كسرة" },
  { word: "سَأَلَ",     correct: false, reason: "ما قبلها فتحة → على ألف" },
  { word: "يَسْأَلُ",   correct: false, reason: "ساكن قبلها → على ألف" },
  { word: "رَأْسٌ",     correct: false, reason: "ما قبلها فتحة → على ألف" },
  { word: "مَسَاءٌ",    correct: false, reason: "ما قبلها ألف مد → على السطر" },
];

// الدرس الثاني: الهمزة على السطر — عبور النهر
const RIVER_WORDS = [
  { word: "قِرَاءَةٌ", correct: true,  reason: "بعد ألف مد" },
  { word: "مُرُوءَةٌ", correct: true,  reason: "بعد واو مد" },
  { word: "عَبَاءَةٌ", correct: true,  reason: "بعد ألف مد" },
  { word: "تَسَاءَلَ", correct: true,  reason: "بعد ألف مد" },
  { word: "هُدُوءٌ",   correct: true,  reason: "بعد واو مد" },
  { word: "مَسَاءٌ",   correct: true,  reason: "بعد ألف مد" },
  { word: "جُزْءٌ",    correct: true,  reason: "بعد ساكن" },
  { word: "سَأَلَ",    correct: false, reason: "على ألف لأن ما قبلها فتحة" },
  { word: "بِئْرٌ",    correct: false, reason: "على نبرة لأن ما قبلها كسرة" },
  { word: "يَسْأَلُ",  correct: false, reason: "على ألف لأن ساكن قبلها" },
];

// الدرس الثالث: الهمزة المتطرفة — تسلق الجبل
const MOUNTAIN_WORDS = [
  { word: "مَلجَأَ",   chair: "أ",  reason: "ما قبلها مفتوح (جَ)" },
  { word: "قَرَأَ",    chair: "أ",  reason: "ما قبلها مفتوح (رَ)" },
  { word: "يَجرُؤُ",   chair: "ؤ",  reason: "ما قبلها مضموم (رُ)" },
  { word: "لُؤلُؤٌ",   chair: "ؤ",  reason: "ما قبلها مضموم (لُ)" },
  { word: "شاطِئٌ",    chair: "ئ",  reason: "ما قبلها مكسور (طِ)" },
  { word: "مَنَاهِئُ", chair: "ئ",  reason: "ما قبلها مكسور (هِ)" },
  { word: "شَيءٌ",     chair: "ء",  reason: "ما قبلها ياء ساكنة" },
  { word: "هُدُوءٌ",   chair: "ء",  reason: "ما قبلها واو مد" },
  { word: "دِفءٌ",     chair: "ء",  reason: "ما قبلها ساكن" },
  { word: "مَسَاءٌ",   chair: "ء",  reason: "ما قبلها ألف مد" },
];

// الكلمات المتقاطعة — الدرس الأول (على نبرة)
const CROSSWORD_1 = [
  { num: 1, dir: "أفقي",  clue: "مصدر الماء تحت الأرض في الصحراء",         answer: "بئر" },
  { num: 2, dir: "أفقي",  clue: "مجموعة من الناس أو جماعة",                answer: "فئة" },
  { num: 3, dir: "أفقي",  clue: "طُرح عليه سؤال (ماضٍ للمجهول)",           answer: "سئل" },
  { num: 4, dir: "أفقي",  clue: "حيوان مفترس من الكلبيات يعيش بالبراري",  answer: "ذئب" },
  { num: 5, dir: "عمودي", clue: "حالة النفس حين تهدأ وتطمئن",              answer: "مطمئن" },
  { num: 6, dir: "عمودي", clue: "البرج الذي يُؤذَّن منه في المسجد",        answer: "مئذنة" },
];

// الكلمات المتقاطعة — الدرس الثاني (على السطر)
const CROSSWORD_2 = [
  { num: 1, dir: "أفقي",  clue: "آخر النهار وعكسه الصباح",                answer: "مساء" },
  { num: 2, dir: "أفقي",  clue: "ثوب المرأة الواسع التقليدي",              answer: "عباءة" },
  { num: 3, dir: "أفقي",  clue: "صفة الكريم النبيل",                       answer: "مروءة" },
  { num: 4, dir: "أفقي",  clue: "جزء من الشيء ونصيب منه",                 answer: "جزء" },
  { num: 5, dir: "عمودي", clue: "فعل النظر في الكتاب وتصفّحه",            answer: "قراءة" },
  { num: 6, dir: "عمودي", clue: "الهدوء والسكينة والراحة",                 answer: "هدوء" },
  { num: 7, dir: "عمودي", clue: "فعل التساؤل والاستفهام",                  answer: "تساءل" },
];

// الكلمات المتقاطعة — الدرس الثالث (المتطرفة)
const CROSSWORD_3 = [
  { num: 1, dir: "أفقي",  clue: "حافة البحر حيث يلعب الناس",              answer: "شاطئ" },
  { num: 2, dir: "أفقي",  clue: "الجوهرة البيضاء النادرة من البحر",       answer: "لؤلؤ" },
  { num: 3, dir: "أفقي",  clue: "المكان الذي يلجأ إليه الإنسان أماناً",  answer: "ملجأ" },
  { num: 4, dir: "أفقي",  clue: "الدفء وعكسه البرد",                      answer: "دفء" },
  { num: 5, dir: "عمودي", clue: "يتجرأ ولا يخاف (فعل مضارع)",             answer: "يجرؤ" },
  { num: 6, dir: "عمودي", clue: "فعل القراءة (ماضٍ)",                      answer: "قرأ" },
  { num: 7, dir: "عمودي", clue: "الهدوء والسكون",                          answer: "هدوء" },
  { num: 8, dir: "عمودي", clue: "الشيء الواحد من الأشياء",                 answer: "شيء" },
];

// صندوق الكنز — تصحيح الأخطاء
const TREASURE_FIX = [
  { wrong: "بِءْر",   correct: "بِئْر",    rule: "الهمزة على نبرة لأن ما قبلها كسرة" },
  { wrong: "فِأَة",   correct: "فِئَة",    rule: "الهمزة على نبرة لأن ما قبلها كسرة" },
  { wrong: "سُءِل",   correct: "سُئِل",   rule: "الهمزة على نبرة لأن ما بعدها كسرة" },
  { wrong: "ذِءْب",   correct: "ذِئْب",   rule: "الهمزة على نبرة لأن ما قبلها كسرة" },
  { wrong: "مُطمَءِن",correct: "مُطمَئِن",rule: "الهمزة على نبرة لأن ما بعدها كسرة" },
];

// صندوق الكنز — إملاء الهمزة المتطرفة
const TREASURE_DICTATION = [
  { sentence: "استمتعنا بالسباحة قرب __________ الجميل", answer: "شاطئ",  hint: "حافة البحر" },
  { sentence: "وجد الغواص __________ نادراً في قاع البحر", answer: "لؤلؤ", hint: "جوهرة البحر" },
  { sentence: "اختبأ الطفل في __________ آمن من المطر", answer: "ملجأ",  hint: "مكان الأمان" },
  { sentence: "__________ الطالب الكتاب باهتمام شديد", answer: "قرأ",    hint: "فعل القراءة" },
  { sentence: "الفراء يقينا __________ في الشتاء", answer: "الدفء",  hint: "عكس البرد" },
  { sentence: "__________ الغرفة يساعد على التركيز", answer: "هدوء",   hint: "السكينة" },
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

/* ══════════════════════════════════════════════════════
   GAME 4 — رحلة الكنز ١: فرز البوابة (الهمزة على نبرة)
   ══════════════════════════════════════════════════════ */
function GateSortGame({ onBack }: { onBack: () => void }) {
  const [words] = useState(() => [...GATE_SORT_WORDS].sort(() => Math.random() - 0.5));
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [feedback, setFeedback] = useState<"correct"|"wrong"|null>(null);
  const [done, setDone] = useState(false);
  const [confettiTrig, setConfettiTrig] = useState(0);

  function answer(isNabra: boolean) {
    if (feedback) return;
    const isRight = isNabra === words[idx].correct;
    setFeedback(isRight ? "correct" : "wrong");
    if (isRight) { setCorrect(c => c+1); setConfettiTrig(t => t+1); }
    setTimeout(() => {
      setFeedback(null);
      if (idx < words.length - 1) setIdx(i => i+1);
      else setDone(true);
    }, 1200);
  }

  if (done) return (
    <div className="bg-white/10 rounded-2xl p-6 text-center text-white">
      <div className="text-5xl mb-3">{correct >= 7 ? "🔓" : "🔒"}</div>
      <h2 className="text-2xl font-bold mb-2">{correct >= 7 ? "فُتِحَتِ الْبَوَّابَةُ!" : "حَاوِلْ مَرَّةً أُخْرَى"}</h2>
      <p className="text-emerald-200 mb-4">أَصَبْتَ {correct} مِنْ {words.length}</p>
      <div className="flex gap-3 justify-center">
        <button onClick={() => { setIdx(0); setCorrect(0); setDone(false); }}
          className="px-5 py-2 bg-emerald-500 text-white rounded-xl font-bold">إِعَادَةٌ</button>
        <button onClick={onBack}
          className="px-5 py-2 bg-white/20 text-white rounded-xl font-bold">الْقَائِمَةُ</button>
      </div>
    </div>
  );

  const w = words[idx];
  return (
    <div>
      <Confetti trigger={confettiTrig} />
      {/* Progress */}
      <div className="w-full h-2 bg-white/20 rounded-full mb-4">
        <div className="h-2 rounded-full bg-emerald-400 transition-all" style={{ width: `${(idx/words.length)*100}%` }} />
      </div>
      <p className="text-emerald-200 text-sm text-center mb-4">{idx+1} / {words.length}</p>

      {/* Card */}
      <div className="bg-white/10 rounded-2xl p-6 text-center mb-6">
        <p className="text-emerald-300 text-sm mb-3">هَلِ الْهَمْزَةُ مَكْتُوبَةٌ عَلَى نَبْرَةٍ صَحِيحَةً؟</p>
        <p className="text-4xl font-bold text-white mb-2" style={{ fontFamily: "'Amiri', serif" }}>{w.word}</p>
        {feedback && (
          <div className={`mt-3 text-sm font-bold rounded-xl px-4 py-2 ${feedback === "correct" ? "bg-green-500/30 text-green-200" : "bg-red-500/30 text-red-200"}`}>
            {feedback === "correct" ? "✅ صَحِيحٌ!" : `❌ ${w.reason}`}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-4">
        <button onClick={() => answer(false)}
          className="flex-1 py-4 rounded-2xl text-white font-bold text-lg transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg,#dc2626,#b91c1c)" }}>
          ❌ لَا
        </button>
        <button onClick={() => answer(true)}
          className="flex-1 py-4 rounded-2xl text-white font-bold text-lg transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg,#059669,#047857)" }}>
          ✅ نَعَمْ
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   GAME 5 — رحلة الكنز ٢: عبور النهر (الهمزة على السطر)
   ══════════════════════════════════════════════════════ */
function RiverCrossGame({ onBack }: { onBack: () => void }) {
  const [words] = useState(() => [...RIVER_WORDS].sort(() => Math.random() - 0.5));
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);
  const [confettiTrig, setConfettiTrig] = useState(0);

  const correctIdxs = words.map((w,i) => w.correct ? i : -1).filter(i => i !== -1);

  function check() {
    setChecked(true);
    const allRight = correctIdxs.every(i => selected.has(i)) && selected.size === correctIdxs.length;
    if (allRight) setConfettiTrig(t => t+1);
  }

  function toggle(i: number) {
    if (checked) return;
    setSelected(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; });
  }

  const allRight = checked && correctIdxs.every(i => selected.has(i)) && selected.size === correctIdxs.length;

  return (
    <div>
      <Confetti trigger={confettiTrig} />
      <div className="bg-white/10 rounded-2xl p-4 mb-4 text-center text-white">
        <p className="text-blue-200 text-sm">اخْتَرِ الْكَلِمَاتِ الَّتِي هَمْزَتُهَا عَلَى السَّطْرِ لِتَبْنِيَ الْجِسْرَ وَتَعْبُرَ النَّهَرَ! 🌊</p>
      </div>

      {/* River visual */}
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-2xl opacity-30" style={{ background: "linear-gradient(180deg, #1d4ed8, #1e40af)" }} />
        <div className="relative grid grid-cols-2 gap-2 p-3">
          {words.map((w, i) => {
            const isSel = selected.has(i);
            const isRight = checked ? w.correct : null;
            return (
              <button key={i} onClick={() => toggle(i)}
                className="py-3 px-4 rounded-xl text-right font-bold transition-all"
                style={{
                  fontFamily: "'Amiri', serif", fontSize: "1rem",
                  background: checked
                    ? (w.correct ? (isSel ? "#059669" : "#dc2626") : (isSel ? "#dc2626" : "rgba(255,255,255,0.1)"))
                    : (isSel ? "#1d4ed8" : "rgba(255,255,255,0.15)"),
                  color: "white",
                  border: isSel ? "2px solid white" : "2px solid transparent",
                }}>
                {w.word}
                {checked && <span className="text-xs mr-1">{w.correct ? (isSel ? " ✅" : " ❌") : (isSel ? " ❌" : "")}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {checked && (
        <div className={`rounded-xl p-3 text-center mb-4 text-sm font-bold ${allRight ? "bg-green-500/30 text-green-200" : "bg-amber-500/30 text-amber-200"}`}>
          {allRight ? "🏆 عَبَرْتَ النَّهَرَ بِأَمَانٍ!" : "💡 راجع الكلمات الحمراء وتذكر: الهمزة على السطر بعد حروف المد الساكنة"}
        </div>
      )}

      <div className="flex gap-3">
        {!checked
          ? <button onClick={check} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">تَحَقَّقْ ✓</button>
          : <button onClick={() => { setSelected(new Set()); setChecked(false); }} className="flex-1 py-3 bg-white/20 text-white rounded-xl font-bold">إِعَادَةٌ</button>
        }
        <button onClick={onBack} className="px-4 py-3 bg-white/10 text-white rounded-xl font-bold">←</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   GAME 6 — رحلة الكنز ٣: تسلق الجبل (الهمزة المتطرفة)
   ══════════════════════════════════════════════════════ */
function MountainClimbGame({ onBack }: { onBack: () => void }) {
  const CHAIRS = [
    { id: "أ",  label: "على ألف",    color: "#059669", bg: "#dcf5e7", rule: "ما قبلها مفتوح" },
    { id: "ؤ",  label: "على واو",    color: "#1d4ed8", bg: "#dbeafe", rule: "ما قبلها مضموم" },
    { id: "ئ",  label: "على ياء",    color: "#7c3aed", bg: "#f3e8ff", rule: "ما قبلها مكسور" },
    { id: "ء",  label: "على السطر",  color: "#b45309", bg: "#fef3e2", rule: "ما قبلها ساكن" },
  ];

  const [words] = useState(() => [...MOUNTAIN_WORDS].sort(() => Math.random() - 0.5));
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const [confettiTrig, setConfettiTrig] = useState(0);

  function pick(wordIdx: number, chair: string) {
    if (checked) return;
    setAnswers(prev => ({ ...prev, [wordIdx]: chair }));
  }

  function check() {
    setChecked(true);
    const correct = words.every((w, i) => answers[i] === w.chair);
    if (correct) setConfettiTrig(t => t+1);
  }

  const score = words.filter((w, i) => answers[i] === w.chair).length;

  return (
    <div>
      <Confetti trigger={confettiTrig} />
      <div className="bg-white/10 rounded-2xl p-4 mb-4 text-center text-white">
        <p className="text-amber-200 text-sm">اخْتَرِ الْكُرْسِيَّ الصَّحِيحَ لِكُلِّ هَمْزَةٍ مُتَطَرِّفَةٍ 🏔️</p>
      </div>

      {/* Chairs legend */}
      <div className="grid grid-cols-4 gap-1 mb-4">
        {CHAIRS.map(c => (
          <div key={c.id} className="text-center p-2 rounded-xl text-xs font-bold" style={{ background: c.bg, color: c.color }}>
            <div className="text-lg">{c.id}</div>
            <div>{c.label}</div>
            <div className="text-gray-500 text-xs">{c.rule}</div>
          </div>
        ))}
      </div>

      {/* Words */}
      <div className="space-y-2 mb-4">
        {words.map((w, i) => {
          const picked = answers[i];
          const isRight = checked ? picked === w.chair : null;
          return (
            <div key={i} className="bg-white/10 rounded-xl p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="flex gap-1">
                  {CHAIRS.map(c => (
                    <button key={c.id} onClick={() => pick(i, c.id)}
                      className="w-9 h-9 rounded-lg text-sm font-bold transition-all"
                      style={{
                        background: picked === c.id ? c.color : "rgba(255,255,255,0.15)",
                        color: "white",
                        border: picked === c.id ? "2px solid white" : "2px solid transparent",
                      }}>{c.id}</button>
                  ))}
                </div>
                <p className="text-white font-bold text-base" style={{ fontFamily: "'Amiri', serif" }}>{w.word}</p>
              </div>
              {checked && (
                <p className={`text-xs text-right ${isRight ? "text-green-300" : "text-red-300"}`}>
                  {isRight ? `✅ صَحِيحٌ — ${w.reason}` : `❌ الصَّوَابُ: ${w.chair} — ${w.reason}`}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {checked && (
        <div className={`rounded-xl p-3 text-center mb-4 font-bold ${score === words.length ? "bg-green-500/30 text-green-200" : "bg-amber-500/30 text-amber-200"}`}>
          {score === words.length ? "🏆 وَصَلْتَ الْقِمَّةَ!" : `أَصَبْتَ ${score} مِنْ ${words.length} — حَاوِلْ مَرَّةً أُخْرَى!`}
        </div>
      )}

      <div className="flex gap-3">
        {!checked
          ? <button onClick={check} disabled={Object.keys(answers).length < words.length}
              className="flex-1 py-3 text-white rounded-xl font-bold disabled:opacity-50"
              style={{ background: "#b45309" }}>تَحَقَّقْ ✓</button>
          : <button onClick={() => { setAnswers({}); setChecked(false); }} className="flex-1 py-3 bg-white/20 text-white rounded-xl font-bold">إِعَادَةٌ</button>
        }
        <button onClick={onBack} className="px-4 py-3 bg-white/10 text-white rounded-xl font-bold">←</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   GAME 7 — الكلمات المتقاطعة
   ══════════════════════════════════════════════════════ */
function CrosswordGame({ onBack, questions, title, color }: {
  onBack: () => void;
  questions: typeof CROSSWORD_1;
  title: string;
  color: string;
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const [confettiTrig, setConfettiTrig] = useState(0);

  function check() {
    setChecked(true);
    const allRight = questions.every((q, i) =>
      (answers[i] || "").trim().replace(/\s/g, "") === q.answer.replace(/\s/g, "")
    );
    if (allRight) setConfettiTrig(t => t+1);
  }

  const score = questions.filter((q, i) =>
    (answers[i] || "").trim().replace(/\s/g, "") === q.answer.replace(/\s/g, "")
  ).length;

  return (
    <div>
      <Confetti trigger={confettiTrig} />
      <div className="bg-white/10 rounded-2xl p-4 mb-4 text-right text-white">
        <h3 className="font-bold text-lg mb-1">🔤 {title}</h3>
        <p className="text-sm text-white/70">أَكْمِلِ الْكَلِمَاتِ بِنَاءً عَلَى التَّلْمِيحَاتِ</p>
      </div>

      <div className="space-y-3 mb-4">
        {questions.map((q, i) => {
          const ans = answers[i] || "";
          const isRight = checked ? ans.trim() === q.answer : null;
          return (
            <div key={i} className="bg-white/10 rounded-xl p-3 text-right">
              <div className="flex gap-2 items-center mb-2">
                <span className="text-xs px-2 py-0.5 rounded-full text-white font-bold" style={{ background: color }}>{q.dir}</span>
                <span className="text-white/70 text-xs">{q.num}</span>
              </div>
              <p className="text-white text-sm mb-2">{q.clue}</p>
              <div className="flex gap-2 items-center">
                {checked && <span>{isRight ? "✅" : `❌ ${q.answer}`}</span>}
                <input
                  value={ans}
                  onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                  readOnly={checked}
                  className="flex-1 px-3 py-2 rounded-xl text-right text-white font-bold focus:outline-none"
                  style={{ background: checked ? (isRight ? "#059669" : "#dc2626") : "rgba(255,255,255,0.2)", fontFamily: "'Amiri', serif", fontSize: "1.1rem" }}
                  placeholder="اكتب هنا..."
                  dir="rtl"
                />
              </div>
            </div>
          );
        })}
      </div>

      {checked && (
        <div className={`rounded-xl p-3 text-center mb-4 font-bold ${score === questions.length ? "bg-green-500/30 text-green-200" : "bg-amber-500/30 text-amber-200"}`}>
          {score === questions.length ? "🏆 أَحْسَنْتَ! كَلِمَاتٌ مُتَقَاطِعَةٌ مُكْتَمِلَةٌ!" : `أَصَبْتَ ${score} مِنْ ${questions.length}`}
        </div>
      )}

      <div className="flex gap-3">
        {!checked
          ? <button onClick={check} className="flex-1 py-3 text-white rounded-xl font-bold" style={{ background: color }}>تَحَقَّقْ ✓</button>
          : <button onClick={() => { setAnswers({}); setChecked(false); }} className="flex-1 py-3 bg-white/20 text-white rounded-xl font-bold">إِعَادَةٌ</button>
        }
        <button onClick={onBack} className="px-4 py-3 bg-white/10 text-white rounded-xl font-bold">←</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   GAME 8 — صندوق الكنز: التصحيح والإملاء
   ══════════════════════════════════════════════════════ */
function TreasureBoxGame({ onBack, mode }: { onBack: () => void; mode: "fix"|"dictation" }) {
  const items = mode === "fix" ? TREASURE_FIX : TREASURE_DICTATION;
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const [confettiTrig, setConfettiTrig] = useState(0);

  function check() {
    setChecked(true);
    const allRight = items.every((item: any, i: number) =>
      (answers[i] || "").trim() === item.correct || (answers[i] || "").trim() === item.answer
    );
    if (allRight) setConfettiTrig(t => t+1);
  }

  const score = items.filter((item: any, i: number) =>
    (answers[i] || "").trim() === (item.correct || item.answer)
  ).length;

  return (
    <div>
      <Confetti trigger={confettiTrig} />
      <div className="bg-white/10 rounded-2xl p-4 mb-4 text-right text-white">
        <h3 className="font-bold text-lg mb-1">🏆 {mode === "fix" ? "صَنْدُوقُ الْكَنْزِ — صَحِّحِ الأَخْطَاءَ" : "صَنْدُوقُ الْكَنْزِ — أَكْمِلِ الإِمْلَاءَ"}</h3>
        <p className="text-sm text-white/70">{mode === "fix" ? "صَحِّحِ الْكَلِمَاتِ الْخَاطِئَةَ لِفَتْحِ الْكَنْزِ" : "أَكْمِلِ الْجُمَلَ بِالْكَلِمَةِ الصَّحِيحَةِ"}</p>
      </div>

      <div className="space-y-3 mb-4">
        {(items as any[]).map((item, i) => {
          const ans = answers[i] || "";
          const rightAnswer = item.correct || item.answer;
          const isRight = checked ? ans.trim() === rightAnswer : null;
          return (
            <div key={i} className="bg-white/10 rounded-xl p-3 text-right">
              {mode === "fix"
                ? <p className="text-red-300 font-bold line-through text-sm mb-1" style={{ fontFamily: "'Amiri', serif" }}>{item.wrong}</p>
                : <p className="text-white text-sm mb-2">{item.sentence}</p>
              }
              {mode === "fix" && item.rule && (
                <p className="text-amber-300 text-xs mb-2">💡 {item.rule}</p>
              )}
              {mode === "dictation" && item.hint && (
                <p className="text-blue-300 text-xs mb-2">💡 {item.hint}</p>
              )}
              <div className="flex gap-2 items-center">
                {checked && <span>{isRight ? "✅" : `❌ ${rightAnswer}`}</span>}
                <input
                  value={ans}
                  onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                  readOnly={checked}
                  className="flex-1 px-3 py-2 rounded-xl text-right text-white font-bold focus:outline-none"
                  style={{ background: checked ? (isRight ? "#059669" : "#dc2626") : "rgba(255,255,255,0.2)", fontFamily: "'Amiri', serif", fontSize: "1.1rem" }}
                  placeholder={mode === "fix" ? "الكلمة الصحيحة..." : "أكمل الفراغ..."}
                  dir="rtl"
                />
              </div>
            </div>
          );
        })}
      </div>

      {checked && (
        <div className={`rounded-xl p-4 text-center mb-4 ${score === items.length ? "bg-yellow-500/30 text-yellow-200" : "bg-amber-500/30 text-amber-200"}`}>
          {score === items.length
            ? <><div className="text-3xl mb-2">🏆</div><p className="font-bold">فَتَحْتَ صَنْدُوقَ الْكَنْزِ! أَنْتَ الْمُسْتَكْشِفُ اللُّغَوِيُّ الْكَبِيرُ!</p></>
            : <p className="font-bold">أَصَبْتَ {score} مِنْ {items.length} — رَاجِعِ الْإِجَابَاتِ الْحَمْرَاءَ</p>
          }
        </div>
      )}

      <div className="flex gap-3">
        {!checked
          ? <button onClick={check} className="flex-1 py-3 text-white rounded-xl font-bold" style={{ background: "#b45309" }}>افْتَحِ الْكَنْزَ! 🗝️</button>
          : <button onClick={() => { setAnswers({}); setChecked(false); }} className="flex-1 py-3 bg-white/20 text-white rounded-xl font-bold">إِعَادَةٌ</button>
        }
        <button onClick={onBack} className="px-4 py-3 bg-white/10 text-white rounded-xl font-bold">←</button>
      </div>
    </div>
  );
}

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
  const [activeGame, setActiveGame] = useState<"menu"|"middle"|"end"|"quiz"|"gate"|"river"|"mountain"|"cross1"|"cross2"|"cross3"|"treasure-fix"|"treasure-dict">("menu");

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

  if (activeGame === "gate") return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "linear-gradient(180deg,#0a1628,#064e3b)", minHeight: "100vh" }}>
      <div className="p-4" style={{ background: "linear-gradient(135deg,#064e3b,#065f46)" }}>
        <button onClick={() => setActiveGame("menu")} className="text-emerald-300 text-sm mb-1">← عَالَمُ الْهَمْزَةِ</button>
        <h1 className="text-xl font-bold text-white text-right">🔓 رِحْلَةُ الْكَنْزِ ١ — فَرْزُ الْبَوَّابَةِ</h1>
        <p className="text-emerald-300 text-xs text-right mt-1">الْهَمْزَةُ الْمُتَوَسِّطَةُ عَلَى نَبْرَةٍ</p>
      </div>
      <div className="max-w-xl mx-auto px-4 py-6"><GateSortGame onBack={() => setActiveGame("menu")} /></div>
    </div>
  );

  if (activeGame === "river") return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "linear-gradient(180deg,#0c1840,#1e3a8a)", minHeight: "100vh" }}>
      <div className="p-4" style={{ background: "linear-gradient(135deg,#1e3a8a,#1d4ed8)" }}>
        <button onClick={() => setActiveGame("menu")} className="text-blue-300 text-sm mb-1">← عَالَمُ الْهَمْزَةِ</button>
        <h1 className="text-xl font-bold text-white text-right">🌊 رِحْلَةُ الْكَنْزِ ٢ — عُبُورُ النَّهَرِ</h1>
        <p className="text-blue-300 text-xs text-right mt-1">الْهَمْزَةُ الْمُتَوَسِّطَةُ عَلَى السَّطْرِ</p>
      </div>
      <div className="max-w-xl mx-auto px-4 py-6"><RiverCrossGame onBack={() => setActiveGame("menu")} /></div>
    </div>
  );

  if (activeGame === "mountain") return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "linear-gradient(180deg,#1c0a28,#78350f)", minHeight: "100vh" }}>
      <div className="p-4" style={{ background: "linear-gradient(135deg,#78350f,#b45309)" }}>
        <button onClick={() => setActiveGame("menu")} className="text-amber-300 text-sm mb-1">← عَالَمُ الْهَمْزَةِ</button>
        <h1 className="text-xl font-bold text-white text-right">🏔️ رِحْلَةُ الْكَنْزِ ٣ — تَسَلُّقُ الْجَبَلِ</h1>
        <p className="text-amber-300 text-xs text-right mt-1">الْهَمْزَةُ الْمُتَطَرِّفَةُ</p>
      </div>
      <div className="max-w-xl mx-auto px-4 py-6"><MountainClimbGame onBack={() => setActiveGame("menu")} /></div>
    </div>
  );

  if (activeGame === "cross1") return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "linear-gradient(180deg,#0f172a,#064e3b)", minHeight: "100vh" }}>
      <div className="p-4" style={{ background: "linear-gradient(135deg,#064e3b,#065f46)" }}>
        <button onClick={() => setActiveGame("menu")} className="text-emerald-300 text-sm mb-1">← عَالَمُ الْهَمْزَةِ</button>
        <h1 className="text-xl font-bold text-white text-right">🔤 الْكَلِمَاتُ الْمُتَقَاطِعَةُ — الْهَمْزَةُ عَلَى نَبْرَةٍ</h1>
      </div>
      <div className="max-w-xl mx-auto px-4 py-6">
        <CrosswordGame onBack={() => setActiveGame("menu")} questions={CROSSWORD_1} title="الْهَمْزَةُ الْمُتَوَسِّطَةُ عَلَى نَبْرَةٍ" color="#059669" />
      </div>
    </div>
  );

  if (activeGame === "cross2") return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "linear-gradient(180deg,#0c1840,#1e3a8a)", minHeight: "100vh" }}>
      <div className="p-4" style={{ background: "linear-gradient(135deg,#1e3a8a,#1d4ed8)" }}>
        <button onClick={() => setActiveGame("menu")} className="text-blue-300 text-sm mb-1">← عَالَمُ الْهَمْزَةِ</button>
        <h1 className="text-xl font-bold text-white text-right">🔤 الْكَلِمَاتُ الْمُتَقَاطِعَةُ — الْهَمْزَةُ عَلَى السَّطْرِ</h1>
      </div>
      <div className="max-w-xl mx-auto px-4 py-6">
        <CrosswordGame onBack={() => setActiveGame("menu")} questions={CROSSWORD_2} title="الْهَمْزَةُ الْمُتَوَسِّطَةُ عَلَى السَّطْرِ" color="#1d4ed8" />
      </div>
    </div>
  );

  if (activeGame === "cross3") return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "linear-gradient(180deg,#1c0a28,#78350f)", minHeight: "100vh" }}>
      <div className="p-4" style={{ background: "linear-gradient(135deg,#78350f,#b45309)" }}>
        <button onClick={() => setActiveGame("menu")} className="text-amber-300 text-sm mb-1">← عَالَمُ الْهَمْزَةِ</button>
        <h1 className="text-xl font-bold text-white text-right">🔤 الْكَلِمَاتُ الْمُتَقَاطِعَةُ — الْهَمْزَةُ الْمُتَطَرِّفَةُ</h1>
      </div>
      <div className="max-w-xl mx-auto px-4 py-6">
        <CrosswordGame onBack={() => setActiveGame("menu")} questions={CROSSWORD_3} title="الْهَمْزَةُ الْمُتَطَرِّفَةُ" color="#b45309" />
      </div>
    </div>
  );

  if (activeGame === "treasure-fix") return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "linear-gradient(180deg,#1c1009,#92400e)", minHeight: "100vh" }}>
      <div className="p-4" style={{ background: "linear-gradient(135deg,#92400e,#b45309)" }}>
        <button onClick={() => setActiveGame("menu")} className="text-amber-300 text-sm mb-1">← عَالَمُ الْهَمْزَةِ</button>
        <h1 className="text-xl font-bold text-white text-right">🏆 صَنْدُوقُ الْكَنْزِ — صَحِّحِ الأَخْطَاءَ</h1>
      </div>
      <div className="max-w-xl mx-auto px-4 py-6"><TreasureBoxGame onBack={() => setActiveGame("menu")} mode="fix" /></div>
    </div>
  );

  if (activeGame === "treasure-dict") return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "linear-gradient(180deg,#13001f,#3b0764)", minHeight: "100vh" }}>
      <div className="p-4" style={{ background: "linear-gradient(135deg,#3b0764,#6b21a8)" }}>
        <button onClick={() => setActiveGame("menu")} className="text-purple-300 text-sm mb-1">← عَالَمُ الْهَمْزَةِ</button>
        <h1 className="text-xl font-bold text-white text-right">🏆 صَنْدُوقُ الْكَنْزِ — تَحَدِّي الإِمْلَاءِ</h1>
      </div>
      <div className="max-w-xl mx-auto px-4 py-6"><TreasureBoxGame onBack={() => setActiveGame("menu")} mode="dictation" /></div>
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

        {/* Separator */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-white/20"/>
          <span className="text-white/50 text-xs">رِحْلَةُ الْكَنْزِ</span>
          <div className="flex-1 h-px bg-white/20"/>
        </div>

        {/* Treasure Hunt Section */}
        <div className="bg-white/5 rounded-3xl p-4 mb-4" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="text-center mb-4">
            <span className="text-3xl">🗺️</span>
            <h2 className="text-white font-bold text-lg mt-1">رِحْلَةُ الْكَنْزِ</h2>
            <p className="text-white/50 text-xs">ثَلَاثُ مَرَاحِلَ × ثَلَاثَةُ دُرُوسٍ</p>
          </div>

          {/* Row: درس ١ */}
          <div className="mb-4">
            <p className="text-emerald-300 text-xs font-bold text-right mb-2">📗 الدَّرْسُ الأَوَّلُ — الْهَمْزَةُ عَلَى نَبْرَةٍ</p>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setActiveGame("gate")}
                className="py-3 px-2 rounded-2xl text-center text-white text-xs font-bold transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg,#064e3b,#059669)" }}>
                <div className="text-2xl mb-1">🔓</div>فَرْزُ الْبَوَّابَةِ
              </button>
              <button onClick={() => setActiveGame("cross1")}
                className="py-3 px-2 rounded-2xl text-center text-white text-xs font-bold transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg,#065f46,#047857)" }}>
                <div className="text-2xl mb-1">🔤</div>مُتَقَاطِعَةٌ
              </button>
              <button onClick={() => setActiveGame("treasure-fix")}
                className="py-3 px-2 rounded-2xl text-center text-white text-xs font-bold transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg,#1a5c2a,#064e3b)" }}>
                <div className="text-2xl mb-1">🏆</div>صَنْدُوقُ التَّصْحِيحِ
              </button>
            </div>
          </div>

          {/* Row: درس ٢ */}
          <div className="mb-4">
            <p className="text-blue-300 text-xs font-bold text-right mb-2">📘 الدَّرْسُ الثَّانِي — الْهَمْزَةُ عَلَى السَّطْرِ</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setActiveGame("river")}
                className="py-3 px-2 rounded-2xl text-center text-white text-xs font-bold transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg,#1e3a8a,#1d4ed8)" }}>
                <div className="text-2xl mb-1">🌊</div>عُبُورُ النَّهَرِ
              </button>
              <button onClick={() => setActiveGame("cross2")}
                className="py-3 px-2 rounded-2xl text-center text-white text-xs font-bold transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)" }}>
                <div className="text-2xl mb-1">🔤</div>مُتَقَاطِعَةٌ
              </button>
            </div>
          </div>

          {/* Row: درس ٣ */}
          <div>
            <p className="text-amber-300 text-xs font-bold text-right mb-2">📙 الدَّرْسُ الثَّالِثُ — الْهَمْزَةُ الْمُتَطَرِّفَةُ</p>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setActiveGame("mountain")}
                className="py-3 px-2 rounded-2xl text-center text-white text-xs font-bold transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg,#78350f,#b45309)" }}>
                <div className="text-2xl mb-1">🏔️</div>تَسَلُّقُ الْجَبَلِ
              </button>
              <button onClick={() => setActiveGame("cross3")}
                className="py-3 px-2 rounded-2xl text-center text-white text-xs font-bold transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg,#92400e,#b45309)" }}>
                <div className="text-2xl mb-1">🔤</div>مُتَقَاطِعَةٌ
              </button>
              <button onClick={() => setActiveGame("treasure-dict")}
                className="py-3 px-2 rounded-2xl text-center text-white text-xs font-bold transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg,#3b0764,#6b21a8)" }}>
                <div className="text-2xl mb-1">🏆</div>صَنْدُوقُ الإِمْلَاءِ
              </button>
            </div>
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