// إدارة حالة التطبيق
import { getMyStudentRecord, saveMyStudentRecord, getToken, clearToken } from "./api";

export interface SelfLearningState {
  completedActivities: number;
  totalAttempts: number;
  skillsImproved: string[];
  // أعلى مرحلة وصلها الطالب في رحلة التعلم الذاتي التسع (0..8)، تُستخدم
  // لعرض موضعه الحالي بصريًا في مسار الرحلة بالصفحة الرئيسية للقسم.
  journeyStageReached: number;
  // آخر هدف حدّده الطالب لنفسه قبل بدء نشاط (🎯 هدفي اليوم)
  lastGoal: string;
  // عدد مرات طلب مساعدة فعلية (تلميح/مثال/شرح/حل) — لا تُحتسب هنا
  // خيار "سأحاول وحدي"، وتُستخدم لاحقًا في حساب مؤشر الاستقلالية
  helpRequests: number;
  // ── عدّادات سلوكية دقيقة (تغذّي مؤشر الاستقلالية وجواز التعلم الذاتي) ──
  goalsSetCount: number;           // 🎯 محدد الأهداف
  questionsAskedCount: number;     // 🔎 الباحث المستقل (اسأل بذكاء)
  criticalThinkCount: number;      // 🧠 المفكر الناقد (اكتشف خطأ الذكاء الاصطناعي)
  retriesWithoutHelpCount: number; // 🔄 لا أستسلم (أعاد المحاولة قبل طلب المساعدة)
  selfCorrectedCount: number;      // ✅ المراجع الذاتي (صحّح خطأه بنفسه دون رؤية الحل)
  improvedCount: number;           // 📈 أطوّر نفسي (تحسّن بين محاولتين)
}

export interface StudentData {
  name: string;
  grade: string;
  avatar: string;
  points: number;
  stars: number;
  speakingProgress: number;
  writingProgress: number;
  selfLearningProgress: number;
  completedLessons: string[];
  badges: string[];
  teacherComment: string;
  selfLearning: SelfLearningState;
  /** هل شاهد الطالب الجولة التعريفية من قبل؟ (لتفادي إظهارها في كل دخول) */
  onboardingSeen?: boolean;
}

const DEFAULT_SELF_LEARNING: SelfLearningState = {
  completedActivities: 0,
  totalAttempts: 0,
  skillsImproved: [],
  journeyStageReached: 0,
  lastGoal: "",
  helpRequests: 0,
  goalsSetCount: 0,
  questionsAskedCount: 0,
  criticalThinkCount: 0,
  retriesWithoutHelpCount: 0,
  selfCorrectedCount: 0,
  improvedCount: 0,
};

const DEFAULT_STATE: StudentData = {
  name: "",
  grade: "الصف السادس",
  avatar: "👦",
  points: 0,
  stars: 0,
  speakingProgress: 0,
  writingProgress: 0,
  selfLearningProgress: 0,
  completedLessons: [],
  badges: [],
  teacherComment: "",
  selfLearning: DEFAULT_SELF_LEARNING,
};

const KEY = "sawti_qalami_v2_state";
let listeners: (() => void)[] = [];
const OWNER_KEY = `${KEY}_owner`;
const DIRTY_KEY = `${KEY}_unsynced_owner`;

function cacheOwner(): string | null {
  try {
    const payload = getToken()?.split(".")[1];
    return payload ? JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))).sub || null : null;
  } catch { return null; }
}

function cancelPendingSave() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = null;
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;

export function getState(): StudentData {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_STATE, ...data, selfLearning: { ...DEFAULT_SELF_LEARNING, ...data.selfLearning } };
  } catch {
    return DEFAULT_STATE;
  }
}

async function persistSnapshot(data: StudentData, token: string, signal?: AbortSignal): Promise<boolean> {
  if (signal?.aborted) throw new DOMException("تم إلغاء استعادة الجلسة", "AbortError");
  if (getToken() !== token) return false;
  const serialized = JSON.stringify(data);
  const saved = await saveMyStudentRecord(data, signal);
  if (signal?.aborted) throw new DOMException("تم إلغاء استعادة الجلسة", "AbortError");
  if (saved && getToken() === token && localStorage.getItem(KEY) === serialized) localStorage.removeItem(DIRTY_KEY);
  return saved;
}

