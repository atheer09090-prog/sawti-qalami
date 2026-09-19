import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { playEffect, audioFile } from "@/lib/audio";
import { getHamzaJourneys } from "@/lib/api";
import {
  GameFeelStyles, useCombo, ComboIndicator, useCharacterReaction,
  VictoryModal, SmartReview, evaluateAchievements, type MistakeRecord,
} from "@/lib/game-widgets";

/* ══════════════════════════════════════════════════════════════
   الْغَوَّاصُ وَصَائِدُ اللَّآلِئِ — الهمزة المتوسطة المنفردة على السطر
   لعبة مسار تفاعلية بثيم أعماق البحر — ٤ محارات + صندوق كنز غارق

   ملاحظة بنيوية: كل المكوّنات الفرعية مُعرَّفة خارج المكوّن الرئيسي
   (نفس أسلوب TreasureMapLesson) لتفادي مشاكل فقدان التركيز وأخطاء الـ Hooks.
   ══════════════════════════════════════════════════════════════ */

type Phase = "intro" | "video" | "oyster1" | "oyster2" | "oyster3" | "oyster4" | "chest" | "results";
const PHASES: Phase[] = ["intro", "video", "oyster1", "oyster2", "oyster3", "oyster4", "chest", "results"];

const PATH_POS: Record<Phase, { x: number; y: number }> = {
  intro:   { x: 12, y: 10 },
  video:   { x: 26, y: 26 },
  oyster1: { x: 40, y: 40 },
  oyster2: { x: 54, y: 54 },
  oyster3: { x: 68, y: 66 },
  oyster4: { x: 80, y: 78 },
  chest:   { x: 90, y: 90 },
  results: { x: 90, y: 90 },
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DEFAULT_OYSTER1_SETS = [
  [{ label: "قِراءَة", correct: true }, { label: "قِراءية", correct: false }],
  [{ label: "عَباءَة", correct: true }, { label: "عَبائة", correct: false }],
  [{ label: "مُروءَة", correct: true }, { label: "مُروءةَ", correct: false }],
];

// المحارة الثانية: اختيار الحركة الصحيحة فوق الألف ثم فوق الهمزة، في كلمة (قِراءَة)
const DEFAULT_OYSTER2_ALEF_OPTIONS = [
  { label: "سُكُون (مَدٌّ)", correct: true },
  { label: "فَتْحَة", correct: false },
  { label: "ضَمَّة", correct: false },
];
const DEFAULT_OYSTER2_HAMZA_OPTIONS = [
  { label: "ضَمَّة", correct: false },
  { label: "فَتْحَة", correct: true },
  { label: "كَسْرَة", correct: false },
];

const DEFAULT_OYSTER3_OPTIONS = [
  { text: "لأنَّ الْهَمْزَةَ مَكْسُورَةٌ بَعْدَ حَرْفٍ سَاكِنٍ", correct: false },
  { text: "لأنَّ الْهَمْزَةَ مَفْتُوحَةٌ وَجَاءَتْ بَعْدَ وَاوِ مَدٍّ سَاكِنَةٍ", correct: true },
  { text: "لأنَّ الْهَمْزَةَ مَضْمُومَةٌ بَعْدَ فَتْحٍ", correct: false },
];

// المحارة الرابعة (بعد التحويل من إدخال نصي إلى صيد اللؤلؤة الصحيحة):
// نفس كلمة "رَدَاءَة" الأصلية، مع مموّهات مبنيّة على أخطاء إملائية شائعة
// (خلط ة/ه، أو نقل الهمزة إلى مقعد خاطئ) حتى يبقى مستوى الصعوبة قريبًا من السابق
const DEFAULT_OYSTER4_OPTIONS = [
  { label: "رَدَاءَه", correct: false },
  { label: "رَدَاءَة", correct: true },
  { label: "رَدَائِه", correct: false },
];

/* ── بيانات المراجعة الذكية (القاعدة والتعليل) — بيانات، لا منطق ── */
const DEFAULT_RULE =
  "تُكتب الهمزة المتوسطة منفردة على السطر إذا جاءت مفتوحة بعد ألف مدٍّ ساكنة، أو مفتوحة بعد واو مدٍّ ساكنة.";
const DEFAULT_OYSTER1_EXPLANATIONS = [
  "الهمزة في «قراءة» مفتوحة وسبقها ألف مد ساكنة، فتُكتب منفردة على السطر.",
  "الهمزة في «عباءة» مفتوحة وسبقها ألف مد ساكنة، فتُكتب منفردة على السطر.",
  "الهمزة في «مروءة» مفتوحة وسبقها واو مد ساكنة، فتُكتب منفردة على السطر.",
];
const DEFAULT_OYSTER2_EXPLANATION =
  "في «قراءة»: الألف قبل الهمزة ساكنة (حرف مد)، والهمزة نفسها مفتوحة — ولذلك كُتبت منفردة على السطر.";
const DEFAULT_OYSTER3_EXPLANATION =
  "همزة «نبوءة» مفتوحة وجاءت بعد واو مد ساكنة، فتُكتب منفردة على السطر.";
const DEFAULT_OYSTER4_EXPLANATION =
  "الكلمة الصحيحة «رَدَاءَة»: الهمزة مفتوحة بعد ألف مد ساكنة، فتُكتب منفردة على السطر.";

const DEFAULT_CONTENT = {
  rule: DEFAULT_RULE,
  oyster1Sets: DEFAULT_OYSTER1_SETS,
  oyster1Explanations: DEFAULT_OYSTER1_EXPLANATIONS,
  oyster2AlefOptions: DEFAULT_OYSTER2_ALEF_OPTIONS,
  oyster2HamzaOptions: DEFAULT_OYSTER2_HAMZA_OPTIONS,
  oyster2Explanation: DEFAULT_OYSTER2_EXPLANATION,
  oyster3Options: DEFAULT_OYSTER3_OPTIONS,
  oyster3Explanation: DEFAULT_OYSTER3_EXPLANATION,
  oyster4Options: DEFAULT_OYSTER4_OPTIONS,
  oyster4Explanation: DEFAULT_OYSTER4_EXPLANATION,
};

/* ══════════════ مكوّنات ثابتة (خارج المكوّن الرئيسي) ══════════════ */

function TopBar({ pearls, oxygen, onBack }: { pearls: number; oxygen: number; onBack: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-3" style={{ background: "rgba(6,30,50,0.55)" }}>
      <button onClick={onBack} className="text-cyan-100 text-base">← الْمَهَامُّ</button>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1 bg-cyan-950/60 text-cyan-100 px-3 py-1 rounded-full text-base font-bold">🫧 {oxygen}</span>
        <span className="flex items-center gap-1 bg-cyan-950/60 text-yellow-200 px-3 py-1 rounded-full text-base font-bold">🦪 {pearls}</span>
      </div>
    </div>
  );
}

function OceanBackdrop({ phase, interactive, onActivate, reaction, reactKey }: { phase: Phase; interactive: boolean; onActivate: () => void; reaction: "idle" | "correct" | "wrong"; reactKey: number }) {
  const pos = PATH_POS[phase];
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{
        background: "linear-gradient(180deg, #7dd3fc 0%, #0ea5e9 25%, #0369a1 55%, #0c4a6e 80%, #082f49 100%)"
      }} />
      {/* فقاعات زخرفية */}
      {[...Array(14)].map((_, i) => (
        <div key={i} className="absolute rounded-full bg-white/20"
          style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, width: 6 + (i % 4) * 4, height: 6 + (i % 4) * 4 }} />
      ))}
      <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M12,10 Q25,25 40,40 T68,66 T90,90" fill="none" stroke="#e0f2fe" strokeWidth="0.8" strokeDasharray="2,2" />
      </svg>
      {(["intro", "video", "oyster1", "oyster2", "oyster3", "oyster4", "chest"] as Phase[]).map((p, i) => {
        const done = PHASES.indexOf(phase) > PHASES.indexOf(p);
        const active = phase === p;
        const clickable = active && interactive;
        return (
          <div key={p} onClick={clickable ? onActivate : undefined}
            className={`absolute flex items-center justify-center rounded-full shadow-lg transition-all ${active ? "pearl-node-active" : ""} ${clickable ? "cursor-pointer" : ""}`}
            style={{
              left: `${PATH_POS[p].x}%`, top: `${PATH_POS[p].y}%`,
              width: active ? 40 : 30, height: active ? 40 : 30,
              transform: "translate(-50%, -50%)",
              background: done
                ? "radial-gradient(circle at 35% 30%, #fff, #6ee7b7 60%, #059669)"
                : "radial-gradient(circle at 35% 30%, #fff, #7dd3fc 55%, #0c4a6e)",
              border: "2px solid rgba(255,255,255,0.75)",
              fontSize: active ? 18 : 14,
            }}>
            {i === 6 ? "🏆" : done ? "✨" : "🦪"}
          </div>
        );
      })}
      {interactive && (
        <div className="absolute whitespace-nowrap text-center pointer-events-none" style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -170%)", animation: "hintBob2 1s ease-in-out infinite" }}>
          <span className="px-3 py-1.5 rounded-full font-bold text-sm shadow-lg" style={{ background: "#f0f9ff", color: "#0c4a6e", border: "2px solid #0891b2" }}>👆 اضْغَطْ هُنَا</span>
        </div>
      )}
      <style>{`
        @keyframes pearlNodePulse { 0%,100% { box-shadow: 0 0 0 0 rgba(8,145,178,0.6); } 50% { box-shadow: 0 0 0 8px rgba(8,145,178,0); } }
        @keyframes hintBob2 { 0%,100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, -6px); } }
        .pearl-node-active { animation: pearlNodePulse 1.8s ease-out infinite; }
      `}</style>
      <div key={reactKey} className={`absolute text-5xl transition-all duration-500 ease-out ${reaction === "correct" ? "char-bounce-correct" : reaction === "wrong" ? "char-shake-wrong" : ""}`}
        style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -110%)", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.4))" }}>
        {reaction === "correct" ? "🤿😄" : reaction === "wrong" ? "🤿😟" : "🤿"}
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
    <div className="relative z-10 max-w-3xl w-full mx-4 rounded-3xl p-8 shadow-2xl" style={{ background: "rgba(240,249,255,0.72)", border: "3px solid #0891b2", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
      {children}
    </div>
  );
}

