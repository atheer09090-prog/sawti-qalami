import { useState } from "react";
import { useLocation } from "wouter";
import { getState, setState } from "@/lib/store";

const GRADES = ["الرابع", "الخامس", "السادس", "السابع"];
const SECTIONS = ["أ", "ب", "ج", "د"];

export default function ClassSelection() {
  const [, setLocation] = useLocation();
  const student = getState();
  const [step, setStep] = useState<"grade"|"section">("grade");
  const [selectedGrade, setSelectedGrade] = useState("");

  function handleGrade(grade: string) {
    setSelectedGrade(grade);
    setStep("section");
  }

  function handleSection(section: string) {
    const fullClass = `الصف ${selectedGrade} ${section}`;
    setState(prev => ({ ...prev, grade: fullClass }));
    setLocation("/dashboard");
  }

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "#f5f0e8", minHeight: "100vh" }}>
      {/* Header */}
      <div className="p-4" style={{ background: "linear-gradient(135deg, #1a5c2a 0%, #2d7a3e 100%)" }}>
        <div className="flex items-center gap-2 mb-2">
          <img src="/assets/logo.png" alt="" className="w-7 h-7 object-contain" />
          <button onClick={() => step === "section" ? setStep("grade") : setLocation("/dashboard")}
            className="text-green-200 text-sm">
            ← {step === "section" ? "اختيار الصف" : "الرئيسية"}
          </button>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-3xl p-2 bg-green-700 rounded-xl">🎓</span>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-white">تَحْدِيدُ الصَّفِّ</h1>
            <p className="text-green-200 text-sm">
              {step === "grade" ? "اخْتَرْ صَفَّكَ الدِّرَاسِيَّ" : `الصف ${selectedGrade} — اخْتَرْ شُعْبَتَكَ`}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6">
        {/* Mascot card */}
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

        {/* Step indicator */}
        <div className="flex justify-center gap-3 mb-6">
          {["اختيار الصف", "اختيار الشعبة"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: (step === "grade" ? i === 0 : i <= 1) ? "#1a5c2a" : "#d1d5db" }}>
                  {i + 1}
                </div>
                <span className="text-sm font-bold"
                  style={{ color: (step === "grade" ? i === 0 : i <= 1) ? "#1a5c2a" : "#9ca3af" }}>
                  {s}
                </span>
              </div>
              {i === 0 && <div className="w-8 h-0.5" style={{ background: step === "section" ? "#1a5c2a" : "#d1d5db" }} />}
            </div>
          ))}
        </div>

        {/* Grade selection */}
        {step === "grade" && (
          <>
            <h2 className="text-right font-bold text-lg mb-4" style={{ color: "#1a5c2a" }}>
              📚 اخْتَرْ صَفَّكَ:
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {GRADES.map((grade) => (
                <button key={grade} onClick={() => handleGrade(grade)}
                  className="p-6 bg-white rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all text-center"
                  style={{ border: "2px solid #e5e7eb" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#1a5c2a")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
                >
                  <div className="text-4xl mb-2">🏫</div>
                  <h3 className="font-bold text-xl" style={{ color: "#1a5c2a" }}>
                    الصف {grade}
                  </h3>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Section selection */}
        {step === "section" && (
          <>
            <h2 className="text-right font-bold text-lg mb-4" style={{ color: "#1a5c2a" }}>
              🏫 الصف {selectedGrade} — اخْتَرْ شُعْبَتَكَ:
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {SECTIONS.map((section) => {
                const current = student.grade === `الصف ${selectedGrade} ${section}`;
                return (
                  <button key={section} onClick={() => handleSection(section)}
                    className="p-6 rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all text-center"
                    style={{
                      background: current ? "#dcf5e7" : "white",
                      border: `2px solid ${current ? "#1a5c2a" : "#e5e7eb"}`,
                    }}
                  >
                    <div className="text-4xl mb-2">
                      {current ? "✅" : "🏫"}
                    </div>
                    <h3 className="font-bold text-3xl" style={{ color: "#1a5c2a" }}>
                      {section}
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">
                      الصف {selectedGrade} {section}
                    </p>
                    {current && (
                      <span className="text-xs text-green-600 font-bold">مُحَدَّدٌ ✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            <button onClick={() => setStep("grade")}
              className="w-full mt-4 py-3 rounded-xl border-2 font-bold text-sm transition-all hover:bg-green-50"
              style={{ borderColor: "#1a5c2a", color: "#1a5c2a" }}>
              ← تغيير الصف
            </button>
          </>
        )}
      </div>
    </div>
  );
}