export function setState(updater: (prev: StudentData) => StudentData) {
  const next = updater(getState());
  localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((fn) => fn());
  // مزامنة تلقائية مع الخادم مرتبطة بحساب الطالب (رمز الجلسة)، لا
  // بالاسم والصف كما كان سابقًا — حتى يستعيد الطالب تقدّمه من أي جهاز
  // بعد تسجيل الدخول فقط، بدل الاعتماد على تخمين اسمه وصفّه. لا مزامنة
  // إن لم يكن هناك حساب مسجَّل دخوله بعد. نُؤخِّر الإرسال قليلًا حتى لا
  // نرسل طلبًا لكل ضغطة عند تغييرات متتالية سريعة.
  const ownerToken = getToken();
  if (ownerToken && next.name.trim()) {
    cancelPendingSave();
    const owner = cacheOwner();
    if (owner) localStorage.setItem(DIRTY_KEY, owner);
    syncTimer = setTimeout(() => {
      syncTimer = null;
      if (getToken() === ownerToken) void persistSnapshot(next, ownerToken);
    }, 800);
  }
}

// يُستدعى عند تسجيل الدخول أو عند فتح البرنامج وهناك جلسة محفوظة: يجلب
// سجل التقدّم المحفوظ لحساب الطالب الحالي من الخادم، وإن وُجد يستعيد
// منه (النقاط، الشارات، الدروس المكتملة...) بدل البدء من الصفر.
export function prefetchMyStudentRecord(signal: AbortSignal): Promise<any | null> | undefined {
  // لا نسبق حفظ التغييرات المحلية بطلب قد يجلب نسخة أقدم من التقدم.
  if (!getToken() || localStorage.getItem(DIRTY_KEY)) return undefined;
  const request = getMyStudentRecord(signal);
  // قد ينتهي التحقق من الهوية بالفشل قبل استهلاك هذا الطلب.
  void request.catch(() => {});
  return request;
}

export async function loadMyStudentFromServer(fallbackName: string, fallbackGrade: string, avatar: string, signal?: AbortSignal, prefetchedRecord?: Promise<any | null>): Promise<StudentData> {
  if (signal?.aborted) throw new DOMException("تم إلغاء استعادة الجلسة", "AbortError");
  cancelPendingSave();
  const requestToken = getToken();
  const owner = cacheOwner();
  if (requestToken && owner && owner === localStorage.getItem(OWNER_KEY) && owner === localStorage.getItem(DIRTY_KEY)) {
    prefetchedRecord = undefined;
    const saved = await persistSnapshot(getState(), requestToken, signal);
    if (getToken() !== requestToken) throw new Error("تغيرت جلسة المستخدم أثناء حفظ التقدم");
    if (!saved) return getState();
  }
  let record;
  try { record = await (prefetchedRecord ?? getMyStudentRecord(signal)); }
  catch (error) {
    if (signal?.aborted) throw error;
    if (getToken() === requestToken && owner && owner === localStorage.getItem(OWNER_KEY)) return getState();
    throw error;
  }
  if (signal?.aborted) throw new DOMException("تم إلغاء استعادة الجلسة", "AbortError");
  if (getToken() !== requestToken) throw new Error("تغيرت جلسة المستخدم أثناء استعادة التقدم");
  const merged: StudentData = record
    ? { ...DEFAULT_STATE, ...record, selfLearning: { ...DEFAULT_SELF_LEARNING, ...record.selfLearning }, name: fallbackName, grade: fallbackGrade }
    : { ...DEFAULT_STATE, name: fallbackName, grade: fallbackGrade, avatar };
  if (owner) localStorage.setItem(OWNER_KEY, owner);
  localStorage.setItem(KEY, JSON.stringify(merged));
  listeners.forEach((fn) => fn());
  return merged;
}

export function subscribe(fn: () => void) {
  listeners.push(fn);
  return () => { listeners = listeners.filter((l) => l !== fn); };
}

export function clearState() {
  cancelPendingSave();
  localStorage.removeItem(DIRTY_KEY);
  localStorage.removeItem(OWNER_KEY);
  localStorage.removeItem(KEY);
  listeners.forEach((fn) => fn());
}

/** تسجيل الخروج: يمسح الجلسة (token) وبيانات الطالب المحلية معًا. */
export function logout() {
  clearToken();
  clearState();
}

// Retry an interrupted automatic save on reconnection, only for its authenticated owner.
if (typeof window !== "undefined") {
  const retrySave = () => {
    const token = getToken();
    if (token && cacheOwner() === localStorage.getItem(DIRTY_KEY)) void persistSnapshot(getState(), token);
  };
  window.addEventListener("online", retrySave);
  import.meta.hot?.dispose(() => window.removeEventListener("online", retrySave));
}
