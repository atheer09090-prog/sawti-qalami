import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { playEffect, stopAll, audioFile } from "@/lib/audio";
import { getGames } from "@/lib/api";

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
    <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl bg-white/10">
      <div className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className="w-2 h-2 rounded-full transition-all"
            style={{ background: i < phase ? color : "rgba(255,255,255,0.3)" }} />
        ))}
      </div>
      <p className="text-white text-sm font-bold">{title}</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   LESSON 1 — الهمزة المتوسطة على نبرة (ياء)
   ══════════════════════════════════════════════════════ */

const L1_GATE_WORDS = [
  { word: "بِئْرٌ",     isNabra: true,  reason: "ما قبلها كسرة (بِ)" },
  { word: "ذِئْبٌ",     isNabra: true,  reason: "ما قبلها كسرة (ذِ)" },
  { word: "سُئِلَ",     isNabra: true,  reason: "ما بعدها كسرة (إِ)" },
  { word: "فِئَةٌ",     isNabra: true,  reason: "ما قبلها كسرة (فِ)" },
  { word: "مُطمَئِنٌّ", isNabra: true,  reason: "ما بعدها كسرة (إِ)" },
  { word: "مِئذَنَةٌ",  isNabra: true,  reason: "ما بعدها كسرة (إِ)" },
  { word: "سَأَلَ",     isNabra: false, reason: "ما قبلها فتحة → على ألف" },
  { word: "يَسْأَلُ",   isNabra: false, reason: "ساكن قبلها → على ألف" },
  { word: "رَأْسٌ",     isNabra: false, reason: "ما قبلها فتحة → على ألف" },
  { word: "مَسَاءٌ",    isNabra: false, reason: "بعد ألف مد → على السطر" },
];

const L1_CROSSWORD = [
  { clue: "مصدر الماء في الصحراء", answer: "بئر",    opts: ["بأر","بئر","بير","بءر"] },
  { clue: "مجموعة من الناس",        answer: "فئة",    opts: ["فأة","فاة","فئة","فءة"] },
  { clue: "طُرح عليه سؤال",         answer: "سئل",    opts: ["سأل","سئل","سال","سءل"] },
  { clue: "حيوان مفترس كالكلب",     answer: "ذئب",    opts: ["ذأب","ذيب","ذئب","ذاب"] },
  { clue: "البرج الذي يُؤذَّن منه", answer: "مئذنة",  opts: ["مأذنة","مئذنة","ميذنة","ماذنة"] },
  { clue: "النفس الهادئة المطمئنة",  answer: "مطمئن",  opts: ["مطمأن","مطمين","مطمئن","مطمان"] },
];

const L1_FIX = [
  { wrong: "بِءْر",    correct: "بِئْر",    rule: "ما قبلها كسرة → نبرة" },
  { wrong: "فِأَة",    correct: "فِئَة",    rule: "ما قبلها كسرة → نبرة" },
  { wrong: "سُءِل",    correct: "سُئِل",   rule: "ما بعدها كسرة → نبرة" },
  { wrong: "ذِءب",     correct: "ذِئب",    rule: "ما قبلها كسرة → نبرة" },
  { wrong: "مُطمَءِن", correct: "مُطمَئِن",rule: "ما بعدها كسرة → نبرة" },
];

