import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { setState, loadMyStudentFromServer } from "@/lib/store";
import { stopSound, setGender } from "@/lib/audio";
import { registerAccount, loginAccount, guestLogin, setToken, getToken, fetchMe, warmUpServer } from "@/lib/api";
import { AlertCircle, Eye, EyeOff, GraduationCap, Info, Lock, Mail, Mic, PenLine, Target, User } from "lucide-react";
import { Btn } from "@/components/ds";
import { cn } from "@/lib/utils";

const AVATARS = [
  { id: "boy1",  src: "/assets/omani-boy.png",   label: "طالب ١" },
  { id: "boy2",  src: "/assets/omani-boy.png",   label: "طالب ٢" },
  { id: "girl1", src: "/assets/omani-girl.png",  label: "طالبة ١" },
  { id: "girl2", src: "/assets/omani-girl2.png", label: "طالبة ٢" },
];

type Mode = "login" | "register";

export default function Login() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>("login");
  const [restoringSession, setRestoringSession] = useState(true);

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
    });
    setBusy(false);
    if (!res.ok || !res.token || !res.user) return setError(res.error || "تعذّر إنشاء الحساب");
    await afterAuthSuccess(res.user, res.token);
  }

  async function handleLogin() {
    setError(""); setEmailNotFound(false);
    if (!loginEmail.trim() || !loginPassword) return setError("الرجاء إدخال البريد الإلكتروني وكلمة المرور");
    setBusy(true);
    const res = await loginAccount(loginEmail.trim(), loginPassword);
    setBusy(false);
    if (!res.ok || !res.token || !res.user) {
      setEmailNotFound(!!res.notFound);
      return setError(res.error || "تعذّر تسجيل الدخول");
    }
    await afterAuthSuccess(res.user, res.token);
  }

  async function handleGuestLogin() {
    setError(""); setEmailNotFound(false);
    setBusy(true);
    const res = await guestLogin();
    setBusy(false);
    if (!res.ok || !res.token || !res.user) return setError(res.error || "تعذّر الدخول التجريبي");
    await afterAuthSuccess(res.user, res.token);
  }

  if (restoringSession) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center" role="status">
        <div className="flex flex-col items-center gap-3 text-text-secondary">
          <img src="/assets/logo.png" alt="" className="size-16 animate-pulse object-contain" />
          <p className="t-small">جَارٍ التَّحَقُّقُ مِنْ جَلْسَتِكَ...</p>
        </div>
      </div>
    );
  }

  const isRegister = mode === "register";
  const switchMode = (m: Mode) => { setMode(m); setError(""); setEmailNotFound(false); };

  return (
    <div dir="rtl" className="grid min-h-screen place-items-center p-4 md:p-8">
      <div className="page-enter card grid w-full max-w-5xl overflow-hidden shadow-lg lg:grid-cols-2" style={{ borderRadius: "1.5rem" }}>

        {/* ── لوحة الهوية: الرسم العُماني + الرسالة ── */}
        <aside className="relative hidden min-h-[640px] flex-col justify-between overflow-hidden p-10 text-white lg:flex"
          style={{ backgroundImage: "url('/assets/bg-main.png')", backgroundSize: "cover", backgroundPosition: "8% center" }}>
          <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(12,46,22,0.78) 0%, rgba(12,46,22,0.08) 36%, rgba(12,46,22,0.12) 52%, rgba(12,46,22,0.9) 100%)" }} />
          <div className="relative">
            <span className="mb-5 grid size-20 place-items-center rounded-2xl bg-white shadow-md">
              <img src="/assets/logo.png" alt="صوتي قلمي" className="size-16 object-contain" />
            </span>
            <h1 className="t-display">صَوْتِي قَلَمِي</h1>
            <p className="t-body mt-1 text-white/85">أَتَعَلَّمُ. أُبْدِعُ. أَتَعَبَّرُ.</p>
          </div>
          <div className="relative">
            <ul className="space-y-3">
              {[
                { icon: Mic, text: "تَحَدَّثْ عَنْ مَوْضُوعٍ وَاحْصُلْ عَلَى تَقْيِيمٍ" },
                { icon: PenLine, text: "اكْتُبْ نَصَّكَ وَصَحِّحْ أَخْطَاءَكَ" },
                { icon: Target, text: "تَعَلَّمْ بِأُسْلُوبِكَ وَتَابِعْ تَقَدُّمَكَ" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-[15px]">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/15"><Icon size={18} strokeWidth={1.85} /></span>
                  {text}
                </li>
              ))}
            </ul>
            <p className="t-caption mt-6 text-white/75">مَنَصَّةٌ تَعْلِيمِيَّةٌ لِطُلَّابِ الصَّفِّ السَّادِسِ · سَلْطَنَةُ عُمَانَ 🇴🇲</p>
          </div>
        </aside>

        {/* ── النموذج ── */}
        <main className="flex flex-col justify-center p-6 sm:p-10">
          {/* هوية مصغّرة للهاتف/التابلت */}
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <img src="/assets/logo.png" alt="" className="size-14 object-contain" />
            <div>
              <h1 className="text-xl font-bold text-primary">صَوْتِي قَلَمِي</h1>
              <p className="t-caption text-text-muted">أَتَعَلَّمُ. أُبْدِعُ. أَتَعَبَّرُ.</p>
            </div>
          </div>

          {/* تبويب دخول / حساب جديد */}
          <div role="tablist" aria-label="طريقة الدخول" className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-surface-subtle p-1">
            {([["login", "تَسْجِيلُ الدُّخُولِ"], ["register", "حِسَابٌ جَدِيدٌ"]] as const).map(([m, label]) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => switchMode(m)}
                className={cn("min-h-[44px] rounded-lg text-[15px] font-semibold transition-all",
                  mode === m ? "bg-white text-primary shadow-sm" : "text-text-secondary hover:text-text-primary")}>
                {label}
              </button>
            ))}
          </div>

          <h2 className="t-section text-text-primary">{isRegister ? "أَنْشِئْ حِسَابَكَ" : "أَهْلًا بِعَوْدَتِكَ"}</h2>
          <p className="t-small mb-5 mt-0.5 text-text-secondary">
            {isRegister ? "لِيُحْفَظَ تَقَدُّمُكَ تِلْقَائِيًّا وَتَسْتَعِيدَهُ مِنْ أَيِّ جِهَازٍ." : "سَجِّلْ دُخُولَكَ لِلْمُتَابَعَةِ مِنْ حَيْثُ تَوَقَّفْتَ."}
          </p>

          {error && (
            <div role="alert" className="alert alert-error mb-4">
              <AlertCircle size={20} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden />
              <div className="flex-1">
                <p>{error}</p>
                {emailNotFound && (
                  <button type="button" className="mt-1 text-sm font-semibold text-primary underline underline-offset-2"
                    onClick={() => { setMode("register"); setEmail(loginEmail.trim()); setError(""); setEmailNotFound(false); }}>
                    لَا يُوجَدُ حِسَابٌ بِهَذَا الْبَرِيدِ — أَنْشِئْ حِسَابًا جَدِيدًا
                  </button>
                )}
              </div>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); isRegister ? handleRegister() : handleLogin(); }} noValidate>
            {isRegister ? (
              <>
                <fieldset className="mb-4">
                  <legend className="label">اخْتَرْ صُورَتَكَ</legend>
                  <div role="radiogroup" aria-label="الصورة الشخصية" className="flex gap-3">
                    {AVATARS.map((av) => (
                      <button key={av.id} type="button" role="radio" aria-checked={avatar === av.id} aria-label={av.label}
                        onClick={() => setAvatar(av.id)}
                        className={cn("size-14 overflow-hidden rounded-full border-2 bg-surface-subtle transition-all duration-200 sm:size-16",
                          avatar === av.id ? "scale-110 border-primary bg-primary-soft shadow-md ring-4 ring-primary/15" : "border-border hover:border-border-strong")}>
                        <img src={av.src} alt="" className="size-full object-contain p-1" />
                      </button>
                    ))}
                  </div>
                </fieldset>

                <Field id="reg-name" label="اسْمُكَ الْكَرِيمُ" value={name} onChange={setName} placeholder="أَدْخِلِ اسْمَكَ" icon={User} autoComplete="name" />

                <div className="mb-4">
                  <label htmlFor="reg-section" className="label">شُعْبَتُكَ</label>
                  <div className="flex gap-2">
                    <span className="grid min-w-[84px] place-items-center rounded-xl bg-surface-subtle px-3 text-sm font-semibold text-text-secondary">السَّادِسُ</span>
                    <input id="reg-section" className="input" value={section} onChange={(e) => setSection(e.target.value)} placeholder="مِثَالٌ: ٩ أَوْ أ" />
                  </div>
                </div>

                <Field id="reg-email" label="الْبَرِيدُ الْإِلِكْتْرُونِيُّ" value={email} onChange={setEmail} placeholder="example@mail.com" icon={Mail} type="email" autoComplete="email" dir="ltr" />
                <Field id="reg-pass" label="كَلِمَةُ الْمُرُورِ" value={password} onChange={setPassword} placeholder="6 أَحْرُفٍ عَلَى الْأَقَلِّ" icon={Lock} type="password" autoComplete="new-password" />
              </>
            ) : (
              <>
                <Field id="login-email" label="الْبَرِيدُ الْإِلِكْتْرُونِيُّ" value={loginEmail} onChange={setLoginEmail} placeholder="example@mail.com" icon={Mail} type="email" autoComplete="email" dir="ltr" />
                <Field id="login-pass" label="كَلِمَةُ الْمُرُورِ" value={loginPassword} onChange={setLoginPassword} placeholder="••••••" icon={Lock} type="password" autoComplete="current-password" />
              </>
            )}

            <Btn type="submit" size="lg" block loading={busy} className="mt-1">
              {isRegister ? (busy ? "جَارٍ إِنْشَاءُ الْحِسَابِ..." : "أَنْشِئْ حِسَابِي وَابْدَأْ") : (busy ? "جَارٍ التَّحَقُّقُ..." : "تَسْجِيلُ الدُّخُولِ")}
            </Btn>
            {slowServer && (
              <p role="status" className="alert alert-warning mt-3 !py-2 text-sm">
                الْخَادِمُ يَسْتَيْقِظُ مِنْ وَضْعِ السُّكُونِ، وَقَدْ يَسْتَغْرِقُ هَذَا حَتَّى دَقِيقَةٍ فِي أَوَّلِ مُحَاوَلَةٍ. الرَّجَاءُ الِانْتِظَارُ.
              </p>
            )}
          </form>

          <div className="my-6 flex items-center gap-3 text-text-muted" aria-hidden>
            <span className="h-px flex-1 bg-border" /><span className="t-caption">خِيَارَاتٌ أُخْرَى</span><span className="h-px flex-1 bg-border" />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Btn variant="outline" icon={GraduationCap} onClick={() => setLocation("/teacher")}>دُخُولُ الْمُعَلِّمِ</Btn>
            <Btn variant="outline" icon={Info} onClick={() => setLocation("/about")}>مَا هَذَا الْبَرْنَامَجُ؟</Btn>
          </div>
          <Btn variant="ghost" size="sm" block className="mt-2 !whitespace-normal text-center" onClick={handleGuestLogin} disabled={busy}>
            دُخُولٌ تَجْرِيبِيٌّ (لِلِاسْتِعْرَاضِ فَقَطْ — لِلَجْنَةِ التَّحْكِيمِ)
          </Btn>
        </main>
      </div>
    </div>
  );
}

function Field({ id, label, value, onChange, placeholder, icon: Icon, type = "text", autoComplete, dir }: {
  id: string; label: string; value: string; onChange: (v: string) => void; placeholder: string;
  icon: typeof Mail; type?: string; autoComplete?: string; dir?: "ltr" | "rtl";
}) {
  const [show, setShow] = useState(false);
  const isPass = type === "password";
  return (
    <div className="mb-4">
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <Icon size={18} strokeWidth={1.75} className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden />
        <input id={id} className="input" style={{ paddingInlineStart: isPass ? "2.75rem" : undefined, paddingInlineEnd: "2.75rem", direction: dir }}
          type={isPass && show ? "text" : type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} autoComplete={autoComplete} />
        {isPass && (
          <button type="button" onClick={() => setShow(v => !v)} aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            className="absolute start-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-text-muted hover:bg-surface-subtle hover:text-text-primary">
            {show ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
          </button>
        )}
      </div>
    </div>
  );
}
