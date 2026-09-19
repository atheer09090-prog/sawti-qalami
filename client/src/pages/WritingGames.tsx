import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { playEffect, stopAll, audioFile } from "@/lib/audio";
import { getGames } from "@/lib/api";

/* ══════════════════════════════════════════════════════
   UTIL — shuffle (Fisher–Yates) so option order/correct
   position is randomized every time a question is shown
   ══════════════════════════════════════════════════════ */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ══════════════════════════════════════════════════════
   CONTINUE BUTTON — shown after a WRONG answer so the
   feedback stays on screen until the learner is ready
   ══════════════════════════════════════════════════════ */
function ContinueButton({ onClick, color }: { onClick: () => void; color: string }) {
  return (
    <button onClick={onClick}
      className="w-full mt-3 py-3 rounded-2xl text-white font-bold active:scale-95 transition-all"
      style={{ background: color }}>
      اسْتَمِرَّ ←
    </button>
  );
}

/* ══════════════════════════════════════════════════════
   CONFETTI
   ══════════════════════════════════════════════════════ */
function Confetti({ trigger }: { trigger: number }) {
  const [pieces, setPieces] = useState<Array<{ id: number; x: number; color: string; delay: number }>>([]);
  useEffect(() => {
    if (trigger === 0) return;
    const colors = ["#1a5c2a","#f5c842","#1d4ed8","#dc2626","#7c3aed","#d97706"];
    const newPieces = Array.from({ length: 20 }, (_, i) => ({
      id: Date.now() + i, x: 5 + Math.random() * 90,
      color: colors[i % colors.length], delay: Math.random() * 0.4,
    }));
    setPieces(newPieces);
    const t = setTimeout(() => setPieces([]), 1600);
    return () => clearTimeout(t);
  }, [trigger]);
  if (!pieces.length) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(p => (
        <div key={p.id} className="absolute top-0 w-3 h-3 rounded-sm"
          style={{ left: `${p.x}%`, background: p.color,
            animation: `cf 1.4s ease-in ${p.delay}s forwards` }} />
      ))}
      <style>{`@keyframes cf{0%{transform:translateY(-20px) rotate(0);opacity:1}100%{transform:translateY(85vh) rotate(600deg);opacity:0}}`}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   PHASE HEADER
   ══════════════════════════════════════════════════════ */
function PhaseHeader({ phase, total, title, color }: { phase: number; total: number; title: string; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl bg-white shadow-sm border border-gray-100">
      <div className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className="w-2 h-2 rounded-full transition-all"
            style={{ background: i < phase ? color : "#e8ddc8" }} />
        ))}
      </div>
      <p className="text-gray-800 text-sm font-bold">{title}</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   LESSON 1 — الهمزة المتوسطة على نبرة (ياء)
   ══════════════════════════════════════════════════════ */

/*
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  درس ١: الهمزة المتوسطة على نبرة (ياء)
  القاعدة: تُكتب على نبرة إذا كانت مكسورة أو ما قبلها
  مكسور أو ما بعدها مكسور (الكسرة أقوى الحركات)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  مرحلة الفرز — كلمات جديدة غير مكررة لاحقاً
*/
const L1_GATE_WORDS = [
  // همزة على نبرة ✅ — كلمات خاصة بهذه المرحلة فقط
  { word: "بِئْرٌ",      isNabra: true,  reason: "ما قبلها كسرة (بِـ)" },
  { word: "ذِئْبٌ",      isNabra: true,  reason: "ما قبلها كسرة (ذِـ)" },
  { word: "فِئَةٌ",      isNabra: true,  reason: "ما قبلها كسرة (فِـ)" },
  { word: "رِئَةٌ",      isNabra: true,  reason: "ما قبلها كسرة (رِـ)" },
  { word: "طَارِئٌ",     isNabra: true,  reason: "ما قبلها كسرة (رِـ)" },
  { word: "سُئِلَ",      isNabra: true,  reason: "ما بعدها كسرة (ـئِـ)" },
  // ليست على نبرة ❌
  { word: "سَأَلَ",      isNabra: false, reason: "ما قبلها فتحة → تُكتب على ألف" },
  { word: "يَأْكُلُ",    isNabra: false, reason: "ما قبلها فتحة → تُكتب على ألف" },
  { word: "مَسَاءٌ",     isNabra: false, reason: "قبلها ألف مد ساكنة → تُكتب على السطر" },
  { word: "يَجْرُؤُ",    isNabra: false, reason: "ما قبلها ضمة → تُكتب على واو" },
];

/*
  مرحلة الاختيار — كلمات جديدة كلياً (غير مكررة مع الفرز أو الكنز)
  ملاحظة: الخيارات تقتصر على الأوجه الثلاثة المحتملة للهمزة
  (نبرة ئـ / ألف أ / واو ؤ) حتى لا نربك الطالب، وتُعرض بترتيب عشوائي
*/
const L1_CROSSWORD = [
  { clue: "البرج الذي يُرفع منه الأذان",       answer: "مِئْذَنَةٌ", opts: ["مَأْذَنَةٌ","مِئْذَنَةٌ","مُؤْذَنَةٌ","مَاذَنَةٌ"] },
  { clue: "حالة النفس الهادئة الساكنة",   answer: "مُطْمَئِنٌّ", opts: ["مُطْمَأَنٌّ","مُطْمَوِنٌّ","مُطْمَئِنٌّ","مُطْمَانٌّ"] },
  { clue: "نقيض الأمراء والكرماء (جمع لئيم)", answer: "لِئَامٌ", opts: ["لَأَامٌ","لِئَامٌ","لُؤَامٌ","لِيَامٌ"] },
  { clue: "فعل ماضٍ للمتكلم بمعنى وَصَلَ",     answer: "جِئْتُ", opts: ["جَأْتُ","جُؤْتُ","جِئْتُ","جِيتُ"] },
  { clue: "صفة لمن بدأ للتوّ في مجاله، عكس المخضرم", answer: "نَاشِئٌ", opts: ["نَاشَأٌ","نَاشُؤٌ","نَاشِئٌ","نَاشِءٌ"] },
  { clue: "فعل ماضٍ بمعنى فَقَدَ الأمل",   answer: "يَئِسَ",    opts: ["يَأَسَ","يَؤُسَ","يَئِسَ","يَيِسَ"] },
];

/*
  مرحلة صندوق الكنز — كلمات جديدة كلياً (لا تتكرر مع الفرز أو الاختيار)
  الخيارات: الصحيح + خطأ بالألف + خطأ بالواو + خطأ بالسطر — تُعرض عشوائيًا
*/
const L1_FIX = [
  { wrong: "بِأْسَ",     correct: "بِئْسَ",     rule: "ما قبلها كسرة (بِـ) → تُكتب على نبرة لا على ألف", opts: ["بِئْسَ","بِأْسَ","بُؤْسَ","بِيسَ"] },
  { wrong: "فِأْرَانٌ",  correct: "فِئْرَانٌ",  rule: "ما قبلها كسرة (فِـ) → تُكتب على نبرة لا على ألف", opts: ["فِئْرَانٌ","فِأْرَانٌ","فُؤْرَانٌ","فِيرَانٌ"] },
  { wrong: "مُتَّكِأٌ",  correct: "مُتَّكِئٌ",  rule: "ما قبلها كسرة (كِـ) → تُكتب على نبرة لا على ألف", opts: ["مُتَّكِئٌ","مُتَّكِأٌ","مُتَّكُؤٌ","مُتَّكِءٌ"] },
  { wrong: "مُبْتَدَأٌ", correct: "مُبْتَدِئٌ", rule: "ما قبلها كسرة (دِـ) → تُكتب على نبرة لا على ألف", opts: ["مُبْتَدِئٌ","مُبْتَدَأٌ","مُبْتَدُؤٌ","مُبْتَدِءٌ"] },
  { wrong: "دَافَأٌ",    correct: "دَافِئٌ",    rule: "ما قبلها كسرة (فِـ) → تُكتب على نبرة لا على ألف", opts: ["دَافِئٌ","دَافَأٌ","دَافُؤٌ","دَافِءٌ"] },
];

