import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { playEffect, audioFile } from "@/lib/audio";
import { getHamzaJourneys } from "@/lib/api";
import {
  GameFeelStyles, useCombo, ComboIndicator, useCharacterReaction,
  VictoryModal, SmartReview, evaluateAchievements, type MistakeRecord,
} from "@/lib/game-widgets";

/* ══════════════════════════════════════════════════════════════
   قَائِدُ الْمِنْطَادِ وَجَزِيرَةُ الْهَمَزَاتِ الْمُعَلَّقَةِ — الهمزة المتطرفة
   لعبة مسار تفاعلية بثيم السماء والمنطاد — ٤ غيوم + صندوق كنز طائر

   ملاحظة بنيوية: كل المكوّنات الفرعية مُعرَّفة خارج المكوّن الرئيسي
   (نفس أسلوب لعبتَي "رحلة الكنز" و"الغواص") لتفادي مشاكل فقدان
   التركيز وأخطاء الـ Hooks.
   ══════════════════════════════════════════════════════════════ */

type Phase = "intro" | "video" | "cloud1" | "cloud2" | "cloud3" | "cloud4" | "island" | "results";
const PHASES: Phase[] = ["intro", "video", "cloud1", "cloud2", "cloud3", "cloud4", "island", "results"];

const PATH_POS: Record<Phase, { x: number; y: number }> = {
  intro:  { x: 8,  y: 85 },
  video:  { x: 24, y: 68 },
  cloud1: { x: 38, y: 55 },
  cloud2: { x: 51, y: 47 },
  cloud3: { x: 66, y: 50 },
  cloud4: { x: 79, y: 45 },
  island: { x: 92, y: 18 },
  results:{ x: 92, y: 18 },
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DEFAULT_CLOUD1_OPTIONS = [
  { text: "فِي أَوَّلِ الْكَلِمَةِ", correct: false },
  { text: "فِي وَسَطِ الْكَلِمَةِ", correct: false },
  { text: "فِي نِهَايَةِ الْكَلِمَةِ", correct: true },
];

const DEFAULT_CLOUD2_OPTIONS = [
  { label: "فَتْحَة", correct: false },
  { label: "ضَمَّة", correct: false },
  { label: "كَسْرَة", correct: true },
  { label: "سُكُون", correct: false },
];

const DEFAULT_CLOUD3_OPTIONS = [
  { text: "لِأَنَّ الْحَرْفَ الَّذِي يَسْبِقُهَا مَضْمُومٌ، وَالضَّمَّةُ تُنَاسِبُهَا الْوَاوُ", correct: true },
  { text: "لِأَنَّ الْهَمْزَةَ نَفْسَهَا مَضْمُومَةٌ", correct: false },
  { text: "لِأَنَّ الْحَرْفَ الَّذِي يَسْبِقُهَا سَاكِنٌ", correct: false },
];

// الغيمة الرابعة (بعد التحويل من إدخال نصي إلى تصويب الهدف الصحيح):
// نفس كلمة "دفء" الأصلية، مع مموّهات هي مقاعد الهمزة الأخرى (نبرة/واو)
const DEFAULT_CLOUD4_OPTIONS = [
  { label: "دِفْء", correct: true },
  { label: "دَفُو", correct: false },
  { label: "دِفْئ", correct: false },
];

/* ── بيانات المراجعة الذكية (القاعدة والتعليل) — بيانات، لا منطق ── */
const DEFAULT_RULE =
  "تُكتب الهمزة المتطرفة بحسب حركة الحرف الذي يسبقها: على الألف إذا كان مفتوحًا، وعلى الواو إذا كان مضمومًا، وعلى الياء إذا كان مكسورًا، وعلى السطر إذا كان ساكنًا.";
const DEFAULT_CLOUD1_EXPLANATION =
  "الهمزة المتطرفة هي الهمزة التي تقع دائمًا في آخر الكلمة، ومن هنا جاء اسمها «متطرفة».";
const DEFAULT_CLOUD2_EXPLANATION =
  "حرف الطاء في «شاطئ» مكسور، ولذلك كُتبت الهمزة بعده على ياء.";
const DEFAULT_CLOUD3_EXPLANATION =
  "الحرف الذي يسبق الهمزة في «يجرؤ» (الراء) مضموم، والضمة تناسبها الواو، فكُتبت الهمزة على واو.";
const DEFAULT_CLOUD4_EXPLANATION =
  "الكلمة الصحيحة «دِفْء»: الحرف الذي يسبق الهمزة (الفاء) ساكن، فتُكتب الهمزة على السطر.";

const DEFAULT_CONTENT = {
  rule: DEFAULT_RULE,
  cloud1Options: DEFAULT_CLOUD1_OPTIONS,
  cloud1Explanation: DEFAULT_CLOUD1_EXPLANATION,
  cloud2Options: DEFAULT_CLOUD2_OPTIONS,
  cloud2Explanation: DEFAULT_CLOUD2_EXPLANATION,
  cloud3Options: DEFAULT_CLOUD3_OPTIONS,
  cloud3Explanation: DEFAULT_CLOUD3_EXPLANATION,
  cloud4Options: DEFAULT_CLOUD4_OPTIONS,
  cloud4Explanation: DEFAULT_CLOUD4_EXPLANATION,
};

/* ══════════════ مكوّنات ثابتة (خارج المكوّن الرئيسي) ══════════════ */

function TopBar({ stars, fuel, onBack }: { stars: number; fuel: number; onBack: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-3" style={{ background: "rgba(15,23,42,0.4)" }}>
      <button onClick={onBack} className="text-blue-100 text-base">← الْمَهَامُّ</button>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1 bg-slate-900/50 text-orange-200 px-3 py-1 rounded-full text-base font-bold">⛽ {fuel}</span>
        <span className="flex items-center gap-1 bg-slate-900/50 text-yellow-300 px-3 py-1 rounded-full text-base font-bold">⭐ {stars}</span>
      </div>
    </div>
  );
}

function SkyBackdrop({ phase, interactive, onActivate, reaction, reactKey }: { phase: Phase; interactive: boolean; onActivate: () => void; reaction: "idle" | "correct" | "wrong"; reactKey: number }) {
  const pos = PATH_POS[phase];
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{
        background: "linear-gradient(180deg, #7dd3fc 0%, #38bdf8 30%, #60a5fa 65%, #93c5fd 100%)"
      }} />
      {/* غيوم متحركة زخرفية */}
      {[...Array(8)].map((_, i) => (
        <div key={i} className="absolute text-5xl opacity-70" style={{ left: `${(i * 29) % 100}%`, top: `${8 + (i * 17) % 70}%` }}>☁️</div>
      ))}
      <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M8,85 Q20,70 38,55 T66,50 T92,18" fill="none" stroke="#1e3a8a" strokeWidth="0.8" strokeDasharray="2,2" />
      </svg>
      {(["intro", "video", "cloud1", "cloud2", "cloud3", "cloud4", "island"] as Phase[]).map((p, i) => {
        const done = PHASES.indexOf(phase) > PHASES.indexOf(p);
        const active = phase === p;
        const clickable = active && interactive;
        return (
          <div key={p} onClick={clickable ? onActivate : undefined}
            className={`absolute flex items-center justify-center rounded-full shadow-lg transition-all ${clickable ? "target-active-pulse cursor-pointer" : ""}`}
            style={{
              left: `${PATH_POS[p].x}%`, top: `${PATH_POS[p].y}%`,
              width: active ? 42 : 28, height: active ? 42 : 28,
              transform: "translate(-50%, -50%)",
              background: done ? "#059669" : "rgba(255,255,255,0.25)",
              border: `2px dashed ${done ? "rgba(255,255,255,0.8)" : active ? "#ea580c" : "#1e3a8a"}`,
              fontSize: active ? 18 : 12,
            }}>
            {i === 6 ? "🏆" : done ? "✅" : "🎯"}
          </div>
        );
      })}
      {interactive && (
        <div className="absolute whitespace-nowrap text-center pointer-events-none" style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -170%)", animation: "hintBob3 1s ease-in-out infinite" }}>
          <span className="px-3 py-1.5 rounded-full font-bold text-sm shadow-lg" style={{ background: "#f8fafc", color: "#1e3a8a", border: "2px solid #1e40af" }}>👆 اضْغَطْ هُنَا</span>
        </div>
      )}
      <style>{`
        @keyframes targetActivePulse { 0%,100% { box-shadow: 0 0 0 0 rgba(234,88,12,0.6); } 50% { box-shadow: 0 0 0 10px rgba(234,88,12,0); } }
        @keyframes hintBob3 { 0%,100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, -6px); } }
        .target-active-pulse { animation: targetActivePulse 1.1s ease-in-out infinite; }
      `}</style>
      <div key={reactKey} className={`absolute text-5xl transition-all duration-500 ease-out ${reaction === "correct" ? "char-bounce-correct" : reaction === "wrong" ? "char-shake-wrong" : ""}`}
        style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -110%)", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.4))" }}>
        {reaction === "correct" ? "🎈😄" : reaction === "wrong" ? "🎈😟" : "🎈"}
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
    <div className="relative z-10 max-w-3xl w-full mx-4 rounded-3xl p-8 shadow-2xl" style={{ background: "rgba(248,250,252,0.72)", border: "3px solid #1e40af", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
      {children}
    </div>
  );
}

