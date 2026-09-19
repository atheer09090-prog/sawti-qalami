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
let syncTimer: ReturnType<typeof setTimeout> | null = null;

export function getState(): StudentData {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
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
  if (getToken() && next.name.trim()) {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      saveMyStudentRecord(next);
    }, 800);
  }
}

// يُستدعى عند تسجيل الدخول أو عند فتح المنصة وهناك جلسة محفوظة: يجلب
// سجل التقدّم المحفوظ لحساب الطالب الحالي من الخادم، وإن وُجد يستعيد
// منه (النقاط، الشارات، الدروس المكتملة...) بدل البدء من الصفر.
export async function loadMyStudentFromServer(fallbackName: string, fallbackGrade: string, avatar: string): Promise<StudentData> {
  const record = await getMyStudentRecord();
  const merged: StudentData = record
    ? { ...DEFAULT_STATE, ...record, name: fallbackName, grade: fallbackGrade }
    : { ...DEFAULT_STATE, name: fallbackName, grade: fallbackGrade, avatar };
  localStorage.setItem(KEY, JSON.stringify(merged));
  listeners.forEach((fn) => fn());
  return merged;
}

export function subscribe(fn: () => void) {
  listeners.push(fn);
  return () => { listeners = listeners.filter((l) => l !== fn); };
}

export function clearState() {
  localStorage.removeItem(KEY);
  listeners.forEach((fn) => fn());
}

/** تسجيل الخروج: يمسح الجلسة (token) وبيانات الطالب المحلية معًا. */
export function logout() {
  clearToken();
  clearState();
}
