export const API_BASE = import.meta.env.VITE_API_URL || "https://sawti-0k3n.onrender.com/api";

export async function diacritizeText(text: string): Promise<string> {
  if (!text) return text;
  try {
    const res = await fetch(`${API_BASE}/eval/diacritize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return text;
    const data = await res.json();
    return data?.result || text;
  } catch {
    return text;
  }
}

export async function checkSpelling(
  text: string,
  useAi: boolean = false
): Promise<{ errors: Array<{ wrong: string; correct: string; explanation: string; start: number; end: number; source: string }>; error_count: number; score: number }> {
  try {
    const res = await fetch(`${API_BASE}/eval/spellcheck`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, use_ai: useAi }),
    });
    if (!res.ok) return { errors: [], error_count: 0, score: 100 };
    return res.json();
  } catch {
    return { errors: [], error_count: 0, score: 100 };
  }
}

export async function evaluateSpeech(
  audioBlob: Blob,
  referenceText?: string,
  studentId: number = 0,
  lessonId: string = ""
) {
  const formData = new FormData();
  // اسم الملف يجب أن يطابق الصيغة الحقيقية للـBlob (audio/webm من MediaRecorder
  // في Speaking.tsx). كان الاسم سابقاً "recording.wav" رغم أن المحتوى الفعلي
  // WebM — الباك إند الآن يعتمد أولاً على الـContent-Type الحقيقي للملف كحل
  // أساسي، لكن نُصلح الاسم هنا أيضاً حتى يتطابق الاسم والمحتوى بدقة في كل مكان.
  const ext = audioBlob.type.includes("webm") ? "webm"
    : audioBlob.type.includes("ogg") ? "ogg"
    : audioBlob.type.includes("mp4") || audioBlob.type.includes("m4a") ? "m4a"
    : audioBlob.type.includes("mpeg") || audioBlob.type.includes("mp3") ? "mp3"
    : "wav";
  formData.append("audio_file", audioBlob, `recording.${ext}`);
  formData.append("student_id", String(studentId));
  formData.append("lesson_id", lessonId);
  if (referenceText) formData.append("reference_text", referenceText);
  const res = await fetch(`${API_BASE}/eval/speech`, { method: "POST", body: formData });
  if (!res.ok) throw new Error("خطأ في تقييم التحدث");
  return res.json();
}

export async function evaluateWriting(
  text: string,
  minWords: number = 20,
  studentId: number = 0,
  lessonId: string = ""
) {
  const res = await fetch(`${API_BASE}/eval/writing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id: studentId, lesson_id: lessonId, text, min_words: minWords }),
  });
  if (!res.ok) throw new Error("خطأ في تقييم الكتابة");
  return res.json();
}

// ── 🤖 اسأل بذكاء: يصوغ الطالب سؤاله بنفسه ويجيب المعلم الذكي ──
export async function askSmartTeacher(question: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/eval/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) return "تعذّر الاتصال بالمعلم الذكي الآن. حاول مرة أخرى.";
    const data = await res.json();
    return data?.answer || "لم أتمكن من فهم السؤال، حاول صياغته بطريقة أخرى.";
  } catch {
    return "تعذّر الاتصال بالمعلم الذكي الآن. تحقّق من اتصالك بالإنترنت.";
  }
}

export async function evaluateContext(text: string): Promise<Array<{original: string; suggested: string; rule: string}>> {
  try {
    const res = await fetch(`${API_BASE}/eval/context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.suggestions || [];
  } catch {
    return [];
  }
}

// ── Lessons API ──
const LESSONS_BASE = `${API_BASE.replace("/api", "")}/api/lessons`;
const STUDENTS_BASE = `${API_BASE.replace("/api", "")}/api/students`;
const AUTH_BASE = `${API_BASE.replace("/api", "")}/api/auth`;

// ── سجلّ الطالب على الخادم (يُبنى المفتاح من الاسم + الصف) ──
export async function getStudentRecord(name: string, grade: string): Promise<any | null> {
  try {
    const res = await fetch(`${STUDENTS_BASE}/${encodeURIComponent(name)}/${encodeURIComponent(grade)}`);
    return res.ok ? res.json() : null;
  } catch { return null; }
}
export async function saveStudentRecord(name: string, grade: string, data: object): Promise<boolean> {
  try {
    const res = await fetch(`${STUDENTS_BASE}/${encodeURIComponent(name)}/${encodeURIComponent(grade)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch { return false; }
}
export async function saveStudentRecordByKey(key: string, data: object): Promise<boolean> {
  try {
    const res = await fetch(`${STUDENTS_BASE}/by-key`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, data }),
    });
    return res.ok;
  } catch { return false; }
}
export async function listStudents(): Promise<any[]> {
  try {
    const res = await fetch(STUDENTS_BASE);
    return res.ok ? res.json() : [];
  } catch { return []; }
}

