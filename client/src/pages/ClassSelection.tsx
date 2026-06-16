import { useLocation } from "wouter";
import { getState, setState } from "@/lib/store";

const SECTIONS = ["أ", "ب", "ج", "د"];

export default function ClassSelection() {
  const [, setLocation] = useLocation();
  const student = getState();

  // Extract base grade (e.g. "الصف السادس" from "الصف السادس أ")
  const baseGrade = student.grade.replace(/ [أبجد]$/, "").trim();
  const currentSection = student.grade.replace(baseGrade, "").trim();

  function handleSection(section: string) {
    setState(prev => ({ ...prev, grade: `${baseGrade} ${section}` }));
    setLocation("/dashboard");
  }

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "#f5f0e8", minHeight: "100vh" }}>
      {/* Header */}
      <div className="p-4" style={{ background: "linear-gradient(135deg, #1a5c2a 0%, #2d7a3e 100%)" }}>
        <div className="flex items-center gap-2 mb-2">
          <img src="/assets/logo.png" alt="" className="w-7 h-7 object-contain" />
          <button onClick={() => setLocation("/dashboard")} className="text-green-200 text-sm">
            ← الرَّئِيسِيَّةُ
          </button>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-3xl p-2 bg-green-700 rounded-xl">🎓</span>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-white">تَحْدِيدُ الشُّعْبَةِ</h1>
            <p className="text-green-200 text-sm">{baseGrade} — اخْتَرْ شُعْبَتَكَ</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6">
        {/* Student card */}
        <div className="bg-white rounded-xl p-3 mb-5 flex items-center gap-3 shadow">
          <img
            src={`/assets/${student.avatar === "boy1" || student.avatar === "boy2" ? "omani-boy" : student.avatar === "girl1" ? "omani-girl" : "omani-girl2"}.png`}
            alt="" className="w-12 h-12 object-contain"
          />
          <div className="text-right">
            <p className="font-bold text-sm">{student.name}</p>
            <p className="text-gray-400 text-xs">{student.grade}</p>
          </div>
        </div>

        <h2 className="text-right font-bold text-lg mb-4" style={{ color: "#1a5c2a" }}>
          🏫 اخْتَرْ شُعْبَتَكَ فِي {baseGrade}:
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {SECTIONS.map((section) => {
            const isSelected = currentSection === section;
            return (
              <button key={section} onClick={() => handleSection(section)}
                className="p-8 rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all text-center"
                style={{
                  background: isSelected ? "#dcf5e7" : "white",
                  border: `2px solid ${isSelected ? "#1a5c2a" : "#e5e7eb"}`,
                }}
              >
                <div className="text-4xl mb-2">{isSelected ? "✅" : "🏫"}</div>
                <h3 className="font-bold text-5xl mb-1" style={{ color: "#1a5c2a" }}>{section}</h3>
                <p className="text-gray-400 text-sm">{baseGrade} {section}</p>
                {isSelected && (
                  <span className="text-xs text-green-600 font-bold mt-1 block">شُعْبَتُكَ الْحَالِيَّةُ ✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}