import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { playEffect, audioFile } from "@/lib/audio";
import { getHamzaJourneys } from "@/lib/api";
import {
  GameFeelStyles, useCombo, ComboIndicator, useCharacterReaction,
  VictoryModal, SmartReview, evaluateAchievements, type MistakeRecord,
} from "@/lib/game-widgets";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ══════════════════════════════════════════════════════════════
   رِحْلَةُ الْمُسْتَكْشِفِ — الهمزة المتوسطة على ياء (نبرة)
   لعبة مسار تفاعلية بأسلوب خريطة الكنز — ٦ محطات على مسار من الصخور

   ملاحظة بنيوية مهمة: كل المكوّنات الفرعية (Card, TopBar, الشاشات...)
   مُعرَّفة هنا في أعلى الملف (خارج المكوّن الرئيسي) وليس بداخله.
   لو عرّفناها بداخل TreasureMapLesson كانت ستُعاد إنشاؤها من جديد
   عند كل إعادة رسم (كل ضغطة حرف)، مما يجعل React "يُعيد تركيب" العنصر
   من الصفر ويفقد التركيز (Focus) من حقل الكتابة — وهذا كان سبب مشكلة
   "أحتاج أضغط بعد كل حرف".
   ══════════════════════════════════════════════════════════════ */

type Phase = "intro" | "video" | "rock1" | "rock2" | "rock3" | "rock4" | "treasure" | "results";

const PHASES: Phase[] = ["intro", "video", "rock1", "rock2", "rock3", "rock4", "treasure", "results"];

const PATH_POS: Record<Phase, { x: number; y: number }> = {
  intro:   { x: 8,  y: 82 },
  video:   { x: 22, y: 68 },
  rock1:   { x: 38, y: 74 },
  rock2:   { x: 55, y: 77 },
  rock3:   { x: 68, y: 60 },
  rock4:   { x: 80, y: 38 },
  treasure:{ x: 92, y: 20 },
  results: { x: 92, y: 20 },
};

const DEFAULT_ROCK1_SETS = [
  [{ label: "زَائِر",    correct: true },  { label: "زَاءِر",    correct: false }],
  [{ label: "ذِئْب",     correct: true },  { label: "ذِأْب",     correct: false }],
  [{ label: "مِئْذَنَة",  correct: true },  { label: "مِأْذَنَة",  correct: false }],
];

const HARAKAT_CORRECT_ORDER = ["الْكَسْرَة", "الضَّمَّة", "الْفَتْحَة", "السُّكُون"];

const DEFAULT_ROCK3_OPTIONS = [
  { text: "لأنَّ الْهَمْزَةَ سَاكِنَةٌ وَمَا قَبْلَهَا مَكْسُورٌ", correct: false },
  { text: "لأنَّ الْهَمْزَةَ مَكْسُورَةٌ وَمَا قَبْلَهَا مَفْتُوحٌ وَالْكَسْرَةُ أَقْوَى", correct: true },
  { text: "لأنَّ الْهَمْزَةَ مَفْتُوحَةٌ وَمَا قَبْلَهَا مَضْمُومٌ", correct: false },
];

// الصخرة الرابعة (بعد التحويل من إدخال نصي إلى اختيار البوابة الصحيحة):
// نفس كلمة "بئر" الأصلية، مع مموّهات هي مقاعد الهمزة الأخرى (ألف/واو) حتى
// يبقى السؤال يختبر فهم "متى تُكتب على نبرة" بدل مجرّد الكتابة الحرة
const DEFAULT_ROCK4_OPTIONS = [
  { label: "بِئْرٍ", correct: true },
  { label: "بَأْرٍ", correct: false },
  { label: "بُؤْرٍ", correct: false },
];

/* ── بيانات المراجعة الذكية (القاعدة والتعليل) — القيم الافتراضية،
   تُستبدل عند وجود محتوى معدَّل من لوحة المعلم (getHamzaJourneys) ── */
