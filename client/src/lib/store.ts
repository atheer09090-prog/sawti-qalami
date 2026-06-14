// إدارة حالة التطبيق
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
}

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
};

const KEY = "sawti_qalami_v2_state";
let listeners: (() => void)[] = [];

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
}

export function subscribe(fn: () => void) {
  listeners.push(fn);
  return () => { listeners = listeners.filter((l) => l !== fn); };
}

export function clearState() {
  localStorage.removeItem(KEY);
  listeners.forEach((fn) => fn());
}
