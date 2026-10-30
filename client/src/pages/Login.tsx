import { Brand } from "@/components/ProductUI";
import { useState, useEffect, useId, useRef } from "react";
import { useLocation } from "wouter";
import { getState, setState, loadMyStudentFromServer, prefetchMyStudentRecord } from "@/lib/store";
import { stopSound, setGender } from "@/lib/audio";
import { describeError, registerAccount, loginAccount, guestLogin, setToken, getToken, fetchMe, warmUpServer } from "@/lib/api";

const AVATARS = [
  { id: "boy1",  src: "/assets/avatars/boy1-v2.png", label: "طالب بالكُمّة العُمانية" },
  { id: "boy2",  src: "/assets/avatars/boy2-v2.png", label: "طالب بالمَصَر العُماني" },
  { id: "girl1", src: "/assets/avatars/girl1-v2.png", label: "طالبة بحجاب أخضر" },
  { id: "girl2", src: "/assets/avatars/girl2-v2.png", label: "طالبة بحجاب وردي" },
];

type Mode = "login" | "register";

export default function Login() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>("login");
  const [restoringSession, setRestoringSession] = useState(() => Boolean(getToken()));
  const restoreRequest = useRef<AbortController | null>(null);

  // حقول حساب جديد
  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [avatar, setAvatar] = useState("boy1");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // حقول دخول
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [slowServer, setSlowServer] = useState(false);

  // إن طال الانتظار أثناء الدخول/التسجيل أكثر من المعتاد (غالبًا لأن
  // الخادم كان نائمًا واستيقظ للتو)، نوضّح للطالب أن هذا طبيعي بدل أن
  // يظن أن شيئًا تعطَّل.
  useEffect(() => {
    if (!busy) { setSlowServer(false); return; }
    const t = setTimeout(() => setSlowServer(true), 6000);
    return () => clearTimeout(t);
  }, [busy]);
  const [error, setError] = useState("");
  const [emailNotFound, setEmailNotFound] = useState(false);

  useEffect(() => {
    stopSound();
    warmUpServer(); // نبدأ إيقاظ الخادم فورًا، قبل أي تفاعل من الطالب
    const controller = new AbortController();
    restoreRequest.current = controller;
    let active = true;
    // قد يستيقظ Render Free خلال دقيقة؛ مهلة الخلفية لا تؤخر ظهور الصفحة.
    const timeout = setTimeout(() => controller.abort(), 75_000);
    // تظهر صفحة الدخول فورًا. الاستعادة في الخلفية ولا تمنع استخدام النموذج.
    (async () => {
      try {
        if (getToken()) {
          void import("./Dashboard").catch(() => {});
          const identity = fetchMe(controller.signal);
          const progress = prefetchMyStudentRecord(controller.signal);
          const user = await identity;
          if (user && !controller.signal.aborted) {
            const g = user.avatar === "girl1" || user.avatar === "girl2" ? "female" : "male";
            setGender(g);
            await loadMyStudentFromServer(user.name, user.grade, user.avatar, controller.signal, progress);
            if (active && !controller.signal.aborted) setLocation("/dashboard");
          }
        }
      } catch (e) {
        if (active && !controller.signal.aborted) setError(describeError(e, "تعذّر استعادة جلستك. حاول تسجيل الدخول مرة أخرى."));
      } finally {
        clearTimeout(timeout);
        controller.abort();
        if (active) setRestoringSession(false);
      }
    })();
    return () => { active = false; controller.abort(); clearTimeout(timeout); stopSound(); };
  }, []);

  function beginManualLogin() {
    restoreRequest.current?.abort();
    setRestoringSession(false);
    setBusy(true);
    void import("./Dashboard").catch(() => {});
  }

  async function afterAuthSuccess(user: { name: string; grade: string; avatar: string }, token: string) {
    setToken(token);
    const g = user.avatar === "girl1" || user.avatar === "girl2" ? "female" : "male";
    setGender(g);
    try {
      await loadMyStudentFromServer(user.name, user.grade, user.avatar);
      setLocation("/dashboard");
    } catch (e) { setError(describeError(e, "تعذّر استعادة تقدمك. حاول مرة أخرى.")); }
  }

  async function handleRegister() {
    setError("");
    if (!name.trim()) return setError("الرجاء إدخال اسمك");
    if (!section.trim()) return setError("الرجاء إدخال شعبتك");
    if (!email.trim()) return setError("الرجاء إدخال بريدك الإلكتروني");
    if (password.length < 6) return setError("كلمة المرور يجب ألا تقل عن 6 أحرف");

    const grade = `السادس ${section.trim()}`;
    beginManualLogin();
    try {
      const res = await registerAccount({
        name: name.trim(), grade, avatar, email: email.trim(), password,
      });
      if (!res.ok || !res.token || !res.user) return setError(res.error || "تعذّر إنشاء الحساب");
      await afterAuthSuccess(res.user, res.token);
    } finally { setBusy(false); }
  }

  async function handleLogin() {
    setError(""); setEmailNotFound(false);
    if (!loginEmail.trim() || !loginPassword) return setError("الرجاء إدخال البريد الإلكتروني وكلمة المرور");
    beginManualLogin();
    try {
      const res = await loginAccount(loginEmail.trim(), loginPassword);
      if (!res.ok || !res.token || !res.user) {
        setEmailNotFound(!!res.notFound);
        return setError(res.error || "تعذّر تسجيل الدخول");
      }
      await afterAuthSuccess(res.user, res.token);
    } finally { setBusy(false); }
  }

  async function handleGuestLogin() {
    setError(""); setEmailNotFound(false);
    beginManualLogin();
    try {
      const res = await guestLogin();
      if (!res.ok || !res.token || !res.user) return setError(res.error || "تعذّر الدخول التجريبي");
      await afterAuthSuccess(res.user, res.token);
    } finally { setBusy(false); }
  }

  return (
    <div
      dir="rtl"
      className="auth-page"
    >
      <div className="auth-layout">
        <aside className="auth-brand"><Brand large /><h1>مساحة لصوتك وإبداع لقلمك</h1><p>بَرْنَامَجٌ تَفَاعُلِيٌّ لِتَعْلِيمِ اللُّغَةِ الْعَرَبِيَّةِ لِطُلَّابِ الصَّفِّ السَّادِسِ</p></aside>

        {/* ── White Form ── */}
        <div className="auth-form">
          {restoringSession && <p role="status" className="text-center text-xs text-gray-500 mb-3">نستعيد حسابك المحفوظ في الخلفية…</p>}
          {mode === "login" && (
            <p className="text-center text-sm font-bold mb-1" style={{ color: "#075348" }}>
              أهلًا بعودتك
            </p>
          )}

          {error && (
            <div role="alert" className="mb-3 bg-red-50 border border-red-200 rounded-xl p-2.5 text-right">
              <p className="text-red-600 text-sm">{error}</p>
              {emailNotFound && (
                <button
                  type="button"
                  onClick={() => { setMode("register"); setEmail(loginEmail.trim()); setError(""); setEmailNotFound(false); }}
                  className="mt-2 text-xs font-bold underline underline-offset-2"
                  style={{ color: "#075348" }}
                >
                  لَا يُوجَدُ حِسَابٌ بِهَذَا الْبَرِيدِ — اضْغَطْ هُنَا لِإِنْشَاءِ حِسَابٍ جَدِيدٍ
                </button>
              )}
            </div>
          )}

          {mode === "register" ? (
            <>
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); }}
                className="text-xs text-gray-400 mb-3 flex items-center gap-1"
              >
                → الرُّجُوعُ إِلَى تَسْجِيلِ الدُّخُولِ
              </button>
              <p className="text-xs text-gray-400 text-center mb-4">
                أَنْشِئْ حِسَابَكَ لِيُحْفَظَ تَقَدُّمُكَ تِلْقَائِيًّا وَتَسْتَعِيدَهُ مِنْ أَيِّ جِهَازٍ
              </p>

              {/* Avatar picker */}
              <div className="mb-4">
                <label className="block text-right text-gray-600 mb-2 font-semibold text-sm">اخْتَرْ صُورَتَكَ:</label>
                <div className="avatar-options">
                  {AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      aria-label={av.label}
                      aria-pressed={avatar === av.id}
                      onClick={() => setAvatar(av.id)}
                      className="student-avatar-option"
                    >
                      <img src={av.src} alt="" />
                      {avatar === av.id && <span className="avatar-selected" aria-hidden="true">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <Field label="اسْمُكَ الْكَرِيمُ:" value={name} onChange={setName} placeholder="أَدْخِلْ اسْمَكَ هُنَا..." icon="👤" />

              <div className="mb-3">
                <label htmlFor="student-section" className="block text-right text-gray-600 mb-1.5 font-semibold text-sm">
                  شُعْبَتُكَ: <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">السادس</div>
                  <input
                    id="student-section" type="text" value={section} onChange={(e) => setSection(e.target.value)}
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
                onClick={handleRegister}
                disabled={busy}
                className="sawti-btn-primary w-full py-4 text-lg"
              >
                {busy ? "جَارٍ إِنْشَاءُ الْحِسَابِ..." : "أَنْشِئْ حِسَابِي وَابْدَأْ!"}
              </button>
              {slowServer && (
                <p className="text-xs text-amber-600 text-center mt-2">
                  ⏳ الخادم يستيقظ من وضع السكون، قد يستغرق هذا حتى دقيقة في أول محاولة — الرجاء الانتظار.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-gray-400 text-center mb-4">سَجِّلْ دُخُولَكَ لِلْمُتَابَعَةِ مِنْ حَيْثُ تَوَقَّفْتَ</p>
              <Field label="بَرِيدُكَ الإِلِكْتْرُونِيُّ:" value={loginEmail} onChange={setLoginEmail} placeholder="example@mail.com" icon="✉️" type="email" />
              <Field label="كَلِمَةُ الْمُرُورِ:" value={loginPassword} onChange={setLoginPassword} placeholder="••••••" icon="🔒" type="password" onEnter={handleLogin} />
              <button
                onClick={handleLogin}
                disabled={busy}
                className="sawti-btn-primary w-full py-4 text-lg"
              >
                {busy ? "جَارٍ التَّحَقُّقُ..." : "تَسْجِيلُ الدُّخُولِ"}
              </button>
              {slowServer && (
                <p className="text-xs text-amber-600 text-center mt-2">
                  ⏳ الخادم يستيقظ من وضع السكون، قد يستغرق هذا حتى دقيقة في أول محاولة — الرجاء الانتظار.
                </p>
              )}

              <button
                type="button"
                onClick={() => { setMode("register"); setError(""); }}
                className="w-full mt-4 py-2 text-sm text-center text-gray-500"
              >
                لَيْسَ لَدَيْكَ حِسَابٌ؟ <span className="font-bold underline underline-offset-2" style={{ color: "#075348" }}>أَنْشِئْ حِسَابًا جَدِيدًا</span>
              </button>
            </>
          )}

          <p className="text-center text-gray-400 mt-3 text-xs">
            كُنْ مُجِدًّا بِتَقَدُّمِكَ، كُلُّ خُطْوَةٍ تُقَرِّبُكَ مِنَ الإِبْدَاعِ
          </p>

          <button
            onClick={() => setLocation("/about")}
            className="w-full mt-2 py-1.5 text-xs font-semibold text-gray-500 underline underline-offset-2"
          >
            ما هو هذا البرنامج؟ وكيف يعمل؟
          </button>

          <button
            onClick={() => setLocation("/teacher")}
            className="w-full mt-3 py-2.5 rounded-xl border-2 font-bold text-sm transition-all hover:bg-amber-50"
            style={{ borderColor: "#c6a260", color: "#b45309" }}
          >
            دُخُولُ الْمُعَلِّمِ
          </button>

          <button
            onClick={handleGuestLogin}
            disabled={busy}
            className="sawti-btn-outline w-full mt-2 text-sm disabled:opacity-50"
          >
            دُخُولٌ تَجْرِيبِيٌّ (لِلِاسْتِعْرَاضِ فَقَطْ — لِلَجْنَةِ التَّحْكِيمِ)
          </button>
        </div>
      </div>

      {import.meta.env.DEV && !getToken() && <button className="sawti-btn-outline mx-auto mt-6" onClick={() => {
        if (!getState().name) setState(prev => ({ ...prev, name: "طالب تجريبي", grade: "الصف السادس", avatar: "boy1", stars: 12, points: 120, speakingProgress: 40, writingProgress: 25, selfLearningProgress: 15, onboardingSeen: true }));
        sessionStorage.setItem(`welcome_session_${getState().name}`, "1");
        setLocation("/dashboard");
      }}>معاينة التصميم محليًا</button>}
      <p className="auth-footer">صوتي قلمي · سلطنة عُمان</p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, icon, type = "text", onEnter }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; icon: string; type?: string; onEnter?: () => void;
}) {
  const fieldId = useId();
  return (
    <div className="mb-4">
      <label htmlFor={fieldId} className="block text-right text-gray-600 mb-1.5 font-semibold text-sm">{label}</label>
      <div className="relative">
        <input
          id={fieldId}
          autoComplete={type === "password" ? "current-password" : type === "email" ? "email" : "name"}
          dir={type === "email" ? "ltr" : undefined}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
          placeholder={placeholder}
          className="sawti-input text-base"
        />

      </div>
    </div>
  );
}