const DEFAULT_RULE =
  "تُكتب الهمزة المتوسطة على ياء إذا كانت مكسورة، أو كان الحرف الذي قبلها مكسورًا، أو سُبقت بياء ساكنة وكانت الهمزة مفتوحة أو مضمومة — لأن الكسرة أقوى الحركات.";
const DEFAULT_ROCK1_EXPLANATIONS = [
  "حركة الهمزة في «زائر» كسرة، فتُكتب على ياء.",
  "الحرف الذي قبل الهمزة في «ذئب» (الذال) مكسور، فتُكتب على ياء.",
  "الحرف الذي قبل الهمزة في «مئذنة» (الميم) مكسور، فتُكتب على ياء.",
];
const DEFAULT_ROCK2_EXPLANATION =
  "الكسرة أقوى الحركات، تليها الضمة، ثم الفتحة، ثم السكون — وهذا الترتيب هو ما يحدد شكل الهمزة عند المقارنة بين حركتها وحركة ما قبلها.";
const DEFAULT_ROCK3_EXPLANATION =
  "همزة «مُطْمَئِن» مكسورة وما قبلها مفتوح، والكسرة أقوى من الفتحة، فكُتبت على ياء.";
const DEFAULT_ROCK4_EXPLANATION =
  "الحرف الذي قبل الهمزة في «بئر» (الباء) مكسور، فتُكتب الهمزة على ياء: بِئْرٍ.";

const DEFAULT_CONTENT = {
  rule: DEFAULT_RULE,
  rock1Sets: DEFAULT_ROCK1_SETS,
  rock1Explanations: DEFAULT_ROCK1_EXPLANATIONS,
  rock2Explanation: DEFAULT_ROCK2_EXPLANATION,
  rock3Options: DEFAULT_ROCK3_OPTIONS,
  rock3Explanation: DEFAULT_ROCK3_EXPLANATION,
  rock4Options: DEFAULT_ROCK4_OPTIONS,
  rock4Explanation: DEFAULT_ROCK4_EXPLANATION,
};

/* ══════════════ مكوّنات ثابتة (خارج المكوّن الرئيسي) ══════════════ */

function TopBar({ points, keys, onBack }: { points: number; keys: number; onBack: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-3" style={{ background: "rgba(41,26,13,0.55)" }}>
      <button onClick={onBack} className="text-amber-100 text-base">← الْمَهَامُّ</button>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1 bg-amber-900/60 text-amber-100 px-3 py-1 rounded-full text-base font-bold">🔑 {keys}</span>
        <span className="flex items-center gap-1 bg-amber-900/60 text-yellow-300 px-3 py-1 rounded-full text-base font-bold">⭐ {points}</span>
      </div>
    </div>
  );
}