function Lesson1({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState(0); // 0=goals 1=intro 2=gate 3=cross 4=treasure
  const [confetti, setConfetti] = useState(0);

  // phase 2 — gate sort
  const [gateWords] = useState(() => [...L1_GATE_WORDS].sort(() => Math.random() - 0.5));
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

  function gateAnswer(val: boolean) {
    if (gateFeedback) return;
    const right = val === gateWords[gateIdx].isNabra;
    setGateFeedback(right ? "correct" : "wrong");
    if (right) { setGateScore(s => s+1); setConfetti(c => c+1); playEffect(audioFile("/assets/correct.mp3"), 0.7); }
    else playEffect(audioFile("/assets/tryagain.mp3"), 0.6);
    setTimeout(() => {
      setGateFeedback(null);
      if (gateIdx < gateWords.length - 1) setGateIdx(i => i+1);
      else setGateDone(true);
    }, right ? 1200 : 2800);
  }

  function crossAnswer(opt: string) {
    if (crossSelected) return;
    setCrossSelected(opt);
    const right = opt === L1_CROSSWORD[crossIdx].answer;
    if (right) { setCrossScore(s => s+1); setConfetti(c => c+1); playEffect(audioFile("/assets/correct.mp3"), 0.7); }
    else playEffect(audioFile("/assets/tryagain.mp3"), 0.6);
    setTimeout(() => {
      setCrossSelected(null);
      if (crossIdx < L1_CROSSWORD.length - 1) setCrossIdx(i => i+1);
      else setCrossDone(true);
    }, right ? 1300 : 2800);
  }

  function fixAnswer(opt: string) {
    if (fixFeedback) return;
    setFixSelected(opt);
    const right = opt === L1_FIX[fixIdx].correct;
    setFixFeedback(right ? "correct" : "wrong");
    if (right) { setFixScore(s => s+1); setConfetti(c => c+1); playEffect(audioFile("/assets/correct.mp3"), 0.7); }
    else playEffect(audioFile("/assets/tryagain.mp3"), 0.6);
    setTimeout(() => {
      setFixFeedback(null); setFixSelected(null);
      if (fixIdx < L1_FIX.length - 1) setFixIdx(i => i+1);
      else setFixDone(true);
    }, right ? 1300 : 2800);
  }

  const bg = "linear-gradient(180deg,#0a1628,#064e3b)";
  const accent = "#059669";

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: bg, minHeight: "100vh" }}>
      <Confetti trigger={confetti} />
      <div className="p-4" style={{ background: "linear-gradient(135deg,#064e3b,#065f46)" }}>
        <button onClick={onBack} className="text-emerald-300 text-sm mb-2">← قَائِمَةُ الدُّرُوسِ</button>
        <div className="flex justify-between items-center">
          <span className="text-xs px-3 py-1 rounded-full text-white font-bold" style={{ background: accent }}>الدَّرْسُ الأَوَّلُ</span>
          <h1 className="text-xl font-bold text-white text-right">الْهَمْزَةُ عَلَى نَبْرَةٍ (يَاءٍ)</h1>
        </div>
        {/* Progress bar */}
        <div className="flex gap-1 mt-3">
          {["🎯","🎬","🔓","🔤","🏆"].map((icon, i) => (
            <div key={i} onClick={() => i < phase && setPhase(i)}
              className="flex-1 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
              style={{ background: i === phase ? accent : i < phase ? "#047857" : "rgba(255,255,255,0.1)", cursor: i < phase ? "pointer" : "default" }}>
              {icon}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5">

        {/* ── المرحلة ٠: الأهداف ── */}
        {phase === 0 && (
          <div className="space-y-4">
            <div className="bg-white/10 rounded-3xl p-5 text-right text-white">
              <h2 className="text-xl font-bold mb-4" style={{ color: "#f5c842" }}>🎯 مَاذَا سَتَتَعَلَّمُ؟</h2>
              {[
                "تَعْرِفُ مَتَى تُكْتَبُ الْهَمْزَةُ عَلَى نَبْرَةٍ (ياء)",
                "تُعَلِّلُ سَبَبَ كِتَابَتِهَا بِمُقَارَنَةِ الْحَرَكَاتِ",
                "تَكْتُبُ كَلِمَاتٍ بِهَمْزَةٍ عَلَى نَبْرَةٍ بِشَكْلٍ صَحِيحٍ",
              ].map((g, i) => (
                <div key={i} className="flex items-start gap-3 mb-3 p-3 rounded-xl bg-white/10">
                  <span className="text-xl">{["١️⃣","٢️⃣","٣️⃣"][i]}</span>
                  <p className="text-sm leading-relaxed">{g}</p>
                </div>
              ))}
            </div>
            <div className="bg-white/5 rounded-2xl p-4 text-right text-white/60 text-sm">
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
            <div className="bg-white/10 rounded-3xl p-5 text-right text-white">
              <div className="text-center text-4xl mb-4">⚔️</div>
              <h3 className="font-bold text-lg mb-3" style={{ color: "#f5c842" }}>مَعْرَكَةُ الْحَرَكَاتِ!</h3>
              <p className="text-sm leading-loose mb-4">
                فِي مَمْلَكَةِ الْكَلِمَاتِ، نَشَبَتْ مَعْرَكَةٌ بَيْنَ الْحَرَكَاتِ الثَّلَاثِ:
              </p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { h: "الْفَتْحَةُ", icon: "🟡", power: "ضَعِيفَةٌ" },
                  { h: "الضَّمَّةُ", icon: "🟠", power: "مُتَوَسِّطَةٌ" },
                  { h: "الْكَسْرَةُ", icon: "🔵", power: "الأَقْوَى! 👑" },
                ].map((h, i) => (
                  <div key={i} className="bg-white/10 rounded-xl p-3 text-center">
                    <div className="text-2xl mb-1">{h.icon}</div>
                    <p className="text-xs font-bold text-white">{h.h}</p>
                    <p className="text-xs" style={{ color: i === 2 ? "#f5c842" : "rgba(255,255,255,0.6)" }}>{h.power}</p>
                  </div>
                ))}
              </div>
              <div className="bg-yellow-500/20 rounded-xl p-3 text-center">
                <p className="text-sm font-bold" style={{ color: "#f5c842" }}>
                  📌 الْقَاعِدَةُ الذَّهَبِيَّةُ: إِذَا وُجِدَتِ الْكَسْرَةُ (قَبْلَ الْهَمْزَةِ أَوْ بَعْدَهَا) → الْهَمْزَةُ عَلَى نَبْرَةٍ ئ
                </p>
              </div>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 text-right text-white">
              <p className="text-sm font-bold mb-3" style={{ color: "#86efac" }}>مثال تفاعلي:</p>
              <p className="text-lg font-bold text-center mb-2" style={{ fontFamily: "'Amiri', serif" }}>سُ + ئ + ل = سُئِلَ</p>
              <p className="text-xs text-center text-white/70">الكسرة بعد الهمزة → تكتب على نبرة ✅</p>
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
                <div className="w-full h-2 bg-white/20 rounded-full mb-3">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${(gateIdx/gateWords.length)*100}%`, background: accent }} />
                </div>
                <p className="text-white/60 text-xs text-center mb-4">{gateIdx+1} / {gateWords.length}</p>
                <div className="bg-white/10 rounded-3xl p-6 text-center mb-5">
                  <p className="text-white/70 text-sm mb-3">هَلِ الْهَمْزَةُ مَكْتُوبَةٌ عَلَى نَبْرَةٍ صَحِيحَةً؟</p>
                  <p className="text-5xl font-bold text-white mb-4" style={{ fontFamily: "'Amiri', serif" }}>{gateWords[gateIdx].word}</p>
                  {gateFeedback && (
                    <div className={`text-sm font-bold rounded-xl px-4 py-2 ${gateFeedback === "correct" ? "bg-green-500/30 text-green-200" : "bg-red-500/30 text-red-200"}`}>
                      {gateFeedback === "correct" ? "✅ صَحِيحٌ!" : `❌ ${gateWords[gateIdx].reason}`}
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <button onClick={() => gateAnswer(false)}
                    className="flex-1 py-4 rounded-2xl text-white font-bold text-xl active:scale-95"
                    style={{ background: "linear-gradient(135deg,#dc2626,#b91c1c)" }}>❌ لَا</button>
                  <button onClick={() => gateAnswer(true)}
                    className="flex-1 py-4 rounded-2xl text-white font-bold text-xl active:scale-95"
                    style={{ background: `linear-gradient(135deg,${accent},#047857)` }}>✅ نَعَمْ</button>
                </div>
              </>
            ) : (
              <div className="bg-white/10 rounded-3xl p-6 text-center text-white">
                <div className="text-5xl mb-3">{gateScore >= 7 ? "🔓" : "🔒"}</div>
                <h3 className="text-xl font-bold mb-2">{gateScore >= 7 ? "فُتِحَتِ الْبَوَّابَةُ!" : "حَاوِلْ مَرَّةً أُخْرَى"}</h3>
                <p className="text-emerald-300 mb-5">أَصَبْتَ {gateScore} مِنْ {gateWords.length}</p>
                {gateScore >= 7
                  ? <button onClick={() => setPhase(3)} className="w-full py-3 rounded-2xl text-white font-bold" style={{ background: accent }}>التَّالِي → 🔤</button>
                  : <button onClick={() => { setGateIdx(0); setGateScore(0); setGateDone(false); }} className="w-full py-3 rounded-2xl text-white font-bold bg-white/20">إِعَادَةٌ 🔄</button>
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
                <div className="w-full h-2 bg-white/20 rounded-full mb-3">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${(crossIdx/L1_CROSSWORD.length)*100}%`, background: accent }} />
                </div>
                <p className="text-white/60 text-xs text-center mb-4">{crossIdx+1} / {L1_CROSSWORD.length}</p>
                <div className="bg-white/10 rounded-3xl p-5 text-center mb-4">
                  <p className="text-emerald-300 text-sm mb-2">🔍 مَا هَذِهِ الْكَلِمَةُ؟</p>
                  <p className="text-white font-bold text-base">{L1_CROSSWORD[crossIdx].clue}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {L1_CROSSWORD[crossIdx].opts.map(opt => {
                    const isCorrect = opt === L1_CROSSWORD[crossIdx].answer;
                    const isSelected = opt === crossSelected;
                    let bg = "rgba(255,255,255,0.15)";
                    if (crossSelected) bg = isCorrect ? "#059669" : isSelected ? "#dc2626" : "rgba(255,255,255,0.1)";
                    return (
                      <button key={opt} onClick={() => crossAnswer(opt)}
                        className="py-4 rounded-2xl text-white font-bold text-xl transition-all active:scale-95"
                        style={{ background: bg, fontFamily: "'Amiri', serif", border: isSelected ? "2px solid white" : "2px solid transparent" }}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="bg-white/10 rounded-3xl p-6 text-center text-white">
                <div className="text-5xl mb-3">🔤</div>
                <h3 className="text-xl font-bold mb-2">أَكْمَلْتَ الْمُتَقَاطِعَةَ!</h3>
                <p className="text-emerald-300 mb-5">أَصَبْتَ {crossScore} مِنْ {L1_CROSSWORD.length}</p>
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
                <div className="w-full h-2 bg-white/20 rounded-full mb-3">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${(fixIdx/L1_FIX.length)*100}%`, background: "#f5c842" }} />
                </div>
                <p className="text-white/60 text-xs text-center mb-4">{fixIdx+1} / {L1_FIX.length}</p>
                <div className="bg-white/10 rounded-3xl p-5 text-center mb-4">
                  <p className="text-white/70 text-sm mb-2">🔑 اخْتَرِ الْكِتَابَةَ الصَّحِيحَةَ لِفَتْحِ الْكَنْزِ</p>
                  <p className="text-3xl line-through text-red-400 font-bold mb-1" style={{ fontFamily: "'Amiri', serif" }}>{L1_FIX[fixIdx].wrong}</p>
                  <p className="text-xs text-amber-300">💡 {L1_FIX[fixIdx].rule}</p>
                  {fixFeedback && (
                    <div className={`mt-3 text-sm font-bold rounded-xl px-4 py-2 ${fixFeedback === "correct" ? "bg-green-500/30 text-green-200" : "bg-red-500/30 text-red-200"}`}>
                      {fixFeedback === "correct" ? "✅ مِفْتَاحٌ صَحِيحٌ!" : `❌ الصَّوَابُ: ${L1_FIX[fixIdx].correct}`}
                    </div>
                  )}
                </div>
                {/* Options: scramble correct + wrong variants */}
                <div className="grid grid-cols-2 gap-3">
                  {[L1_FIX[fixIdx].correct,
                    L1_FIX[fixIdx].wrong,
                    L1_FIX[fixIdx].correct.replace("ئ","أ"),
                    L1_FIX[fixIdx].correct.replace("ئ","ء"),
                  ].filter((v,i,a) => a.indexOf(v) === i).slice(0,4)
                  .sort(() => Math.random() - 0.5)
                  .map(opt => {
                    const isCorrect = opt === L1_FIX[fixIdx].correct;
                    const isSelected = opt === fixSelected;
                    let bg = "rgba(255,255,255,0.15)";
                    if (fixFeedback) bg = isCorrect ? "#059669" : isSelected ? "#dc2626" : "rgba(255,255,255,0.1)";
                    return (
                      <button key={opt} onClick={() => fixAnswer(opt)}
                        className="py-4 rounded-2xl text-white font-bold text-xl transition-all active:scale-95"
                        style={{ background: bg, fontFamily: "'Amiri', serif" }}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="bg-white/10 rounded-3xl p-6 text-center text-white">
                <div className="text-6xl mb-3">🏆</div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: "#f5c842" }}>فَتَحْتَ صَنْدُوقَ الْكَنْزِ!</h3>
                <p className="text-emerald-300 mb-2">أَصَبْتَ {fixScore} مِنْ {L1_FIX.length}</p>
                <p className="text-white/70 text-sm mb-5">أَتْقَنْتَ الْهَمْزَةَ الْمُتَوَسِّطَةَ عَلَى نَبْرَةٍ! 🎉</p>
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

const L2_RIVER_WORDS = [
  { word: "قِرَاءَةٌ", isSatr: true,  reason: "بعد ألف مد" },
  { word: "مُرُوءَةٌ", isSatr: true,  reason: "بعد واو مد" },
  { word: "عَبَاءَةٌ", isSatr: true,  reason: "بعد ألف مد" },
  { word: "تَسَاءَلَ", isSatr: true,  reason: "بعد ألف مد" },
  { word: "هُدُوءٌ",   isSatr: true,  reason: "بعد واو مد" },
  { word: "مَسَاءٌ",   isSatr: true,  reason: "بعد ألف مد" },
  { word: "سَأَلَ",    isSatr: false, reason: "ما قبلها فتحة → على ألف" },
  { word: "بِئْرٌ",    isSatr: false, reason: "ما قبلها كسرة → على نبرة" },
  { word: "يَسْأَلُ",  isSatr: false, reason: "ساكن قبلها → على ألف" },
  { word: "رَأْسٌ",    isSatr: false, reason: "ما قبلها فتحة → على ألف" },
];

const L2_CROSSWORD = [
  { clue: "آخر النهار",                   answer: "مساء",   opts: ["مسأء","مساء","مسيء","مساء"] },
  { clue: "ثوب المرأة الواسع",             answer: "عباءة",  opts: ["عباأة","عبائة","عباءة","عبآة"] },
  { clue: "صفة الكريم النبيل",             answer: "مروءة",  opts: ["مروأة","مروئة","مروءة","مروةء"] },
  { clue: "فعل التساؤل والاستفهام",        answer: "تساءل",  opts: ["تسائل","تساأل","تساءل","تسؤال"] },
  { clue: "فعل النظر في الكتاب",           answer: "قراءة",  opts: ["قراأة","قرائة","قراءة","قرآة"] },
  { clue: "السكون والهدوء",                 answer: "هدوء",   opts: ["هدوأ","هدوئ","هدوء","هديء"] },
];

const L2_FILL = [
  { sentence: "جَلَسْتُ فِي ___ تَامَّةٍ أَمَامَ مَكْتَبَتِي", answer: "هُدُوءٍ", opts: ["هُدُوءٍ","هُدُوئٍ","هُدُوأٍ","هُدُؤٍ"] },
  { sentence: "بَدَأْتُ ___ كِتَابِي الْمُفَضَّلِ", answer: "قِرَاءَةَ", opts: ["قِرَاءَةَ","قِرَاأَةَ","قِرَائَةَ","قِرَآةَ"] },
  { sentence: "أَرْتَدِي ___ فِي الْمُنَاسَبَاتِ", answer: "عَبَاءَةً", opts: ["عَبَاأَةً","عَبَائَةً","عَبَاءَةً","عَبَآةً"] },
  { sentence: "غَرَبَتِ الشَّمْسُ وَحَلَّ الْ___", answer: "مَسَاءُ", opts: ["مَسَأُ","مَسَاءُ","مَسَائُ","مَسَؤُ"] },
];

function Lesson2({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState(0);
  const [confetti, setConfetti] = useState(0);

  const [riverWords] = useState(() => [...L2_RIVER_WORDS].sort(() => Math.random() - 0.5));
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

  function riverAnswer(val: boolean) {
    if (riverFeedback) return;
    const right = val === riverWords[riverIdx].isSatr;
    setRiverFeedback(right ? "correct" : "wrong");
    if (right) { setRiverScore(s => s+1); setConfetti(c => c+1); playEffect(audioFile("/assets/correct.mp3"), 0.7); }
    else playEffect(audioFile("/assets/tryagain.mp3"), 0.6);
    setTimeout(() => {
      setRiverFeedback(null);
      if (riverIdx < riverWords.length - 1) setRiverIdx(i => i+1);
      else setRiverDone(true);
    }, 1200);
  }

  function crossAnswer(opt: string) {
    if (crossSelected) return;
    setCrossSelected(opt);
    const right = opt === L2_CROSSWORD[crossIdx].answer;
    if (right) { setCrossScore(s => s+1); setConfetti(c => c+1); playEffect(audioFile("/assets/correct.mp3"), 0.7); }
    else playEffect(audioFile("/assets/tryagain.mp3"), 0.6);
    setTimeout(() => {
      setCrossSelected(null);
      if (crossIdx < L2_CROSSWORD.length - 1) setCrossIdx(i => i+1);
      else setCrossDone(true);
    }, 1300);
  }

  function fillAnswer(opt: string) {
    if (fillFeedback) return;
    setFillSelected(opt);
    const right = opt === L2_FILL[fillIdx].answer;
    setFillFeedback(right ? "correct" : "wrong");
    if (right) { setFillScore(s => s+1); setConfetti(c => c+1); playEffect(audioFile("/assets/correct.mp3"), 0.7); }
    else playEffect(audioFile("/assets/tryagain.mp3"), 0.6);
    setTimeout(() => {
      setFillFeedback(null); setFillSelected(null);
      if (fillIdx < L2_FILL.length - 1) setFillIdx(i => i+1);
      else setFillDone(true);
    }, 1300);
  }

  const bg = "linear-gradient(180deg,#0c1840,#1e3a8a)";
  const accent = "#1d4ed8";

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: bg, minHeight: "100vh" }}>
      <Confetti trigger={confetti} />
      <div className="p-4" style={{ background: "linear-gradient(135deg,#1e3a8a,#1d4ed8)" }}>
        <button onClick={onBack} className="text-blue-300 text-sm mb-2">← قَائِمَةُ الدُّرُوسِ</button>
        <div className="flex justify-between items-center">
          <span className="text-xs px-3 py-1 rounded-full text-white font-bold bg-blue-600">الدَّرْسُ الثَّانِي</span>
          <h1 className="text-xl font-bold text-white text-right">الْهَمْزَةُ عَلَى السَّطْرِ</h1>
        </div>
        <div className="flex gap-1 mt-3">
          {["🎯","🎬","🌊","🔤","🏆"].map((icon, i) => (
            <div key={i} onClick={() => i < phase && setPhase(i)}
              className="flex-1 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
              style={{ background: i === phase ? accent : i < phase ? "#1e40af" : "rgba(255,255,255,0.1)", cursor: i < phase ? "pointer" : "default" }}>
              {icon}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5">

        {phase === 0 && (
          <div className="space-y-4">
            <div className="bg-white/10 rounded-3xl p-5 text-right text-white">
              <h2 className="text-xl font-bold mb-4" style={{ color: "#93c5fd" }}>🎯 مَاذَا سَتَتَعَلَّمُ؟</h2>
              {[
                "تَسْتَنْتِجُ مَتَى تُكْتَبُ الْهَمْزَةُ الْمُتَوَسِّطَةُ عَلَى السَّطْرِ",
                "تُوَضِّحُ سَبَبَ كِتَابَتِهَا فِي كَلِمَاتٍ مُخْتَلِفَةٍ",
                "تُطَبِّقُ الْقَاعِدَةَ فِي جُمَلٍ جَدِيدَةٍ",
              ].map((g, i) => (
                <div key={i} className="flex items-start gap-3 mb-3 p-3 rounded-xl bg-white/10">
                  <span className="text-xl">{["١️⃣","٢️⃣","٣️⃣"][i]}</span>
                  <p className="text-sm leading-relaxed">{g}</p>
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
            <div className="bg-white/10 rounded-3xl p-5 text-right text-white">
              <div className="text-center text-4xl mb-4">🔍</div>
              <h3 className="font-bold text-lg mb-3" style={{ color: "#93c5fd" }}>الْمُحَقِّقُ وَالْهَمْزَةُ الْهَارِبَةُ!</h3>
              <p className="text-sm leading-loose mb-3">اخْتَفَتِ الْهَمْزَةُ مِنْ كُرْسِيِّهَا! تَرَكَتْ رِسَالَةً:</p>
              <div className="bg-blue-900/50 rounded-xl p-3 text-center mb-4 italic">
                <p className="text-sm">"لَنْ أَجْلِسَ عَلَى أَيِّ كُرْسِيٍّ إِذَا كَانَ مَا قَبْلِي حَرْفَ مَدٍّ سَاكِنٌ (ألف أو واو)!"</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl mb-1">🔵</p>
                  <p className="text-xs font-bold">بَعْدَ أَلِفِ مَدٍّ</p>
                  <p className="text-xs text-white/60 mt-1">مَسَاءٌ ← مَسَا + ء</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl mb-1">🟠</p>
                  <p className="text-xs font-bold">بَعْدَ وَاوِ مَدٍّ</p>
                  <p className="text-xs text-white/60 mt-1">هُدُوءٌ ← هُدُو + ء</p>
                </div>
              </div>
              <div className="bg-yellow-500/20 rounded-xl p-3 text-center">
                <p className="text-sm font-bold" style={{ color: "#fde68a" }}>📌 بَعْدَ أَلِفٍ أَوْ وَاوٍ سَاكِنَةٍ → الْهَمْزَةُ عَلَى السَّطْرِ ء</p>
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
                <div className="w-full h-2 bg-white/20 rounded-full mb-3">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${(riverIdx/riverWords.length)*100}%`, background: accent }} />
                </div>
                <p className="text-white/60 text-xs text-center mb-4">{riverIdx+1} / {riverWords.length}</p>
                <div className="bg-white/10 rounded-3xl p-6 text-center mb-5">
                  <p className="text-white/70 text-sm mb-3">هَلِ الْهَمْزَةُ مَكْتُوبَةٌ عَلَى السَّطْرِ صَحِيحَةً؟</p>
                  <p className="text-5xl font-bold text-white mb-4" style={{ fontFamily: "'Amiri', serif" }}>{riverWords[riverIdx].word}</p>
                  {riverFeedback && (
                    <div className={`text-sm font-bold rounded-xl px-4 py-2 ${riverFeedback === "correct" ? "bg-green-500/30 text-green-200" : "bg-red-500/30 text-red-200"}`}>
                      {riverFeedback === "correct" ? "✅ حَجَرٌ صَحِيحٌ!" : `❌ ${riverWords[riverIdx].reason}`}
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <button onClick={() => riverAnswer(false)} className="flex-1 py-4 rounded-2xl text-white font-bold text-xl active:scale-95" style={{ background: "linear-gradient(135deg,#dc2626,#b91c1c)" }}>❌ لَا</button>
                  <button onClick={() => riverAnswer(true)} className="flex-1 py-4 rounded-2xl text-white font-bold text-xl active:scale-95" style={{ background: `linear-gradient(135deg,${accent},#1e40af)` }}>✅ نَعَمْ</button>
                </div>
              </>
            ) : (
              <div className="bg-white/10 rounded-3xl p-6 text-center text-white">
                <div className="text-5xl mb-3">{riverScore >= 7 ? "🌊" : "💧"}</div>
                <h3 className="text-xl font-bold mb-2">{riverScore >= 7 ? "عَبَرْتَ النَّهَرَ!" : "حَاوِلْ مَرَّةً أُخْرَى"}</h3>
                <p className="text-blue-300 mb-5">أَصَبْتَ {riverScore} مِنْ {riverWords.length}</p>
                {riverScore >= 7
                  ? <button onClick={() => setPhase(3)} className="w-full py-3 rounded-2xl text-white font-bold" style={{ background: accent }}>التَّالِي → 🔤</button>
                  : <button onClick={() => { setRiverIdx(0); setRiverScore(0); setRiverDone(false); }} className="w-full py-3 rounded-2xl text-white font-bold bg-white/20">إِعَادَةٌ 🔄</button>
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
                <div className="w-full h-2 bg-white/20 rounded-full mb-3">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${(crossIdx/L2_CROSSWORD.length)*100}%`, background: accent }} />
                </div>
                <p className="text-white/60 text-xs text-center mb-4">{crossIdx+1} / {L2_CROSSWORD.length}</p>
                <div className="bg-white/10 rounded-3xl p-5 text-center mb-4">
                  <p className="text-blue-300 text-sm mb-2">🔍 مَا هَذِهِ الْكَلِمَةُ؟</p>
                  <p className="text-white font-bold text-base">{L2_CROSSWORD[crossIdx].clue}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {L2_CROSSWORD[crossIdx].opts.filter((v,i,a) => a.indexOf(v) === i).map(opt => {
                    const isCorrect = opt === L2_CROSSWORD[crossIdx].answer;
                    const isSelected = opt === crossSelected;
                    let bg = "rgba(255,255,255,0.15)";
                    if (crossSelected) bg = isCorrect ? "#059669" : isSelected ? "#dc2626" : "rgba(255,255,255,0.1)";
                    return (
                      <button key={opt} onClick={() => crossAnswer(opt)}
                        className="py-4 rounded-2xl text-white font-bold text-xl transition-all active:scale-95"
                        style={{ background: bg, fontFamily: "'Amiri', serif" }}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="bg-white/10 rounded-3xl p-6 text-center text-white">
                <div className="text-5xl mb-3">🔤</div>
                <p className="text-blue-300 mb-5">أَصَبْتَ {crossScore} مِنْ {L2_CROSSWORD.length}</p>
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
                <div className="w-full h-2 bg-white/20 rounded-full mb-3">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${(fillIdx/L2_FILL.length)*100}%`, background: "#f5c842" }} />
                </div>
                <p className="text-white/60 text-xs text-center mb-4">{fillIdx+1} / {L2_FILL.length}</p>
                <div className="bg-white/10 rounded-3xl p-5 text-center mb-4">
                  <p className="text-white/70 text-sm mb-3">🔑 اخْتَرِ الْكَلِمَةَ الصَّحِيحَةَ لِإِكْمَالِ الْجُمْلَةِ</p>
                  <p className="text-white text-base leading-loose" style={{ fontFamily: "'Amiri', serif" }}>{L2_FILL[fillIdx].sentence}</p>
                  {fillFeedback && (
                    <div className={`mt-3 text-sm font-bold rounded-xl px-4 py-2 ${fillFeedback === "correct" ? "bg-green-500/30 text-green-200" : "bg-red-500/30 text-red-200"}`}>
                      {fillFeedback === "correct" ? "✅ صَحِيحٌ!" : `❌ الصَّوَابُ: ${L2_FILL[fillIdx].answer}`}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {L2_FILL[fillIdx].opts.map(opt => {
                    const isCorrect = opt === L2_FILL[fillIdx].answer;
                    const isSelected = opt === fillSelected;
                    let bg = "rgba(255,255,255,0.15)";
                    if (fillFeedback) bg = isCorrect ? "#059669" : isSelected ? "#dc2626" : "rgba(255,255,255,0.1)";
                    return (
                      <button key={opt} onClick={() => fillAnswer(opt)}
                        className="py-4 rounded-2xl text-white font-bold text-xl transition-all active:scale-95"
                        style={{ background: bg, fontFamily: "'Amiri', serif" }}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="bg-white/10 rounded-3xl p-6 text-center text-white">
                <div className="text-6xl mb-3">🏆</div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: "#fde68a" }}>مُمْتَازٌ!</h3>
                <p className="text-blue-300 mb-5">أَتْقَنْتَ الْهَمْزَةَ الْمُتَوَسِّطَةَ عَلَى السَّطْرِ! 🎉</p>
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

const L3_MOUNTAIN_WORDS = [
  { word: "مَلجَأَ",   chair: "أ",  reason: "ما قبلها مفتوح (جَ)",       color: "#059669" },
  { word: "قَرَأَ",    chair: "أ",  reason: "ما قبلها مفتوح (رَ)",       color: "#059669" },
  { word: "يَجرُؤُ",   chair: "ؤ",  reason: "ما قبلها مضموم (رُ)",       color: "#1d4ed8" },
  { word: "لُؤلُؤٌ",   chair: "ؤ",  reason: "ما قبلها مضموم (لُ)",       color: "#1d4ed8" },
  { word: "شاطِئٌ",    chair: "ئ",  reason: "ما قبلها مكسور (طِ)",       color: "#7c3aed" },
  { word: "مَنَاهِئُ", chair: "ئ",  reason: "ما قبلها مكسور (هِ)",       color: "#7c3aed" },
  { word: "شَيءٌ",     chair: "ء",  reason: "ما قبلها ياء ساكنة",        color: "#b45309" },
  { word: "هُدُوءٌ",   chair: "ء",  reason: "ما قبلها واو مد ساكنة",     color: "#b45309" },
];

const L3_CROSSWORD = [
  { clue: "حافة البحر حيث يلعب الناس",     answer: "شاطئ",  opts: ["شاطأ","شاطؤ","شاطئ","شاطء"] },
  { clue: "جوهرة بيضاء من البحر",           answer: "لؤلؤ",  opts: ["لألأ","لؤلؤ","لئلئ","لاءلاء"] },
  { clue: "مكان الأمان والحماية",            answer: "ملجأ",  opts: ["ملجاء","ملجؤ","ملجئ","ملجأ"] },
  { clue: "يتجرأ ولا يخاف (مضارع)",         answer: "يجرؤ",  opts: ["يجرأ","يجرء","يجرئ","يجرؤ"] },
  { clue: "فعل القراءة (ماضٍ)",              answer: "قرأ",   opts: ["قرء","قرؤ","قرئ","قرأ"] },
  { clue: "الشيء الواحد من الأشياء",         answer: "شيء",   opts: ["شيأ","شيؤ","شيئ","شيء"] },
  { clue: "الدفء وعكسه البرد",              answer: "دفء",   opts: ["دفأ","دفؤ","دفئ","دفء"] },
  { clue: "الهدوء والسكون",                  answer: "هدوء",  opts: ["هدوأ","هدوئ","هداء","هدوء"] },
];

const L3_CHAIRS = [
  { id: "أ", label: "مَفْتُوحٌ قَبْلَهَا", color: "#059669", bg: "#dcf5e7" },
  { id: "ؤ", label: "مَضْمُومٌ قَبْلَهَا", color: "#1d4ed8", bg: "#dbeafe" },
  { id: "ئ", label: "مَكْسُورٌ قَبْلَهَا", color: "#7c3aed", bg: "#f3e8ff" },
  { id: "ء", label: "سَاكِنٌ قَبْلَهَا",   color: "#b45309", bg: "#fef3e2" },
];

function Lesson3({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState(0);
  const [confetti, setConfetti] = useState(0);

  // mountain — pick chair for each word one at a time
  const [mtnWords] = useState(() => [...L3_MOUNTAIN_WORDS].sort(() => Math.random() - 0.5));
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
    const qs = L3_MOUNTAIN_WORDS.map(w => ({
      question: `أَيُّ كُرْسِيٍّ تَجْلِسُ عَلَيْهِ الْهَمْزَةُ فِي «${w.word}»؟`,
      answer: w.chair,
      reason: w.reason,
      opts: ["أ","ؤ","ئ","ء"],
    }));
    return qs.sort(() => Math.random() - 0.5).slice(0, 6);
  });

  function mtnAnswer(chair: string) {
    if (mtnFeedback) return;
    setMtnSelected(chair);
    const right = chair === mtnWords[mtnIdx].chair;
    setMtnFeedback(right ? "correct" : "wrong");
    if (right) { setMtnScore(s => s+1); setConfetti(c => c+1); playEffect(audioFile("/assets/correct.mp3"), 0.7); }
    else playEffect(audioFile("/assets/tryagain.mp3"), 0.6);
    setTimeout(() => {
      setMtnFeedback(null); setMtnSelected(null);
      if (mtnIdx < mtnWords.length - 1) setMtnIdx(i => i+1);
      else setMtnDone(true);
    }, 1300);
  }

  function crossAnswer(opt: string) {
    if (crossSelected) return;
    setCrossSelected(opt);
    const right = opt === L3_CROSSWORD[crossIdx].answer;
    if (right) { setCrossScore(s => s+1); setConfetti(c => c+1); playEffect(audioFile("/assets/correct.mp3"), 0.7); }
    else playEffect(audioFile("/assets/tryagain.mp3"), 0.6);
    setTimeout(() => {
      setCrossSelected(null);
      if (crossIdx < L3_CROSSWORD.length - 1) setCrossIdx(i => i+1);
      else setCrossDone(true);
    }, 1300);
  }

  function chairAnswer(opt: string) {
    if (chairFeedback) return;
    setChairSelected(opt);
    const right = opt === chairQuiz[chairIdx].answer;
    setChairFeedback(right ? "correct" : "wrong");
    if (right) { setChairScore(s => s+1); setConfetti(c => c+1); playEffect(audioFile("/assets/correct.mp3"), 0.7); }
    else playEffect(audioFile("/assets/tryagain.mp3"), 0.6);
    setTimeout(() => {
      setChairFeedback(null); setChairSelected(null);
      if (chairIdx < chairQuiz.length - 1) setChairIdx(i => i+1);
      else setChairDone(true);
    }, 1300);
  }

  const bg = "linear-gradient(180deg,#1c0a28,#78350f)";
  const accent = "#b45309";

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: bg, minHeight: "100vh" }}>
      <Confetti trigger={confetti} />
      <div className="p-4" style={{ background: "linear-gradient(135deg,#78350f,#b45309)" }}>
        <button onClick={onBack} className="text-amber-300 text-sm mb-2">← قَائِمَةُ الدُّرُوسِ</button>
        <div className="flex justify-between items-center">
          <span className="text-xs px-3 py-1 rounded-full text-white font-bold bg-amber-700">الدَّرْسُ الثَّالِثُ</span>
          <h1 className="text-xl font-bold text-white text-right">الْهَمْزَةُ الْمُتَطَرِّفَةُ</h1>
        </div>
        <div className="flex gap-1 mt-3">
          {["🎯","🎬","🏔️","🔤","🏆"].map((icon, i) => (
            <div key={i} onClick={() => i < phase && setPhase(i)}
              className="flex-1 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
              style={{ background: i === phase ? accent : i < phase ? "#92400e" : "rgba(255,255,255,0.1)", cursor: i < phase ? "pointer" : "default" }}>
              {icon}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5">

        {phase === 0 && (
          <div className="space-y-4">
            <div className="bg-white/10 rounded-3xl p-5 text-right text-white">
              <h2 className="text-xl font-bold mb-4" style={{ color: "#fcd34d" }}>🎯 مَاذَا سَتَتَعَلَّمُ؟</h2>
              {[
                "تُحَدِّدُ الْهَمْزَةَ الْمُتَطَرِّفَةَ وَمَوْقِعَهَا فِي الْكَلِمَةِ",
                "تُعَلِّلُ سَبَبَ كِتَابَتِهَا عَلَى الألف أو الواو أو الياء أو السطر",
                "تَكْتُبُ كَلِمَاتٍ بِهَمْزَةٍ مُتَطَرِّفَةٍ فِي سِيَاقَاتٍ مُتَنَوِّعَةٍ",
              ].map((g, i) => (
                <div key={i} className="flex items-start gap-3 mb-3 p-3 rounded-xl bg-white/10">
                  <span className="text-xl">{["١️⃣","٢️⃣","٣️⃣"][i]}</span>
                  <p className="text-sm leading-relaxed">{g}</p>
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
            <div className="bg-white/10 rounded-3xl p-5 text-right text-white">
              <div className="text-center text-4xl mb-3">🦎</div>
              <h3 className="font-bold text-lg mb-3" style={{ color: "#fcd34d" }}>قِصَّةُ الْحِرْبَاءِ اللُّغَوِيَّةِ!</h3>
              <p className="text-sm leading-loose mb-4">فِي غَابَةِ الْكَلِمَاتِ تَعِيشُ حِرْبَاءُ سِحْرِيَّةٌ. هِيَ دَائِمًا فِي <strong style={{ color: "#fcd34d" }}>آخِرِ الْكَلِمَةِ</strong>. لَوْنُهَا يَتَغَيَّرُ بِحَسَبِ الْحَرْفِ الَّذِي يَسْبِقُهَا:</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {L3_CHAIRS.map(c => (
                  <div key={c.id} className="rounded-xl p-3 text-center" style={{ background: c.bg }}>
                    <div className="text-2xl font-bold mb-1" style={{ color: c.color }}>{c.id}</div>
                    <p className="text-xs font-bold" style={{ color: c.color }}>{c.label}</p>
                  </div>
                ))}
              </div>
              <div className="bg-yellow-500/20 rounded-xl p-3 text-center">
                <p className="text-xs" style={{ color: "#fde68a" }}>📌 انْظُرْ إِلَى الْحَرَكَةِ عَلَى الْحَرْفِ الَّذِي قَبْلَ الْهَمْزَةِ فَقَطْ!</p>
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
                <div className="w-full h-2 bg-white/20 rounded-full mb-3">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${(mtnIdx/mtnWords.length)*100}%`, background: accent }} />
                </div>
                <p className="text-white/60 text-xs text-center mb-3">{mtnIdx+1} / {mtnWords.length}</p>
                <div className="bg-white/10 rounded-3xl p-5 text-center mb-4">
                  <p className="text-white/70 text-sm mb-2">عَلَى أَيِّ كُرْسِيٍّ تَجْلِسُ الْهَمْزَةُ فِي:</p>
                  <p className="text-5xl font-bold text-white mb-3" style={{ fontFamily: "'Amiri', serif" }}>{mtnWords[mtnIdx].word}</p>
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
                      <button key={c.id} onClick={() => mtnAnswer(c.id)}
                        className="py-4 rounded-2xl text-white font-bold text-2xl transition-all active:scale-95"
                        style={{
                          background: mtnFeedback ? (isRight ? "#059669" : isSel ? "#dc2626" : "rgba(255,255,255,0.1)") : (isSel ? c.color : "rgba(255,255,255,0.15)"),
                          fontFamily: "'Amiri', serif"
                        }}>
                        {c.id}
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {L3_CHAIRS.map(c => (
                    <p key={c.id} className="text-center text-xs text-white/50">{c.label.split(" ")[0]}</p>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-white/10 rounded-3xl p-6 text-center text-white">
                <div className="text-5xl mb-3">{mtnScore >= 6 ? "🏔️" : "⛰️"}</div>
                <h3 className="text-xl font-bold mb-2">{mtnScore >= 6 ? "وَصَلْتَ الْقِمَّةَ!" : "حَاوِلْ مَرَّةً أُخْرَى"}</h3>
                <p className="text-amber-300 mb-5">أَصَبْتَ {mtnScore} مِنْ {mtnWords.length}</p>
                {mtnScore >= 6
                  ? <button onClick={() => setPhase(3)} className="w-full py-3 rounded-2xl text-white font-bold" style={{ background: accent }}>التَّالِي → 🔤</button>
                  : <button onClick={() => { setMtnIdx(0); setMtnScore(0); setMtnDone(false); }} className="w-full py-3 rounded-2xl text-white font-bold bg-white/20">إِعَادَةٌ 🔄</button>
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
                <div className="w-full h-2 bg-white/20 rounded-full mb-3">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${(crossIdx/L3_CROSSWORD.length)*100}%`, background: accent }} />
                </div>
                <p className="text-white/60 text-xs text-center mb-4">{crossIdx+1} / {L3_CROSSWORD.length}</p>
                <div className="bg-white/10 rounded-3xl p-5 text-center mb-4">
                  <p className="text-amber-300 text-sm mb-2">🔍 مَا هَذِهِ الْكَلِمَةُ؟</p>
                  <p className="text-white font-bold text-base">{L3_CROSSWORD[crossIdx].clue}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {L3_CROSSWORD[crossIdx].opts.map(opt => {
                    const isCorrect = opt === L3_CROSSWORD[crossIdx].answer;
                    const isSelected = opt === crossSelected;
                    let bg = "rgba(255,255,255,0.15)";
                    if (crossSelected) bg = isCorrect ? "#059669" : isSelected ? "#dc2626" : "rgba(255,255,255,0.1)";
                    return (
                      <button key={opt} onClick={() => crossAnswer(opt)}
                        className="py-4 rounded-2xl text-white font-bold text-xl transition-all active:scale-95"
                        style={{ background: bg, fontFamily: "'Amiri', serif" }}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="bg-white/10 rounded-3xl p-6 text-center text-white">
                <div className="text-5xl mb-3">🔤</div>
                <p className="text-amber-300 mb-5">أَصَبْتَ {crossScore} مِنْ {L3_CROSSWORD.length}</p>
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
                <div className="w-full h-2 bg-white/20 rounded-full mb-3">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${(chairIdx/chairQuiz.length)*100}%`, background: "#f5c842" }} />
                </div>
                <p className="text-white/60 text-xs text-center mb-4">{chairIdx+1} / {chairQuiz.length}</p>
                <div className="bg-white/10 rounded-3xl p-5 text-center mb-4">
                  <p className="text-white text-base font-bold">{chairQuiz[chairIdx].question}</p>
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
                      <button key={c.id} onClick={() => chairAnswer(c.id)}
                        className="py-4 rounded-2xl text-white font-bold text-2xl transition-all active:scale-95"
                        style={{
                          background: chairFeedback ? (isRight ? "#059669" : isSel ? "#dc2626" : "rgba(255,255,255,0.1)") : (isSel ? c.color : c.bg + "44"),
                          fontFamily: "'Amiri', serif"
                        }}>
                        {c.id}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="bg-white/10 rounded-3xl p-6 text-center text-white">
                <div className="text-6xl mb-3">🏆</div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: "#fcd34d" }}>الْمُسْتَكْشِفُ اللُّغَوِيُّ الْكَبِيرُ!</h3>
                <p className="text-amber-300 mb-2">أَصَبْتَ {chairScore} مِنْ {chairQuiz.length}</p>
                <p className="text-white/70 text-sm mb-5">أَتْقَنْتَ الْهَمْزَةَ الْمُتَطَرِّفَةَ بِجَمِيعِ حَالَاتِهَا! 🎉</p>
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

  if (activeLesson === "l1") return <Lesson1 onBack={() => setActiveLesson("menu")} />;
  if (activeLesson === "l2") return <Lesson2 onBack={() => setActiveLesson("menu")} />;
  if (activeLesson === "l3") return <Lesson3 onBack={() => setActiveLesson("menu")} />;

  const lessons = [
    { id: "l1", num: "١", title: "الْهَمْزَةُ الْمُتَوَسِّطَةُ عَلَى نَبْرَةٍ", sub: "الْيَاءُ — قَاعِدَةُ الْكَسْرَةِ", icon: "🔓", color: "#059669", bg: "linear-gradient(135deg,#064e3b,#059669)", phases: ["🎯 أَهْدَاف","🎬 تَمْهِيد","🔓 فَرْزُ الْبَوَّابَةِ","🔤 اخْتَرِ الصَّحِيحَ","🏆 صَنْدُوقُ الْكَنْزِ"] },
    { id: "l2", num: "٢", title: "الْهَمْزَةُ الْمُتَوَسِّطَةُ عَلَى السَّطْرِ", sub: "بَعْدَ حُرُوفِ الْمَدِّ السَّاكِنَةِ", icon: "🌊", color: "#1d4ed8", bg: "linear-gradient(135deg,#1e3a8a,#1d4ed8)", phases: ["🎯 أَهْدَاف","🎬 تَمْهِيد","🌊 عُبُورُ النَّهَرِ","🔤 اخْتَرِ الصَّحِيحَ","🏆 أَكْمِلِ الْجُمْلَةَ"] },
    { id: "l3", num: "٣", title: "الْهَمْزَةُ الْمُتَطَرِّفَةُ", sub: "أَلِف — وَاو — يَاء — السَّطْر", icon: "🏔️", color: "#b45309", bg: "linear-gradient(135deg,#78350f,#b45309)", phases: ["🎯 أَهْدَاف","🎬 الْحِرْبَاءُ","🏔️ تَسَلُّقُ الْجَبَلِ","🔤 اخْتَرِ الصَّحِيحَ","🏆 تَحَدِّي الْكُرْسِيِّ"] },
  ];

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "linear-gradient(180deg,#0f172a,#1e1b4b)", minHeight: "100vh" }}>
      {/* Header */}
      <div className="p-4" style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)" }}>
        <button onClick={() => setLocation("/skills/writing")} className="text-purple-300 text-sm mb-3">← مَهَارَةُ الْكِتَابَةِ</button>
        <div className="flex justify-between items-center">
          <span className="text-3xl">🎮</span>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-white">أَلْعَابُ الْهَمْزَةِ</h1>
            <p className="text-purple-300 text-sm">٣ دُرُوسٌ × ٥ مَرَاحِلَ</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
        {lessons.map(l => (
          <button key={l.id} onClick={() => setActiveLesson(l.id as any)}
            className="w-full rounded-3xl overflow-hidden text-right transition-all active:scale-98 hover:scale-101 shadow-xl"
            style={{ background: l.bg }}>
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <span className="text-5xl">{l.icon}</span>
                <div>
                  <p className="text-white/60 text-xs mb-1">الدَّرْسُ {l.num}</p>
                  <h2 className="text-white font-bold text-lg leading-snug">{l.title}</h2>
                  <p className="text-white/70 text-sm mt-1">{l.sub}</p>
                </div>
              </div>
              {/* Phases preview */}
              <div className="flex gap-1 flex-wrap mt-3">
                {l.phases.map((p, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-full bg-white/20 text-white">{p}</span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