function FeedbackBanner({ feedback }: { feedback: "correct" | "wrong" | null }) {
  if (!feedback) return null;
  return (
    <div className="mt-4 text-center font-bold text-xl" style={{ color: feedback === "correct" ? "#059669" : "#dc2626" }}>
      {feedback === "correct" ? "✅ أَحْسَنْتَ! فَتَحْتَ الْمَحَارَةَ" : "❌ حَاوِلْ مَرَّةً أُخْرَى"}
    </div>
  );
}

/* ── أسلوب اللعب الجديد: صيد اللآلئ — خيارات عائمة تُلتقط باللمس بدل أزرار ثابتة ── */
function PearlStyles() {
  return (
    <style>{`
      @keyframes pearlBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
      @keyframes pearlPop { 0% { transform: scale(1); opacity: 1; } 60% { transform: scale(1.25); opacity: 1; } 100% { transform: scale(0.3); opacity: 0; } }
      @keyframes pearlShake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
      .pearl-idle { animation: pearlBob 2.6s ease-in-out infinite; }
      .pearl-correct { animation: pearlPop 0.55s ease-out forwards; }
      .pearl-wrong { animation: pearlShake 0.4s ease-in-out; border-color: #dc2626 !important; background: #fee2e2 !important; }
    `}</style>
  );
}