function MapBackdrop({ phase, interactive, onActivate, reaction, reactKey }: { phase: Phase; interactive: boolean; onActivate: () => void; reaction: "idle" | "correct" | "wrong"; reactKey: number }) {
  const pos = PATH_POS[phase];
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse at 30% 20%, #d9c48a 0%, #b89b5e 35%, #7c9473 70%, #4f6b52 100%)"
      }} />
      <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M8,82 Q20,60 38,74 T68,60 T92,20" fill="none" stroke="#3d2b18" strokeWidth="0.8" strokeDasharray="2,2" />
      </svg>
      {(["intro", "video", "rock1", "rock2", "rock3", "rock4", "treasure"] as Phase[]).map((p, i) => {
        const done = PHASES.indexOf(phase) > PHASES.indexOf(p);
        const active = phase === p;
        const clickable = active && interactive;
        return (
          <div key={p} onClick={clickable ? onActivate : undefined}
            className={`absolute flex items-center justify-center shadow-lg transition-all ${clickable ? "lock-active-pulse" : ""}`}
            style={{
              left: `${PATH_POS[p].x}%`, top: `${PATH_POS[p].y}%`,
              width: active ? 40 : 28, height: active ? 46 : 32,
              transform: "translate(-50%, -50%)",
              background: done ? "linear-gradient(180deg,#6ee7b7,#059669)" : active ? "linear-gradient(180deg,#fcd34d,#d97706)" : "linear-gradient(180deg,#c9a874,#8a7048)",
              border: "2px solid rgba(255,255,255,0.7)",
              borderRadius: "50% 50% 6px 6px",
              fontSize: active ? 18 : 12,
            }}>
            {i === 6 ? "🏆" : done ? "🔓" : "🔒"}
          </div>
        );
      })}
      {interactive && (
        <div className="absolute lock-hint-bob whitespace-nowrap text-center pointer-events-none" style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -170%)" }}>
          <span className="px-3 py-1.5 rounded-full font-bold text-sm shadow-lg" style={{ background: "#fef3e2", color: "#78350f", border: "2px solid #d97706" }}>👆 اضْغَطْ هُنَا</span>
        </div>
      )}
      <div key={reactKey} className={`absolute text-5xl transition-all duration-500 ease-out ${reaction === "correct" ? "char-bounce-correct" : reaction === "wrong" ? "char-shake-wrong" : ""}`}
        style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -110%)", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.4))" }}>
        {reaction === "correct" ? "😄" : reaction === "wrong" ? "😟" : "🧑‍🎓"}
      </div>
      {interactive && (
        <div onClick={onActivate} className="absolute cursor-pointer z-20" style={{
          left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -60%)",
          width: 160, height: 220,
        }} />
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 max-w-3xl w-full mx-4 rounded-3xl p-8 shadow-2xl" style={{ background: "rgba(253,248,236,0.72)", border: "3px solid #c9a15a", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
      {children}
    </div>
  );
}

function FeedbackBanner({ feedback }: { feedback: "correct" | "wrong" | null }) {
  if (!feedback) return null;
  return (
    <div className="mt-4 text-center font-bold text-xl" style={{ color: feedback === "correct" ? "#059669" : "#dc2626" }}>
      {feedback === "correct" ? "✅ أَحْسَنْتَ! إِجَابَةٌ صَحِيحَةٌ" : "❌ حَاوِلْ مَرَّةً أُخْرَى"}
    </div>
  );
}

/* ── أسلوب اللعب الجديد: فَتْحُ بَوَّابَاتِ الطَّرِيقِ — يختار المستكشف بوابة
   من عدّة بوابات مقفلة ليتابع مسيره؛ البوابة الصحيحة تنفتح وتضيء، والخاطئة
   تهتزّ سلاسلها ويرتدّ عنها ── */
function GateStyles() {
  return (
    <style>{`
      @keyframes gateRattle { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-3deg); } 75% { transform: rotate(3deg); } }
      @keyframes gateOpen { 0% { transform: scaleX(1); opacity: 1; } 60% { transform: scaleX(1.06); opacity: 1; box-shadow: 0 0 30px 8px rgba(217,119,6,0.55); } 100% { transform: scaleX(1.02); opacity: 0.35; } }
      @keyframes lockPulse { 0%,100% { transform: translate(-50%,-50%) scale(1); box-shadow: 0 0 0 0 rgba(252,211,77,0.6); } 50% { transform: translate(-50%,-50%) scale(1.18); box-shadow: 0 0 0 10px rgba(252,211,77,0); } }
      @keyframes hintBob { 0%,100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, -6px); } }
      .lock-active-pulse { animation: lockPulse 1.1s ease-in-out infinite; cursor: pointer; }
      .lock-hint-bob { animation: hintBob 1s ease-in-out infinite; }
      .gate-locked:hover { filter: brightness(1.05); }
      .gate-wrong { animation: gateRattle 0.35s ease-in-out 2; border-color: #dc2626 !important; }
      .gate-correct { animation: gateOpen 0.7s ease-out forwards; }
    `}</style>
  );
}

