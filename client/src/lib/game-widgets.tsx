import { useEffect, useRef, useState } from "react";

/* ══════════════════════════════════════════════════════════════
   game-widgets.tsx — مكوّنات مشتركة لتحسين تجربة اللعب (Game Feel)
   تُستخدم في الألعاب الثلاث (TreasureMap / DiverPearl / BalloonHamza)
   دون أي تغيير في المحتوى التعليمي أو منطق التحقق من الإجابات.
   ══════════════════════════════════════════════════════════════ */

/* ---------- الأنماط الحركية المشتركة ---------- */
export function GameFeelStyles() {
  return (
    <style>{`
      @keyframes charBounceCorrect {
        0%   { transform: translate(-50%,-110%) scale(1) rotate(0deg); }
        30%  { transform: translate(-50%,-135%) scale(1.18) rotate(-6deg); }
        55%  { transform: translate(-50%,-98%)  scale(1.05) rotate(4deg); }
        100% { transform: translate(-50%,-110%) scale(1) rotate(0deg); }
      }
      @keyframes charShakeWrong {
        0%,100% { transform: translate(-50%,-110%) rotate(0deg); }
        20% { transform: translate(-58%,-110%) rotate(-8deg); }
        40% { transform: translate(-42%,-110%) rotate(8deg); }
        60% { transform: translate(-56%,-110%) rotate(-6deg); }
        80% { transform: translate(-44%,-110%) rotate(6deg); }
      }
      @keyframes comboPop {
        0%   { transform: translateX(-50%) scale(0.4) translateY(10px); opacity: 0; }
        55%  { transform: translateX(-50%) scale(1.25) translateY(-4px); opacity: 1; }
        100% { transform: translateX(-50%) scale(1) translateY(0); opacity: 1; }
      }
      @keyframes sparklePulse {
        0%,100% { opacity: 0.55; transform: scale(0.92); }
        50%     { opacity: 1;    transform: scale(1.15); }
      }
      @keyframes confettiFall {
        0%   { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
        100% { transform: translateY(105vh) rotate(720deg); opacity: 0.85; }
      }
      @keyframes fadeInUp {
        0%   { opacity: 0; transform: translateY(14px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      .char-bounce-correct { animation: charBounceCorrect 0.6s ease-out; }
      .char-shake-wrong    { animation: charShakeWrong 0.5s ease-in-out; }
      .combo-pop            { animation: comboPop 0.35s ease-out; }
      .sparkle-pulse        { animation: sparklePulse 1.4s ease-in-out infinite; }
      .fade-in-up           { animation: fadeInUp 0.4s ease-out; }
    `}</style>
  );
}

/* ---------- نظام الكومبو (Combo) ---------- */
export function useCombo() {
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [pulseKey, setPulseKey] = useState(0);

  function registerAnswer(correct: boolean): number {
    if (correct) {
      let gained = 0;
      setCombo(c => {
        const next = c + 1;
        setMaxCombo(m => Math.max(m, next));
        if (next >= 2) { gained = 2; setBonus(b => b + 2); setPulseKey(k => k + 1); }
        return next;
      });
      return gained;
    } else {
      setCombo(0);
      return 0;
    }
  }

  function resetCombo() {
    setCombo(0); setMaxCombo(0); setBonus(0); setPulseKey(0);
  }

  return { combo, maxCombo, bonus, pulseKey, registerAnswer, resetCombo };
}

export function ComboIndicator({ combo, pulseKey, accent = "#d97706" }: { combo: number; pulseKey: number; accent?: string }) {
  if (combo < 2) return null;
  return (
    <div key={pulseKey} className="combo-pop fixed top-20 left-1/2 z-40 px-4 py-1.5 rounded-full font-extrabold text-lg shadow-xl text-white whitespace-nowrap"
      style={{ background: `linear-gradient(135deg, ${accent}, #f59e0b)` }}>
      🔥 سِلْسِلَةٌ ×{combo}
    </div>
  );
}

/* ---------- ردّة فعل الشخصية ---------- */
export function useCharacterReaction() {
  const [reaction, setReaction] = useState<"idle" | "correct" | "wrong">("idle");
  const [reactKey, setReactKey] = useState(0);
  function react(correct: boolean) {
    setReaction(correct ? "correct" : "wrong");
    setReactKey(k => k + 1);
    setTimeout(() => setReaction("idle"), 700);
  }
  return { reaction, reactKey, react };
}

/* ---------- الكونفيتي ---------- */
export function Confetti({ count = 60 }: { count?: number }) {
  const [visible, setVisible] = useState(true);
  const pieces = useRef(
    Array.from({ length: count }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 1.8 + Math.random() * 1,
      color: ["#f59e0b", "#059669", "#0ea5e9", "#dc2626", "#a855f7", "#facc15"][i % 6],
      w: 5 + Math.random() * 5,
      h: 8 + Math.random() * 8,
      rotate: Math.random() * 360,
    }))
  ).current;

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2600);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
      {pieces.map((p, i) => (
        <div key={i} style={{
          position: "absolute", left: `${p.left}%`, top: "-6vh",
          width: p.w, height: p.h, background: p.color,
          animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
          transform: `rotate(${p.rotate}deg)`, borderRadius: 2,
        }} />
      ))}
    </div>
  );
}

/* ---------- بطاقة إنجاز ---------- */
export type Achievement = { icon: string; title: string; desc: string };

