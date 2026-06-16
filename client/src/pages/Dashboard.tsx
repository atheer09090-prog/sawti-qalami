import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getState, clearState, StudentData } from "@/lib/store";
import { playSound, stopSound } from "@/lib/audio";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

/* ── Welcome Popup ── */
function WelcomePopup({ name, onClose }: { name: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-8 text-center shadow-2xl mx-4"
        style={{ maxWidth: 340, animation: "popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-6xl mb-4">👋</div>
        <h2
          style={{ fontFamily: "'Amiri', serif", color: "#1a5c2a", fontSize: "1.6rem", fontWeight: 700, lineHeight: 1.3 }}
          dir="rtl"
        >
          مَرْحَباً يَا بَطَلَ اللُّغَةِ الْعَرَبِيَّةِ!
        </h2>
        <p className="text-gray-500 mt-2 mb-1" style={{ fontFamily: "'Cairo', sans-serif" }} dir="rtl">
          هَيَّا نَتَعَلَّمُ وَنُبْدِعُ مَعًا ✨
        </p>
        <p
          className="text-amber-600 text-sm cursor-pointer mt-4 font-bold"
          style={{ fontFamily: "'Cairo', sans-serif" }}
          onClick={onClose}
        >
          انْقُرْ لِلْمُتَابَعَةِ
        </p>
      </div>
      <style>{`
        @keyframes popIn {
          from { transform: scale(0.7); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function getLabel(v: number) {
  if (v >= 80) return "مُمْتَازٌ ⭐";
  if (v >= 60) return "جَيِّدٌ جِدًّا ⭐";
  if (v >= 40) return "يَحْتَاجُ تَطْوِيرًا ⭐";
  return "ابْدَأْ رِحْلَتَكَ";
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [student, setStudent] = useState<StudentData>(getState());
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const s = getState();
    if (!s.name) { setLocation("/"); return; }
    setStudent(s);
    playSound("/assets/welcome.wav", 0.3);
    // Show popup only once per session
    const alreadyShown = sessionStorage.getItem("welcomeShown");
    if (!alreadyShown) {
      const t = setTimeout(() => {
        setShowPopup(true);
        sessionStorage.setItem("welcomeShown", "1");
      }, 400);
      return () => { stopSound(); clearTimeout(t); };
    }
    return () => stopSound();
  }, []);

  const chartData = [
    { name: "التَّحَدُّث", value: student.speakingProgress, fill: "#1a5c2a" },
    { name: "الْكِتَابَة", value: student.writingProgress, fill: "#b45309" },
    { name: "التَّعَلُّم", value: student.selfLearningProgress, fill: "#1d4ed8" },
  ];

  return (
    <div
      dir="rtl"
      style={{ fontFamily: "'Cairo', sans-serif", minHeight: "100vh" }}
    >
      {showPopup && <WelcomePopup name={student.name} onClose={() => setShowPopup(false)} />}
      {/* Full-page background */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: -1,
          backgroundImage: "url('/assets/bg-main.png')",
          backgroundSize: "cover", backgroundPosition: "center",
          opacity: 0.25,
        }}
      />

      {/* Top bar */}
      <div className="flex justify-between items-center px-4 py-3 bg-white/70 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-2 bg-white rounded-full px-3 py-1.5 shadow-sm border border-yellow-200">
          <span className="text-yellow-500 text-sm">⭐</span>
          <span className="font-bold text-sm">{student.stars}</span>
          <span className="text-xs text-gray-400">نُقَاطِي</span>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm text-right border border-gray-100">
          <div>
            <p className="text-xs font-bold" style={{ color: "#1a5c2a" }}>مَرْحَباً بِكَ</p>
            <p className="font-bold text-sm">{student.name}</p>
            <p className="text-xs text-gray-400">{student.grade}</p>
          </div>
          <img
            src={`/assets/${student.avatar === "boy1" || student.avatar === "boy2" ? "omani-boy" : student.avatar === "girl1" ? "omani-girl" : "omani-girl2"}.png`}
            alt=""
            className="w-12 h-12 object-contain rounded-full border-2"
            style={{ borderColor: "#1a5c2a" }}
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-8">
        {/* Logo & Title */}
        <div className="text-center py-5">
          <img src="/assets/logo.png" alt="صوتي قلمي" className="w-20 h-20 object-contain mx-auto mb-2" />
          <p className="text-gray-600 text-sm">
            مَنْصَةٌ تَفَاعُلِيَّةٌ لِتَعْلِيمِ اللُّغَةِ الْعَرَبِيَّةِ لِطُلَّابِ الصَّفِّ السَّادِسِ
          </p>
          <span
            className="inline-block mt-1 px-4 py-1 rounded-full text-white text-xs font-bold"
            style={{ background: "#1a5c2a" }}
          >
            🇴🇲 سَلْطَنَةُ عُمَانَ
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Navigation Cards */}
          <div className="flex flex-col gap-3">
            {/* Skills */}
            <button
              onClick={() => setLocation("/skills")}
              className="p-4 rounded-2xl text-right shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
              style={{ background: "#dcf5e7", border: "2px solid #86efac" }}
            >
              <div className="flex justify-between items-center">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: "#1a5c2a" }}>🎙️</div>
                <div>
                  <h3 className="font-bold text-lg" style={{ color: "#1a5c2a" }}>الْمَهَارَاتُ</h3>
                  <p className="text-sm text-gray-500">دُرُوسٌ - تَمَارِينُ - تَقْيِيمَاتٌ</p>
                </div>
              </div>
              <p className="text-green-600 text-sm mt-2 font-semibold">دُخُولٌ ←</p>
            </button>

            {/* Grade change */}
            <button
              className="p-4 rounded-2xl text-right shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
              style={{ background: "#ede9f5", border: "2px solid #c4b5fd" }}
              onClick={() => setLocation("/class-selection")}
            >
              <div className="flex justify-between items-center">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: "#7c3aed" }}>🎓</div>
                <div>
                  <h3 className="font-bold text-lg text-purple-700">تَحْدِيدُ الصَّفِّ</h3>
                  <p className="text-sm text-gray-500">اخْتَرْ صَفَّكَ الدِّرَاسِيَّ</p>
                </div>
              </div>
              <p className="text-purple-600 text-sm mt-2 font-semibold">دُخُولٌ ←</p>
            </button>

            {/* Assessments */}
            <button
              onClick={() => setLocation("/assessments")}
              className="p-4 rounded-2xl text-right shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
              style={{ background: "#fef9e7", border: "2px solid #fde68a" }}
            >
              <div className="flex justify-between items-center">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: "#b45309" }}>📊</div>
                <div>
                  <h3 className="font-bold text-lg text-amber-700">تَقْيِيمَاتِي</h3>
                  <p className="text-sm text-gray-500">عَرْضُ نَتَائِجِكَ وَتَقَدُّمِكَ</p>
                </div>
              </div>
              <p className="text-amber-600 text-sm mt-2 font-semibold">دُخُولٌ ←</p>
            </button>

            {/* Logout */}
            <button
              onClick={() => { clearState(); setLocation("/"); }}
              className="p-4 rounded-2xl text-right shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
              style={{ background: "#fee2e2", border: "2px solid #fca5a5" }}
            >
              <div className="flex justify-between items-center">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: "#dc2626" }}>🚪</div>
                <div>
                  <h3 className="font-bold text-lg text-red-600">تَسْجِيلُ الْخُرُوجِ</h3>
                  <p className="text-sm text-gray-500">الْخُرُوجُ مِنَ الْمَنْصَةِ</p>
                </div>
              </div>
              <p className="text-red-500 text-sm mt-2 font-semibold">دُخُولٌ ←</p>
            </button>
          </div>

          {/* Stats card */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 shadow-md">
            <h3 className="text-right font-bold text-lg mb-4" style={{ color: "#1a5c2a" }}>
              📊 إِحْصَائِيَّاتُ تَقَدُّمِكَ
            </h3>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {chartData.map((d) => (
                <div key={d.name} className="text-center p-3 rounded-xl" style={{ background: "#f5f0e8" }}>
                  <p className="text-xs text-gray-500 mb-1">{d.name}</p>
                  <p className="text-2xl font-bold" style={{ color: d.fill }}>{d.value}%</p>
                  <p className="text-xs" style={{ color: d.fill }}>{getLabel(d.value)}</p>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={155}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fontFamily: "'Cairo', sans-serif" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-5 p-4 rounded-2xl text-center bg-white/60 backdrop-blur-sm border border-green-100">
          <p className="text-gray-600 text-sm">
            ✨ أَنْتَ نَجْمٌ مُضِيءٌ فِي سَمَاءِ الْعِلْمِ وَالْمَعْرِفَةِ ✨
          </p>
        </div>
      </div>
    </div>
  );
}