function GateOption({ label, order, status, wide, onClick }: {
  label: string; order?: number; status: "locked" | "picked-correct" | "picked-wrong"; wide?: boolean; onClick: () => void;
}) {
  const cls = status === "picked-correct" ? "gate-correct" : status === "picked-wrong" ? "gate-wrong" : "gate-locked";
  return (
    <button
      onClick={onClick}
      disabled={status === "picked-correct"}
      className={`${cls} relative text-center font-bold active:scale-95 transition-all ${wide ? "w-full text-right py-4 px-5" : "py-6 px-3"}`}
      style={{
        background: "linear-gradient(180deg, #fef3e2 0%, #e9c98a 100%)",
        border: "3px solid #8a6d3b",
        borderRadius: "16px 16px 6px 6px",
        color: "#78350f",
        fontFamily: wide ? undefined : "'Amiri', serif",
        fontSize: wide ? 15 : 22,
      }}>
      <span className="absolute -top-3 right-1/2 translate-x-1/2 text-xl">
        {status === "picked-correct" ? "🔓" : "🔒"}
      </span>
      {order !== undefined && (
        <span className="absolute -top-3 left-2 bg-amber-700 text-white text-sm w-5 h-5 rounded-full flex items-center justify-center">{order}</span>
      )}
      <span className="block mt-2">{wide ? `${label}` : label}</span>
    </button>
  );
}

function GateRow({ children, columns = 2 }: { children: React.ReactNode; columns?: number }) {
  return <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}>{children}</div>;
}

/* ══════════════ المكوّن الرئيسي ══════════════ */