// ── حسابات الطلاب (تسجيل/دخول/جلسة) ──────────────────────────────
const TOKEN_KEY = "sawti_qalami_token";

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token: string) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
}
export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export interface AuthUser { id: string; name: string; grade: string; avatar: string; email: string }
export interface AuthResult { ok: boolean; token?: string; user?: AuthUser; migrated?: boolean; error?: string; notFound?: boolean }

export async function registerAccount(payload: {
  name: string; grade: string; avatar: string; email: string; password: string;
  legacy_name?: string; legacy_grade?: string;
}): Promise<AuthResult> {
  try {
    const res = await fetch(`${AUTH_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.detail || "تعذّر إنشاء الحساب" };
    return { ok: true, token: data.token, user: data.user, migrated: data.migrated };
  } catch {
    return { ok: false, error: "تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت." };
  }
}

export async function loginAccount(email: string, password: string): Promise<AuthResult> {
  try {
    const res = await fetch(`${AUTH_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.detail || "تعذّر تسجيل الدخول", notFound: res.status === 404 };
    return { ok: true, token: data.token, user: data.user };
  } catch {
    return { ok: false, error: "تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت." };
  }
}

export async function fetchMe(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${AUTH_BASE}/me`, { headers: authHeaders() });
    if (!res.ok) return null; // رمز منتهي أو غير صالح
    return res.json();
  } catch { return null; }
}

// ── سجلّ الطالب المرتبط بالحساب (بدل الاسم+الصف) ──
export async function getMyStudentRecord(): Promise<any | null> {
  try {
    const res = await fetch(`${STUDENTS_BASE}/me`, { headers: authHeaders() });
    return res.ok ? res.json() : null;
  } catch { return null; }
}
export async function saveMyStudentRecord(data: object): Promise<boolean> {
  try {
    const res = await fetch(`${STUDENTS_BASE}/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch { return false; }
}

// ── استبيان SUS (قياس قابلية الاستخدام) ──
export interface SusResult { ok: boolean; score?: number; band?: { key: string; label: string; color: string }; error?: string }

export async function submitSus(answers: number[], comment = ""): Promise<SusResult> {
  try {
    const res = await fetch(`${API_BASE}/sus`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ answers, comment }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.detail || "تعذّر إرسال التقييم" };
    return { ok: true, score: data.score, band: data.band };
  } catch {
    return { ok: false, error: "تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت." };
  }
}

export async function getMySus(): Promise<{ score: number; band: { label: string } } | null> {
  try {
    const res = await fetch(`${API_BASE}/sus/me`, { headers: authHeaders() });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

export async function getSusSummary(): Promise<{ count: number; average: number | null; bands: Record<string, number> }> {
  try {
    const res = await fetch(`${API_BASE}/sus/summary`);
    return res.ok ? res.json() : { count: 0, average: null, bands: { poor: 0, ok: 0, good: 0 } };
  } catch { return { count: 0, average: null, bands: { poor: 0, ok: 0, good: 0 } }; }
}

// ── تقييمات الطلاب لتجربة استخدام البرنامج (⭐ قيّم البرنامج) ──
export async function submitReview(review: {
  student: string; quality: number; ease: number; benefit: number; comment: string;
}): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(review),
    });
    return res.ok;
  } catch { return false; }
}
export async function listReviews(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/reviews`);
    return res.ok ? res.json() : [];
  } catch { return []; }
}

// ── تحميل تقرير PDF لأداء طالب (يُنزَّل مباشرة في المتصفح) ──
export async function downloadStudentReport(payload: {
  name: string; grade: string;
  speaking_progress: number; writing_progress: number; self_learning_progress: number;
  teacher_comment: string; points: number; stars: number;
}): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/reports/student`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return false;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `تقرير_${payload.name}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

// ── دُخُولُ الْمُعَلِّمِ بِرَمْزِ وُصُولٍ ──
export async function teacherLogin(code: string): Promise<boolean> {
  try {
    const res = await fetch(`${AUTH_BASE}/teacher-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    return res.ok;
  } catch { return false; }
}

