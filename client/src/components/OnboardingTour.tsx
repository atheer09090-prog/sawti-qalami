import { useState } from "react";

interface Step {
  emoji: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    emoji: "👋",
    title: "مَرْحَبًا بِكَ فِي صَوْتِي قَلَمِي",
    body: "مِنَصَّةٌ تُسَاعِدُكَ عَلَى تَطْوِيرِ مَهَارَتَيِ التَّحَدُّثِ وَالْكِتَابَةِ بِاللُّغَةِ الْعَرَبِيَّةِ. جَوْلَةٌ سَرِيعَةٌ فِي 5 خُطُوَاتٍ فَقَطْ لِتَتَعَرَّفَ عَلَى أَهَمِّ أَجْزَائِهَا.",
  },
  {
    emoji: "🎙️",
    title: "مَهَارَةُ التَّحَدُّثِ",
    body: "سَجِّلْ صَوْتَكَ وَأَنْتَ تَتَحَدَّثُ عَنْ مَوْضُوعٍ مَا، وَسَتَحْصُلُ فَوْرًا عَلَى تَقْيِيمٍ لِنُطْقِكَ وَبِنَاءِ جُمَلِكَ.",
  },
  {
    emoji: "✏️",
    title: "مَهَارَةُ الْكِتَابَةِ",
    body: "اكْتُبْ نَصًّا حَوْلَ مَوْضُوعٍ مُعَيَّنٍ، وَسَتَحْصُلُ عَلَى تَصْحِيحٍ لِلْأَخْطَاءِ وَتَقْيِيمٍ لِأُسْلُوبِكَ.",
  },
  {
    emoji: "📊",
    title: "نَتَائِجُكَ",
    body: "مِنْ صَفْحَةِ \"نَتَائِجِي\" تَسْتَطِيعُ رُؤْيَةَ تَقْيِيمَاتِكَ السَّابِقَةِ فِي كُلِّ مَهَارَةٍ فِي أَيِّ وَقْتٍ.",
  },
  {
    emoji: "🗂️",
    title: "سِجِلُّكَ مَحْفُوظٌ تِلْقَائِيًّا",
    body: "كُلُّ مُحَاوَلَةٍ تَقُومُ بِهَا تُحْفَظُ تِلْقَائِيًّا فِي حِسَابِكَ — لَا حَاجَةَ لِلضَّغْطِ عَلَى أَيِّ زِرِّ حِفْظٍ، وَتَسْتَطِيعُ الْعَوْدَةَ إِلَيْهَا مِنْ أَيِّ جِهَازٍ.",
  },
];

export function OnboardingTour({ onFinish }: { onFinish: () => void }) {
  const [i, setI] = useState(0);
  const isLast = i === STEPS.length - 1;
  const step = STEPS[i];

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
    >
      <div
        className="bg-white rounded-3xl p-6 text-center shadow-2xl w-full"
        style={{ maxWidth: 360, fontFamily: "'Cairo', sans-serif" }}
      >
        <div className="text-6xl mb-3">{step.emoji}</div>
        <h2 style={{ fontFamily: "'Amiri', serif", color: "#1a5c2a", fontSize: "1.4rem", fontWeight: 700 }}>
          {step.title}
        </h2>
        <p className="text-gray-500 text-sm leading-relaxed mt-3 mb-5">{step.body}</p>

        {/* نقاط التقدّم */}
        <div className="flex justify-center gap-1.5 mb-5">
          {STEPS.map((_, idx) => (
            <span
              key={idx}
              className="rounded-full transition-all"
              style={{
                width: idx === i ? 20 : 7, height: 7,
                background: idx === i ? "#1a5c2a" : "#d1d5db",
              }}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {i > 0 && (
            <button
              onClick={() => setI((v) => v - 1)}
              className="flex-1 py-3 rounded-xl border-2 font-bold text-sm text-gray-600"
              style={{ borderColor: "#e5e7eb" }}
            >
              السَّابِقُ
            </button>
          )}
          <button
            onClick={() => (isLast ? onFinish() : setI((v) => v + 1))}
            className="flex-1 py-3 rounded-xl text-white font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #1a5c2a, #2d7a3e)" }}
          >
            {isLast ? "لِنَبْدَأْ! 🚀" : "التَّالِي"}
          </button>
        </div>

        {!isLast && (
          <button onClick={onFinish} className="w-full mt-3 text-xs text-gray-400 underline underline-offset-2">
            تَخَطَّ الْجَوْلَةَ
          </button>
        )}
      </div>
    </div>
  );
}