export default function TreasureMapLesson() {
  const [, setLocation] = useLocation();
  const [content, setContent] = useState(DEFAULT_CONTENT);
  useEffect(() => {
    getHamzaJourneys().then(d => {
      if (d?.l1) setContent(c => ({ ...c, ...d.l1 }));
    });
  }, []);
  const [phase, setPhase] = useState<Phase>("intro");
  const [cardVisible, setCardVisible] = useState(true);
  const { combo, maxCombo, bonus: comboBonus, pulseKey, registerAnswer: registerCombo, resetCombo } = useCombo();
  const { reaction, reactKey, react: charReact } = useCharacterReaction();
  const [mistakes, setMistakes] = useState<Record<string, MistakeRecord>>({});
  const [wrongCount, setWrongCount] = useState(0);
  const startTimeRef = useRef<number>(Date.now());

  function logMistake(id: string, record: Omit<MistakeRecord, "id">) {
    setMistakes(prev => (prev[id] ? prev : { ...prev, [id]: { id, ...record } }));
    setWrongCount(w => w + 1);
  }
  const [points, setPoints] = useState(0);
  const [keys, setKeys] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const [rock1Step, setRock1Step] = useState(0);
  const [harakatOrder, setHarakatOrder] = useState<string[]>([]);
  const [treasureOpened, setTreasureOpened] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [round, setRound] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoDone, setVideoDone] = useState(false);

  // نُخلط ترتيب الخيارات (يمين/يسار) لكل سؤال، وتبقى ثابتة طوال عرض نفس السؤال
  const rock1Options = useMemo(() => shuffle(content.rock1Sets[rock1Step]), [rock1Step, round]);
  const rock3Options = useMemo(() => shuffle(content.rock3Options), [round]);
  const rock4Options = useMemo(() => shuffle(content.rock4Options), [round]);

  function goNext(nextPhase: Phase, gainedPoints = 0, gainedKey = false) {
    if (gainedPoints) setPoints(p => p + gainedPoints);
    if (gainedKey) setKeys(k => k + 1);
    setFeedback(null);
    setTimeout(() => { setPhase(nextPhase); setSelectedIdx(null); setCardVisible(false); }, 550);
  }

  function celebrate() {
    try { playEffect(audioFile("/assets/correct.mp3"), 0.7); } catch {}
  }

  function resetAll() {
    setPhase("intro"); setPoints(0); setKeys(0); setRock1Step(0);
    setHarakatOrder([]); setSelectedIdx(null);
    setTreasureOpened(false); setVideoDone(false); setFeedback(null);
    setRound(r => r + 1); setCardVisible(true);
    resetCombo(); setMistakes({}); setWrongCount(0); startTimeRef.current = Date.now();
  }

  /* ── منطق كل شاشة ── */
  function chooseRock1(idx: number, correct: boolean) {
    setSelectedIdx(idx);
    if (correct) {
      celebrate();
      charReact(true); registerCombo(true);
      setFeedback("correct");
      if (rock1Step < content.rock1Sets.length - 1) {
        setTimeout(() => { setRock1Step(s => s + 1); setFeedback(null); setSelectedIdx(null); }, 700);
      } else {
        goNext("rock2", 10);
      }
    } else {
      charReact(false); registerCombo(false);
      logMistake(`rock1-${rock1Step}`, {
        question: "كِتَابَةُ الْهَمْزَةِ الْمُتَوَسِّطَةِ فِي هَذِهِ الْكَلِمَةِ",
        userAnswer: rock1Options[idx].label,
        correctAnswer: rock1Options.find(o => o.correct)?.label ?? "",
        rule: content.rule,
        explanation: content.rock1Explanations[rock1Step],
      });
      setFeedback("wrong");
      setTimeout(() => setSelectedIdx(null), 500);
    }
  }

  function pickHaraka(h: string) {
    const next = [...harakatOrder, h];
    setHarakatOrder(next);
    if (next.length === HARAKAT_CORRECT_ORDER.length) {
      const isRight = next.every((v, i) => v === HARAKAT_CORRECT_ORDER[i]);
      if (isRight) {
        celebrate();
        charReact(true); registerCombo(true);
        setFeedback("correct");
        setTimeout(() => goNext("rock3", 20, true), 800);
      } else {
        charReact(false); registerCombo(false);
        logMistake("rock2", {
          question: "تَرْتِيبُ الْحَرَكَاتِ مِنَ الْأَقْوَى إِلَى الْأَضْعَفِ",
          userAnswer: next.join(" ، "),
          correctAnswer: HARAKAT_CORRECT_ORDER.join(" ، "),
          rule: content.rule,
          explanation: content.rock2Explanation,
        });
        setFeedback("wrong");
        setTimeout(() => setHarakatOrder([]), 900);
      }
    }
  }

  function chooseRock3(idx: number, correct: boolean) {
    setSelectedIdx(idx);
    if (correct) {
      celebrate(); charReact(true); registerCombo(true);
      setFeedback("correct"); goNext("rock4", 20);
    } else {
      charReact(false); registerCombo(false);
      logMistake("rock3", {
        question: "لِمَاذَا كُتِبَتِ الْهَمْزَةُ عَلَى نَبْرَةٍ فِي كَلِمَةِ (مُطْمَئِن)؟",
        userAnswer: rock3Options[idx].text,
        correctAnswer: rock3Options.find(o => o.correct)?.text ?? "",
        rule: content.rule,
        explanation: content.rock3Explanation,
      });
      setFeedback("wrong"); setTimeout(() => setSelectedIdx(null), 500);
    }
  }

  function chooseRock4(idx: number, correct: boolean) {
    setSelectedIdx(idx);
    if (correct) {
      celebrate(); charReact(true); registerCombo(true);
      setFeedback("correct");
      goNext("treasure", 30, true);
    } else {
      charReact(false); registerCombo(false);
      logMistake("rock4", {
        question: "الْكِتَابَةُ الصَّحِيحَةُ لِهَمْزَةِ كَلِمَةِ «بئر»",
        userAnswer: rock4Options[idx].label,
        correctAnswer: rock4Options.find(o => o.correct)?.label ?? "",
        rule: content.rule,
        explanation: content.rock4Explanation,
      });
      setFeedback("wrong");
      setTimeout(() => setSelectedIdx(null), 500);
    }
  }

  /* ── محتوى الشاشة الحالية ── */
  function renderScreen() {
    switch (phase) {
      case "intro":
        return (
          <Card>
            <h1 className="text-3xl font-bold text-center mb-1" style={{ color: "#78350f", fontFamily: "'Amiri', serif" }}>🗺️ رِحْلَةُ الْمُسْتَكْشِفِ</h1>
            <p className="text-center text-amber-800 text-base mb-5">الْهَمْزَةُ الْمُتَوَسِّطَةُ عَلَى نَبْرَةٍ (يَاء)</p>
            <div className="bg-amber-50 rounded-2xl p-4 mb-5 border border-amber-200">
              <p className="font-bold text-amber-900 mb-2 text-base">🎯 أَهْدَافُ رِحْلَتِنَا الْيَوْمَ:</p>
              <ul className="text-amber-800 text-lg font-semibold space-y-2 leading-relaxed">
                <li>١. التَّعَرُّفُ عَلَى مَوَاضِعِ كِتَابَةِ الْهَمْزَةِ الْمُتَوَسِّطَةِ عَلَى يَاءٍ.</li>
                <li>٢. تَعْلِيلُ سَبَبِ كِتَابَتِهَا (مُقَارَنَةُ الْحَرَكَاتِ وَقُوَّةِ الْكَسْرَةِ).</li>
                <li>٣. كِتَابَتُهَا بِشَكْلٍ صَحِيحٍ.</li>
              </ul>
            </div>
            <button onClick={() => goNext("video")} className="w-full py-3.5 rounded-2xl text-white font-bold text-xl active:scale-95 transition-all" style={{ background: "#b45309" }}>
              🚶‍♂️ ابْدَأِ الرِّحْلَةَ
            </button>
          </Card>
        );

      case "video":
        return (
          <Card>
            <h2 className="text-2xl font-bold text-center mb-4" style={{ color: "#78350f" }}>📺 مَحَطَّةُ الْمَعْرِفَةِ</h2>
            <div className="rounded-2xl overflow-hidden bg-black mb-4" style={{ aspectRatio: "16/9" }}>
              <video ref={videoRef} controls className="w-full h-full" onEnded={() => setVideoDone(true)} src="/videos/hamza-nabra.mp4">
                متصفحك لا يدعم عرض الفيديو.
              </video>
            </div>
            {!videoDone && <p className="text-center text-amber-600 text-sm mb-3">🔒 شَاهِدِ الْفِيدِيُو كَامِلاً لِفَتْحِ التَّحَدِّي التَّالِي</p>}
            <button onClick={() => goNext("rock1")} disabled={!videoDone}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-xl active:scale-95 transition-all disabled:opacity-40" style={{ background: "#b45309" }}>
              🪨 الِانْتِقَالُ لِلتَّحَدِّي
            </button>
          </Card>
        );

      case "rock1": {
        const options = rock1Options;
        return (
          <Card>
            <p className="text-sm text-amber-500 mb-1">🪨 الصَّخْرَةُ الْأُولَى — سُؤَالُ {rock1Step + 1}/{content.rock1Sets.length}</p>
            <h2 className="text-2xl font-bold mb-5" style={{ color: "#78350f" }}>أَمَامَكَ بَوَّابَتَانِ مُقْفَلَتَانِ! افْتَحِ الْبَوَّابَةَ الَّتِي تَحْمِلُ الْكَلِمَةَ الصَّحِيحَةَ إِمْلَائِيًّا لِتَتَابَعَ مَسِيرَكَ:</h2>
            <GateRow columns={2}>
              {options.map((o, i) => (
                <GateOption key={i} label={o.label}
                  status={selectedIdx !== i ? "locked" : o.correct ? "picked-correct" : "picked-wrong"}
                  onClick={() => chooseRock1(i, o.correct)} />
              ))}
            </GateRow>
            <FeedbackBanner feedback={feedback} />
          </Card>
        );
      }

      case "rock2": {
        const remaining = HARAKAT_CORRECT_ORDER.filter(h => !harakatOrder.includes(h));
        return (
          <Card>
            <p className="text-sm text-amber-500 mb-1">🪨 الصَّخْرَةُ الثَّانِيَةُ — بَوَّابَاتُ التَّرْتِيبِ</p>
            <h2 className="text-2xl font-bold mb-4" style={{ color: "#78350f" }}>الْكَسْرَةُ هِيَ مَلِكَةُ الْحَرَكَاتِ! لِتَفْتَحَ الْبَوَّابَاتِ الْأَرْبَعَ لَا بُدَّ أَنْ تَخْتَارَهَا بِالتَّرْتِيبِ مِنَ الْأَقْوَى إِلَى الْأَضْعَفِ:</h2>
            {harakatOrder.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {harakatOrder.map((h, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-xl text-white font-bold text-sm flex items-center gap-1" style={{ background: "#059669" }}>🔓 {i + 1}. {h}</span>
                ))}
              </div>
            )}
            <GateRow columns={2}>
              {remaining.map(h => (
                <GateOption key={h} label={h} status="locked" onClick={() => pickHaraka(h)} />
              ))}
            </GateRow>
            <FeedbackBanner feedback={feedback} />
          </Card>
        );
      }

      case "rock3":
        return (
          <Card>
            <p className="text-sm text-amber-500 mb-1">🪨 الصَّخْرَةُ الثَّالِثَةُ — تَحَدِّي التَّعْلِيلِ</p>
            <h2 className="text-2xl font-bold mb-5" style={{ color: "#78350f", fontFamily: "'Amiri', serif" }}>لِمَاذَا كُتِبَتِ الْهَمْزَةُ عَلَى نَبْرَةٍ فِي كَلِمَةِ (مُطْمَئِن)؟ افْتَحِ الْبَوَّابَةَ الَّتِي تَحْمِلُ التَّعْلِيلَ الصَّحِيحَ:</h2>
            <div className="space-y-3">
              {rock3Options.map((o, i) => (
                <GateOption key={i} label={`${i + 1}. ${o.text}`} wide
                  status={selectedIdx !== i ? "locked" : o.correct ? "picked-correct" : "picked-wrong"}
                  onClick={() => chooseRock3(i, o.correct)} />
              ))}
            </div>
            <FeedbackBanner feedback={feedback} />
          </Card>
        );

      case "rock4":
        return (
          <Card>
            <p className="text-sm text-amber-500 mb-1">🪨 الصَّخْرَةُ الرَّابِعَةُ وَالْأَخِيرَةُ — الْبَوَّابَةُ الْأَخِيرَةُ</p>
            <h2 className="text-2xl font-bold mb-3" style={{ color: "#78350f" }}>اكْتَشِفِ الْكَلِمَةَ الْخَطَأَ، ثُمَّ افْتَحِ الْبَوَّابَةَ الَّتِي تَحْمِلُ كِتَابَتَهَا الصَّحِيحَةَ:</h2>
            <p className="text-center text-3xl font-bold mb-5 p-4 rounded-2xl" style={{ background: "#fef3e2", color: "#78350f", fontFamily: "'Amiri', serif" }}>
              شَرِبْتُ مِنْ <span className="text-red-500 underline decoration-wavy">بَأْرٍ</span> عَمِيقٍ
            </p>
            <GateRow columns={3}>
              {rock4Options.map((o, i) => (
                <GateOption key={i} label={o.label}
                  status={selectedIdx !== i ? "locked" : o.correct ? "picked-correct" : "picked-wrong"}
                  onClick={() => chooseRock4(i, o.correct)} />
              ))}
            </GateRow>
            <FeedbackBanner feedback={feedback} />
          </Card>
        );

      case "treasure":
        return (
          <Card>
            {!treasureOpened ? (
              <div className="text-center">
                <div className="text-7xl mb-4 animate-bounce">📦</div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: "#78350f" }}>لَقَدْ وَصَلْتَ إِلَى صُنْدُوقِ الْكَنْزِ!</h2>
                <p className="text-amber-700 text-base mb-5">اسْتَخْدِمِ الْمِفْتَاحَيْنِ اللَّذَيْنِ جَمَعْتَهُمَا لِفَتْحِهِ ({keys}/2 🔑)</p>
                <button onClick={() => setTreasureOpened(true)} disabled={keys < 2}
                  className="py-3.5 px-8 rounded-2xl text-white font-bold text-xl active:scale-95 transition-all disabled:opacity-40" style={{ background: "#d97706" }}>
                  🔓 افْتَحِ الصُّنْدُوقَ
                </button>
              </div>
            ) : (
              <div>
                <div className="text-6xl text-center mb-3">✨🏆✨</div>
                <h2 className="text-2xl font-bold text-center mb-4" style={{ color: "#78350f" }}>الْقَاعِدَةُ الذَّهَبِيَّةُ</h2>
                <div className="rounded-2xl p-4 mb-5" style={{ background: "#fef3e2", border: "2px solid #d97706" }}>
                  <p className="text-amber-900 leading-relaxed text-lg font-semibold">
                    تُكْتَبُ الْهَمْزَةُ الْمُتَوَسِّطَةُ عَلَى يَاءٍ فِي الْحَالَاتِ الْآتِيَةِ (وَالسَّبَبُ فِي الْحَالَاتِ كُلِّهَا أَنَّ <b>الْكَسْرَةَ</b> هِيَ الْحَرَكَةُ الْأَقْوَى):
                  </p>
                  <ul className="mt-2 space-y-2 text-amber-800 text-lg font-semibold">
                    <li>• إِذَا جَاءَتِ الْهَمْزَةُ مَكْسُورَةً (مِثْلَ: سَائِل، مُقْرِئِين).</li>
                    <li>• أَوْ إِذَا جَاءَ الْحَرْفُ الَّذِي قَبْلَ الْهَمْزَةِ مَكْسُورًا (مِثْلَ: ذِئْب، مُنْشِئُون).</li>
                    <li>• أَوْ إِذَا سُبِقَتْ بِيَاءٍ سَاكِنَةٍ وَكَانَتِ الْهَمْزَةُ مَفْتُوحَةً أَوْ مَضْمُومَةً (مِثْلَ: دَفِيئَة).</li>
                  </ul>
                </div>
                <button onClick={() => setPhase("results")} className="w-full py-3.5 rounded-2xl text-white font-bold text-xl active:scale-95 transition-all" style={{ background: "#b45309" }}>
                  عَرْضُ النَّتِيجَةِ 🎉
                </button>
              </div>
            )}
          </Card>
        );

      case "results": {
        const elapsedSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
        const achievements = evaluateAchievements({
          totalQuestions: content.rock1Sets.length + 3, wrongCount, maxCombo, elapsedSeconds,
        });
        return (
          <Card>
            <VictoryModal
              title="أَحْسَنْتَ أَيُّهَا الْمُسْتَكْشِفُ!"
              subtitle="أَتْمَمْتَ رِحْلَةَ الْهَمْزَةِ عَلَى نَبْرَةٍ بِنَجَاحٍ"
              points={points + comboBonus} pointsLabel="⭐ نُقْطَة"
              secondaryValue={keys} secondaryLabel="🔑 مِفْتَاح"
              achievements={achievements}
            >
              <div className="flex gap-3">
                <button onClick={resetAll} className="flex-1 py-3 rounded-2xl font-bold" style={{ background: "#fef3e2", color: "#78350f", border: "2px solid #e9c98a" }}>
                  🔄 إِعَادَةُ اللَّعِبِ
                </button>
                <button onClick={() => setLocation("/writing-games")} className="flex-1 py-3 rounded-2xl text-white font-bold" style={{ background: "#b45309" }}>
                  الدَّرْسُ التَّالِي ←
                </button>
              </div>
              <SmartReview mistakes={Object.values(mistakes)} />
            </VictoryModal>
          </Card>
        );
      }
    }
  }

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", minHeight: "100vh" }} className="relative">
      <GateStyles />
      <GameFeelStyles />
      <ComboIndicator combo={combo} pulseKey={pulseKey} accent="#d97706" />
      <MapBackdrop phase={phase} interactive={!cardVisible} onActivate={() => setCardVisible(true)} reaction={reaction} reactKey={reactKey} />
      <div className="relative z-10 flex flex-col min-h-screen">
        <TopBar points={points} keys={keys} onBack={() => setLocation("/writing-games")} />
        <div className="flex-1 flex items-start justify-center pt-6 pb-8 overflow-y-auto">
          {cardVisible && <div key={phase} className="fade-in-up w-full flex justify-center">{renderScreen()}</div>}
        </div>
      </div>
    </div>
  );
}
