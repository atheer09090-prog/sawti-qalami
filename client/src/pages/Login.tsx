import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { setState } from "@/lib/store";
import { stopSound, setGender } from "@/lib/audio";

const AVATARS = [
  { id: "boy1",  src: "/assets/omani-boy.png",   label: "طالب ١" },
  { id: "boy2",  src: "/assets/omani-boy.png",   label: "طالب ٢" },
  { id: "girl1", src: "/assets/omani-girl.png",  label: "طالبة ١" },
  { id: "girl2", src: "/assets/omani-girl2.png", label: "طالبة ٢" },
];

const GRADES = [
  "السادس ١", "السادس ٢", "السادس ٣", "السادس ٤",
];

export default function Login() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("السادس ١");
  const [section, setSection] = useState("");
  const [avatar, setAvatar] = useState("boy1");

  
  useEffect(() => {
    // No sound on login page - sound plays in Dashboard on first entry
    return () => stopSound();
  }, []);

  function handleStart() {
    if (!name.trim()) return alert("الرجاء إدخال اسمك");
    stopSound();
    const g = avatar === "girl1" || avatar === "girl2" ? "female" : "male";
    setGender(g);
    setState(() => ({
      name, grade: `${grade} - شعبة ${section}`, avatar, points: 0, stars: 0,
      speakingProgress: 0, writingProgress: 0, selfLearningProgress: 0,
      completedLessons: [], badges: [], teacherComment: "",
    }));
    setLocation("/dashboard");
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{
        backgroundImage: "url('/assets/bg-main.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        fontFamily: "'Cairo', sans-serif",
      }}
    >
      {/* Card */}
      <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{ backdropFilter: "blur(2px)" }}>

        {/* ── Green Header ── */}
        <div
          className="pt-8 pb-6 px-6 text-center"
          style={{ background: "linear-gradient(160deg, #1a5c2a 0%, #2d7a3e 70%, #1a5c2a 100%)" }}
        >
          {/* Real logo */}
          <img
            src="/assets/logo.png"
            alt="صوتي قلمي"
            className="w-28 h-28 object-contain mx-auto mb-2"
            style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.3))" }}
          />
          <h1
            style={{ fontFamily: "'Amiri', serif", color: "#f5c842", fontSize: "2rem", fontWeight: 700, lineHeight: 1.2 }}
          >
            صَوْتِي قَلَمِي
          </h1>
          <p style={{ color: "#d4edda", fontSize: "0.85rem", marginTop: "4px" }}>
            أَتَعَلَّمُ. أُبْدِعُ. أَتَعَبَّرُ
          </p>
        </div>

        {/* ── White Form ── */}
        <div className="bg-white px-6 py-5">
          <h2 className="text-xl font-bold text-center text-gray-700 mb-5">
            👋 مَرْحَباً بِكَ يَا طَالِبُ!
          </h2>

          {/* Avatar picker */}
          <div className="mb-4">
            <label className="block text-right text-gray-600 mb-2 font-semibold text-sm">
              اخْتَرْ صُورَتَكَ:
            </label>
            <div className="flex justify-center gap-3">
              {AVATARS.map((av) => (
                <button
                  key={av.id}
                  onClick={() => {
                    setAvatar(av.id);
                    const g = av.id === "girl1" || av.id === "girl2" ? "female" : "male";
                    setGender(g);
                  }}
                  className="w-16 h-16 rounded-full border-2 transition-all overflow-hidden"
                  style={{
                    borderColor: avatar === av.id ? "#1a5c2a" : "#e5e7eb",
                    background: avatar === av.id ? "#dcf5e7" : "#f9fafb",
                    transform: avatar === av.id ? "scale(1.15)" : "scale(1)",
                    boxShadow: avatar === av.id ? "0 0 0 3px #a7f3c0" : "none",
                  }}
                >
                  <img src={av.src} alt={av.label} className="w-full h-full object-contain p-1" />
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="mb-4">
            <label className="block text-right text-gray-600 mb-1.5 font-semibold text-sm">
              اسْمُكَ الْكَرِيمُ:
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
                placeholder="أَدْخِلْ اسْمَكَ هُنَا..."
                className="w-full px-4 py-3 pr-10 rounded-xl border-2 text-right focus:outline-none text-base transition-colors"
                style={{ borderColor: "#e5e7eb", fontFamily: "'Cairo', sans-serif" }}
                onFocus={(e) => (e.target.style.borderColor = "#1a5c2a")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">👤</span>
            </div>
          </div>

          {/* Grade */}
          <div className="mb-5">
            <label className="block text-right text-gray-600 mb-1.5 font-semibold text-sm">
              فَصْلُكَ الدِّرَاسِيُّ:
            </label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 text-right focus:outline-none text-base"
              style={{ borderColor: "#e5e7eb", fontFamily: "'Cairo', sans-serif" }}
            >
              {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {/* Section */}
          <div className="mb-5">
            <label className="block text-right text-gray-600 mb-1.5 font-semibold text-sm">
              شُعْبَتُكَ:
            </label>
            <input
              type="text"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="مثال: أ أو ب أو ١..."
              className="w-full px-4 py-3 rounded-xl border-2 text-right focus:outline-none text-base"
              style={{ borderColor: "#e5e7eb", fontFamily: "'Cairo', sans-serif" }}
            />
          </div>

          {/* Start */}
          <button
            onClick={handleStart}
            className="w-full py-4 rounded-xl text-white text-lg font-bold transition-all hover:opacity-90 active:scale-95"
            style={{ background: "linear-gradient(135deg, #1a5c2a 0%, #2d7a3e 100%)", fontFamily: "'Cairo', sans-serif" }}
          >
            ابْدَأْ رِحْلَتَكَ الآنَ! 🚀
          </button>

          <p className="text-center text-gray-400 mt-3 text-xs">
            ⭐ كُنْ مُجِدًّا بِتَقَدُّمِكَ، كُلُّ خُطْوَةٍ تُقَرِّبُكَ مِنَ الإِبْدَاعِ ⭐
          </p>

          {/* Teacher login */}
          <button
            onClick={() => setLocation("/teacher")}
            className="w-full mt-3 py-2.5 rounded-xl border-2 font-bold text-sm transition-all hover:bg-amber-50"
            style={{ borderColor: "#f5c842", color: "#b45309" }}
          >
            🎓 دُخُولُ الْمُعَلِّمِ
          </button>
        </div>
      </div>

      {/* Omani boy mascot */}
      <img
        src="/assets/omani-boy.png"
        alt="طالب عماني"
        className="w-36 mt-4 drop-shadow-xl"
        style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.15))" }}
      />

      {/* Oman badge */}
      <button
        className="mt-3 px-5 py-2 rounded-full text-white text-sm font-bold shadow-lg"
        style={{ background: "linear-gradient(135deg, #1a5c2a, #2d7a3e)" }}
      >
        🇴🇲 سَلْطَنَةُ عُمَانَ
      </button>
    </div>
  );
}