export function AchievementCard({ icon, title, desc }: Achievement) {
  return (
    <div className="fade-in-up rounded-2xl p-3 text-center shadow-md" style={{ background: "linear-gradient(180deg, #fff7e6, #fde68a)", border: "2px solid #d97706", minWidth: 116 }}>
      <div className="text-3xl mb-1 sparkle-pulse">{icon}</div>
      <p className="font-bold text-sm" style={{ color: "#78350f" }}>{title}</p>
      <p className="text-xs mt-0.5" style={{ color: "#92400e" }}>{desc}</p>
    </div>
  );
}

export function AchievementsRow({ achievements }: { achievements: Achievement[] }) {
  if (!achievements.length) return null;
  return (
    <div className="mb-5">
      <p className="font-bold text-lg mb-2" style={{ color: "#78350f" }}>🏅 إِنْجَازَاتُكَ</p>
      <div className="flex flex-wrap justify-center gap-3">
        {achievements.map((a, i) => <AchievementCard key={i} {...a} />)}
      </div>
    </div>
  );
}

export function evaluateAchievements(stats: {
  totalQuestions: number; wrongCount: number; maxCombo: number; elapsedSeconds: number; fastThresholdSeconds?: number;
}): Achievement[] {
  const list: Achievement[] = [];
  if (stats.maxCombo >= 3) list.push({ icon: "🐚", title: "صَائِدُ اللَّآلِئِ", desc: "٣ إِجَابَاتٍ صَحِيحَةٍ مُتَتَالِيَةٍ" });
  if (stats.totalQuestions > 0) list.push({ icon: "⭐", title: "خَبِيرُ الْهَمْزَةِ", desc: "إِنْهَاءُ الْمَرْحَلَةِ بِنِسْبَةِ ١٠٠٪" });
  if (stats.wrongCount === 0) list.push({ icon: "🏆", title: "بَطَلُ الْمَرْحَلَةِ", desc: "بِلَا أَيِّ إِجَابَةٍ خَاطِئَةٍ" });
  const threshold = stats.fastThresholdSeconds ?? 180;
  if (stats.elapsedSeconds > 0 && stats.elapsedSeconds <= threshold) list.push({ icon: "🚀", title: "مُتَعَلِّمٌ سَرِيعٌ", desc: "أَنْهَى الدَّرْسَ بِوَقْتٍ قِيَاسِيٍّ" });
  return list;
}

/* ---------- شاشة الفوز ---------- */
export function VictoryModal({
  title, subtitle, points, pointsLabel, secondaryValue, secondaryLabel, achievements, children,
}: {
  title: string; subtitle: string;
  points: number; pointsLabel: string;
  secondaryValue?: number; secondaryLabel?: string;
  achievements: Achievement[];
  children?: React.ReactNode;
}) {
  return (
    <div className="text-center fade-in-up">
      <Confetti />
      <div className="text-6xl mb-2 sparkle-pulse">🎉</div>
      <h2 className="text-3xl font-bold mb-1" style={{ color: "#78350f" }}>{title}</h2>
      <p className="mb-5" style={{ color: "#92400e" }}>{subtitle}</p>
      <div className="flex justify-center gap-6 mb-5">
        <div className="text-center">
          <p className="text-4xl font-bold" style={{ color: "#d97706" }}>{points}</p>
          <p className="text-sm" style={{ color: "#92400e" }}>{pointsLabel}</p>
        </div>
        {secondaryValue !== undefined && (
          <div className="text-center">
            <p className="text-4xl font-bold" style={{ color: "#059669" }}>{secondaryValue}</p>
            <p className="text-sm" style={{ color: "#92400e" }}>{secondaryLabel}</p>
          </div>
        )}
      </div>
      <AchievementsRow achievements={achievements} />
      {children}
    </div>
  );
}

/* ---------- المراجعة الذكية ---------- */
export type MistakeRecord = {
  id: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  rule: string;
  explanation: string;
};

export function SmartReview({ mistakes }: { mistakes: MistakeRecord[] }) {
  return (
    <div className="mt-6 text-right fade-in-up">
      <p className="font-bold text-xl mb-3 text-center" style={{ color: "#78350f" }}>📚 مُرَاجَعَةٌ سَرِيعَةٌ</p>
      {mistakes.length === 0 ? (
        <div className="rounded-2xl p-5 text-center" style={{ background: "#ecfdf5", border: "2px solid #059669" }}>
          <p className="font-bold text-lg" style={{ color: "#065f46" }}>🌟 مُمْتَازٌ!</p>
          <p className="text-sm mt-1" style={{ color: "#047857" }}>لَمْ تُخْطِئْ فِي أَيِّ كَلِمَةٍ، وَلَا تُوجَدُ مُرَاجَعَةٌ مَطْلُوبَةٌ.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mistakes.map(m => (
            <div key={m.id} className="rounded-2xl p-4" style={{ background: "#fff7ed", border: "2px solid #fdba74" }}>
              <p className="font-semibold text-sm mb-2" style={{ color: "#78350f" }}>{m.question}</p>
              <div className="flex flex-wrap gap-4 text-sm mb-2">
                <span style={{ color: "#dc2626" }}>❌ {m.userAnswer}</span>
                <span style={{ color: "#059669" }}>✅ {m.correctAnswer}</span>
              </div>
              <p className="text-sm mb-1" style={{ color: "#92400e" }}><b>📖 القاعدة:</b> {m.rule}</p>
              <p className="text-sm" style={{ color: "#92400e" }}><b>💡 السبب:</b> {m.explanation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