function FeedbackBanner({ feedback }: { feedback: "correct" | "wrong" | null }) {
  if (!feedback) return null;
  return (
    <div className="mt-4 text-center font-bold text-xl" style={{ color: feedback === "correct" ? "#059669" : "#dc2626" }}>
      {feedback === "correct" ? "✅ أَحْسَنْتَ! تَجَاوَزْتَ الْغَيْمَةَ" : "❌ حَاوِلْ مَرَّةً أُخْرَى"}
    </div>
  );
}

/* ── أسلوب اللعب الجديد: تصويب الأهداف — يختار قائد المنطاد الهدف الصحيح
   من بين أهداف متناثرة، فيصيبها بسهم وتنفجر بنجمة، أو يخطئها وتظهر علامة إخفاق ── */
function TargetStyles() {
  return (
    <style>{`
      @keyframes targetDrift { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-4px) rotate(1.5deg); } }
      @keyframes targetHit { 0% { transform: scale(1); opacity: 1; } 40% { transform: scale(1.3); opacity: 1; } 100% { transform: scale(0); opacity: 0; } }
      @keyframes targetMiss { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-5px) rotate(-2deg); } 60% { transform: translateX(5px) rotate(2deg); } }
      .target-idle { animation: targetDrift 3.2s ease-in-out infinite; }
      .target-hit { animation: targetHit 0.5s ease-out forwards; }
      .target-miss { animation: targetMiss 0.35s ease-in-out; border-color: #dc2626 !important; }
    `}</style>
  );
}

