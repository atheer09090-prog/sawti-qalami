import { useLocation } from "wouter";
import { getState } from "@/lib/store";

export default function Assessments() {
  const [, setLocation] = useLocation();
  const student = getState();

  function getGrade(v: number) {
    if (v >= 90) return { label: "مُمْتَازٌ", color: "#1a5c2a" };
    if (v >= 80) return { label: "جَيِّدٌ جِدًّا", color: "#2563eb" };
    if (v >= 70) return { label: "جَيِّدٌ", color: "#d97706" };
    if (v >= 60) return { label: "مَقْبُولٌ", color: "#ea580c" };
    return { label: "يَحْتَاجُ تَطْوِيرًا", color: "#dc2626" };
  }

  const skills = [
    { name: "التَّحَدُّثُ", value: student.speakingProgress, icon: "🎙️", color: "#1a5c2a" },
    { name: "الْكِتَابَةُ", value: student.writingProgress, icon: "✏️", color: "#b45309" },
    { name: "التَّعَلُّمُ الذَّاتِيُّ", value: student.selfLearningProgress, icon: "📚", color: "#1d4ed8" },
  ];

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "#f5f0e8", minHeight: "100vh" }}>
      <div className="p-4" style={{ background: "linear-gradient(135deg, #1a5c2a 0%, #2d7a3e 100%)" }}>
        <button onClick={() => setLocation("/dashboard")} className="text-green-200 text-sm mb-2">← الرَّئِيسِيَّةُ</button>
        <h1 className="text-2xl font-bold text-white text-right">📊 تَقْيِيمَاتِي</h1>
        <p className="text-green-200 text-sm text-right">نَتَائِجُكَ وَتَقَدُّمُكَ</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl p-5 shadow mb-4 text-right">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{student.avatar}</span>
            <div>
              <h2 className="font-bold text-xl">{student.name || "الطَّالِبُ"}</h2>
              <p className="text-gray-500 text-sm">{student.grade}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-500">{student.stars} ⭐</p>
              <p className="text-xs text-gray-500">النُّجُومُ</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{student.points}</p>
              <p className="text-xs text-gray-500">النُّقَاطُ</p>
            </div>
          </div>
        </div>

        {skills.map((s) => {
          const grade = getGrade(s.value);
          return (
            <div key={s.name} className="bg-white rounded-2xl p-5 shadow mb-3">
              <div className="flex justify-between items-center mb-3">
                <span style={{ color: grade.color }} className="font-bold">{grade.label}</span>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg">{s.name}</h3>
                  <span className="text-2xl">{s.icon}</span>
                </div>
              </div>
              <div className="w-full h-4 bg-gray-100 rounded-full">
                <div className="h-4 rounded-full transition-all" style={{ width: `${s.value}%`, background: s.color }} />
              </div>
              <p className="text-left font-bold mt-1" style={{ color: s.color }}>{s.value}%</p>
            </div>
          );
        })}

        {student.teacherComment && (
          <div className="bg-white rounded-2xl p-5 shadow text-right">
            <h3 className="font-bold text-lg mb-2" style={{ color: "#1a5c2a" }}>💬 تَعْلِيقُ الْمُعَلِّمِ:</h3>
            <p className="text-gray-600">{student.teacherComment}</p>
          </div>
        )}
      </div>
    </div>
  );
}