function PearlOption({ label, index, status, wide, onClick }: {
  label: string; index: number; status: "idle" | "picked-correct" | "picked-wrong"; wide?: boolean; onClick: () => void;
}) {
  const cls = status === "picked-correct" ? "pearl-correct" : status === "picked-wrong" ? "pearl-wrong" : "pearl-idle";
  return (
    <button
      onClick={onClick}
      disabled={status === "picked-correct"}
      className={`${cls} flex items-center justify-center text-center font-bold active:scale-95 transition-colors`}
      style={{
        animationDelay: `${(index % 4) * 0.35}s`,
        background: "radial-gradient(circle at 35% 30%, #ffffff, #e0f2fe 60%, #bae6fd)",
        border: "2px solid #7dd3fc",
        color: "#0c4a6e",
        borderRadius: wide ? "999px" : "50%",
        width: wide ? "auto" : 92,
        height: wide ? "auto" : 92,
        padding: wide ? "14px 22px" : 8,
        fontSize: wide ? 15 : 22,
        fontFamily: "'Amiri', serif",
        boxShadow: "0 4px 10px rgba(8,74,110,0.25)",
      }}>
      {label}
    </button>
  );
}

function PearlField({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-center gap-4 py-2">{children}</div>;
}

/* ══════════════ المكوّن الرئيسي ══════════════ */

export default function DiverPearlLesson() {
  const [, setLocation] = useLocation();
  const [content, setContent] = useState(DEFAULT_CONTENT);
  useEffect(() => {
    getHamzaJourneys().then(d => {
      if (d?.l2) setContent(c => ({ ...c, ...d.l2 }));
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
  const [pearls, setPearls] = useState(0);
  const [oxygen, setOxygen] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const [oyster1Step, setOyster1Step] = useState(0);
  const [oyster2Step, setOyster2Step] = useState<"alef" | "hamza">("alef");
  const [chestOpened, setChestOpened] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [round, setRound] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoDone, setVideoDone] = useState(false);

  const oyster1Options = useMemo(() => shuffle(content.oyster1Sets[oyster1Step]), [oyster1Step, round]);
  const oyster3Options = useMemo(() => shuffle(content.oyster3Options), [round]);
  const oyster2AlefOptions = useMemo(() => shuffle(content.oyster2AlefOptions), [round]);
  const oyster2HamzaOptions = useMemo(() => shuffle(content.oyster2HamzaOptions), [round]);
  const oyster4Options = useMemo(() => shuffle(content.oyster4Options), [round]);

  function goNext(nextPhase: Phase, gainedPearls = 0, gainedOxygen = false) {
    if (gainedPearls) setPearls(p => p + gainedPearls);
    if (gainedOxygen) setOxygen(o => o + 1);
    setFeedback(null);
    setTimeout(() => { setPhase(nextPhase); setSelectedIdx(null); setCardVisible(false); }, 550);
  }

  function celebrate() {
    try { playEffect(audioFile("/assets/correct.mp3"), 0.7); } catch {}
  }

  function resetAll() {
    setPhase("intro"); setPearls(0); setOxygen(0); setOyster1Step(0);
    setOyster2Step("alef"); setSelectedIdx(null);
    setChestOpened(false); setVideoDone(false); setFeedback(null);
    setRound(r => r + 1); setCardVisible(true);
    resetCombo(); setMistakes({}); setWrongCount(0); startTimeRef.current = Date.now();
  }

  function chooseOyster1(idx: number, correct: boolean) {
    setSelectedIdx(idx);
    if (correct) {
      celebrate(); charReact(true); registerCombo(true);
      setFeedback("correct");
      if (oyster1Step < content.oyster1Sets.length - 1) {
        setTimeout(() => { setOyster1Step(s => s + 1); setFeedback(null); setSelectedIdx(null); }, 700);
      } else {
        goNext("oyster2", 10);
      }
    } else {
      charReact(false); registerCombo(false);
      logMistake(`oyster1-${oyster1Step}`, {
        question: "كِتَابَةُ الْهَمْزَةِ الْمُتَوَسِّطَةِ مُنْفَرِدَةً فِي هَذِهِ الْكَلِمَةِ",
        userAnswer: oyster1Options[idx].label,
        correctAnswer: oyster1Options.find(o => o.correct)?.label ?? "",
        rule: content.rule,
        explanation: content.oyster1Explanations[oyster1Step],
      });
      setFeedback("wrong");
      setTimeout(() => setSelectedIdx(null), 500);
    }
  }

  function chooseOyster2(idx: number, correct: boolean) {
    setSelectedIdx(idx);
    if (!correct) {
      charReact(false); registerCombo(false);
      const opts = oyster2Step === "alef" ? oyster2AlefOptions : oyster2HamzaOptions;
      logMistake(`oyster2-${oyster2Step}`, {
        question: oyster2Step === "alef" ? "حَرَكَةُ الْأَلِفِ فِي كَلِمَةِ (قِراءَة)" : "حَرَكَةُ الْهَمْزَةِ فِي كَلِمَةِ (قِراءَة)",
        userAnswer: opts[idx].label,
        correctAnswer: opts.find(o => o.correct)?.label ?? "",
        rule: content.rule,
        explanation: content.oyster2Explanation,
      });
      setFeedback("wrong"); setTimeout(() => setSelectedIdx(null), 500); return;
    }
    charReact(true); registerCombo(true);
    if (oyster2Step === "alef") {
      setFeedback("correct");
      setTimeout(() => { setOyster2Step("hamza"); setFeedback(null); setSelectedIdx(null); }, 700);
    } else {
      celebrate(); setFeedback("correct");
      goNext("oyster3", 20, true);
    }
  }

  function chooseOyster3(idx: number, correct: boolean) {
    setSelectedIdx(idx);
    if (correct) {
      celebrate(); charReact(true); registerCombo(true);
      setFeedback("correct"); goNext("oyster4", 20);
    } else {
      charReact(false); registerCombo(false);
      logMistake("oyster3", {
        question: "لِمَاذَا كُتِبَتِ الْهَمْزَةُ مُنْفَرِدَةً عَلَى السَّطْرِ فِي كَلِمَةِ (نُبُوءَة)؟",
        userAnswer: oyster3Options[idx].text,
        correctAnswer: oyster3Options.find(o => o.correct)?.text ?? "",
        rule: content.rule,
        explanation: content.oyster3Explanation,
      });
      setFeedback("wrong"); setTimeout(() => setSelectedIdx(null), 500);
    }
  }

  function chooseOyster4(idx: number, correct: boolean) {
    setSelectedIdx(idx);
    if (correct) {
      celebrate(); charReact(true); registerCombo(true);
      setFeedback("correct");
      goNext("chest", 30, true);
    } else {
      charReact(false); registerCombo(false);
      logMistake("oyster4", {
        question: "الْكِتَابَةُ الصَّحِيحَةُ لِلْكَلِمَةِ الَّتِي تَصِفُ سُوءَ الْخُلُقِ",
        userAnswer: oyster4Options[idx].label,
        correctAnswer: oyster4Options.find(o => o.correct)?.label ?? "",
        rule: content.rule,
        explanation: content.oyster4Explanation,
      });
      setFeedback("wrong");
      setTimeout(() => setSelectedIdx(null), 500);
    }
  }

  function renderScreen() {
    switch (phase) {
      case "intro":
        return (
          <Card>
            <h1 className="text-3xl font-bold text-center mb-1" style={{ color: "#0c4a6e", fontFamily: "'Amiri', serif" }}>🤿 الْغَوَّاصُ وَصَائِدُ اللَّآلِئِ</h1>
            <p className="text-center text-cyan-700 text-base mb-5">الْهَمْزَةُ الْمُتَوَسِّطَةُ الْمُنْفَرِدَةُ عَلَى السَّطْرِ</p>
            <div className="bg-cyan-50 rounded-2xl p-4 mb-5 border border-cyan-200">
              <p className="font-bold text-cyan-900 mb-2 text-base">🎯 أَهْدَافُ غَوْصَتِنَا الْيَوْمَ:</p>
              <ul className="text-cyan-800 text-lg font-semibold space-y-2 leading-relaxed">
                <li>١. اسْتِنْتَاجُ مَوَاضِعِ كِتَابَةِ الْهَمْزَةِ الْمُتَوَسِّطَةِ الْمُنْفَرِدَةِ عَلَى السَّطْرِ.</li>
                <li>٢. تَوْضِيحُ سَبَبِ كِتَابَتِهَا (مَفْتُوحَةٌ بَعْدَ أَلِفِ مَدٍّ أَوْ وَاوِ مَدٍّ).</li>
                <li>٣. تَطْبِيقُ الْقَاعِدَةِ وَإِتْقَانُ كِتَابَتِهَا إِمْلَائِيًّا.</li>
              </ul>
            </div>
            <button onClick={() => goNext("video")} className="w-full py-3.5 rounded-2xl text-white font-bold text-xl active:scale-95 transition-all" style={{ background: "#0891b2" }}>
              🏊 ارْتَدِ مَلَابِسَ الْغَوْصِ وَابْدَأْ
            </button>
          </Card>
        );

      case "video":
        return (
          <Card>
            <h2 className="text-2xl font-bold text-center mb-4" style={{ color: "#0c4a6e" }}>📺 مَحَطَّةُ الْمَعْرِفَةِ الْمَائِيَّةِ</h2>
            <div className="rounded-2xl overflow-hidden bg-black mb-4" style={{ aspectRatio: "16/9" }}>
              <video ref={videoRef} controls className="w-full h-full" onEnded={() => setVideoDone(true)} src="/videos/hamza-satr.mp4">
                متصفحك لا يدعم عرض الفيديو.
              </video>
            </div>
            {!videoDone && <p className="text-center text-cyan-600 text-sm mb-3">🔒 شَاهِدِ الْفِيدِيُو كَامِلاً لِلنُّزُولِ لِلْأَعْمَاقِ</p>}
            <button onClick={() => goNext("oyster1")} disabled={!videoDone}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-xl active:scale-95 transition-all disabled:opacity-40" style={{ background: "#0891b2" }}>
              🦪 انْزِلْ لِلْأَعْمَاقِ
            </button>
          </Card>
        );

      case "oyster1": {
        const options = oyster1Options;
        return (
          <Card>
            <p className="text-sm text-cyan-500 mb-1">🦪 الْمَحَارَةُ الْأُولَى — سُؤَالُ {oyster1Step + 1}/{content.oyster1Sets.length}</p>
            <h2 className="text-2xl font-bold mb-5" style={{ color: "#0c4a6e" }}>لآلِئُ تَطْفُو أَمَامَكَ، الْتَقِطِ اللُّؤْلُؤَةَ الَّتِي تَحْمِلُ الْكَلِمَةَ الصَّحِيحَةَ إِمْلَائِيًّا:</h2>
            <PearlField>
              {options.map((o, i) => (
                <PearlOption key={i} index={i} label={o.label}
                  status={selectedIdx !== i ? "idle" : o.correct ? "picked-correct" : "picked-wrong"}
                  onClick={() => chooseOyster1(i, o.correct)} />
              ))}
            </PearlField>
            <FeedbackBanner feedback={feedback} />
          </Card>
        );
      }

      case "oyster2": {
        const isAlef = oyster2Step === "alef";
        const options = isAlef ? oyster2AlefOptions : oyster2HamzaOptions;
        return (
          <Card>
            <p className="text-sm text-cyan-500 mb-1">🦪 الْمَحَارَةُ الثَّانِيَةُ — حَرَكَةُ الْهَمْزَةِ وَالْحَرْفِ السَّابِقِ</p>
            <h2 className="text-2xl font-bold mb-3" style={{ color: "#0c4a6e" }}>تَأَمَّلْ كَلِمَةَ (قِراءَة)، وَاخْتَرِ الْحَرَكَةَ الصَّحِيحَةَ:</h2>
            <p className="text-center text-4xl font-bold mb-2 p-3 rounded-2xl" style={{ background: "#e0f2fe", color: "#0c4a6e", fontFamily: "'Amiri', serif" }}>
              قِر<span className={isAlef ? "underline decoration-wavy decoration-cyan-600" : ""}>ا</span><span className={!isAlef ? "underline decoration-wavy decoration-cyan-600" : ""}>ء</span>َة
            </p>
            <p className="text-center text-sm text-cyan-600 mb-4">{isAlef ? "أَوَّلًا: مَا حَرَكَةُ الْأَلِفِ (الْحَرْفُ السَّابِقُ لِلْهَمْزَةِ)؟" : "ثَانِيًا: مَا حَرَكَةُ الْهَمْزَةِ نَفْسِهَا؟"}</p>
            <PearlField>
              {options.map((o, i) => (
                <PearlOption key={i} index={i} label={o.label}
                  status={selectedIdx !== i ? "idle" : o.correct ? "picked-correct" : "picked-wrong"}
                  onClick={() => chooseOyster2(i, o.correct)} />
              ))}
            </PearlField>
            <FeedbackBanner feedback={feedback} />
          </Card>
        );
      }

      case "oyster3":
        return (
          <Card>
            <p className="text-sm text-cyan-500 mb-1">🦪 الْمَحَارَةُ الثَّالِثَةُ — تَحَدِّي التَّعْلِيلِ</p>
            <h2 className="text-2xl font-bold mb-5" style={{ color: "#0c4a6e", fontFamily: "'Amiri', serif" }}>لِمَاذَا كُتِبَتِ الْهَمْزَةُ مُنْفَرِدَةً عَلَى السَّطْرِ فِي كَلِمَةِ (نُبوءَة)؟ الْتَقِطِ الْمَحَارَةَ الَّتِي تَحْمِلُ التَّعْلِيلَ الصَّحِيحَ:</h2>
            <PearlField>
              {oyster3Options.map((o, i) => (
                <PearlOption key={i} index={i} label={`${i + 1}. ${o.text}`} wide
                  status={selectedIdx !== i ? "idle" : o.correct ? "picked-correct" : "picked-wrong"}
                  onClick={() => chooseOyster3(i, o.correct)} />
              ))}
            </PearlField>
            <FeedbackBanner feedback={feedback} />
          </Card>
        );

      case "oyster4":
        return (
          <Card>
            <p className="text-sm text-cyan-500 mb-1">🦪 الْمَحَارَةُ الرَّابِعَةُ وَالْأَخِيرَةُ — تَحَدِّي التَّصْحِيحِ</p>
            <h2 className="text-2xl font-bold mb-3" style={{ color: "#0c4a6e" }}>هَاجَمَتْ سَمَكَةُ الْقِرْشِ الْكَلِمَةَ وَأَفْسَدَتْ كِتَابَتَهَا! الْتَقِطِ اللُّؤْلُؤَةَ الَّتِي تَحْمِلُ الشَّكْلَ الصَّحِيحَ:</h2>
            <p className="text-center text-2xl font-bold mb-5 p-4 rounded-2xl leading-loose" style={{ background: "#e0f2fe", color: "#0c4a6e", fontFamily: "'Amiri', serif" }}>
              يَتَّصِفُ هَذَا الرَّجُلُ بِالـ <span className="text-red-500 underline decoration-wavy">رَدَاءَه</span> فِي أَخْلَاقِهِ
            </p>
            <PearlField>
              {oyster4Options.map((o, i) => (
                <PearlOption key={i} index={i} label={o.label}
                  status={selectedIdx !== i ? "idle" : o.correct ? "picked-correct" : "picked-wrong"}
                  onClick={() => chooseOyster4(i, o.correct)} />
              ))}
            </PearlField>
            <FeedbackBanner feedback={feedback} />
          </Card>
        );

      case "chest":
        return (
          <Card>
            {!chestOpened ? (
              <div className="text-center">
                <div className="text-7xl mb-4 animate-bounce">🗝️📦</div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: "#0c4a6e" }}>وَصَلْتَ إِلَى صُنْدُوقِ الْكَنْزِ الْغَارِقِ!</h2>
                <p className="text-cyan-700 text-base mb-5">اسْتَخْدِمْ مِفْتَاحَيِ الْأُوكْسِجِينِ لِفَتْحِهِ ({oxygen}/2 🫧)</p>
                <button onClick={() => setChestOpened(true)} disabled={oxygen < 2}
                  className="py-3.5 px-8 rounded-2xl text-white font-bold text-xl active:scale-95 transition-all disabled:opacity-40" style={{ background: "#0e7490" }}>
                  🔓 افْتَحِ الصُّنْدُوقَ
                </button>
              </div>
            ) : (
              <div>
                <div className="text-6xl text-center mb-3">✨🏆🐚</div>
                <h2 className="text-2xl font-bold text-center mb-4" style={{ color: "#0c4a6e" }}>الْقَاعِدَةُ الذَّهَبِيَّةُ تَحْتَ الْمَاءِ</h2>
                <div className="rounded-2xl p-4 mb-5" style={{ background: "#e0f2fe", border: "2px solid #0891b2" }}>
                  <p className="text-cyan-900 leading-relaxed text-lg font-semibold mb-2">
                    تُكْتَبُ الْهَمْزَةُ الْمُتَوَسِّطَةُ مُنْفَرِدَةً عَلَى السَّطْرِ فِي حَالَتَيْنِ:
                  </p>
                  <ul className="space-y-1 text-cyan-800 text-base">
                    <li>• إِذَا جَاءَتِ الْهَمْزَةُ مَفْتُوحَةً بَعْدَ أَلِفِ مَدٍّ سَاكِنَةٍ (مِثْلَ: عَباءَة).</li>
                    <li>• أَوْ إِذَا جَاءَتْ مَفْتُوحَةً بَعْدَ وَاوِ مَدٍّ سَاكِنَةٍ (مِثْلَ: مُروءَة).</li>
                  </ul>
                </div>
                <button onClick={() => setPhase("results")}
                  className="w-full py-3.5 rounded-2xl text-white font-bold text-xl active:scale-95 transition-all" style={{ background: "#0891b2" }}>
                  عَرْضُ النَّتِيجَةِ 🎉
                </button>
              </div>
            )}
          </Card>
        );

      case "results": {
        const elapsedSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
        const achievements = evaluateAchievements({
          totalQuestions: content.oyster1Sets.length + 3, wrongCount, maxCombo, elapsedSeconds,
        });
        return (
          <Card>
            <VictoryModal
              title="أَحْسَنْتَ أَيُّهَا الْغَوَّاصُ الْمَاهِرُ!"
              subtitle="أَتْمَمْتَ رِحْلَةَ الْهَمْزَةِ عَلَى السَّطْرِ بِنَجَاحٍ"
              points={pearls + comboBonus} pointsLabel="🦪 لُؤْلُؤَة"
              secondaryValue={oxygen} secondaryLabel="🫧 أُوكْسِجِين"
              achievements={achievements}
            >
              <div className="flex gap-3">
                <button onClick={resetAll} className="flex-1 py-3 rounded-2xl font-bold" style={{ background: "#e0f2fe", color: "#0c4a6e", border: "2px solid #7dd3fc" }}>
                  🔄 إِعَادَةُ اللَّعِبِ
                </button>
                <button onClick={() => setLocation("/writing-games")} className="flex-1 py-3 rounded-2xl text-white font-bold" style={{ background: "#0891b2" }}>
                  لُعْبَةُ الْهَمْزَةِ الْمُتَطَرِّفَةِ ←
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
      <PearlStyles />
      <GameFeelStyles />
      <ComboIndicator combo={combo} pulseKey={pulseKey} accent="#0891b2" />
      <OceanBackdrop phase={phase} interactive={!cardVisible} onActivate={() => setCardVisible(true)} reaction={reaction} reactKey={reactKey} />
      <div className="relative z-10 flex flex-col min-h-screen">
        <TopBar pearls={pearls} oxygen={oxygen} onBack={() => setLocation("/writing-games")} />
        <div className="flex-1 flex items-start justify-center pt-6 pb-8 overflow-y-auto">
          {cardVisible && <div key={phase} className="fade-in-up w-full flex justify-center">{renderScreen()}</div>}
        </div>
      </div>
    </div>
  );
}