function TargetOption({ label, index, status, wide, onClick }: {
  label: string; index: number; status: "idle" | "hit" | "miss"; wide?: boolean; onClick: () => void;
}) {
  const cls = status === "hit" ? "target-hit" : status === "miss" ? "target-miss" : "target-idle";
  return (
    <button
      onClick={onClick}
      disabled={status === "hit"}
      className={`${cls} flex items-center justify-center text-center font-bold active:scale-95 transition-colors`}
      style={{
        animationDelay: `${(index % 3) * 0.4}s`,
        background: "repeating-radial-gradient(circle, #eff6ff 0 14px, #bfdbfe 14px 22px, #eff6ff 22px 30px)",
        border: "3px dashed #1d4ed8",
        color: "#1e3a8a",
        borderRadius: wide ? "999px" : "50%",
        width: wide ? "auto" : 100,
        height: wide ? "auto" : 100,
        padding: wide ? "14px 22px" : 10,
        fontSize: wide ? 14 : 17,
        boxShadow: "0 4px 10px rgba(30,58,138,0.25)",
      }}>
      🎯 {label}
    </button>
  );
}

function TargetField({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-center gap-4 py-2">{children}</div>;
}

/* ══════════════ المكوّن الرئيسي ══════════════ */

export default function BalloonHamzaLesson() {
  const [, setLocation] = useLocation();
  const [content, setContent] = useState(DEFAULT_CONTENT);
  useEffect(() => {
    getHamzaJourneys().then(d => {
      if (d?.l3) setContent(c => ({ ...c, ...d.l3 }));
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
  const [stars, setStars] = useState(0);
  const [fuel, setFuel] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const [islandOpened, setIslandOpened] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [round, setRound] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoDone, setVideoDone] = useState(false);

  const cloud1Options = useMemo(() => shuffle(content.cloud1Options), [round]);
  const cloud2Options = useMemo(() => shuffle(content.cloud2Options), [round]);
  const cloud3Options = useMemo(() => shuffle(content.cloud3Options), [round]);
  const cloud4Options = useMemo(() => shuffle(content.cloud4Options), [round]);

  function goNext(nextPhase: Phase, gainedStars = 0, gainedFuel = false) {
    if (gainedStars) setStars(s => s + gainedStars);
    if (gainedFuel) setFuel(f => f + 1);
    setFeedback(null);
    setTimeout(() => { setPhase(nextPhase); setSelectedIdx(null); setCardVisible(false); }, 550);
  }

  function celebrate() {
    try { playEffect(audioFile("/assets/correct.mp3"), 0.7); } catch {}
  }

  function resetAll() {
    setPhase("intro"); setStars(0); setFuel(0); setSelectedIdx(null);
    setIslandOpened(false); setVideoDone(false); setFeedback(null);
    setRound(r => r + 1); setCardVisible(true);
    resetCombo(); setMistakes({}); setWrongCount(0); startTimeRef.current = Date.now();
  }

  function chooseCloud1(idx: number, correct: boolean) {
    setSelectedIdx(idx);
    if (correct) {
      celebrate(); charReact(true); registerCombo(true);
      setFeedback("correct"); goNext("cloud2", 10);
    } else {
      charReact(false); registerCombo(false);
      logMistake("cloud1", {
        question: "أَيْنَ تَسْكُنُ الْهَمْزَةُ الْمُتَطَرِّفَةُ دَائِمًا فِي الْكَلِمَةِ؟",
        userAnswer: cloud1Options[idx].text,
        correctAnswer: cloud1Options.find(o => o.correct)?.text ?? "",
        rule: content.rule,
        explanation: content.cloud1Explanation,
      });
      setFeedback("wrong"); setTimeout(() => setSelectedIdx(null), 500);
    }
  }

  function chooseCloud2(idx: number, correct: boolean) {
    setSelectedIdx(idx);
    if (correct) {
      celebrate(); charReact(true); registerCombo(true);
      setFeedback("correct"); goNext("cloud3", 20, true);
    } else {
      charReact(false); registerCombo(false);
      logMistake("cloud2", {
        question: "حَرَكَةُ حَرْفِ الطَّاءِ فِي كَلِمَةِ (شاطِئ)",
        userAnswer: cloud2Options[idx].label,
        correctAnswer: cloud2Options.find(o => o.correct)?.label ?? "",
        rule: content.rule,
        explanation: content.cloud2Explanation,
      });
      setFeedback("wrong"); setTimeout(() => setSelectedIdx(null), 500);
    }
  }

  function chooseCloud3(idx: number, correct: boolean) {
    setSelectedIdx(idx);
    if (correct) {
      celebrate(); charReact(true); registerCombo(true);
      setFeedback("correct"); goNext("cloud4", 20);
    } else {
      charReact(false); registerCombo(false);
      logMistake("cloud3", {
        question: "لِمَاذَا كُتِبَتِ الْهَمْزَةُ الْمُتَطَرِّفَةُ عَلَى وَاوٍ فِي كَلِمَةِ (يَجْرُؤ)؟",
        userAnswer: cloud3Options[idx].text,
        correctAnswer: cloud3Options.find(o => o.correct)?.text ?? "",
        rule: content.rule,
        explanation: content.cloud3Explanation,
      });
      setFeedback("wrong"); setTimeout(() => setSelectedIdx(null), 500);
    }
  }

  function chooseCloud4(idx: number, correct: boolean) {
    setSelectedIdx(idx);
    if (correct) {
      celebrate(); charReact(true); registerCombo(true);
      setFeedback("correct");
      goNext("island", 30, true);
    } else {
      charReact(false); registerCombo(false);
      logMistake("cloud4", {
        question: "الْكِتَابَةُ الصَّحِيحَةُ لِلْكَلِمَةِ الَّتِي تَصِفُ الدِّفْءَ",
        userAnswer: cloud4Options[idx].label,
        correctAnswer: cloud4Options.find(o => o.correct)?.label ?? "",
        rule: content.rule,
        explanation: content.cloud4Explanation,
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
            <h1 className="text-3xl font-bold text-center mb-1" style={{ color: "#1e3a8a", fontFamily: "'Amiri', serif" }}>🎈 قَائِدُ الْمِنْطَادِ</h1>
            <p className="text-center text-blue-700 text-base mb-5">الْهَمْزَةُ الْمُتَطَرِّفَةُ</p>
            <div className="bg-blue-50 rounded-2xl p-4 mb-5 border border-blue-200">
              <p className="font-bold text-blue-900 mb-2 text-base">🎯 أَهْدَافُ رِحْلَتِنَا الْجَوِّيَّةِ الْيَوْمَ:</p>
              <ul className="text-blue-800 text-lg font-semibold space-y-2 leading-relaxed">
                <li>١. تَحْدِيدُ مَفْهُومِ الْهَمْزَةِ الْمُتَطَرِّفَةِ وَمَوْقِعِهَا (فِي نِهَايَةِ الْكَلِمَةِ).</li>
                <li>٢. تَعْلِيلُ سَبَبِ كِتَابَتِهَا بِنَاءً عَلَى حَرَكَةِ الْحَرْفِ الَّذِي يَسْبِقُهَا.</li>
                <li>٣. تَطْبِيقُ الْقَاعِدَةِ وَكِتَابَةُ كَلِمَاتٍ صَحِيحَةٍ إِمْلَائِيًّا.</li>
              </ul>
            </div>
            <button onClick={() => goNext("video")} className="w-full py-3.5 rounded-2xl text-white font-bold text-xl active:scale-95 transition-all" style={{ background: "#1d4ed8" }}>
              🚀 شَغِّلِ الْمُحَرِّكَ وَحَلِّقْ
            </button>
          </Card>
        );

      case "video":
        return (
          <Card>
            <h2 className="text-2xl font-bold text-center mb-4" style={{ color: "#1e3a8a" }}>📺 مَحَطَّةُ الْأَرْصَادِ الْمَعْرِفِيَّةِ</h2>
            <div className="rounded-2xl overflow-hidden bg-black mb-4" style={{ aspectRatio: "16/9" }}>
              <video ref={videoRef} controls className="w-full h-full" onEnded={() => setVideoDone(true)} src="/videos/hamza-mutatarrifa.mp4">
                متصفحك لا يدعم عرض الفيديو.
              </video>
            </div>
            {!videoDone && <p className="text-center text-blue-600 text-sm mb-3">🔒 شَاهِدِ الْفِيدِيُو كَامِلاً لِلتَّوَجُّهِ نَحْوَ الْجَزِيرَةِ</p>}
            <button onClick={() => goNext("cloud1")} disabled={!videoDone}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-xl active:scale-95 transition-all disabled:opacity-40" style={{ background: "#1d4ed8" }}>
              ☁️ تَوَجَّهْ نَحْوَ جَزِيرَةِ الْكَنْزِ
            </button>
          </Card>
        );

      case "cloud1":
        return (
          <Card>
            <p className="text-sm text-blue-500 mb-1">☁️ الْغَيْمَةُ الْأُولَى — تَحَدِّي الْمَفْهُومِ</p>
            <h2 className="text-2xl font-bold mb-5" style={{ color: "#1e3a8a" }}>أَهْلًا بِكَ يَا قَائِدَ الْمِنْطَادِ! صَوِّبْ نَحْوَ الْهَدَفِ الصَّحِيحِ: أَيْنَ تَسْكُنُ الْهَمْزَةُ الْمُتَطَرِّفَةُ دَائِمًا فِي الْكَلِمَةِ؟</h2>
            <TargetField>
              {cloud1Options.map((o, i) => (
                <TargetOption key={i} index={i} label={o.text} wide
                  status={selectedIdx !== i ? "idle" : o.correct ? "hit" : "miss"}
                  onClick={() => chooseCloud1(i, o.correct)} />
              ))}
            </TargetField>
            <FeedbackBanner feedback={feedback} />
          </Card>
        );

      case "cloud2":
        return (
          <Card>
            <p className="text-sm text-blue-500 mb-1">☁️ الْغَيْمَةُ الثَّانِيَةُ — حَرَكَةُ الْحَرْفِ السَّابِقِ</p>
            <h2 className="text-2xl font-bold mb-3" style={{ color: "#1e3a8a" }}>
              الْهَمْزَةُ الْمُتَطَرِّفَةُ شَخْصِيَّةٌ حَسَّاسَةٌ، يَتَغَيَّرُ كُرْسِيُّهَا بِحَسَبِ حَرَكَةِ الْحَرْفِ الَّذِي يَسْبِقُهَا! انْظُرْ لِكَلِمَةِ (شاطِئ)، مَا حَرَكَةُ حَرْفِ الطَّاءِ؟
            </h2>
            <p className="text-center text-4xl font-bold mb-5 p-3 rounded-2xl" style={{ background: "#eff6ff", color: "#1e3a8a", fontFamily: "'Amiri', serif" }}>
              شَا<span className="underline decoration-wavy decoration-blue-600">طِ</span>ئ
            </p>
            <TargetField>
              {cloud2Options.map((o, i) => (
                <TargetOption key={i} index={i} label={o.label}
                  status={selectedIdx !== i ? "idle" : o.correct ? "hit" : "miss"}
                  onClick={() => chooseCloud2(i, o.correct)} />
              ))}
            </TargetField>
            <FeedbackBanner feedback={feedback} />
          </Card>
        );

      case "cloud3":
        return (
          <Card>
            <p className="text-sm text-blue-500 mb-1">☁️ الْغَيْمَةُ الثَّالِثَةُ — تَعْلِيلُ الْكَرَاسِيِّ الْأَرْبَعَةِ</p>
            <h2 className="text-2xl font-bold mb-5" style={{ color: "#1e3a8a", fontFamily: "'Amiri', serif" }}>لِمَاذَا كُتِبَتِ الْهَمْزَةُ الْمُتَطَرِّفَةُ عَلَى وَاوٍ فِي كَلِمَةِ (يَجْرُؤ)؟ صَوِّبْ نَحْوَ الْهَدَفِ الصَّحِيحِ:</h2>
            <TargetField>
              {cloud3Options.map((o, i) => (
                <TargetOption key={i} index={i} label={`${i + 1}. ${o.text}`} wide
                  status={selectedIdx !== i ? "idle" : o.correct ? "hit" : "miss"}
                  onClick={() => chooseCloud3(i, o.correct)} />
              ))}
            </TargetField>
            <FeedbackBanner feedback={feedback} />
          </Card>
        );

      case "cloud4":
        return (
          <Card>
            <p className="text-sm text-blue-500 mb-1">☁️ الْغَيْمَةُ الرَّابِعَةُ — تَجَاوُزُ الْعَاصِفَةِ</p>
            <h2 className="text-2xl font-bold mb-3" style={{ color: "#1e3a8a" }}>هُنَاكَ عَاصِفَةٌ إِمْلَائِيَّةٌ أَفْسَدَتِ الْكَلِمَةَ الْأَخِيرَةَ! صَوِّبْ نَحْوَ الْهَدَفِ الَّذِي يَحْمِلُ الشَّكْلَ الصَّحِيحَ لِتَصِلَ إِلَى بَرِّ الْأَمَانِ:</h2>
            <p className="text-center text-3xl font-bold mb-5 p-4 rounded-2xl" style={{ background: "#eff6ff", color: "#1e3a8a", fontFamily: "'Amiri', serif" }}>
              الْجَوُّ بَارِدٌ وَأَشْعُرُ بِالـ <span className="text-red-500 underline decoration-wavy">دَفُو</span>
            </p>
            <TargetField>
              {cloud4Options.map((o, i) => (
                <TargetOption key={i} index={i} label={o.label}
                  status={selectedIdx !== i ? "idle" : o.correct ? "hit" : "miss"}
                  onClick={() => chooseCloud4(i, o.correct)} />
              ))}
            </TargetField>
            <FeedbackBanner feedback={feedback} />
          </Card>
        );

      case "island":
        return (
          <Card>
            {!islandOpened ? (
              <div className="text-center">
                <div className="text-7xl mb-4 animate-bounce">🏝️📦</div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: "#1e3a8a" }}>هَبَطْتَ بِسَلَامٍ عَلَى جَزِيرَةِ الْكَنْزِ الطَّائِرَةِ!</h2>
                <p className="text-blue-700 text-base mb-5">اسْتَخْدِمْ مِفْتَاحَيِ الْوَقُودِ لِفَتْحِ الصُّنْدُوقِ ({fuel}/2 ⛽)</p>
                <button onClick={() => setIslandOpened(true)} disabled={fuel < 2}
                  className="py-3.5 px-8 rounded-2xl text-white font-bold text-xl active:scale-95 transition-all disabled:opacity-40" style={{ background: "#ea580c" }}>
                  🔓 افْتَحِ الصُّنْدُوقَ
                </button>
              </div>
            ) : (
              <div>
                <div className="text-6xl text-center mb-3">✨🏆🎈</div>
                <h2 className="text-2xl font-bold text-center mb-4" style={{ color: "#1e3a8a" }}>الْقَاعِدَةُ الذَّهَبِيَّةُ لِلْهَمْزَةِ الْمُتَطَرِّفَةِ</h2>
                <div className="rounded-2xl p-4 mb-5" style={{ background: "#eff6ff", border: "2px solid #1d4ed8" }}>
                  <p className="text-blue-900 leading-relaxed text-lg font-semibold mb-2">
                    الْهَمْزَةُ الْمُتَطَرِّفَةُ هِيَ الَّتِي تَأْتِي فِي آخِرِ الْكَلِمَةِ، وَتُكْتَبُ بِحَسَبِ حَرَكَةِ الْحَرْفِ الَّذِي قَبْلَهَا:
                  </p>
                  <ul className="space-y-1 text-blue-800 text-base">
                    <li>• عَلَى (أَلِف) إِذَا كَانَ مَا قَبْلَهَا مَفْتُوحًا (مِثْلَ: قَرَأ).</li>
                    <li>• عَلَى (وَاو) إِذَا كَانَ مَا قَبْلَهَا مَضْمُومًا (مِثْلَ: لُؤْلُؤ).</li>
                    <li>• عَلَى (يَاءٍ غَيْرِ مَنْقُوطَةٍ) إِذَا كَانَ مَا قَبْلَهَا مَكْسُورًا (مِثْلَ: شاطِئ).</li>
                    <li>• عَلَى (السَّطْرِ) إِذَا كَانَ مَا قَبْلَهَا سَاكِنًا أَوْ حَرْفَ مَدٍّ (مِثْلَ: دِفْء، سَمَاء).</li>
                  </ul>
                </div>
                <button onClick={() => setPhase("results")}
                  className="w-full py-3.5 rounded-2xl text-white font-bold text-xl active:scale-95 transition-all" style={{ background: "#1d4ed8" }}>
                  عَرْضُ النَّتِيجَةِ 🎉
                </button>
              </div>
            )}
          </Card>
        );

      case "results": {
        const elapsedSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
        const achievements = evaluateAchievements({
          totalQuestions: 4, wrongCount, maxCombo, elapsedSeconds,
        });
        return (
          <Card>
            <VictoryModal
              title='وِسَامُ "مُسْتَكْشِفِ الْهَمَزَاتِ الْعَالَمِيِّ"!'
              subtitle="أَتْمَمْتَ رِحْلَةَ الْهَمْزَةِ الْمُتَطَرِّفَةِ بِنَجَاحٍ — وَبِهَذَا أَكْمَلْتَ وَحْدَةَ الْهَمَزَاتِ كَامِلَةً!"
              points={stars + comboBonus} pointsLabel="⭐ نَجْمَة"
              secondaryValue={fuel} secondaryLabel="⛽ وَقُود"
              achievements={achievements}
            >
              <div className="flex gap-3">
                <button onClick={resetAll} className="flex-1 py-3 rounded-2xl font-bold" style={{ background: "#eff6ff", color: "#1e3a8a", border: "2px solid #bfdbfe" }}>
                  🔄 إِعَادَةُ اللَّعِبِ
                </button>
                <button onClick={() => setLocation("/writing-games")} className="flex-1 py-3 rounded-2xl text-white font-bold" style={{ background: "#1d4ed8" }}>
                  الْمَقَرُّ الرَّئِيسِيُّ ←
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
      <TargetStyles />
      <GameFeelStyles />
      <ComboIndicator combo={combo} pulseKey={pulseKey} accent="#1d4ed8" />
      <SkyBackdrop phase={phase} interactive={!cardVisible} onActivate={() => setCardVisible(true)} reaction={reaction} reactKey={reactKey} />
      <div className="relative z-10 flex flex-col min-h-screen">
        <TopBar stars={stars} fuel={fuel} onBack={() => setLocation("/writing-games")} />
        <div className="flex-1 flex items-start justify-center pt-6 pb-8 overflow-y-auto">
          {cardVisible && <div key={phase} className="fade-in-up w-full flex justify-center">{renderScreen()}</div>}
        </div>
      </div>
    </div>
  );
}