function Lesson1({ onBack, apiData }: { onBack: () => void; apiData?: any }) {
  const [phase, setPhase] = useState(0);
  const [confetti, setConfetti] = useState(0);

  const gateSource = (apiData?.l1_gate?.length ? apiData.l1_gate : L1_GATE_WORDS);
  const crossSource = (apiData?.l1_cross?.length ? apiData.l1_cross : L1_CROSSWORD);
  const fixSource   = (apiData?.l1_fix?.length   ? apiData.l1_fix   : L1_FIX);

  const [gateWords] = useState(() => [...gateSource].sort(() => Math.random() - 0.5));
  const [gateIdx, setGateIdx] = useState(0);
  const [gateScore, setGateScore] = useState(0);
  const [gateFeedback, setGateFeedback] = useState<"correct"|"wrong"|null>(null);
  const [gateDone, setGateDone] = useState(false);

  // phase 3 — crossword MCQ
  const [crossIdx, setCrossIdx] = useState(0);
  const [crossScore, setCrossScore] = useState(0);
  const [crossSelected, setCrossSelected] = useState<string|null>(null);
  const [crossDone, setCrossDone] = useState(false);

  // phase 4 — fix drag
  const [fixIdx, setFixIdx] = useState(0);
  const [fixScore, setFixScore] = useState(0);
  const [fixSelected, setFixSelected] = useState<string|null>(null);
  const [fixFeedback, setFixFeedback] = useState<"correct"|"wrong"|null>(null);
  const [fixDone, setFixDone] = useState(false);

  const crossOpts = useMemo(() => shuffle((crossSource[crossIdx]?.opts || []).map(String)), [crossIdx, apiData]);
  const fixOpts = useMemo(() => shuffle((fixSource[fixIdx]?.opts || []).map(String)), [fixIdx, apiData]);

  function advanceGate() {
    setGateFeedback(null);
    if (gateIdx < gateWords.length - 1) setGateIdx(i => i+1);
    else setGateDone(true);
  }
  function gateAnswer(val: boolean) {
    if (gateFeedback) return;
    const right = val === gateWords[gateIdx].isNabra;
    setGateFeedback(right ? "correct" : "wrong");
    if (right) {
      setGateScore(s => s+1); setConfetti(c => c+1); playEffect(audioFile("/assets/correct.mp3"), 0.7);
      setTimeout(advanceGate, 1200);
    } else {
      playEffect(audioFile("/assets/tryagain.mp3"), 0.6);
    }
  }

  function advanceCross() {
    setCrossSelected(null);
    if (crossIdx < crossSource.length - 1) setCrossIdx(i => i+1);
    else setCrossDone(true);
  }
  function crossAnswer(opt: string) {
    if (crossSelected) return;
    setCrossSelected(opt);
    const right = opt === crossSource[crossIdx].answer;
    if (right) {
      setCrossScore(s => s+1); setConfetti(c => c+1); playEffect(audioFile("/assets/correct.mp3"), 0.7);
      setTimeout(advanceCross, 1300);
    } else {
      playEffect(audioFile("/assets/tryagain.mp3"), 0.6);
    }
  }

  function advanceFix() {
    setFixFeedback(null); setFixSelected(null);
    if (fixIdx < fixSource.length - 1) setFixIdx(i => i+1);
    else setFixDone(true);
  }
  function fixAnswer(opt: string) {
    if (fixFeedback) return;
    setFixSelected(opt);
    const right = opt === fixSource[fixIdx].correct;
    setFixFeedback(right ? "correct" : "wrong");
    if (right) {
      setFixScore(s => s+1); setConfetti(c => c+1); playEffect(audioFile("/assets/correct.mp3"), 0.7);
      setTimeout(advanceFix, 1300);
    } else {
      playEffect(audioFile("/assets/tryagain.mp3"), 0.6);
    }
  }

  const bg = "linear-gradient(180deg,#065f46,#059669)";
  const accent = "#059669";

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "#f5f0e8", minHeight: "100vh" }}>
      <Confetti trigger={confetti} />
      <div className="p-4" style={{ background: "linear-gradient(135deg,#064e3b,#065f46)" }}>
        <button onClick={onBack} className="text-emerald-200 text-sm mb-2">← قَائِمَةُ الدُّرُوسِ</button>
        <div className="flex justify-between items-center">
          <span className="text-xs px-3 py-1 rounded-full text-white font-bold" style={{ background: accent }}>الدَّرْسُ الأَوَّلُ</span>
          <h1 className="text-xl font-bold text-white text-right">الْهَمْزَةُ عَلَى نَبْرَةٍ (يَاءٍ)</h1>
        </div>
        {/* Progress bar */}
        <div className="flex gap-1 mt-3">
          {["🎯","🎬","🔓","🔤","🏆"].map((icon, i) => (
            <div key={i} onClick={() => i < phase && setPhase(i)}
              className="flex-1 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
              style={{ background: i === phase ? accent : i < phase ? "#047857" : "#fdf6ec", cursor: i < phase ? "pointer" : "default" }}>
              {icon}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5">

        {/* ── المرحلة ٠: الأهداف ── */}
        {phase === 0 && (
          <div className="space-y-4">
            <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-5 text-right text-gray-800">
              <h2 className="text-2xl font-bold mb-5 text-center" style={{ color: "#b45309" }}>🎯 مَاذَا سَتَتَعَلَّمُ؟</h2>
              {[
                "تَعْرِفُ مَتَى تُكْتَبُ الْهَمْزَةُ عَلَى نَبْرَةٍ (ياء)",
                "تُعَلِّلُ سَبَبَ كِتَابَتِهَا بِمُقَارَنَةِ الْحَرَكَاتِ",
                "تَكْتُبُ كَلِمَاتٍ بِهَمْزَةٍ عَلَى نَبْرَةٍ بِشَكْلٍ صَحِيحٍ",
              ].map((g, i) => (
                <div key={i} className="flex items-center gap-4 mb-4 p-4 rounded-2xl" style={{ background: "#fdf6ec", border: "1px solid #e8ddc8" }}>
                  <span className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0" style={{ background: "#fdf6ec" }}>{["١","٢","٣"][i]}</span>
                  <p className="text-base font-semibold leading-relaxed text-gray-700">{g}</p>
                </div>
              ))}
            </div>
            <div className="bg-white shadow-sm border border-gray-100 rounded-2xl p-4 text-right text-gray-400 text-sm">
              <p>⏱️ الْوَقْتُ الْمُتَوَقَّعُ: ١٠ دَقَائِقَ &nbsp;|&nbsp; ٥ مَرَاحِلَ</p>
            </div>
            <button onClick={() => setPhase(1)}
              className="w-full py-4 rounded-2xl text-white text-lg font-bold transition-all active:scale-95"
              style={{ background: `linear-gradient(135deg,${accent},#047857)` }}>
              هَيَّا نَبْدَأ! 🚀
            </button>
          </div>
        )}

        {/* ── المرحلة ١: التمهيد ── */}
        {phase === 1 && (
          <div className="space-y-4">
            <PhaseHeader phase={2} total={5} title="التَّمْهِيدُ — مَعْرَكَةُ الْحَرَكَاتِ!" color={accent} />
            <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-5 text-right text-gray-800">
              <div className="text-center text-4xl mb-4">⚔️</div>
              <h3 className="font-bold text-lg mb-3" style={{ color: "#b45309" }}>مَعْرَكَةُ الْحَرَكَاتِ!</h3>
              <p className="text-sm leading-loose mb-4">
                فِي مَمْلَكَةِ الْكَلِمَاتِ، نَشَبَتْ مَعْرَكَةٌ بَيْنَ الْحَرَكَاتِ الثَّلَاثِ:
              </p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { h: "الْفَتْحَةُ", icon: "🟡", power: "ضَعِيفَةٌ" },
                  { h: "الضَّمَّةُ", icon: "🟠", power: "مُتَوَسِّطَةٌ" },
                  { h: "الْكَسْرَةُ", icon: "🔵", power: "الأَقْوَى! 👑" },
                ].map((h, i) => (
                  <div key={i} className="bg-white shadow-sm border border-gray-100 rounded-xl p-3 text-center">
                    <div className="text-2xl mb-1">{h.icon}</div>
                    <p className="text-xs font-bold text-gray-700">{h.h}</p>
                    <p className="text-xs" style={{ color: i === 2 ? "#b45309" : "#9ca3af" }}>{h.power}</p>
                  </div>
                ))}
              </div>
              <div className="bg-yellow-500/20 rounded-xl p-3 text-center">
                <p className="text-sm font-bold" style={{ color: "#b45309" }}>
                  📌 الْقَاعِدَةُ الذَّهَبِيَّةُ: إِذَا وُجِدَتِ الْكَسْرَةُ (قَبْلَ الْهَمْزَةِ أَوْ بَعْدَهَا) → الْهَمْزَةُ عَلَى نَبْرَةٍ ئ
                </p>
              </div>
            </div>
            <div className="bg-white shadow-sm border border-gray-100 rounded-2xl p-4 text-right text-gray-800">
              <p className="text-sm font-bold mb-3" style={{ color: "#15803d" }}>مثال تفاعلي:</p>
              <p className="text-lg font-bold text-center mb-2" style={{ fontFamily: "'Amiri', serif" }}>سُ + ئ + ل = سُئِلَ</p>
              <p className="text-xs text-center text-gray-500">الكسرة بعد الهمزة → تكتب على نبرة ✅</p>
            </div>
            <button onClick={() => setPhase(2)}
              className="w-full py-4 rounded-2xl text-white font-bold active:scale-95"
              style={{ background: `linear-gradient(135deg,${accent},#047857)` }}>
              إِلَى الْمَرْحَلَةِ الأُولَى! 🔓
            </button>
          </div>
        )}

        {/* ── المرحلة ٢: فرز البوابة ── */}
        {phase === 2 && (
          <div>
            <PhaseHeader phase={3} total={5} title="الْمَرْحَلَةُ ١ — افْتَحِ الْبَوَّابَةَ! 🔓" color={accent} />
            {!gateDone ? (
              <>
                <div className="w-full h-2 bg-white shadow-sm border border-gray-100 rounded-full mb-3">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${(gateIdx/gateWords.length)*100}%`, background: accent }} />
                </div>
                <p className="text-gray-400 text-xs text-center mb-4">{gateIdx+1} / {gateWords.length}</p>
                <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-6 text-center mb-5">
                  <p className="text-gray-500 text-sm mb-1">الْكَلِمَةُ التَّالِيَةُ مَكْتُوبَةٌ بِشَكْلٍ صَحِيحٍ. صَنِّفْهَا:</p>
                  <p className="text-gray-400 text-xs mb-3">هَلْ هَمْزَتُهَا مِنْ نَوْعِ "عَلَى نَبْرَةٍ" (ئ)؟</p>
                  <p className="font-bold text-gray-800 mb-4 text-center" style={{ fontFamily: "'Amiri', serif", fontSize: "clamp(1.8rem, 8vw, 3.5rem)", lineHeight: "1.6", wordBreak: "break-word" }}>{gateWords[gateIdx].word}</p>
                  {gateFeedback && (
                    <div className={`text-sm font-bold rounded-xl px-4 py-2 ${gateFeedback === "correct" ? "bg-green-500/30 text-green-200" : "bg-red-500/30 text-red-200"}`}>
                      {gateFeedback === "correct" ? "✅ صَحِيحٌ!" : `❌ ${gateWords[gateIdx].reason}`}
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <button onClick={() => gateAnswer(false)} disabled={!!gateFeedback}
                    className="flex-1 py-4 rounded-2xl text-white font-bold text-xl active:scale-95 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#dc2626,#b91c1c)" }}>❌ لَا</button>
                  <button onClick={() => gateAnswer(true)} disabled={!!gateFeedback}
                    className="flex-1 py-4 rounded-2xl text-white font-bold text-xl active:scale-95 disabled:opacity-50"
                    style={{ background: `linear-gradient(135deg,${accent},#047857)` }}>✅ نَعَمْ</button>
                </div>
                {gateFeedback === "wrong" && <ContinueButton onClick={advanceGate} color={accent} />}
              </>
            ) : (
              <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-6 text-center text-gray-800">
                <div className="text-5xl mb-3">{gateScore >= 7 ? "🔓" : "🔒"}</div>
                <h3 className="text-xl font-bold mb-2">{gateScore >= 7 ? "فُتِحَتِ الْبَوَّابَةُ!" : "حَاوِلْ مَرَّةً أُخْرَى"}</h3>
                <p className="text-emerald-600 mb-5">أَصَبْتَ {gateScore} مِنْ {gateWords.length}</p>
                {gateScore >= 7
                  ? <button onClick={() => setPhase(3)} className="w-full py-3 rounded-2xl text-white font-bold" style={{ background: accent }}>التَّالِي → 🔤</button>
                  : <button onClick={() => { setGateIdx(0); setGateScore(0); setGateDone(false); }} className="w-full py-3 rounded-2xl text-gray-700 font-bold bg-gray-100">إِعَادَةٌ 🔄</button>
                }
              </div>
            )}
          </div>
        )}

        {/* ── المرحلة ٣: الكلمات المتقاطعة MCQ ── */}
        {phase === 3 && (
          <div>
            <PhaseHeader phase={4} total={5} title="الْمَرْحَلَةُ ٢ — اخْتَرِ الْكَلِمَةَ الصَّحِيحَةَ 🔤" color={accent} />
            {!crossDone ? (
              <>
                <div className="w-full h-2 bg-white shadow-sm border border-gray-100 rounded-full mb-3">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${(crossIdx/crossSource.length)*100}%`, background: accent }} />
                </div>
                <p className="text-gray-400 text-xs text-center mb-4">{crossIdx+1} / {crossSource.length}</p>
                <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-5 text-center mb-4">
                  <p className="text-emerald-600 text-sm mb-2">🔍 مَا هَذِهِ الْكَلِمَةُ؟</p>
                  <p className="text-gray-800 font-bold text-base">{crossSource[crossIdx]?.clue}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {crossOpts.map(opt => {
                    const isCorrect = opt === crossSource[crossIdx]?.answer;
                    const isSelected = opt === crossSelected;
                    let bg = "#fdf6ec";
                    let textColor = "#374151";
                    if (crossSelected) { bg = isCorrect ? "#059669" : isSelected ? "#dc2626" : "#fdf6ec"; textColor = (isCorrect || isSelected) ? "#ffffff" : "#374151"; }
                    return (
                      <button key={opt} onClick={() => crossAnswer(opt)} disabled={!!crossSelected}
                        className="py-4 rounded-2xl font-bold text-xl transition-all active:scale-95 disabled:opacity-90"
                        style={{ background: bg, color: textColor, fontFamily: "'Amiri', serif", border: isSelected ? "2px solid " + (textColor === "#ffffff" ? "white" : "#d1d5db") : "2px solid transparent" }}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {crossSelected && crossSelected !== crossSource[crossIdx]?.answer && (
                  <ContinueButton onClick={advanceCross} color={accent} />
                )}
              </>
            ) : (
              <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-6 text-center text-gray-800">
                <div className="text-5xl mb-3">🔤</div>
                <h3 className="text-xl font-bold mb-2">أَكْمَلْتَ الْمُتَقَاطِعَةَ!</h3>
                <p className="text-emerald-600 mb-5">أَصَبْتَ {crossScore} مِنْ {L1_CROSSWORD.length}</p>
                <button onClick={() => setPhase(4)} className="w-full py-3 rounded-2xl text-white font-bold" style={{ background: accent }}>التَّالِي → 🏆</button>
              </div>
            )}
          </div>
        )}

        {/* ── المرحلة ٤: صندوق الكنز ── */}
        {phase === 4 && (
          <div>
            <PhaseHeader phase={5} total={5} title="الْمَرْحَلَةُ ٣ — صَنْدُوقُ الْكَنْزِ 🏆" color={accent} />
            {!fixDone ? (
              <>
                <div className="w-full h-2 bg-white shadow-sm border border-gray-100 rounded-full mb-3">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${(fixIdx/L1_FIX.length)*100}%`, background: "#f5c842" }} />
                </div>
                <p className="text-gray-400 text-xs text-center mb-4">{fixIdx+1} / {L1_FIX.length}</p>
                <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-5 text-center mb-4">
                  <p className="text-gray-500 text-sm mb-2">🔑 اخْتَرِ الْكِتَابَةَ الصَّحِيحَةَ لِفَتْحِ الْكَنْزِ</p>
                  <p className="text-3xl line-through text-red-400 font-bold mb-1" style={{ fontFamily: "'Amiri', serif" }}>{L1_FIX[fixIdx].wrong}</p>
                  <p className="text-xs text-amber-700">💡 {L1_FIX[fixIdx].rule}</p>
                  {fixFeedback && (
                    <div className={`mt-3 text-sm font-bold rounded-xl px-4 py-2 ${fixFeedback === "correct" ? "bg-green-500/30 text-green-200" : "bg-red-500/30 text-red-200"}`}>
                      {fixFeedback === "correct" ? "✅ مِفْتَاحٌ صَحِيحٌ!" : `❌ الصَّوَابُ: ${L1_FIX[fixIdx].correct}`}
                    </div>
                  )}
                </div>
                {/* Options: scrambled correct + wrong variants, order randomized each time */}
                <div className="grid grid-cols-2 gap-3">
                  {fixOpts.map(opt => {
                    const isCorrect = opt === L1_FIX[fixIdx].correct;
                    const isSelected = opt === fixSelected;
                    let bg = "#fdf6ec";
                    let textColor = "#374151";
                    if (fixFeedback) { bg = isCorrect ? "#059669" : isSelected ? "#dc2626" : "#fdf6ec"; textColor = (isCorrect || isSelected) ? "#ffffff" : "#374151"; }
                    return (
                      <button key={opt} onClick={() => fixAnswer(opt)} disabled={!!fixFeedback}
                        className="py-4 rounded-2xl font-bold text-xl transition-all active:scale-95 disabled:opacity-90"
                        style={{ background: bg, color: textColor, fontFamily: "'Amiri', serif" }}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {fixFeedback === "wrong" && <ContinueButton onClick={advanceFix} color="#f5c842" />}
              </>
            ) : (
              <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-6 text-center text-gray-800">
                <div className="text-6xl mb-3">🏆</div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: "#b45309" }}>فَتَحْتَ صَنْدُوقَ الْكَنْزِ!</h3>
                <p className="text-emerald-600 mb-2">أَصَبْتَ {fixScore} مِنْ {L1_FIX.length}</p>
                <p className="text-gray-500 text-sm mb-5">أَتْقَنْتَ الْهَمْزَةَ الْمُتَوَسِّطَةَ عَلَى نَبْرَةٍ! 🎉</p>
                <button onClick={onBack} className="w-full py-3 rounded-2xl text-white font-bold" style={{ background: accent }}>
                  الْعَوْدَةُ إِلَى الدُّرُوسِ
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   LESSON 2 — الهمزة المتوسطة على السطر
   ══════════════════════════════════════════════════════ */

/*
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  درس ٢: الهمزة المتوسطة على السطر
  القاعدة: تُكتب على السطر إذا كان ما قبلها حرف مد
  ساكن (ألف مد أو واو مد)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  مرحلة الفرز — كلمات مختلفة عن المراحل الأخرى
*/
const L2_RIVER_WORDS = [
  // همزة على السطر ✅ — كلمات خاصة بهذه المرحلة فقط
  { word: "مَسَاءٌ",     isSatr: true,  reason: "قبلها ألف مد ساكنة (سا)" },
  { word: "تَسَاءَلَ",   isSatr: true,  reason: "قبلها ألف مد ساكنة (سا)" },
  { word: "وُضُوءٌ",     isSatr: true,  reason: "قبلها واو مد ساكنة (ضو)" },
  { word: "نِدَاءٌ",     isSatr: true,  reason: "قبلها ألف مد ساكنة (دا)" },
  { word: "سَمَاءٌ",     isSatr: true,  reason: "قبلها ألف مد ساكنة (ما)" },
  { word: "هُدُوءٌ",     isSatr: true,  reason: "قبلها واو مد ساكنة (دو)" },
  // ليست على السطر ❌
  { word: "سَأَلَ",      isSatr: false, reason: "قبلها فتحة (سَـ) → تُكتب على ألف" },
  { word: "سُئِلَ",      isSatr: false, reason: "قبلها ضمة وبعدها كسرة → تُكتب على نبرة" },
  { word: "يَجْرُؤُ",    isSatr: false, reason: "قبلها ضمة (رُـ) → تُكتب على واو" },
  { word: "رَأْسٌ",      isSatr: false, reason: "قبلها فتحة (رَـ) → تُكتب على ألف" },
];

/*
  مرحلة الاختيار — كلمات جديدة كلياً (غير مكررة مع عبور النهر أو إكمال الجملة)
  الخيارات مدروسة: الصحيح + خطأ بألف + خطأ بنبرة + خطأ بواو، تُعرض عشوائيًا
*/
const L2_CROSSWORD = [
  { clue: "المصيبة والشقاء وعكسه السعادة",           answer: "شَقَاءٌ",   opts: ["شَقَاءٌ","شَقَاأٌ","شَقَائٌ","شَقَؤٌ"] },
  { clue: "ملابس المرأة الفضفاضة التقليدية",         answer: "عَبَاءَةٌ", opts: ["عَبَاءَةٌ","عَبَاأَةٌ","عَبَائَةٌ","عَبَؤَةٌ"] },
  { clue: "تصفّح الكتاب والنظر فيه",                answer: "قِرَاءَةٌ", opts: ["قِرَاءَةٌ","قِرَاأَةٌ","قِرَائَةٌ","قِرَؤَةٌ"] },
  { clue: "الكرم والشهامة وإغاثة الملهوف",           answer: "مُرُوءَةٌ", opts: ["مُرُوءَةٌ","مُرُوأَةٌ","مُرُوئَةٌ","مُرُؤَةٌ"] },
  { clue: "ما يُغطَّى به الشيء أو يُستَر",           answer: "غِطَاءٌ",   opts: ["غِطَاءٌ","غِطَاأٌ","غِطَائٌ","غِطَؤٌ"] },
  { clue: "من يعمل في تشييد المباني وإنشائها",        answer: "بَنَّاءٌ",   opts: ["بَنَّاءٌ","بَنَّاأٌ","بَنَّائٌ","بَنَّؤٌ"] },
];

/*
  مرحلة إكمال الجملة — كلمات جديدة كلياً (لا تتكرر مع أي مرحلة أخرى)
  ملاحظة: الخيارات تشمل الأوجه الثلاثة المحتملة فقط، وتُعرض عشوائيًا
*/
const L2_FILL = [
  {
    sentence: "كَتَبَ الطَّالِبُ مَوْضُوعَ الْ___ بِخَطٍّ جَمِيلٍ",
    answer: "إِنْشَاءِ",
    opts: ["إِنْشَاءِ","إِنْشَائِ","إِنْشَاأِ","إِنْشَؤِ"]
  },
  {
    sentence: "شَهِدَ الْحَفْلُ ___ رَئِيسِ الْمَدْرَسَةِ بِكَلِمَةٍ مُؤَثِّرَةٍ",
    answer: "ابْتِدَاءَ",
    opts: ["ابْتِدَاءَ","ابْتِدَائَ","ابْتِدَاأَ","ابْتِدَؤَ"]
  },
  {
    sentence: "صَفَّقَ الْجُمْهُورُ عِنْدَ ___ الْمُبَارَاةِ بِفَوْزِ الْفَرِيقِ",
    answer: "انْتِهَاءِ",
    opts: ["انْتِهَاءِ","انْتِهَائِ","انْتِهَاأِ","انْتِهَؤِ"]
  },
  {
    sentence: "يَحْتَاجُ الْجِسْمُ إِلَى ___ صِحِّيٍّ مُتَوَازِنٍ",
    answer: "غِذَاءٍ",
    opts: ["غِذَاءٍ","غِذَائٍ","غِذَاأٍ","غِذَؤٍ"]
  },
];

function Lesson2({ onBack, apiData }: { onBack: () => void; apiData?: any }) {
  const [phase, setPhase] = useState(0);
  const [confetti, setConfetti] = useState(0);

  const riverSource = (apiData?.l2_river?.length ? apiData.l2_river : L2_RIVER_WORDS);
  const crossSource2 = (apiData?.l2_cross?.length ? apiData.l2_cross : L2_CROSSWORD);
  const fillSource  = (apiData?.l2_fill?.length  ? apiData.l2_fill  : L2_FILL);

  const [riverWords] = useState(() => [...riverSource].sort(() => Math.random() - 0.5));
  const [riverIdx, setRiverIdx] = useState(0);
  const [riverScore, setRiverScore] = useState(0);
  const [riverFeedback, setRiverFeedback] = useState<"correct"|"wrong"|null>(null);
  const [riverDone, setRiverDone] = useState(false);

  const [crossIdx, setCrossIdx] = useState(0);
  const [crossScore, setCrossScore] = useState(0);
  const [crossSelected, setCrossSelected] = useState<string|null>(null);
  const [crossDone, setCrossDone] = useState(false);

  const [fillIdx, setFillIdx] = useState(0);
  const [fillScore, setFillScore] = useState(0);
  const [fillSelected, setFillSelected] = useState<string|null>(null);
  const [fillFeedback, setFillFeedback] = useState<"correct"|"wrong"|null>(null);
  const [fillDone, setFillDone] = useState(false);

  const crossOpts = useMemo(() => shuffle(Array.from(new Set((crossSource2[crossIdx]?.opts || []).map(String)))), [crossIdx, apiData]);
  const fillOpts = useMemo(() => shuffle((fillSource[fillIdx]?.opts || []).map(String)), [fillIdx, apiData]);

  function advanceRiver() {
    setRiverFeedback(null);
    if (riverIdx < riverWords.length - 1) setRiverIdx(i => i+1);
    else setRiverDone(true);
  }
  function riverAnswer(val: boolean) {
    if (riverFeedback) return;
    const right = val === riverWords[riverIdx].isSatr;
    setRiverFeedback(right ? "correct" : "wrong");
    if (right) {
      setRiverScore(s => s+1); setConfetti(c => c+1); playEffect(audioFile("/assets/correct.mp3"), 0.7);
      setTimeout(advanceRiver, 1200);
    } else {
      playEffect(audioFile("/assets/tryagain.mp3"), 0.6);
    }
  }

  function advanceCross() {
    setCrossSelected(null);
    if (crossIdx < crossSource2.length - 1) setCrossIdx(i => i+1);
    else setCrossDone(true);
  }
  function crossAnswer(opt: string) {
    if (crossSelected) return;
    setCrossSelected(opt);
    const right = opt === crossSource2[crossIdx].answer;
    if (right) {
      setCrossScore(s => s+1); setConfetti(c => c+1); playEffect(audioFile("/assets/correct.mp3"), 0.7);
      setTimeout(advanceCross, 1300);
    } else {
      playEffect(audioFile("/assets/tryagain.mp3"), 0.6);
    }
  }

  function advanceFill() {
    setFillFeedback(null); setFillSelected(null);
    if (fillIdx < fillSource.length - 1) setFillIdx(i => i+1);
    else setFillDone(true);
  }
  function fillAnswer(opt: string) {
    if (fillFeedback) return;
    setFillSelected(opt);
    const right = opt === fillSource[fillIdx].answer;
    setFillFeedback(right ? "correct" : "wrong");
    if (right) {
      setFillScore(s => s+1); setConfetti(c => c+1); playEffect(audioFile("/assets/correct.mp3"), 0.7);
      setTimeout(advanceFill, 1300);
    } else {
      playEffect(audioFile("/assets/tryagain.mp3"), 0.6);
    }
  }

  const bg = "linear-gradient(180deg,#1e40af,#2563eb)";
  const accent = "#1d4ed8";

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "#f5f0e8", minHeight: "100vh" }}>
      <Confetti trigger={confetti} />
      <div className="p-4" style={{ background: "linear-gradient(135deg,#1e3a8a,#1d4ed8)" }}>
        <button onClick={onBack} className="text-blue-200 text-sm mb-2">← قَائِمَةُ الدُّرُوسِ</button>
        <div className="flex justify-between items-center">
          <span className="text-xs px-3 py-1 rounded-full text-white font-bold bg-blue-600">الدَّرْسُ الثَّانِي</span>
          <h1 className="text-xl font-bold text-white text-right">الْهَمْزَةُ عَلَى السَّطْرِ</h1>
        </div>
        <div className="flex gap-1 mt-3">
          {["🎯","🎬","🌊","🔤","🏆"].map((icon, i) => (
            <div key={i} onClick={() => i < phase && setPhase(i)}
              className="flex-1 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
              style={{ background: i === phase ? accent : i < phase ? "#1e40af" : "#fdf6ec", cursor: i < phase ? "pointer" : "default" }}>
              {icon}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5">

        {phase === 0 && (
          <div className="space-y-4">
            <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-5 text-right text-gray-800">
              <h2 className="text-2xl font-bold mb-5 text-center" style={{ color: "#1d4ed8" }}>🎯 مَاذَا سَتَتَعَلَّمُ؟</h2>
              {[
                "تَسْتَنْتِجُ مَتَى تُكْتَبُ الْهَمْزَةُ الْمُتَوَسِّطَةُ عَلَى السَّطْرِ",
                "تُوَضِّحُ سَبَبَ كِتَابَتِهَا فِي كَلِمَاتٍ مُخْتَلِفَةٍ",
                "تُطَبِّقُ الْقَاعِدَةَ فِي جُمَلٍ جَدِيدَةٍ",
              ].map((g, i) => (
                <div key={i} className="flex items-center gap-4 mb-4 p-4 rounded-2xl" style={{ background: "#fdf6ec", border: "1px solid #e8ddc8" }}>
                  <span className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0" style={{ background: "#fdf6ec" }}>{["١","٢","٣"][i]}</span>
                  <p className="text-base font-semibold leading-relaxed text-gray-700">{g}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setPhase(1)} className="w-full py-4 rounded-2xl text-white text-lg font-bold active:scale-95" style={{ background: `linear-gradient(135deg,${accent},#1e40af)` }}>
              هَيَّا نَبْدَأ! 🚀
            </button>
          </div>
        )}

        {phase === 1 && (
          <div className="space-y-4">
            <PhaseHeader phase={2} total={5} title="التَّمْهِيدُ — الْمُحَقِّقُ وَالْهَمْزَةُ الْهَارِبَةُ!" color={accent} />
            <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-5 text-right text-gray-800">
              <div className="text-center text-4xl mb-4">🔍</div>
              <h3 className="font-bold text-lg mb-3" style={{ color: "#1d4ed8" }}>الْمُحَقِّقُ وَالْهَمْزَةُ الْهَارِبَةُ!</h3>
              <p className="text-sm leading-loose mb-3">اخْتَفَتِ الْهَمْزَةُ مِنْ كُرْسِيِّهَا! تَرَكَتْ رِسَالَةً:</p>
              <div className="bg-blue-900/50 rounded-xl p-3 text-center mb-4 italic">
                <p className="text-sm">"لَنْ أَجْلِسَ عَلَى أَيِّ كُرْسِيٍّ إِذَا كَانَ مَا قَبْلِي حَرْفَ مَدٍّ سَاكِنٌ (ألف أو واو)!"</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-3 text-center">
                  <p className="text-2xl mb-1">🔵</p>
                  <p className="text-xs font-bold">بَعْدَ أَلِفِ مَدٍّ</p>
                  <p className="text-xs text-gray-400 mt-1">مَسَاءٌ ← مَسَا + ء</p>
                </div>
                <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-3 text-center">
                  <p className="text-2xl mb-1">🟠</p>
                  <p className="text-xs font-bold">بَعْدَ وَاوِ مَدٍّ</p>
                  <p className="text-xs text-gray-400 mt-1">هُدُوءٌ ← هُدُو + ء</p>
                </div>
              </div>
              <div className="bg-yellow-500/20 rounded-xl p-3 text-center">
                <p className="text-sm font-bold" style={{ color: "#b45309" }}>📌 بَعْدَ أَلِفٍ أَوْ وَاوٍ سَاكِنَةٍ → الْهَمْزَةُ عَلَى السَّطْرِ ء</p>
              </div>
            </div>
            <button onClick={() => setPhase(2)} className="w-full py-4 rounded-2xl text-white font-bold active:scale-95" style={{ background: `linear-gradient(135deg,${accent},#1e40af)` }}>
              إِلَى الْمَرْحَلَةِ الأُولَى! 🌊
            </button>
          </div>
        )}

        {phase === 2 && (
          <div>
            <PhaseHeader phase={3} total={5} title="الْمَرْحَلَةُ ١ — اعْبُرِ النَّهَرَ! 🌊" color={accent} />
            {!riverDone ? (
              <>
                <div className="w-full h-2 bg-white shadow-sm border border-gray-100 rounded-full mb-3">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${(riverIdx/riverWords.length)*100}%`, background: accent }} />
                </div>
                <p className="text-gray-400 text-xs text-center mb-4">{riverIdx+1} / {riverWords.length}</p>
                <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-6 text-center mb-5">
                  <p className="text-gray-500 text-sm mb-1">الْكَلِمَةُ التَّالِيَةُ مَكْتُوبَةٌ بِشَكْلٍ صَحِيحٍ. صَنِّفْهَا:</p>
                  <p className="text-gray-400 text-xs mb-3">هَلْ هَمْزَتُهَا مِنْ نَوْعِ "عَلَى السَّطْرِ" (ء)؟</p>
                  <p className="font-bold text-gray-800 mb-4 text-center" style={{ fontFamily: "'Amiri', serif", fontSize: "clamp(1.8rem, 8vw, 3.5rem)", lineHeight: "1.6", wordBreak: "break-word" }}>{riverWords[riverIdx].word}</p>
                  {riverFeedback && (
                    <div className={`text-sm font-bold rounded-xl px-4 py-2 ${riverFeedback === "correct" ? "bg-green-500/30 text-green-200" : "bg-red-500/30 text-red-200"}`}>
                      {riverFeedback === "correct" ? "✅ حَجَرٌ صَحِيحٌ!" : `❌ ${riverWords[riverIdx].reason}`}
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <button onClick={() => riverAnswer(false)} disabled={!!riverFeedback} className="flex-1 py-4 rounded-2xl text-white font-bold text-xl active:scale-95 disabled:opacity-50" style={{ background: "linear-gradient(135deg,#dc2626,#b91c1c)" }}>❌ لَا</button>
                  <button onClick={() => riverAnswer(true)} disabled={!!riverFeedback} className="flex-1 py-4 rounded-2xl text-white font-bold text-xl active:scale-95 disabled:opacity-50" style={{ background: `linear-gradient(135deg,${accent},#1e40af)` }}>✅ نَعَمْ</button>
                </div>
                {riverFeedback === "wrong" && <ContinueButton onClick={advanceRiver} color={accent} />}
              </>
            ) : (
              <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-6 text-center text-gray-800">
                <div className="text-5xl mb-3">{riverScore >= 7 ? "🌊" : "💧"}</div>
                <h3 className="text-xl font-bold mb-2">{riverScore >= 7 ? "عَبَرْتَ النَّهَرَ!" : "حَاوِلْ مَرَّةً أُخْرَى"}</h3>
                <p className="text-blue-600 mb-5">أَصَبْتَ {riverScore} مِنْ {riverWords.length}</p>
                {riverScore >= 7
                  ? <button onClick={() => setPhase(3)} className="w-full py-3 rounded-2xl text-white font-bold" style={{ background: accent }}>التَّالِي → 🔤</button>
                  : <button onClick={() => { setRiverIdx(0); setRiverScore(0); setRiverDone(false); }} className="w-full py-3 rounded-2xl text-gray-700 font-bold bg-gray-100">إِعَادَةٌ 🔄</button>
                }
              </div>
            )}
          </div>
        )}

        {phase === 3 && (
          <div>
            <PhaseHeader phase={4} total={5} title="الْمَرْحَلَةُ ٢ — اخْتَرِ الصَّحِيحَ 🔤" color={accent} />
            {!crossDone ? (
              <>
                <div className="w-full h-2 bg-white shadow-sm border border-gray-100 rounded-full mb-3">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${(crossIdx/crossSource2.length)*100}%`, background: accent }} />
                </div>
                <p className="text-gray-400 text-xs text-center mb-4">{crossIdx+1} / {crossSource2.length}</p>
                <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-5 text-center mb-4">
                  <p className="text-blue-600 text-sm mb-2">🔍 مَا هَذِهِ الْكَلِمَةُ؟</p>
                  <p className="text-gray-800 font-bold text-base">{crossSource2[crossIdx]?.clue}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {crossOpts.map(opt => {
                    const isCorrect = opt === crossSource2[crossIdx]?.answer;
                    const isSelected = opt === crossSelected;
                    let bg = "#fdf6ec";
                    let textColor = "#374151";
                    if (crossSelected) { bg = isCorrect ? "#059669" : isSelected ? "#dc2626" : "#fdf6ec"; textColor = (isCorrect || isSelected) ? "#ffffff" : "#374151"; }
                    return (
                      <button key={opt} onClick={() => crossAnswer(opt)} disabled={!!crossSelected}
                        className="py-4 rounded-2xl font-bold text-xl transition-all active:scale-95 disabled:opacity-90"
                        style={{ background: bg, color: textColor, fontFamily: "'Amiri', serif" }}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {crossSelected && crossSelected !== crossSource2[crossIdx]?.answer && (
                  <ContinueButton onClick={advanceCross} color={accent} />
                )}
              </>
            ) : (
              <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-6 text-center text-gray-800">
                <div className="text-5xl mb-3">🔤</div>
                <p className="text-blue-600 mb-5">أَصَبْتَ {crossScore} مِنْ {L2_CROSSWORD.length}</p>
                <button onClick={() => setPhase(4)} className="w-full py-3 rounded-2xl text-white font-bold" style={{ background: accent }}>التَّالِي → 🏆</button>
              </div>
            )}
          </div>
        )}

        {phase === 4 && (
          <div>
            <PhaseHeader phase={5} total={5} title="الْمَرْحَلَةُ ٣ — صَنْدُوقُ الْكَنْزِ 🏆" color={accent} />
            {!fillDone ? (
              <>
                <div className="w-full h-2 bg-white shadow-sm border border-gray-100 rounded-full mb-3">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${(fillIdx/L2_FILL.length)*100}%`, background: "#f5c842" }} />
                </div>
                <p className="text-gray-400 text-xs text-center mb-4">{fillIdx+1} / {L2_FILL.length}</p>
                <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-5 text-center mb-4">
                  <p className="text-gray-500 text-sm mb-3">🔑 اخْتَرِ الْكَلِمَةَ الصَّحِيحَةَ لِإِكْمَالِ الْجُمْلَةِ</p>
                  <p className="text-gray-800 text-base leading-loose" style={{ fontFamily: "'Amiri', serif" }}>{L2_FILL[fillIdx].sentence}</p>
                  {fillFeedback && (
                    <div className={`mt-3 text-sm font-bold rounded-xl px-4 py-2 ${fillFeedback === "correct" ? "bg-green-500/30 text-green-200" : "bg-red-500/30 text-red-200"}`}>
                      {fillFeedback === "correct" ? "✅ صَحِيحٌ!" : `❌ الصَّوَابُ: ${L2_FILL[fillIdx].answer}`}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {fillOpts.map(opt => {
                    const isCorrect = opt === L2_FILL[fillIdx].answer;
                    const isSelected = opt === fillSelected;
                    let bg = "#fdf6ec";
                    let textColor = "#374151";
                    if (fillFeedback) { bg = isCorrect ? "#059669" : isSelected ? "#dc2626" : "#fdf6ec"; textColor = (isCorrect || isSelected) ? "#ffffff" : "#374151"; }
                    return (
                      <button key={opt} onClick={() => fillAnswer(opt)} disabled={!!fillFeedback}
                        className="py-4 rounded-2xl font-bold text-xl transition-all active:scale-95 disabled:opacity-90"
                        style={{ background: bg, color: textColor, fontFamily: "'Amiri', serif" }}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {fillFeedback === "wrong" && <ContinueButton onClick={advanceFill} color="#f5c842" />}
              </>
            ) : (
              <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-6 text-center text-gray-800">
                <div className="text-6xl mb-3">🏆</div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: "#b45309" }}>مُمْتَازٌ!</h3>
                <p className="text-blue-600 mb-5">أَتْقَنْتَ الْهَمْزَةَ الْمُتَوَسِّطَةَ عَلَى السَّطْرِ! 🎉</p>
                <button onClick={onBack} className="w-full py-3 rounded-2xl text-white font-bold" style={{ background: accent }}>الْعَوْدَةُ إِلَى الدُّرُوسِ</button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   LESSON 3 — الهمزة المتطرفة
   ══════════════════════════════════════════════════════ */

/*
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  درس ٣: الهمزة المتطرفة
  القاعدة: تُكتب بحسب حركة الحرف الذي قبلها فقط:
  • مفتوح → على ألف (أ)    مثل: قرَأَ، ملجَأٌ
  • مضموم → على واو (ؤ)    مثل: يجرُؤُ، لؤلُؤٌ
  • مكسور → على ياء (ئ)    مثل: شاطِئٌ، مناهِئُ
  • ساكن  → على السطر (ء)  مثل: شيْءٌ، دِفْءٌ
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  مرحلة تسلق الجبل — ٨ كلمات متنوعة، كلمتان لكل كرسي
*/
const L3_MOUNTAIN_WORDS = [
  // على ألف — ما قبلها مفتوح
  { word: "مَلْجَأٌ",   chair: "أ",  reason: "ما قبلها مفتوح (جَـ)",    color: "#059669" },
  { word: "نَشَأَ",     chair: "أ",  reason: "ما قبلها مفتوح (شَـ)",    color: "#059669" },
  // على واو — ما قبلها مضموم
  { word: "يَجْرُؤُ",  chair: "ؤ",  reason: "ما قبلها مضموم (رُـ)",    color: "#1d4ed8" },
  { word: "تَبُؤُ",    chair: "ؤ",  reason: "ما قبلها مضموم (بُـ)",    color: "#1d4ed8" },
  // على ياء — ما قبلها مكسور
  { word: "شَاطِئٌ",   chair: "ئ",  reason: "ما قبلها مكسور (طِـ)",    color: "#7c3aed" },
  { word: "مَنَاشِئُ", chair: "ئ",  reason: "ما قبلها مكسور (شِـ)",    color: "#7c3aed" },
  // على السطر — ما قبلها ساكن
  { word: "دِفْءٌ",    chair: "ء",  reason: "ما قبلها ساكن (فْـ)",     color: "#b45309" },
  { word: "شَيْءٌ",    chair: "ء",  reason: "ما قبلها ساكن (يْـ)",     color: "#b45309" },
];

/*
  مرحلة الاختيار — كلمات جديدة كلياً (غير مكررة مع تسلّق الجبل أو تحدي الكرسي)
  تغطي الحالات الأربع مع خيارات منطقية، وتُعرض عشوائيًا
*/
const L3_CROSSWORD = [
  { clue: "فعل ماضٍ بمعنى طالَعَ الكتابَ ونطق حروفه", answer: "قَرَأَ",    opts: ["قَرَأَ","قَرَؤَ","قَرِئَ","قَرَءَ"] },
  { clue: "فعل ماضٍ عكس انتهى، أي شَرَعَ في الأمر",   answer: "بَدَأَ",    opts: ["بَدَأَ","بَدَؤَ","بَدِئَ","بَدَءَ"] },
  { clue: "الجوهرة البيضاء النادرة من البحر",         answer: "لُؤْلُؤٌ",  opts: ["لُؤْلُؤٌ","لُأْلُأٌ","لُئْلِئٌ","لُءْلُءٌ"] },
  { clue: "توقّعٌ لحدثٍ سيقع في المستقبل",            answer: "تَنَبُّؤٌ", opts: ["تَنَبُّؤٌ","تَنَبُّأٌ","تَنَبُّئٌ","تَنَبُّءٌ"] },
  { clue: "الشخص الذي يقرأ الكتب والصحف باستمرار",    answer: "قَارِئٌ",   opts: ["قَارِئٌ","قَارِأٌ","قَارُؤٌ","قَارِءٌ"] },
  { clue: "غير مُتوقَّع، يحدث فجأة وبَغْتَةً",         answer: "مُفَاجِئٌ", opts: ["مُفَاجِئٌ","مُفَاجَأٌ","مُفَاجُؤٌ","مُفَاجِءٌ"] },
  { clue: "قسمٌ أو حصةٌ من الكلّ",                    answer: "جُزْءٌ",    opts: ["جُزْءٌ","جُزْأٌ","جُزْؤٌ","جُزْئٌ"] },
  { clue: "امتلاءُ الإناءِ حتى آخره",                 answer: "مِلْءٌ",    opts: ["مِلْءٌ","مِلْأٌ","مِلْؤٌ","مِلْئٌ"] },
];

/*
  مرحلة تحدي الكرسي — كلمات جديدة كلياً (غير مكررة مع تسلّق الجبل أو الاختيار)
*/
const L3_CHAIR_QUIZ_WORDS = [
  { word: "لَجَأَ",    chair: "أ", reason: "ما قبلها مفتوح (جَـ)" },
  { word: "مَرْفَأٌ",  chair: "أ", reason: "ما قبلها مفتوح (فَـ)" },
  { word: "تَكَافُؤٌ", chair: "ؤ", reason: "ما قبلها مضموم (فُـ)" },
  { word: "امْرُؤٌ",   chair: "ؤ", reason: "ما قبلها مضموم (رُـ)" },
  { word: "هَادِئٌ",   chair: "ئ", reason: "ما قبلها مكسور (دِـ)" },
  { word: "خَاطِئٌ",   chair: "ئ", reason: "ما قبلها مكسور (طِـ)" },
  { word: "بُطْءٌ",    chair: "ء", reason: "ما قبلها ساكن (طْـ)" },
  { word: "عِبْءٌ",    chair: "ء", reason: "ما قبلها ساكن (بْـ)" },
];

const L3_CHAIRS = [
  { id: "أ", label: "مَفْتُوحٌ قَبْلَهَا", color: "#059669", bg: "#dcf5e7" },
  { id: "ؤ", label: "مَضْمُومٌ قَبْلَهَا", color: "#1d4ed8", bg: "#dbeafe" },
  { id: "ئ", label: "مَكْسُورٌ قَبْلَهَا", color: "#7c3aed", bg: "#f3e8ff" },
  { id: "ء", label: "سَاكِنٌ قَبْلَهَا",   color: "#b45309", bg: "#fef3e2" },
];

function Lesson3({ onBack, apiData }: { onBack: () => void; apiData?: any }) {
  const [phase, setPhase] = useState(0);
  const [confetti, setConfetti] = useState(0);

  const mtnSource    = apiData?.l3_mountain?.length ? apiData.l3_mountain : L3_MOUNTAIN_WORDS;
  const crossSource3 = apiData?.l3_cross?.length    ? apiData.l3_cross    : L3_CROSSWORD;

  const [mtnWords] = useState(() => [...mtnSource].sort(() => Math.random() - 0.5));
  const [mtnIdx, setMtnIdx] = useState(0);
  const [mtnScore, setMtnScore] = useState(0);
  const [mtnSelected, setMtnSelected] = useState<string|null>(null);
  const [mtnFeedback, setMtnFeedback] = useState<"correct"|"wrong"|null>(null);
  const [mtnDone, setMtnDone] = useState(false);

  const [crossIdx, setCrossIdx] = useState(0);
  const [crossScore, setCrossScore] = useState(0);
  const [crossSelected, setCrossSelected] = useState<string|null>(null);
  const [crossDone, setCrossDone] = useState(false);

  // phase 4 — chair quiz (reverse: given chair, pick word)
  const [chairIdx, setChairIdx] = useState(0);
  const [chairScore, setChairScore] = useState(0);
  const [chairSelected, setChairSelected] = useState<string|null>(null);
  const [chairFeedback, setChairFeedback] = useState<"correct"|"wrong"|null>(null);
  const [chairDone, setChairDone] = useState(false);
  const [chairQuiz] = useState(() => {
    const qs = mtnSource.map(w => ({
      question: `أَيُّ كُرْسِيٍّ تَجْلِسُ عَلَيْهِ الْهَمْزَةُ فِي «${w.word}»؟`,
      answer: w.chair,
      reason: w.reason,
      opts: ["أ","ؤ","ئ","ء"],
    }));
    return shuffle(qs);
  });

  const crossOpts = useMemo(() => shuffle((crossSource3[crossIdx]?.opts || []).map(String)), [crossIdx, apiData]);

  function advanceMtn() {
    setMtnFeedback(null); setMtnSelected(null);
    if (mtnIdx < mtnWords.length - 1) setMtnIdx(i => i+1);
    else setMtnDone(true);
  }
  function mtnAnswer(chair: string) {
    if (mtnFeedback) return;
    setMtnSelected(chair);
    const right = chair === mtnWords[mtnIdx].chair;
    setMtnFeedback(right ? "correct" : "wrong");
    if (right) {
      setMtnScore(s => s+1); setConfetti(c => c+1); playEffect(audioFile("/assets/correct.mp3"), 0.7);
      setTimeout(advanceMtn, 1300);
    } else {
      playEffect(audioFile("/assets/tryagain.mp3"), 0.6);
    }
  }

  function advanceCross() {
    setCrossSelected(null);
    if (crossIdx < crossSource3.length - 1) setCrossIdx(i => i+1);
    else setCrossDone(true);
  }
  function crossAnswer(opt: string) {
    if (crossSelected) return;
    setCrossSelected(opt);
    const right = opt === crossSource3[crossIdx].answer;
    if (right) {
      setCrossScore(s => s+1); setConfetti(c => c+1); playEffect(audioFile("/assets/correct.mp3"), 0.7);
      setTimeout(advanceCross, 1300);
    } else {
      playEffect(audioFile("/assets/tryagain.mp3"), 0.6);
    }
  }

  function advanceChair() {
    setChairFeedback(null); setChairSelected(null);
    if (chairIdx < chairQuiz.length - 1) setChairIdx(i => i+1);
    else setChairDone(true);
  }
  function chairAnswer(opt: string) {
    if (chairFeedback) return;
    setChairSelected(opt);
    const right = opt === chairQuiz[chairIdx].answer;
    setChairFeedback(right ? "correct" : "wrong");
    if (right) {
      setChairScore(s => s+1); setConfetti(c => c+1); playEffect(audioFile("/assets/correct.mp3"), 0.7);
      setTimeout(advanceChair, 1300);
    } else {
      playEffect(audioFile("/assets/tryagain.mp3"), 0.6);
    }
  }

  const bg = "linear-gradient(180deg,#92400e,#b45309)";
  const accent = "#b45309";

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "#f5f0e8", minHeight: "100vh" }}>
      <Confetti trigger={confetti} />
      <div className="p-4" style={{ background: "linear-gradient(135deg,#78350f,#b45309)" }}>
        <button onClick={onBack} className="text-amber-100 text-sm mb-2">← قَائِمَةُ الدُّرُوسِ</button>
        <div className="flex justify-between items-center">
          <span className="text-xs px-3 py-1 rounded-full text-white font-bold bg-amber-700">الدَّرْسُ الثَّالِثُ</span>
          <h1 className="text-xl font-bold text-white text-right">الْهَمْزَةُ الْمُتَطَرِّفَةُ</h1>
        </div>
        <div className="flex gap-1 mt-3">
          {["🎯","🎬","🏔️","🔤","🏆"].map((icon, i) => (
            <div key={i} onClick={() => i < phase && setPhase(i)}
              className="flex-1 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
              style={{ background: i === phase ? accent : i < phase ? "#92400e" : "#fdf6ec", cursor: i < phase ? "pointer" : "default" }}>
              {icon}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5">

        {phase === 0 && (
          <div className="space-y-4">
            <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-5 text-right text-gray-800">
              <h2 className="text-2xl font-bold mb-5 text-center" style={{ color: "#b45309" }}>🎯 مَاذَا سَتَتَعَلَّمُ؟</h2>
              {[
                "تُحَدِّدُ الْهَمْزَةَ الْمُتَطَرِّفَةَ وَمَوْقِعَهَا فِي الْكَلِمَةِ",
                "تُعَلِّلُ سَبَبَ كِتَابَتِهَا عَلَى الألف أو الواو أو الياء أو السطر",
                "تَكْتُبُ كَلِمَاتٍ بِهَمْزَةٍ مُتَطَرِّفَةٍ فِي سِيَاقَاتٍ مُتَنَوِّعَةٍ",
              ].map((g, i) => (
                <div key={i} className="flex items-center gap-4 mb-4 p-4 rounded-2xl" style={{ background: "#fdf6ec", border: "1px solid #e8ddc8" }}>
                  <span className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0" style={{ background: "#fdf6ec" }}>{["١","٢","٣"][i]}</span>
                  <p className="text-base font-semibold leading-relaxed text-gray-700">{g}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setPhase(1)} className="w-full py-4 rounded-2xl text-white text-lg font-bold active:scale-95" style={{ background: `linear-gradient(135deg,${accent},#92400e)` }}>
              هَيَّا نَبْدَأ! 🚀
            </button>
          </div>
        )}

        {phase === 1 && (
          <div className="space-y-4">
            <PhaseHeader phase={2} total={5} title="التَّمْهِيدُ — الْحِرْبَاءُ اللُّغَوِيَّةُ!" color={accent} />
            <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-5 text-right text-gray-800">
              <div className="text-center text-4xl mb-3">🦎</div>
              <h3 className="font-bold text-lg mb-3" style={{ color: "#b45309" }}>قِصَّةُ الْحِرْبَاءِ اللُّغَوِيَّةِ!</h3>
              <p className="text-sm leading-loose mb-4">فِي غَابَةِ الْكَلِمَاتِ تَعِيشُ حِرْبَاءُ سِحْرِيَّةٌ. هِيَ دَائِمًا فِي <strong style={{ color: "#b45309" }}>آخِرِ الْكَلِمَةِ</strong>. لَوْنُهَا يَتَغَيَّرُ بِحَسَبِ الْحَرْفِ الَّذِي يَسْبِقُهَا:</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {L3_CHAIRS.map(c => (
                  <div key={c.id} className="rounded-xl p-3 text-center" style={{ background: c.bg }}>
                    <div className="text-2xl font-bold mb-1" style={{ color: c.color }}>{c.id}</div>
                    <p className="text-xs font-bold" style={{ color: c.color }}>{c.label}</p>
                  </div>
                ))}
              </div>
              <div className="bg-yellow-500/20 rounded-xl p-3 text-center">
                <p className="text-xs" style={{ color: "#b45309" }}>📌 انْظُرْ إِلَى الْحَرَكَةِ عَلَى الْحَرْفِ الَّذِي قَبْلَ الْهَمْزَةِ فَقَطْ!</p>
              </div>
            </div>
            <button onClick={() => setPhase(2)} className="w-full py-4 rounded-2xl text-white font-bold active:scale-95" style={{ background: `linear-gradient(135deg,${accent},#92400e)` }}>
              إِلَى الْمَرْحَلَةِ الأُولَى! 🏔️
            </button>
          </div>
        )}

        {phase === 2 && (
          <div>
            <PhaseHeader phase={3} total={5} title="الْمَرْحَلَةُ ١ — تَسَلَّقِ الْجَبَلَ! 🏔️" color={accent} />
            {!mtnDone ? (
              <>
                <div className="w-full h-2 bg-white shadow-sm border border-gray-100 rounded-full mb-3">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${(mtnIdx/mtnWords.length)*100}%`, background: accent }} />
                </div>
                <p className="text-gray-400 text-xs text-center mb-3">{mtnIdx+1} / {mtnWords.length}</p>
                <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-5 text-center mb-4">
                  <p className="text-gray-500 text-sm mb-2">عَلَى أَيِّ كُرْسِيٍّ تَجْلِسُ الْهَمْزَةُ فِي:</p>
                  <p className="font-bold text-gray-800 mb-3 text-center" style={{ fontFamily: "'Amiri', serif", fontSize: "clamp(1.8rem, 8vw, 3.5rem)", lineHeight: "1.6", wordBreak: "break-word" }}>{mtnWords[mtnIdx].word}</p>
                  {mtnFeedback && (
                    <div className={`text-sm font-bold rounded-xl px-4 py-2 ${mtnFeedback === "correct" ? "bg-green-500/30 text-green-200" : "bg-red-500/30 text-red-200"}`}>
                      {mtnFeedback === "correct" ? `✅ صَحِيحٌ! ${mtnWords[mtnIdx].reason}` : `❌ الصَّوَابُ: ${mtnWords[mtnIdx].chair} — ${mtnWords[mtnIdx].reason}`}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {L3_CHAIRS.map(c => {
                    const isSel = mtnSelected === c.id;
                    const isRight = mtnFeedback ? c.id === mtnWords[mtnIdx].chair : null;
                    return (
                      <button key={c.id} onClick={() => mtnAnswer(c.id)} disabled={!!mtnFeedback}
                        className="py-4 rounded-2xl font-bold text-2xl transition-all active:scale-95 disabled:opacity-90"
                        style={{
                          background: mtnFeedback ? (isRight ? "#059669" : isSel ? "#dc2626" : c.bg) : (isSel ? c.color : c.bg),
                          color: mtnFeedback ? (isRight || isSel ? "#ffffff" : c.color) : (isSel ? "#ffffff" : c.color),
                          fontFamily: "'Amiri', serif"
                        }}>
                        {c.id}
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {L3_CHAIRS.map(c => (
                    <p key={c.id} className="text-center text-xs text-gray-400">{c.label.split(" ")[0]}</p>
                  ))}
                </div>
                {mtnFeedback === "wrong" && <ContinueButton onClick={advanceMtn} color={accent} />}
              </>
            ) : (
              <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-6 text-center text-gray-800">
                <div className="text-5xl mb-3">{mtnScore >= 6 ? "🏔️" : "⛰️"}</div>
                <h3 className="text-xl font-bold mb-2">{mtnScore >= 6 ? "وَصَلْتَ الْقِمَّةَ!" : "حَاوِلْ مَرَّةً أُخْرَى"}</h3>
                <p className="text-amber-700 mb-5">أَصَبْتَ {mtnScore} مِنْ {mtnWords.length}</p>
                {mtnScore >= 6
                  ? <button onClick={() => setPhase(3)} className="w-full py-3 rounded-2xl text-white font-bold" style={{ background: accent }}>التَّالِي → 🔤</button>
                  : <button onClick={() => { setMtnIdx(0); setMtnScore(0); setMtnDone(false); }} className="w-full py-3 rounded-2xl text-gray-700 font-bold bg-gray-100">إِعَادَةٌ 🔄</button>
                }
              </div>
            )}
          </div>
        )}

        {phase === 3 && (
          <div>
            <PhaseHeader phase={4} total={5} title="الْمَرْحَلَةُ ٢ — اخْتَرِ الصَّحِيحَ 🔤" color={accent} />
            {!crossDone ? (
              <>
                <div className="w-full h-2 bg-white shadow-sm border border-gray-100 rounded-full mb-3">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${(crossIdx/crossSource3.length)*100}%`, background: accent }} />
                </div>
                <p className="text-gray-400 text-xs text-center mb-4">{crossIdx+1} / {crossSource3.length}</p>
                <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-5 text-center mb-4">
                  <p className="text-amber-700 text-sm mb-2">🔍 مَا هَذِهِ الْكَلِمَةُ؟</p>
                  <p className="text-gray-800 font-bold text-base">{crossSource3[crossIdx]?.clue}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {crossOpts.map(opt => {
                    const isCorrect = opt === crossSource3[crossIdx]?.answer;
                    const isSelected = opt === crossSelected;
                    let bg = "#fdf6ec";
                    let textColor = "#374151";
                    if (crossSelected) { bg = isCorrect ? "#059669" : isSelected ? "#dc2626" : "#fdf6ec"; textColor = (isCorrect || isSelected) ? "#ffffff" : "#374151"; }
                    return (
                      <button key={opt} onClick={() => crossAnswer(opt)} disabled={!!crossSelected}
                        className="py-4 rounded-2xl font-bold text-xl transition-all active:scale-95 disabled:opacity-90"
                        style={{ background: bg, color: textColor, fontFamily: "'Amiri', serif" }}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {crossSelected && crossSelected !== crossSource3[crossIdx]?.answer && (
                  <ContinueButton onClick={advanceCross} color={accent} />
                )}
              </>
            ) : (
              <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-6 text-center text-gray-800">
                <div className="text-5xl mb-3">🔤</div>
                <p className="text-amber-700 mb-5">أَصَبْتَ {crossScore} مِنْ {crossSource3.length}</p>
                <button onClick={() => setPhase(4)} className="w-full py-3 rounded-2xl text-white font-bold" style={{ background: accent }}>التَّالِي → 🏆</button>
              </div>
            )}
          </div>
        )}

        {phase === 4 && (
          <div>
            <PhaseHeader phase={5} total={5} title="الْمَرْحَلَةُ ٣ — تَحَدِّي الْكُرْسِيِّ! 🏆" color={accent} />
            {!chairDone ? (
              <>
                <div className="w-full h-2 bg-white shadow-sm border border-gray-100 rounded-full mb-3">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${(chairIdx/chairQuiz.length)*100}%`, background: "#f5c842" }} />
                </div>
                <p className="text-gray-400 text-xs text-center mb-4">{chairIdx+1} / {chairQuiz.length}</p>
                <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-5 text-center mb-4">
                  <p className="text-gray-800 text-base font-bold">{chairQuiz[chairIdx].question}</p>
                  {chairFeedback && (
                    <div className={`mt-3 text-sm font-bold rounded-xl px-4 py-2 ${chairFeedback === "correct" ? "bg-green-500/30 text-green-200" : "bg-red-500/30 text-red-200"}`}>
                      {chairFeedback === "correct" ? `✅ ${chairQuiz[chairIdx].reason}` : `❌ الصَّوَابُ: ${chairQuiz[chairIdx].answer} — ${chairQuiz[chairIdx].reason}`}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {L3_CHAIRS.map(c => {
                    const isSel = chairSelected === c.id;
                    const isRight = chairFeedback ? c.id === chairQuiz[chairIdx].answer : null;
                    return (
                      <button key={c.id} onClick={() => chairAnswer(c.id)} disabled={!!chairFeedback}
                        className="py-4 rounded-2xl font-bold text-2xl transition-all active:scale-95 disabled:opacity-90"
                        style={{
                          background: chairFeedback ? (isRight ? "#059669" : isSel ? "#dc2626" : c.bg) : (isSel ? c.color : c.bg),
                          color: chairFeedback ? (isRight || isSel ? "#ffffff" : c.color) : (isSel ? "#ffffff" : c.color),
                          fontFamily: "'Amiri', serif"
                        }}>
                        {c.id}
                      </button>
                    );
                  })}
                </div>
                {chairFeedback === "wrong" && <ContinueButton onClick={advanceChair} color="#f5c842" />}
              </>
            ) : (
              <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-6 text-center text-gray-800">
                <div className="text-6xl mb-3">🏆</div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: "#b45309" }}>الْمُسْتَكْشِفُ اللُّغَوِيُّ الْكَبِيرُ!</h3>
                <p className="text-amber-700 mb-2">أَصَبْتَ {chairScore} مِنْ {chairQuiz.length}</p>
                <p className="text-gray-500 text-sm mb-5">أَتْقَنْتَ الْهَمْزَةَ الْمُتَطَرِّفَةَ بِجَمِيعِ حَالَاتِهَا! 🎉</p>
                <button onClick={onBack} className="w-full py-3 rounded-2xl text-white font-bold" style={{ background: accent }}>الْعَوْدَةُ إِلَى الدُّرُوسِ</button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN — قائمة الدروس
   ══════════════════════════════════════════════════════ */
export default function WritingGames() {
  const [, setLocation] = useLocation();
  const [activeLesson, setActiveLesson] = useState<"menu"|"l1"|"l2"|"l3">("menu");

  useEffect(() => { return () => stopAll(); }, []);

  const [apiData, setApiData] = useState<any>(null);

  useEffect(() => {
    const API = (import.meta as any).env?.VITE_API_URL || "https://sawti-0k3n.onrender.com/api";
    fetch(`${API}/lessons/hamza-games`).then(r => r.ok ? r.json() : null).then(d => { if (d) setApiData(d); }).catch(() => {});
  }, []);

  if (activeLesson === "l1") return <Lesson1 onBack={() => setActiveLesson("menu")} apiData={apiData} />;
  if (activeLesson === "l2") return <Lesson2 onBack={() => setActiveLesson("menu")} apiData={apiData} />;
  if (activeLesson === "l3") return <Lesson3 onBack={() => setActiveLesson("menu")} apiData={apiData} />;

  const lessons = [
    { id: "l1", num: "١", title: "الْهَمْزَةُ الْمُتَوَسِّطَةُ عَلَى نَبْرَةٍ", sub: "الْيَاءُ — قَاعِدَةُ الْكَسْرَةِ", icon: "🔓", color: "#059669", bg: "linear-gradient(135deg,#064e3b,#059669)", phases: ["🎯 أَهْدَاف","🎬 تَمْهِيد","🔓 فَرْزُ الْبَوَّابَةِ","🔤 اخْتَرِ الصَّحِيحَ","🏆 صَنْدُوقُ الْكَنْزِ"] },
    { id: "l2", num: "٢", title: "الْهَمْزَةُ الْمُتَوَسِّطَةُ عَلَى السَّطْرِ", sub: "بَعْدَ حُرُوفِ الْمَدِّ السَّاكِنَةِ", icon: "🌊", color: "#1d4ed8", bg: "linear-gradient(135deg,#1e3a8a,#1d4ed8)", phases: ["🎯 أَهْدَاف","🎬 تَمْهِيد","🌊 عُبُورُ النَّهَرِ","🔤 اخْتَرِ الصَّحِيحَ","🏆 أَكْمِلِ الْجُمْلَةَ"] },
    { id: "l3", num: "٣", title: "الْهَمْزَةُ الْمُتَطَرِّفَةُ", sub: "أَلِف — وَاو — يَاء — السَّطْر", icon: "🏔️", color: "#b45309", bg: "linear-gradient(135deg,#78350f,#b45309)", phases: ["🎯 أَهْدَاف","🎬 الْحِرْبَاءُ","🏔️ تَسَلُّقُ الْجَبَلِ","🔤 اخْتَرِ الصَّحِيحَ","🏆 تَحَدِّي الْكُرْسِيِّ"] },
  ];

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "#f5f0e8", minHeight: "100vh" }}>
      {/* Header */}
      <div className="p-4" style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)" }}>
        <button onClick={() => setLocation("/skills/writing")} className="text-purple-300 text-sm mb-3">← مَهَارَةُ الْكِتَابَةِ</button>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <h1 className="text-2xl font-bold text-white">أَلْعَابُ الْهَمْزَةِ</h1>
            <p className="text-purple-300 text-sm">٣ دُرُوسٌ × ٥ مَرَاحِلَ</p>
          </div>
          <span className="text-3xl">🎮</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
        <button onClick={() => setLocation("/writing-games/treasure-map")}
          className="w-full rounded-3xl overflow-hidden text-right transition-all active:scale-98 hover:scale-101 shadow-xl relative"
          style={{ background: "linear-gradient(135deg,#78350f,#d97706)" }}>
          <div className="p-5 flex items-center gap-4">
            <span className="text-5xl">🗺️</span>
            <div>
              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-white/25 text-white mb-1">✨ تَجْرِبَةٌ جَدِيدَةٌ</span>
              <h2 className="text-white font-bold text-lg leading-snug">رِحْلَةُ الْمُسْتَكْشِفِ التَّفَاعُلِيَّةُ</h2>
              <p className="text-white/70 text-sm mt-1">الْهَمْزَةُ عَلَى نَبْرَةٍ — مَسَارٌ عَبْرَ خَرِيطَةِ كَنْزٍ</p>
            </div>
          </div>
        </button>

        <button onClick={() => setLocation("/writing-games/diver-pearl")}
          className="w-full rounded-3xl overflow-hidden text-right transition-all active:scale-98 hover:scale-101 shadow-xl relative"
          style={{ background: "linear-gradient(135deg,#0c4a6e,#0891b2)" }}>
          <div className="p-5 flex items-center gap-4">
            <span className="text-5xl">🤿</span>
            <div>
              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-white/25 text-white mb-1">✨ تَجْرِبَةٌ جَدِيدَةٌ</span>
              <h2 className="text-white font-bold text-lg leading-snug">الْغَوَّاصُ وَصَائِدُ اللَّآلِئِ</h2>
              <p className="text-white/70 text-sm mt-1">الْهَمْزَةُ عَلَى السَّطْرِ — رِحْلَةٌ فِي أَعْمَاقِ الْبَحْرِ</p>
            </div>
          </div>
        </button>

        <button onClick={() => setLocation("/writing-games/balloon")}
          className="w-full rounded-3xl overflow-hidden text-right transition-all active:scale-98 hover:scale-101 shadow-xl relative"
          style={{ background: "linear-gradient(135deg,#1e3a8a,#3b82f6)" }}>
          <div className="p-5 flex items-center gap-4">
            <span className="text-5xl">🎈</span>
            <div>
              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-white/25 text-white mb-1">✨ تَجْرِبَةٌ جَدِيدَةٌ</span>
              <h2 className="text-white font-bold text-lg leading-snug">قَائِدُ الْمِنْطَادِ وَجَزِيرَةُ الْكَنْزِ</h2>
              <p className="text-white/70 text-sm mt-1">الْهَمْزَةُ الْمُتَطَرِّفَةُ — رِحْلَةٌ فِي السَّمَاءِ</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