export async function getSpeakingLessons() {
  try {
    const res = await fetch(`${LESSONS_BASE}/speaking`);
    return res.ok ? res.json() : null;
  } catch { return null; }
}

export async function getWritingTopics() {
  try {
    const res = await fetch(`${LESSONS_BASE}/writing`);
    return res.ok ? res.json() : null;
  } catch { return null; }
}

export async function addSpeakingLesson(lesson: object) {
  const res = await fetch(`${LESSONS_BASE}/speaking`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lesson),
  });
  return res.json();
}

export async function addWritingTopic(topic: object) {
  const res = await fetch(`${LESSONS_BASE}/writing`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(topic),
  });
  return res.json();
}

export async function updateSpeakingLesson(id: string, lesson: object) {
  const res = await fetch(`${LESSONS_BASE}/speaking/${id}`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lesson),
  });
  return res.json();
}

export async function updateWritingTopic(id: string, topic: object) {
  const res = await fetch(`${LESSONS_BASE}/writing/${id}`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(topic),
  });
  return res.json();
}

export async function deleteSpeakingLesson(id: string) {
  await fetch(`${LESSONS_BASE}/speaking/${id}`, { method: "DELETE" });
}

export async function deleteWritingTopic(id: string) {
  await fetch(`${LESSONS_BASE}/writing/${id}`, { method: "DELETE" });
}

// ── Self Learning API ──
export async function getSelfLearning() {
  try {
    const res = await fetch(`${LESSONS_BASE}/self-learning`);
    return res.ok ? res.json() : null;
  } catch { return null; }
}

export async function addQuizQuestion(q: object) {
  await fetch(`${LESSONS_BASE}/self-learning/quiz`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(q) });
}
export async function updateQuizQuestion(idx: number, q: object) {
  await fetch(`${LESSONS_BASE}/self-learning/quiz/${idx}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(q) });
}
export async function deleteQuizQuestion(idx: number) {
  await fetch(`${LESSONS_BASE}/self-learning/quiz/${idx}`, { method: "DELETE" });
}
export async function addWordOrder(q: object) {
  await fetch(`${LESSONS_BASE}/self-learning/word-order`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(q) });
}
export async function updateWordOrder(idx: number, q: object) {
  await fetch(`${LESSONS_BASE}/self-learning/word-order/${idx}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(q) });
}
export async function deleteWordOrder(idx: number) {
  await fetch(`${LESSONS_BASE}/self-learning/word-order/${idx}`, { method: "DELETE" });
}
export async function addFillIn(q: object) {
  await fetch(`${LESSONS_BASE}/self-learning/fill-in`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(q) });
}
export async function updateFillIn(idx: number, q: object) {
  await fetch(`${LESSONS_BASE}/self-learning/fill-in/${idx}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(q) });
}
export async function deleteFillIn(idx: number) {
  await fetch(`${LESSONS_BASE}/self-learning/fill-in/${idx}`, { method: "DELETE" });
}

// ── Writing Games API ──
// ملاحظة: النسخة القديمة من ألعاب الهمزة (middle_hamza/end_hamza/quick_quiz)
// حُذفت من واجهة الطالب واستُبدلت بثلاث رحلات تفاعلية ثابتة المحتوى
// (TreasureMapLesson / DiverPearlLesson / BalloonHamzaLesson)، لذلك أُزيلت
// دوال إضافة/تعديل/حذف تلك الأسئلة القديمة من هنا لأنها لم تعد مستخدمة.
export async function getGames() {
  try {
    const res = await fetch(`${LESSONS_BASE}/games`);
    return res.ok ? res.json() : null;
  } catch { return null; }
}

// ── محتوى ألعاب الهمزة الحالية (رحلة المستكشف / الغواص / المنطاد) ──
export async function getHamzaJourneys(): Promise<any | null> {
  try {
    const res = await fetch(`${LESSONS_BASE}/hamza-journeys`);
    return res.ok ? res.json() : null;
  } catch { return null; }
}
export async function updateHamzaJourney(journeyId: string, data: object): Promise<boolean> {
  try {
    const res = await fetch(`${LESSONS_BASE}/hamza-journeys/${journeyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch { return false; }
}
export async function resetHamzaJourney(journeyId: string): Promise<boolean> {
  try {
    const res = await fetch(`${LESSONS_BASE}/hamza-journeys/${journeyId}/reset`, { method: "PUT" });
    return res.ok;
  } catch { return false; }
}
