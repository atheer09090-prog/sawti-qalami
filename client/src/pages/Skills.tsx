import { useLocation } from "wouter";
import { getState } from "@/lib/store";

export default function Skills() {
  const [, setLocation] = useLocation();
  const student = getState();

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "#f5f0e8", minHeight: "100vh" }}>
      {/* Header */}
      <div className="p-4" style={{ background: "linear-gradient(135deg, #1a5c2a 0%, #2d7a3e 100%)" }}>
        <div className="flex items-center gap-2 mb-3">
          <img src="/assets/logo.png" alt="" className="w-8 h-8 object-contain" />
          <button onClick={() => setLocation("/dashboard")} className="text-green-200 text-sm">← الرَّئِيسِيَّةُ</button>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-4xl p-2 bg-green-700 rounded-xl">🎯</span>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-white">الْمَهَارَاتُ اللُّغَوِيَّةُ</h1>
            <p className="text-green-200 text-sm">اخْتَرِ الْمَهَارَةَ الَّتِي تُرِيدُ تَطْوِيرَهَا</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
        {/* Speaking */}
        <button
          onClick={() => setLocation("/skills/speaking")}
          className="p-5 rounded-2xl text-right shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
          style={{ background: "#dcf5e7", border: "2px solid #86efac" }}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-4xl p-2 rounded-xl" style={{ background: "#1a5c2a" }}>🎙️</span>
            <div>
              <h2 className="text-xl font-bold" style={{ color: "#1a5c2a" }}>مَهَارَةُ التَّحَدُّثِ</h2>
              <p className="text-gray-500 text-sm">تَعَلَّمِ التَّعْبِيرَ الشَّفَهِيَّ وَالتَّحَدُّثَ بِثِقَةٍ</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap mb-3">
            {["وَصْفُ رِحْلَةٍ صَيْفِيَّةٍ", "قِرَاءَةٌ مَنْشُورٌ تَوْعَوِيٌّ", "التَّعْبِيرُ عَنِ الرَّأْيِ"].map(t => (
              <span key={t} className="text-xs px-2 py-1 rounded-full bg-white text-green-700 border border-green-200">{t}</span>
            ))}
          </div>
          <div className="flex justify-between items-center">
            <button className="text-white px-4 py-2 rounded-xl text-sm font-bold" style={{ background: "#1a5c2a" }}>
              دُخُولٌ ←
            </button>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-2 rounded-full" style={{ width: `${student.speakingProgress}%`, background: "#1a5c2a" }} />
              </div>
              <span className="text-sm font-bold" style={{ color: "#1a5c2a" }}>{student.speakingProgress}%</span>
            </div>
          </div>
        </button>

        {/* Writing */}
        <button
          onClick={() => setLocation("/skills/writing")}
          className="p-5 rounded-2xl text-right shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
          style={{ background: "#fef3e2", border: "2px solid #fcd34d" }}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-4xl p-2 rounded-xl" style={{ background: "#b45309" }}>✏️</span>
            <div>
              <h2 className="text-xl font-bold text-amber-800">مَهَارَةُ الْكِتَابَةِ</h2>
              <p className="text-gray-500 text-sm">طَوِّرْ أُسْلُوبَكَ الْكِتَابِيَّ وَإِبْدَاعَكَ اللُّغَوِيَّ</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap mb-3">
            {["وَصْفُ الْمَنْزِلِ", "وَصْفُ الْحَيِّ", "وَصْفُ الْمَسْجِدِ"].map(t => (
              <span key={t} className="text-xs px-2 py-1 rounded-full bg-white text-amber-700 border border-amber-200">{t}</span>
            ))}
          </div>
          <div className="flex justify-between items-center">
            <button className="bg-amber-700 text-white px-4 py-2 rounded-xl text-sm font-bold">دُخُولٌ ←</button>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-2 rounded-full bg-amber-600" style={{ width: `${student.writingProgress}%` }} />
              </div>
              <span className="text-sm font-bold text-amber-700">{student.writingProgress}%</span>
            </div>
          </div>
        </button>

        {/* Self Learning */}
        <button
          onClick={() => setLocation("/skills/self-learning")}
          className="p-5 rounded-2xl text-right shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
          style={{ background: "#dbeafe", border: "2px solid #93c5fd" }}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-4xl p-2 rounded-xl" style={{ background: "#1d4ed8" }}>📚</span>
            <div>
              <h2 className="text-xl font-bold text-blue-800">مَهَارَةُ التَّعَلُّمِ الذَّاتِيِّ</h2>
              <p className="text-gray-500 text-sm">اكْتَشِفْ وَتَعَلَّمْ بِاسْتِقْلَالِيَّةٍ وَإِبْدَاعٍ</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap mb-3">
            {["تَقْيِيمُ الذَّاتِ", "الْبَحْثُ وَالِاسْتِكْشَافُ", "الْمَشَارِيعُ الإِبْدَاعِيَّةُ"].map(t => (
              <span key={t} className="text-xs px-2 py-1 rounded-full bg-white text-blue-700 border border-blue-200">{t}</span>
            ))}
          </div>
          <div className="flex justify-between items-center">
            <button className="bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold">دُخُولٌ ←</button>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${student.selfLearningProgress}%` }} />
              </div>
              <span className="text-sm font-bold text-blue-700">{student.selfLearningProgress}%</span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
