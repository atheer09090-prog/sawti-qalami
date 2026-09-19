import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { setState, loadMyStudentFromServer } from "@/lib/store";
import { stopSound, setGender } from "@/lib/audio";
import { registerAccount, loginAccount, setToken, getToken, fetchMe } from "@/lib/api";

const AVATARS = [
  { id: "boy1",  src: "/assets/omani-boy.png",   label: "طالب ١" },
  { id: "boy2",  src: "/assets/omani-boy.png",   label: "طالب ٢" },
  { id: "girl1", src: "/assets/omani-girl.png",  label: "طالبة ١" },
  { id: "girl2", src: "/assets/omani-girl2.png", label: "طالبة ٢" },
];

type Mode = "login" | "register";

export default function Login() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>("register");
  const [restoringSession, setRestoringSession] = useState(true);

  // حقول حساب جديد
  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [avatar, setAvatar] = useState("boy1");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showLegacy, setShowLegacy] = useState(false);
  const [legacyName, setLegacyName] = useState("");
  const [legacySection, setLegacySection] = useState("");

  // حقول دخول
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    stopSound();
    // إن كانت هناك جلسة محفوظة سابقًا (رمز دخول)، حاول استعادتها تلقائيًا
    // بدل إجبار الطالب على تسجيل الدخول من جديد في كل زيارة.
    (async () => {
      if (getToken()) {
        const user = await fetchMe();
        if (user) {
          const g = user.avatar === "girl1" || user.avatar === "girl2" ? "female" : "male";
          setGender(g);
          await loadMyStudentFromServer(user.name, user.grade, user.avatar);
          setLocation("/dashboard");
          return;
        }
      }
      setRestoringSession(false);
    })();
    return () => stopSound();
  }, []);

  async function afterAuthSuccess(user: { name: string; grade: string; avatar: string }, token: string) {
    setToken(token);
    const g = user.avatar === "girl1" || user.avatar === "girl2" ? "female" : "male";
    setGender(g);
    await loadMyStudentFromServer(user.name, user.grade, user.avatar);
    setLocation("/dashboard");
  }

  async function handleRegister() {
    setError("");
    if (!name.trim()) return setError("الرجاء إدخال اسمك");
    if (!section.trim()) return setError("الرجاء إدخال شعبتك");
    if (!email.trim()) return setError("الرجاء إدخال بريدك الإلكتروني");
    if (password.length < 6) return setError("كلمة المرور يجب ألا تقل عن 6 أحرف");

    const grade = `السادس ${section.trim()}`;
    setBusy(true);
    const res = await registerAccount({
      name: name.trim(), grade, avatar, email: email.trim(), password,
      ...(showLegacy && legacyName.trim() && legacySection.trim()
        ? { legacy_name: legacyName.trim(), legacy_grade: `السادس ${legacySection.trim()}` }
        : {}),
    });
    setBusy(false);
    if (!res.ok || !res.token || !res.user) return setError(res.error || "تعذّر إنشاء الحساب");
    await afterAuthSuccess(res.user, res.token);
  }

  async function handleLogin() {
    setError("");
    if (!loginEmail.trim() || !loginPassword) return setError("الرجاء إدخال البريد الإلكتروني وكلمة المرور");
    setBusy(true);
    const res = await loginAccount(loginEmail.trim(), loginPassword);
    setBusy(false);
    if (!res.ok || !res.token || !res.user) return setError(res.error || "تعذّر تسجيل الدخول");
    await afterAuthSuccess(res.user, res.token);
  }

  if (restoringSession) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center" style={{ fontFamily: "'Cairo', sans-serif" }}>
        <p className="text-gray-500">جَارٍ التَّحَقُّقُ مِنْ جَلْسَتِكَ...</p>
      </div>
    );
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
          <img
            src="/assets/logo.png"
            alt="صوتي قلمي"
            className="w-24 h-24 object-contain mx-auto mb-2"
            style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.3))" }}
          />
          <h1 style={{ fontFamily: "'Amiri', serif", color: "#f5c842", fontSize: "1.9rem", fontWeight: 700, lineHeight: 1.2 }}>
            صَوْتِي قَلَمِي
          </h1>
          <p style={{ color: "#d4edda", fontSize: "0.85rem", marginTop: "4px" }}>
            أَتَعَلَّمُ. أُبْدِعُ. أَتَعَبَّرُ
          </p>
        </div>

        {/* ── White Form ── */}
        <div className="bg-white px-6 py-5">
          {/* Tabs */}
          <div className="flex mb-5 rounded-xl overflow-hidden border-2" style={{ borderColor: "#e5e7eb" }}>
            <button
              onClick={() => { setMode("register"); setError(""); }}
              className="flex-1 py-2.5 text-sm font-bold transition-colors"
              style={mode === "register" ? { background: "#1a5c2a", color: "white" } : { background: "white", color: "#6b7280" }}
            >
              حِسَابٌ جَدِيدٌ
            </button>
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className="flex-1 py-2.5 text-sm font-bold transition-colors"
              style={mode === "login" ? { background: "#1a5c2a", color: "white" } : { background: "white", color: "#6b7280" }}
            >
              تَسْجِيلُ الدُّخُولِ
            </button>
          </div>

          {error && (
            <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-2.5 text-right">
              <p className="text-red-600 text-sm">⚠️ {error}</p>
            </div>
          )}

          {mode === "register" ? (
            <>
              <p className="text-xs text-gray-400 text-center mb-4">
                أَنْشِئْ حِسَابَكَ لِيُحْفَظَ تَقَدُّمُكَ تِلْقَائِيًّا وَتَسْتَعِيدَهُ مِنْ أَيِّ جِهَازٍ
              </p>

              {/* Avatar picker */}
              <div className="mb-4">
                <label className="block text-right text-gray-600 mb-2 font-semibold text-sm">اخْتَرْ صُورَتَكَ:</label>
                <div className="flex justify-center gap-3">
                  {AVATARS.map((av) => (
                    <button
                      key={av.id}
                      onClick={() => setAvatar(av.id)}
                      className="w-14 h-14 rounded-full border-2 transition-all overflow-hidden"
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

              <Field label="اسْمُكَ الْكَرِيمُ:" value={name} onChange={setName} placeholder="أَدْخِلْ اسْمَكَ هُنَا..." icon="👤" />

              <div className="mb-3">
                <label className="block text-right text-gray-600 mb-1.5 font-semibold text-sm">
                  شُعْبَتُكَ: <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">السادس</div>
                  <input
                    type="text" value={section} onChange={(e) => setSection(e.target.value)}
                    placeholder="مثال: ٩ أو أ..."
                    className="w-full pl-4 pr-20 py-3 rounded-xl border-2 text-right focus:outline-none text-base"
                    style={{ borderColor: "#e5e7eb" }}
                  />
                </div>
              </div>

              <Field label="بَرِيدُكَ الإِلِكْتْرُونِيُّ:" value={email} onChange={setEmail} placeholder="example@mail.com" icon="✉️" type="email" />
              <Field label="كَلِمَةُ الْمُرُورِ:" value={password} onChange={setPassword} placeholder="6 أحرف على الأقل" icon="🔒" type="password" />

              {/* استعادة تقدم سابق */}
              <button
                type="button"
                onClick={() => setShowLegacy((v) => !v)}
                className="w-full text-right text-xs text-blue-600 font-semibold mb-3 underline underline-offset-2"
              >
                {showLegacy ? "▲ " : "▼ "} هَلْ اسْتَخْدَمْتَ الْمَنَصَّةَ سَابِقًا بِدُونِ حِسَابٍ؟
              </button>
              {showLegacy && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs text-amber-800 mb-2 leading-relaxed">
                    أَدْخِلِ اسْمَكَ وَشُعْبَتَكَ الْقَدِيمَيْنِ بِالضَّبْطِ كَمَا كُنْتَ تَكْتُبُهُمَا سَابِقًا، وَسَنَرْبُطُ تَقَدُّمَكَ الْقَدِيمَ (نِقَاطَكَ وَشَارَاتِكَ) بِحِسَابِكَ الْجَدِيدِ تِلْقَائِيًّا.
                  </p>
                  <input
                    type="text" value={legacyName} onChange={(e) => setLegacyName(e.target.value)}
                    placeholder="اسمك القديم"
                    className="w-full mb-2 px-3 py-2 rounded-lg border text-right text-sm"
                  />
                  <input
                    type="text" value={legacySection} onChange={(e) => setLegacySection(e.target.value)}
                    placeholder="شعبتك القديمة (مثال: ٩)"
                    className="w-full px-3 py-2 rounded-lg border text-right text-sm"
                  />
                </div>
              )}

              <button
                onClick={handleRegister}
                disabled={busy}
                className="w-full py-4 rounded-xl text-white text-lg font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #1a5c2a 0%, #2d7a3e 100%)" }}
              >
                {busy ? "جَارٍ إِنْشَاءُ الْحِسَابِ..." : "أَنْشِئْ حِسَابِي وَابْدَأْ! 🚀"}
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-400 text-center mb-4">سَجِّلْ دُخُولَكَ لِلْمُتَابَعَةِ مِنْ حَيْثُ تَوَقَّفْتَ</p>
              <Field label="بَرِيدُكَ الإِلِكْتْرُونِيُّ:" value={loginEmail} onChange={setLoginEmail} placeholder="example@mail.com" icon="✉️" type="email" />
              <Field label="كَلِمَةُ الْمُرُورِ:" value={loginPassword} onChange={setLoginPassword} placeholder="••••••" icon="🔒" type="password" onEnter={handleLogin} />
              <button
                onClick={handleLogin}
                disabled={busy}
                className="w-full py-4 rounded-xl text-white text-lg font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #1a5c2a 0%, #2d7a3e 100%)" }}
              >
                {busy ? "جَارٍ التَّحَقُّقُ..." : "تَسْجِيلُ الدُّخُولِ"}
              </button>
            </>
          )}

          <p className="text-center text-gray-400 mt-3 text-xs">
            ⭐ كُنْ مُجِدًّا بِتَقَدُّمِكَ، كُلُّ خُطْوَةٍ تُقَرِّبُكَ مِنَ الإِبْدَاعِ ⭐
          </p>

          <button
            onClick={() => setLocation("/about")}
            className="w-full mt-2 py-1.5 text-xs font-semibold text-gray-500 underline underline-offset-2"
          >
            ℹ️ ما هي هذه المنصة؟ وكيف تعمل؟
          </button>

          <button
            onClick={() => setLocation("/teacher")}
            className="w-full mt-3 py-2.5 rounded-xl border-2 font-bold text-sm transition-all hover:bg-amber-50"
            style={{ borderColor: "#f5c842", color: "#b45309" }}
          >
            🎓 دُخُولُ الْمُعَلِّمِ
          </button>
        </div>
      </div>

      <img
        src="/assets/omani-boy.png"
        alt="طالب عماني"
        className="w-32 mt-4 drop-shadow-xl"
        style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.15))" }}
      />

      <button
        className="mt-3 px-5 py-2 rounded-full text-white text-sm font-bold shadow-lg"
        style={{ background: "linear-gradient(135deg, #1a5c2a, #2d7a3e)" }}
      >
        🇴🇲 سَلْطَنَةُ عُمَانَ
      </button>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, icon, type = "text", onEnter }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; icon: string; type?: string; onEnter?: () => void;
}) {
  return (
    <div className="mb-4">
      <label className="block text-right text-gray-600 mb-1.5 font-semibold text-sm">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
          placeholder={placeholder}
          className="w-full px-4 py-3 pr-10 rounded-xl border-2 text-right focus:outline-none text-base transition-colors"
          style={{ borderColor: "#e5e7eb" }}
          onFocus={(e) => (e.target.style.borderColor = "#1a5c2a")}
          onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
      </div>
    </div>
  );
}
