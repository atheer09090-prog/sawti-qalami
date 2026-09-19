import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { getState, setState, StudentData } from "@/lib/store";
import { getSelfLearning, askSmartTeacher, evaluateWriting, evaluateSpeech } from "@/lib/api";
import { classifyMicError, checkMicSupport, type MicErrorInfo } from "@/lib/mic";
import { MicPermissionCard } from "@/components/MicPermissionCard";

/* ══════════════════════════════════════════════════════════════
   رِحْلَةُ التَّعَلُّمِ الذَّاتِيِّ — تِسْعُ مَرَاحِلَ
   الطالب يقود تعلمه، والذكاء الاصطناعي يسانده تدريجيًا.
   المرحلة الأولى (سابقًا): المسار البصري + ربط "أُنَفِّذُ" بالأنشطة.
   المرحلة الثانية (هنا): تفعيل حقيقي لِـ 🎯 هدفي اليوم، 🗺️ خطتي
   للتعلم، 🎚️ اختيار مستوى المساعدة، 🔎 اكتشف خطأك، 🔄 حاول مرة
   أخرى، 🪞 ماذا تعلمت؟ — كخطوات فعلية تُغلِّف الأنشطة الثلاثة
   الموجودة (لا نشاط منفصل لكل خطوة، حسب المطلوب). بقية المراحل
   (🤖 اسأل بذكاء، 🧠 أنا المعلم، ✍️ اكتب ثم حسّن، 🎙️ تحدث وقيّم
   نفسك) ستُفعَّل في المرحلة الثالثة.
   ══════════════════════════════════════════════════════════════ */
const JOURNEY_STAGES = [
  { icon: "🎯", label: "أُحَدِّدُ هَدَفِي", info: "حَدِّدْ مَا تُرِيدُ تَحْسِينَهُ الْيَوْمَ: الإِمْلَاءَ، الْكِتَابَةَ، أَوْ مَهَارَةً أُخْرَى." },
  { icon: "🗺️", label: "أُخَطِّطُ", info: "رَتِّبْ خُطُوَاتِ إِنْجَازِ مَهَمَّتِكَ قَبْلَ الْبَدْءِ." },
  { icon: "✍️", label: "أُنَفِّذُ", info: "نَفِّذِ الْمَهَمَّةَ بِنَفْسِكَ خُطْوَةً بِخُطْوَةٍ." },
  { icon: "👀", label: "أُرَاقِبُ أَدَائِي", info: "رَاقِبْ أَدَاءَكَ وَحَاوِلْ اكْتِشَافَ أَخْطَائِكَ بِنَفْسِكَ." },
  { icon: "💡", label: "أَطْلُبُ الْمُسَاعَدَةَ", info: "اطْلُبِ الْمُسَاعَدَةَ تَدْرِيجِيًّا: تَلْمِيحٌ، ثُمَّ مِثَالٌ، ثُمَّ شَرْحٌ." },
  { icon: "🔄", label: "أُحَاوِلُ مَرَّةً أُخْرَى", info: "لَا بَأْسَ بِالْخَطَأِ! حَاوِلْ مَرَّةً أُخْرَى قَبْلَ رُؤْيَةِ الْحَلِّ." },
  { icon: "✅", label: "أُقَيِّمُ نَفْسِي", info: "قَيِّمْ أَدَاءَكَ: هَلْ حَقَّقْتَ هَدَفَكَ؟" },
  { icon: "🪞", label: "أَتَأَمَّلُ فِي تَعَلُّمِي", info: "تَأَمَّلْ: مَاذَا تَعَلَّمْتَ؟ وَمَا الَّذِي كَانَ صَعْبًا؟" },
  { icon: "🚀", label: "هَدَفِي الْقَادِمُ", info: "حَدِّدْ هَدَفَكَ الْقَادِمَ وَابْدَأْ رِحْلَةً جَدِيدَةً 🌱" },
];

const EMPTY_SELF_LEARNING = {
  completedActivities: 0, totalAttempts: 0, skillsImproved: [] as string[], journeyStageReached: 0, lastGoal: "", helpRequests: 0,
  goalsSetCount: 0, questionsAskedCount: 0, criticalThinkCount: 0, retriesWithoutHelpCount: 0, selfCorrectedCount: 0, improvedCount: 0,
};

// ── 🎯 هدفي اليوم ──
const GOAL_OPTIONS = [
  "تَحْسِينُ الْإِمْلَاءِ",
  "تَحْسِينُ الْكِتَابَةِ",
  "تَرْتِيبُ الْأَفْكَارِ",
  "اسْتِخْدَامُ عَلَامَاتِ التَّرْقِيمِ",
  "تَحْسِينُ التَّحَدُّثِ",
  "تَعَلُّمُ قَاعِدَةٍ جَدِيدَةٍ",
];

// ── 🗺️ خطتي للتعلم (خطوات عامة قابلة للتطبيق على أي نشاط) ──
const PLAN_STEPS_CANONICAL = [
  "أَقْرَأُ السُّؤَالَ جَيِّدًا",
  "أُفَكِّرُ قَبْلَ الْإِجَابَةِ",
  "أُجِيبُ بِنَفْسِي",
  "أُرَاجِعُ إِجَابَتِي قَبْلَ التَّأْكِيدِ",
];

// ── 🎚️ سُلّم المساعدة الذكي (يُطبَّق على أنشطة الإجابة الحرة) ──
const ASSIST_CONTENT: Record<string, { hint: string; example: string; rule: string }> = {
  order: {
    hint: "ابْدَأْ بِتَحْدِيدِ مَنْ قَامَ بِالْفِعْلِ (الْفَاعِلُ) أَوَّلًا.",
    example: "مِثَالٌ مُشَابِهٌ: «الْمُعَلِّمُ كَتَبَ عَلَى السَّبُّورَةِ» — الْفَاعِلُ أَوَّلًا، ثُمَّ الْفِعْلُ، ثُمَّ بَقِيَّةُ الْجُمْلَةِ.",
    rule: "التَّرْتِيبُ الشَّائِعُ لِلْجُمْلَةِ: الْفَاعِلُ، ثُمَّ الْفِعْلُ، ثُمَّ مَا يَتَعَلَّقُ بِهِ مِنْ مَكَانٍ أَوْ جِهَةٍ.",
  },
  fill: {
    hint: "الْكَلِمَةُ الْمَطْلُوبَةُ صِفَةٌ تُنَاسِبُ كَلِمَةَ «وَغَنِيَّةٌ» بَعْدَهَا.",
    example: "مِثَالٌ: «الْحَدِيقَةُ جَمِيلَةٌ وَوَاسِعَةٌ» — صِفَتَانِ مُتَتَالِيَتَانِ بَعْدَ الْمُبْتَدَأِ.",
    rule: "الصِّفَةُ تَتْبَعُ الْمَوْصُوفَ فِي التَّذْكِيرِ وَالتَّأْنِيثِ، وَتَتَنَاسَقُ مَعَ الصِّفَةِ الْأُخْرَى فِي الْجُمْلَةِ.",
  },
};

const SKILL_BY_ACTIVITY: Record<string, string> = {
  order: "تَرْتِيبُ الأَفْكَارِ",
  fill: "الْمُفْرَدَاتُ وَالإِمْلَاءُ",
  quiz: "الْمُفْرَدَاتُ وَتَرَاكِيبُ الْجُمْلَةِ",
};

// يُسجَّل تقدُّم الطالب في القسم بعد كل نشاط، ويُستخدم لعرض بطاقة
// التقدم في الصفحة الرئيسية لقسم التعلم الذاتي.
function recordActivity(skill: string) {
  setState(prev => {
    const sl = prev.selfLearning ?? EMPTY_SELF_LEARNING;
    return {
      ...prev,
      selfLearning: {
        ...sl,
        totalAttempts: sl.totalAttempts + 1,
        completedActivities: sl.completedActivities + 1,
        skillsImproved: sl.skillsImproved.includes(skill) ? sl.skillsImproved : [...sl.skillsImproved, skill],
        journeyStageReached: Math.max(sl.journeyStageReached, 2), // وصل مرحلة "أُنَفِّذُ" على الأقل
      },
    };
  });
}

// تُحدَّث بعد أي تفاعل مع مراحل الرحلة (هدف/خطة/مساعدة/تأمل) دون
// احتساب "نشاط مكتمل" جديد — فقط رفع أعلى مرحلة وصلها الطالب وتحديث
// حقول اختيارية مثل الهدف وعدد طلبات المساعدة.
function updateJourney(patch: Partial<{ stage: number; goal: string; helpRequestDelta: number }>) {
  setState(prev => {
    const sl = prev.selfLearning ?? EMPTY_SELF_LEARNING;
    return {
      ...prev,
      selfLearning: {
        ...sl,
        journeyStageReached: patch.stage !== undefined ? Math.max(sl.journeyStageReached, patch.stage) : sl.journeyStageReached,
        lastGoal: patch.goal !== undefined ? patch.goal : sl.lastGoal,
        helpRequests: patch.helpRequestDelta ? sl.helpRequests + patch.helpRequestDelta : sl.helpRequests,
      },
    };
  });
}

type CounterKey = "goalsSetCount" | "questionsAskedCount" | "criticalThinkCount" | "retriesWithoutHelpCount" | "selfCorrectedCount" | "improvedCount";

// عدّاد سلوكي بسيط يُستدعى عند وقوع سلوك فعلي محدد (وليس عند إكمال
// نشاط بشكل عام) — يغذّي مؤشر الاستقلالية وجواز التعلم الذاتي أدناه.
function bumpCounter(key: CounterKey) {
  setState(prev => {
    const sl = prev.selfLearning ?? EMPTY_SELF_LEARNING;
    return { ...prev, selfLearning: { ...sl, [key]: sl[key] + 1 } };
  });
}

// ── 🪪 جواز التعلم الذاتي: شارات مرتبطة بسلوك فعلي فقط، لا بمجرد
// إكمال نشاط ── (راجع "سادسًا: جواز التعلم الذاتي" في خطة التطوير)
const BADGES: { id: string; icon: string; title: string; desc: string; check: (sl: any) => boolean }[] = [
  { id: "goals", icon: "🎯", title: "مُحَدِّدُ الْأَهْدَافِ", desc: "حَدَّدَ هَدَفَهُ قَبْلَ بَدْءِ الْأَنْشِطَةِ", check: sl => sl.goalsSetCount >= 1 },
  { id: "researcher", icon: "🔎", title: "الْبَاحِثُ الْمُسْتَقِلُّ", desc: "بَحَثَ عَنِ الْمَعْلُومَةِ بِنَفْسِهِ (اسْأَلْ بِذَكَاءٍ)", check: sl => sl.questionsAskedCount >= 1 },
  { id: "critical", icon: "🧠", title: "الْمُفَكِّرُ النَّاقِدُ", desc: "اكْتَشَفَ خَطَأً فِي إِجَابَةِ الذَّكَاءِ الِاصْطِنَاعِيِّ", check: sl => sl.criticalThinkCount >= 1 },
  { id: "persist", icon: "🔄", title: "لَا أَسْتَسْلِمُ", desc: "أَعَادَ الْمُحَاوَلَةَ قَبْلَ طَلَبِ الْحَلِّ", check: sl => sl.retriesWithoutHelpCount >= 1 },
  { id: "reviewer", icon: "✅", title: "الْمُرَاجِعُ الذَّاتِيُّ", desc: "اكْتَشَفَ وَصَحَّحَ خَطَأَهُ بِنَفْسِهِ", check: sl => sl.selfCorrectedCount >= 1 },
  { id: "improver", icon: "📈", title: "أُطَوِّرُ نَفْسِي", desc: "حَقَّقَ تَحَسُّنًا مُقَارَنَةً بِمُحَاوَلَتِهِ السَّابِقَةِ", check: sl => sl.improvedCount >= 1 },
];

// مؤشر الاستقلالية: نسبة الأنشطة التي أنجزها الطالب دون طلب مساعدة
// فعلية (تلميح/مثال/شرح/حل). كل طلب مساعدة يخفّض النسبة تدريجيًا
// بدل أن يُسقطها فجأة، حتى يبقى مؤشرًا تشجيعيًا لا حكمًا قاسيًا.
function computeIndependence(sl: { completedActivities: number; helpRequests: number }): number | null {
  if (sl.completedActivities === 0) return null;
  return Math.round((sl.completedActivities / (sl.completedActivities + sl.helpRequests)) * 100);
}

// جميع أسئلة "اخْتَبِرْ مَعْلُومَاتِكَ" خاصة بدروس الهمزة الثلاثة فقط
// (المتوسطة على نبرة، المتوسطة على السطر، المتطرفة) — لا شيء خارجها
const DEFAULT_QUIZ = [
  { q: "كَيْفَ تُكْتَبُ الْهَمْزَةُ الْمُتَوَسِّطَةُ فِي كَلِمَةِ «بِئْر»؟", options: ["بِأْر", "بِئْر", "بِؤْر", "بِير"], correct: 1 },
  { q: "أَيْنَ تُكْتَبُ الْهَمْزَةُ الْمُتَوَسِّطَةُ فِي كَلِمَةِ «سَمَاء» عِنْدَ الْإِسْنَادِ (سَمَاؤُنَا)؟", options: ["عَلَى نَبْرَةٍ", "عَلَى وَاوٍ", "عَلَى السَّطْرِ", "عَلَى أَلِفٍ"], correct: 1 },
  { q: "مَا مَوْضِعُ الْهَمْزَةِ الْمُتَطَرِّفَةِ فِي الْكَلِمَةِ دَائِمًا؟", options: ["فِي أَوَّلِ الْكَلِمَةِ", "فِي وَسَطِ الْكَلِمَةِ", "فِي آخِرِ الْكَلِمَةِ", "قَبْلَ آخِرِ حَرْفٍ"], correct: 2 },
];

const DEFAULT_WORD_ORDER = [
  { words: ["عَلَى", "تُكْتَبُ", "السَّطْرِ", "الْهَمْزَةُ", "الْمُتَوَسِّطَةُ", "فِي", "«مَسْأَلَة»"], answer: "الْهَمْزَةُ الْمُتَوَسِّطَةُ فِي «مَسْأَلَة» تُكْتَبُ عَلَى السَّطْرِ" },
];

const DEFAULT_FILL_IN = [
  { sentence: "تُكْتَبُ الْهَمْزَةُ الْمُتَوَسِّطَةُ فِي كَلِمَةِ «سُئِلَ» عَلَى ________", answer: "نَبْرَةٍ" },
];

// ── 🧠 أنا المعلم: إجابة من "المعلم الذكي" تحتوي خطأ متعمَّد يكتشفه الطالب ──
// الأسئلة الثلاثة تغطي دروس الهمزة الثلاثة (نبرة/سطر/متطرفة) فقط
const TEACHER_CHECK_ITEMS = [
  {
    question: "كَيْفَ تُكْتَبُ الْهَمْزَةُ الْمُتَوَسِّطَةُ فِي كَلِمَةِ «سُئِلَ»؟",
    aiAnswer: "تُكْتَبُ «سُوئِلَ» بِالْهَمْزَةِ عَلَى وَاوٍ لِأَنَّ مَا قَبْلَهَا مَضْمُومٌ.",
    correctAnswer: "سُئِلَ (بالهمزة على نبرة/ياء)",
    explanation: "تُكْتَبُ الْهَمْزَةُ الْمُتَوَسِّطَةُ عَلَى نَبْرَةٍ (يَاءٍ) إِذَا كَانَتْ مَكْسُورَةً أَوْ كَانَ مَا قَبْلَهَا مَكْسُورًا، وَفِي «سُئِلَ» الْهَمْزَةُ مَكْسُورَةٌ فَتُكْتَبُ عَلَى نَبْرَةٍ: سُئِلَ، لَا عَلَى وَاوٍ.",
  },
  {
    question: "كَيْفَ تُكْتَبُ الْهَمْزَةُ الْمُتَوَسِّطَةُ فِي كَلِمَةِ «مَسْأَلَة»؟",
    aiAnswer: "تُكْتَبُ «مسئلة» بِالْهَمْزَةِ عَلَى نَبْرَةٍ لِأَنَّهَا مَكْسُورَةٌ.",
    correctAnswer: "مَسْأَلَة (بالهمزة على السطر)",
    explanation: "تُكْتَبُ الْهَمْزَةُ الْمُتَوَسِّطَةُ عَلَى السَّطْرِ إِذَا كَانَتْ سَاكِنَةً وَمَا قَبْلَهَا مَفْتُوحٌ، وَفِي «مَسْأَلَة» الْهَمْزَةُ سَاكِنَةٌ بَعْدَ فَتْحَةٍ، فَتُكْتَبُ عَلَى السَّطْرِ: مَسْأَلَة، لَا عَلَى نَبْرَةٍ.",
  },
  {
    question: "كَيْفَ تُكْتَبُ الْهَمْزَةُ الْمُتَطَرِّفَةُ فِي كَلِمَةِ «يَجْرُؤُ»؟",
    aiAnswer: "تُكْتَبُ «يَجْرُئُ» بِالْهَمْزَةِ عَلَى نَبْرَةٍ.",
    correctAnswer: "يَجْرُؤُ (بالهمزة على واو)",
    explanation: "تُكْتَبُ الْهَمْزَةُ الْمُتَطَرِّفَةُ عَلَى حَرْفٍ يُنَاسِبُ حَرَكَةَ مَا قَبْلَهَا فَقَطْ، وَفِي «يَجْرُؤُ» مَا قَبْلَ الْهَمْزَةِ مَضْمُومٌ (رُ)، فَتُكْتَبُ عَلَى وَاوٍ: يَجْرُؤُ، لَا عَلَى نَبْرَةٍ.",
  },
];

// ── ✍️ اكتب ثم حسّن ──
const IMPROVE_PROMPT = "اُكْتُبْ فِقْرَةً قَصِيرَةً تَصِفُ فِيهَا مَكَانًا تُحِبُّهُ.";

// ── 🎙️ تحدث ثم قيّم نفسك ──
const SPEAK_PROMPT = "تَحَدَّثْ لِمُدَّةِ ٣٠ ثَانِيَةً عَنْ كِتَابِكَ الْمُفَضَّلِ.";
const SELF_RATING_CRITERIA = [
  { key: "clarity", label: "وُضُوحُ الصَّوْتِ" },
  { key: "order", label: "تَرْتِيبُ الْأَفْكَارِ" },
  { key: "language", label: "سَلَامَةُ اللُّغَةِ" },
  { key: "vocab", label: "تَنَوُّعُ الْمُفْرَدَاتِ" },
  { key: "fluency", label: "الطَّلَاقَةُ" },
] as const;

export default function SelfLearning() {
  const [, setLocation] = useLocation();
  const [student, setStudent] = useState<StudentData>(getState());
  const [activeStage, setActiveStage] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!getState().name) { setLocation("/"); return; }
  }, []);

  const [quiz, setQuiz] = useState(DEFAULT_QUIZ);
  const [wordOrder, setWordOrder] = useState(DEFAULT_WORD_ORDER);
  const [fillIn, setFillIn] = useState(DEFAULT_FILL_IN);
  const [activity, setActivity] = useState<string | null>(null);

  useEffect(() => {
    getSelfLearning().then(d => {
      if (!d) return;
      if (d.quiz?.length) setQuiz(d.quiz);
      if (d.word_order?.length) setWordOrder(d.word_order);
      if (d.fill_in?.length) setFillIn(d.fill_in);
    });
  }, []);
  const [quizIdx, setQuizIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [wordAnswer, setWordAnswer] = useState("");
  const [fillAnswer, setFillAnswer] = useState("");
  const [checked, setChecked] = useState(false);

  // ── حالة رحلة النشاط: هدف → خطة → تنفيذ → تأمل ──
  type FlowStep = "goal" | "plan" | "task" | "reflect";
  const [flowStep, setFlowStep] = useState<FlowStep>("goal");
  const [goal, setGoal] = useState<string | null>(null);
  const [customGoal, setCustomGoal] = useState("");
  const [planSelection, setPlanSelection] = useState<string[]>([]);
  const [planChecked, setPlanChecked] = useState(false);
  const [wrongCount, setWrongCount] = useState(0);
  const [showAssistMenu, setShowAssistMenu] = useState(false);
  const [assistReveal, setAssistReveal] = useState<"hint" | "example" | "rule" | "solution" | null>(null);
  const [reflection, setReflection] = useState({ learned: "", hard: "", better: "" });

  // ── 🤖 اسأل بذكاء ──
  const [question, setQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [asking, setAsking] = useState(false);

  // ── 🧠 أنا المعلم ──
  const [teacherItem, setTeacherItem] = useState(TEACHER_CHECK_ITEMS[0]);
  const [studentAgrees, setStudentAgrees] = useState<boolean | null>(null);
  const [correction, setCorrection] = useState("");
  const [teacherSubmitted, setTeacherSubmitted] = useState(false);

  // ── ✍️ اكتب ثم حسّن ──
  type ImproveStage = "draft1" | "feedback1" | "draft2" | "compare";
  const [improveStage, setImproveStage] = useState<ImproveStage>("draft1");
  const [draft1, setDraft1] = useState("");
  const [draft1Result, setDraft1Result] = useState<any>(null);
  const [draft2, setDraft2] = useState("");
  const [draft2Result, setDraft2Result] = useState<any>(null);
  const [improveLoading, setImproveLoading] = useState(false);
  const [improveError, setImproveError] = useState("");

  // ── 🎙️ تحدث ثم قيّم نفسك ──
  const [recording, setRecording] = useState(false);
  const [speakTimer, setSpeakTimer] = useState(0);
  const [audioBlobState, setAudioBlobState] = useState<Blob | null>(null);
  const [selfRatings, setSelfRatings] = useState<Record<string, number>>({});
  const [selfRatingSubmitted, setSelfRatingSubmitted] = useState(false);
  const [speakResult, setSpeakResult] = useState<any>(null);
  const [speakLoading, setSpeakLoading] = useState(false);
  const [speakError, setSpeakError] = useState("");
  const [micError, setMicError] = useState<MicErrorInfo | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const speakTimerRef = useRef<any>(null);

  function startActivity(id: string) {
    setActivity(id);
    setFlowStep("goal");
    setGoal(null); setCustomGoal("");
    setPlanSelection([]); setPlanChecked(false);
    setQuizIdx(0); setSelected(null); setScore(0); setDone(false);
    setWordAnswer(""); setFillAnswer(""); setChecked(false);
    setWrongCount(0); setShowAssistMenu(false); setAssistReveal(null);
    setReflection({ learned: "", hard: "", better: "" });
    setQuestion(""); setAiAnswer(""); setAsking(false);
    setStudentAgrees(null); setCorrection(""); setTeacherSubmitted(false);
    setTeacherItem(TEACHER_CHECK_ITEMS[Math.floor(Math.random() * TEACHER_CHECK_ITEMS.length)]);
    setImproveStage("draft1"); setDraft1(""); setDraft1Result(null); setDraft2(""); setDraft2Result(null); setImproveLoading(false);
    setRecording(false); setSpeakTimer(0); setAudioBlobState(null);
    setSelfRatings({}); setSelfRatingSubmitted(false); setSpeakResult(null); setSpeakLoading(false); setSpeakError(""); setMicError(null);
  }

  function resetToHome() {
    setActivity(null);
    setActiveStage(null);
    setStudent(getState());
  }

  function confirmGoal() {
    const g = goal === "custom" ? customGoal.trim() : goal;
    if (!g) return;
    updateJourney({ stage: 0, goal: g });
    bumpCounter("goalsSetCount");
    setFlowStep("plan");
  }

  function togglePlanStep(step: string) {
    if (planSelection.includes(step)) {
      setPlanSelection(planSelection.filter(s => s !== step));
    } else {
      setPlanSelection([...planSelection, step]);
    }
  }

  function confirmPlan() {
    setPlanChecked(true);
    updateJourney({ stage: 1 });
  }

  function chooseAssist(level: 1 | 2 | 3 | 4 | 5) {
    setShowAssistMenu(false);
    if (level === 1) { setAssistReveal(null); return; } // سأحاول وحدي — بلا كشف شيء
    updateJourney({ helpRequestDelta: 1 });
    if (level === 2) setAssistReveal("hint");
    else if (level === 3) setAssistReveal("example");
    else if (level === 4) setAssistReveal("rule");
    else {
      if (assistReveal !== "solution") {
        recordActivity(SKILL_BY_ACTIVITY[activity || ""] || "مَهَارَةٌ عَامَّةٌ");
        setStudent(getState());
      }
      setAssistReveal("solution");
    }
  }

  function checkOrderAnswer() {
    const correct = wordAnswer.trim() === wordOrder[0].answer;
    setChecked(true);
    if (correct) {
      recordActivity("تَرْتِيبُ الأَفْكَارِ");
      if (wrongCount > 0 && assistReveal !== "solution") bumpCounter("selfCorrectedCount");
      setStudent(getState());
    } else setWrongCount(c => c + 1);
  }

  function checkFillAnswer() {
    const correct = fillAnswer.trim().includes("جميل");
    setChecked(true);
    if (correct) {
      recordActivity("الْمُفْرَدَاتُ وَالإِمْلَاءُ");
      if (wrongCount > 0 && assistReveal !== "solution") bumpCounter("selfCorrectedCount");
      setStudent(getState());
    } else setWrongCount(c => c + 1);
  }

  function renderCheckResult(correct: boolean, correctAnswerText: string) {
    const assistContent = ASSIST_CONTENT[activity || ""] || { hint: "", example: "", rule: "" };
    if (correct) {
      return (
        <div className="mt-3 bg-green-50 rounded-xl p-3 text-center">
          <p className="font-bold text-green-700">✅ صَحِيحٌ! أَحْسَنْتَ!</p>
          <button onClick={() => setFlowStep("reflect")}
            className="mt-2 text-sm px-4 py-2 rounded-lg bg-blue-700 text-white font-bold">
            التَّالِي: أَتَأَمَّلُ فِي تَعَلُّمِي 🪞
          </button>
        </div>
      );
    }
    return (
      <div className="mt-3 space-y-2">
        {!showAssistMenu && assistReveal === null && (
          <div className="bg-red-50 rounded-xl p-3 text-right">
            <p className="text-red-600 font-bold text-sm mb-2">
              🔎 لَيْسَتْ صَحِيحَةً بَعْدُ. حَاوِلْ أَنْ تَكْتَشِفَ الْخَطَأَ بِنَفْسِكَ أَوَّلًا!
            </p>
            <div className="flex gap-2">
              <button onClick={() => { setChecked(false); bumpCounter("retriesWithoutHelpCount"); }}
                className="flex-1 py-2 rounded-lg bg-white border-2 border-red-300 text-red-600 font-bold text-sm">
                🔄 حَاوِلْ مَرَّةً أُخْرَى
              </button>
              {wrongCount >= 2 && (
                <button onClick={() => setShowAssistMenu(true)}
                  className="flex-1 py-2 rounded-lg bg-amber-500 text-white font-bold text-sm">
                  🎚️ سَاعِدْنِي
                </button>
              )}
            </div>
          </div>
        )}

        {showAssistMenu && (
          <div className="bg-amber-50 rounded-xl p-3 text-right">
            <p className="font-bold text-amber-800 text-sm mb-2">كَيْفَ تُرِيدُ أَنْ أُسَاعِدَكَ؟</p>
            <div className="flex flex-col gap-1.5">
              <button onClick={() => chooseAssist(1)} className="p-2 rounded-lg bg-white text-right text-sm border border-amber-200">🧠 سَأُحَاوِلُ وَحْدِي</button>
              <button onClick={() => chooseAssist(2)} className="p-2 rounded-lg bg-white text-right text-sm border border-amber-200">💡 أَعْطِنِي تَلْمِيحًا</button>
              <button onClick={() => chooseAssist(3)} className="p-2 rounded-lg bg-white text-right text-sm border border-amber-200">📝 أَعْطِنِي مِثَالًا مُشَابِهًا</button>
              <button onClick={() => chooseAssist(4)} className="p-2 rounded-lg bg-white text-right text-sm border border-amber-200">📚 اشْرَحْ لِي الْقَاعِدَةَ</button>
              <button onClick={() => chooseAssist(5)} className="p-2 rounded-lg bg-white text-right text-sm border border-amber-200">✅ أَرِنِي الْحَلَّ مَعَ التَّفْسِيرِ</button>
            </div>
          </div>
        )}

        {assistReveal && (
          <div className="bg-blue-50 rounded-xl p-3 text-right">
            {assistReveal === "hint" && <p className="text-blue-800 text-sm">💡 {assistContent.hint}</p>}
            {assistReveal === "example" && <p className="text-blue-800 text-sm">📝 {assistContent.example}</p>}
            {assistReveal === "rule" && <p className="text-blue-800 text-sm">📚 {assistContent.rule}</p>}
            {assistReveal === "solution" && (
              <div>
                <p className="text-blue-800 text-sm font-bold mb-1">✅ الْحَلُّ: {correctAnswerText}</p>
                <p className="text-blue-700 text-xs">{assistContent.rule}</p>
              </div>
            )}
            <div className="flex gap-2 mt-2">
              {assistReveal !== "solution" ? (
                <button onClick={() => { setChecked(false); setAssistReveal(null); }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-blue-700 text-white font-bold">
                  🔄 حَاوِلْ مَرَّةً أُخْرَى
                </button>
              ) : (
                <button onClick={() => setFlowStep("reflect")}
                  className="text-xs px-3 py-1.5 rounded-lg bg-blue-700 text-white font-bold">
                  التَّالِي: أَتَأَمَّلُ فِي تَعَلُّمِي 🪞
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── 🤖 اسأل بذكاء ──
  async function askQuestion() {
    if (!question.trim() || asking) return;
    setAsking(true);
    const answer = await askSmartTeacher(question.trim());
    setAiAnswer(answer);
    setAsking(false);
    recordActivity("طَرْحُ أَسْئِلَةٍ جَيِّدَةٍ");
    bumpCounter("questionsAskedCount");
    setStudent(getState());
  }

  // ── 🧠 أنا المعلم ──
  function submitTeacherCheck() {
    setTeacherSubmitted(true);
    recordActivity("التَّفْكِيرُ النَّاقِدُ");
    if (studentAgrees === false && teacherCorrectionMatches) bumpCounter("criticalThinkCount");
    setStudent(getState());
  }
  const teacherCorrectionMatches = correction.trim().length > 0 &&
    (correction.includes(teacherItem.correctAnswer.split(" ")[0]) || teacherItem.correctAnswer.includes(correction.trim()));

  // ── ✍️ اكتب ثم حسّن ──
  async function submitDraft1() {
    if (draft1.trim().length < 10 || improveLoading) return;
    setImproveLoading(true);
    setImproveError("");
    try {
      const res = await evaluateWriting(draft1.trim());
      setDraft1Result(res);
      setImproveStage("feedback1");
    } catch {
      setImproveError("تَعَذَّرَ الِاتِّصَالُ بِالْخَادِمِ لِتَقْيِيمِ النَّصِّ. تَحَقَّقْ مِنِ اتِّصَالِكَ بِالإِنْتَرْنِتِ وَحَاوِلْ مَرَّةً أُخْرَى.");
    }
    setImproveLoading(false);
  }
  async function submitDraft2() {
    if (draft2.trim().length < 10 || improveLoading) return;
    setImproveLoading(true);
    setImproveError("");
    try {
      const res = await evaluateWriting(draft2.trim());
      setDraft2Result(res);
      setImproveStage("compare");
      recordActivity("الْكِتَابَةُ وَالْمُرَاجَعَةُ الذَّاتِيَّةُ");
      if (res.overall_score > draft1Result?.overall_score) bumpCounter("improvedCount");
      setStudent(getState());
    } catch {
      setImproveError("تَعَذَّرَ الِاتِّصَالُ بِالْخَادِمِ لِتَقْيِيمِ النَّصِّ. تَحَقَّقْ مِنِ اتِّصَالِكَ بِالإِنْتَرْنِتِ وَحَاوِلْ مَرَّةً أُخْرَى.");
    }
    setImproveLoading(false);
  }

  // ── 🎙️ تحدث ثم قيّم نفسك ──
  async function startSpeakRecording() {
    setSpeakError(""); setSpeakResult(null); setAudioBlobState(null); setMicError(null);
    const supportIssue = checkMicSupport();
    if (supportIssue) { setMicError(supportIssue); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 16000 },
      });
      const preferredMimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
      const supportedMimeType = preferredMimeTypes.find(
        (t) => typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(t)
      );
      const mr = supportedMimeType ? new MediaRecorder(stream, { mimeType: supportedMimeType }) : new MediaRecorder(stream);
      const actualMimeType = mr.mimeType || supportedMimeType || "audio/webm";
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: actualMimeType });
        setAudioBlobState(blob);
      };
      mr.start(1000);
      mediaRef.current = mr;
      setRecording(true); setSpeakTimer(0);
      speakTimerRef.current = setInterval(() => {
        setSpeakTimer(t => { if (t >= 60) { stopSpeakRecording(); return t; } return t + 1; });
      }, 1000);
    } catch (err) {
      setMicError(classifyMicError(err));
    }
  }
  function stopSpeakRecording() {
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    clearInterval(speakTimerRef.current);
    setRecording(false);
  }
  function rateSelf(key: string, value: number) {
    if (selfRatingSubmitted) return;
    setSelfRatings(prev => ({ ...prev, [key]: value }));
  }
  async function submitSelfRatingThenAI() {
    setSelfRatingSubmitted(true);
    if (!audioBlobState) return;
    setSpeakLoading(true);
    try {
      const res = await evaluateSpeech(audioBlobState, SPEAK_PROMPT, 0, "self-learning-speak");
      setSpeakResult(res);
      recordActivity("التَّحَدُّثُ وَالتَّقْيِيمُ الذَّاتِيُّ");
      setStudent(getState());
    } catch {
      setSpeakError("تَعَذَّرَ تَقْيِيمُ التَّسْجِيلِ. تَحَقَّقْ مِنِ اتِّصَالِكَ بِالإِنْتَرْنِتِ.");
    }
    setSpeakLoading(false);
  }
  const speakFmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  function handleQuizAnswer(idx: number) {
    setSelected(idx);
    if (idx === quiz[quizIdx].correct) setScore(s => s + 1);
    setTimeout(() => {
      if (quizIdx < quiz.length - 1) { setQuizIdx(q => q + 1); setSelected(null); }
      else {
        setDone(true);
        setState(prev => ({ ...prev, selfLearningProgress: Math.max(prev.selfLearningProgress, Math.round(score / quiz.length * 100)) }));
        recordActivity("الْمُفْرَدَاتُ وَتَرَاكِيبُ الْجُمْلَةِ");
        setStudent(getState());
      }
    }, 1000);
  }

  if (!activity) {
    const sl = student.selfLearning ?? EMPTY_SELF_LEARNING;
    const independence = computeIndependence(sl);

    return (
      <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "#f5f0e8", minHeight: "100vh" }}>
        <div className="p-4" style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)" }}>
          <button onClick={() => setLocation("/skills")} className="text-blue-200 text-sm mb-2">← الْمَهَارَاتُ</button>
          <div className="flex justify-between items-center">
            <div className="text-right">
              <h1 className="text-2xl font-bold text-white">مَهَارَةُ التَّعَلُّمِ الذَّاتِيِّ</h1>
              <p className="text-blue-200 text-sm">اكْتَشِفْ وَتَعَلَّمْ بِاسْتِقْلَالِيَّةٍ وَإِبْدَاعٍ</p>
            </div>
            <span className="text-3xl p-2 bg-blue-800 rounded-xl">📚</span>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          {/* ── بطاقة موجزة: ترحيب + تقدم ── */}
          <div className="rounded-2xl p-5 text-right shadow"
            style={{ background: "linear-gradient(135deg,#ecfdf5,#d1fae5)", border: "1px solid #a7f3d0" }}>
            <h2 className="font-bold text-lg text-emerald-800">
              مَرْحَبًا{student.name ? ` يَا ${student.name}` : ""}! أَنْتَ مَنْ يَقُودُ تَعَلُّمَكَ هُنَا 🌱
            </h2>

            <div className="w-full h-2.5 bg-white/60 rounded-full mt-3 mb-1 overflow-hidden">
              <div className="h-2.5 rounded-full transition-all"
                style={{ width: `${student.selfLearningProgress}%`, background: "linear-gradient(90deg,#059669,#10b981)" }} />
            </div>

            <div className="flex justify-between items-center mt-3">
              <div className="flex gap-4">
                <span className="text-sm text-emerald-800"><b>{sl.completedActivities}</b> أَنْشِطَةٌ</span>
                <span className="text-sm text-emerald-800">🌱 <b>{independence === null ? "—" : `${independence}%`}</b></span>
                <span className="text-sm text-emerald-800">🪪 <b>{BADGES.filter(b => b.check(sl)).length}</b>/{BADGES.length}</span>
              </div>
              <button onClick={() => setShowDetails(v => !v)} className="text-xs text-emerald-700 font-bold underline">
                {showDetails ? "إِخْفَاءُ التَّفَاصِيلِ ▲" : "تَفَاصِيلُ رِحْلَتِي ▼"}
              </button>
            </div>
          </div>

          {/* ── تفاصيل إضافية (اختيارية، مطويّة افتراضيًا) ── */}
          {showDetails && (
            <div className="rounded-2xl p-5 shadow bg-white space-y-5">
              {/* شارات */}
              <div>
                <h3 className="font-bold text-blue-800 text-right text-sm mb-3">🪪 جَوَازُ التَّعَلُّمِ الذَّاتِيِّ</h3>
                <div className="grid grid-cols-3 gap-2">
                  {BADGES.map(b => {
                    const earned = b.check(sl);
                    return (
                      <div key={b.id} title={b.desc} className="rounded-xl p-2 text-center"
                        style={{ background: earned ? "#fffbeb" : "#f9fafb", border: `1px solid ${earned ? "#fde68a" : "#e5e7eb"}`, opacity: earned ? 1 : 0.5 }}>
                        <p className="text-xl">{earned ? b.icon : "🔒"}</p>
                        <p className="text-[10px] font-bold text-gray-600 leading-tight mt-0.5">{b.title}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* مسار الرحلة */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="font-bold text-blue-800 text-right text-sm mb-3">🧭 رِحْلَةُ تَعَلُّمِي</h3>
                <div className="flex overflow-x-auto gap-1 pb-2 -mx-1 px-1" style={{ scrollbarWidth: "thin" }}>
                  {JOURNEY_STAGES.map((stage, i) => {
                    const done = i < sl.journeyStageReached;
                    const current = i === sl.journeyStageReached;
                    return (
                      <div key={i} className="flex items-center shrink-0">
                        <button onClick={() => setActiveStage(activeStage === i ? null : i)}
                          className="flex flex-col items-center gap-1 px-1.5 transition-transform active:scale-95">
                          <span className="w-10 h-10 rounded-full flex items-center justify-center text-base shrink-0"
                            style={{
                              background: done ? "#059669" : current ? "#1d4ed8" : "#e5e7eb",
                              color: done || current ? "white" : "#9ca3af",
                              boxShadow: current ? "0 0 0 3px #bfdbfe" : "none",
                            }}>
                            {done ? "✓" : stage.icon}
                          </span>
                          <span className="text-[9px] text-gray-500 text-center w-14 leading-tight">{stage.label}</span>
                        </button>
                        {i < JOURNEY_STAGES.length - 1 && (
                          <span className="w-3 h-0.5 shrink-0" style={{ background: i < sl.journeyStageReached ? "#059669" : "#e5e7eb" }} />
                        )}
                      </div>
                    );
                  })}
                </div>
                {activeStage !== null && (
                  <div className="mt-2 bg-blue-50 rounded-xl p-3 text-right">
                    <p className="text-sm text-blue-800 leading-relaxed" style={{ fontFamily: "'Amiri',serif" }}>
                      {JOURNEY_STAGES[activeStage].icon} {JOURNEY_STAGES[activeStage].info}
                    </p>
                  </div>
                )}
              </div>

              {sl.skillsImproved.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <h3 className="font-bold text-blue-800 text-right text-sm mb-2">مَهَارَاتٌ طَوَّرْتُهَا</h3>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {sl.skillsImproved.map(s => (
                      <span key={s} className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-semibold">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── الأنشطة ── */}
          <div id="self-learning-activities">
            <h2 className="text-right font-bold text-lg mb-4 text-blue-800">🎯 ابْدَأْ نَشَاطَكَ الْآنَ:</h2>
            <div className="flex flex-col gap-3">
              {[
                { id: "quiz", icon: "🧠", title: "اخْتَبِرْ مَعْلُومَاتِكَ", desc: "أَسْئِلَةٌ تَفَاعُلِيَّةٌ لِقِيَاسِ مُسْتَوَاكَ" },
                { id: "order", icon: "🔤", title: "رَتِّبِ الْكَلِمَاتِ", desc: "رَتِّبِ الْكَلِمَاتِ لِتَكُونَ جُمْلَةً صَحِيحَةً" },
                { id: "fill", icon: "✏️", title: "أَكْمِلِ الْجُمْلَةَ", desc: "أَكْمِلِ الْجُمَلَ النَّاقِصَةَ بِالْكَلِمَةِ الْمُنَاسِبَةِ" },
                { id: "ask", icon: "🤖", title: "اسْأَلْ بِذَكَاءٍ", desc: "صِغْ سُؤَالَكَ بِنَفْسِكَ وَاسْأَلِ الْمُعَلِّمَ الذَّكِيَّ" },
                { id: "teacher", icon: "🧠", title: "أَنَا الْمُعَلِّمُ", desc: "تَحَقَّقْ مِنْ إِجَابَةِ الْمُعَلِّمِ الذَّكِيِّ وَصَحِّحْهَا إِنْ لَزِمَ" },
                { id: "improve", icon: "✍️", title: "اكْتُبْ ثُمَّ حَسِّنْ", desc: "اُكْتُبْ فِقْرَةً ثُمَّ حَسِّنْهَا بَعْدَ الْمُرَاجَعَةِ" },
                { id: "speak", icon: "🎙️", title: "تَحَدَّثْ ثُمَّ قَيِّمْ نَفْسَكَ", desc: "سَجِّلْ حَدِيثًا قَصِيرًا وَقَيِّمْ نَفْسَكَ قَبْلَ تَقْيِيمِ الذَّكَاءِ الِاصْطِنَاعِيِّ" },
              ].map(a => (
                <button key={a.id} onClick={() => startActivity(a.id)}
                  className="p-4 bg-white rounded-xl shadow text-right hover:shadow-md transition-all flex justify-between items-center">
                  <div><h3 className="font-bold text-blue-800">{a.title}</h3><p className="text-gray-500 text-sm">{a.desc}</p></div>
                  <span className="text-4xl p-2 rounded-xl" style={{ background: "#dbeafe" }}>{a.icon}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "#f5f0e8", minHeight: "100vh" }}>
      <div className="p-4 bg-blue-700">
        <button onClick={resetToHome} className="text-blue-200 text-sm">← الْعَوْدَةُ</button>
        <h1 className="text-white font-bold text-lg text-right mt-1">مَهَارَةُ التَّعَلُّمِ الذَّاتِيِّ</h1>
        {/* شريط مصغّر يوضح موضع الطالب داخل رحلة النشاط الحالي */}
        <div className="flex gap-1.5 mt-2">
          {(["goal", "plan", "task", "reflect"] as const).map(s => (
            <div key={s} className="flex-1 h-1.5 rounded-full"
              style={{ background: (["goal","plan","task","reflect"].indexOf(flowStep) >= ["goal","plan","task","reflect"].indexOf(s)) ? "#bfdbfe" : "rgba(255,255,255,0.25)" }} />
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">

        {/* ── 🎯 هدفي اليوم ── */}
        {flowStep === "goal" && (
          <div className="bg-white rounded-2xl p-5 shadow">
            <h2 className="text-right font-bold text-lg text-blue-800 mb-1">🎯 هَدَفِي الْيَوْمَ</h2>
            <p className="text-right text-sm text-gray-500 mb-4">مَا الْهَدَفُ الَّذِي تُرِيدُ تَحْقِيقَهُ الْيَوْمَ؟</p>
            <div className="flex flex-col gap-2 mb-3">
              {GOAL_OPTIONS.map(g => (
                <button key={g} onClick={() => setGoal(g)}
                  className={`p-3 rounded-xl text-right border-2 transition-all ${goal === g ? "border-blue-500 bg-blue-50 font-bold text-blue-800" : "border-gray-200 bg-white"}`}>
                  {g}
                </button>
              ))}
              <button onClick={() => setGoal("custom")}
                className={`p-3 rounded-xl text-right border-2 transition-all ${goal === "custom" ? "border-blue-500 bg-blue-50 font-bold text-blue-800" : "border-gray-200 bg-white"}`}>
                ✏️ هَدَفٌ أَكْتُبُهُ بِنَفْسِي
              </button>
              {goal === "custom" && (
                <input value={customGoal} onChange={e => setCustomGoal(e.target.value)} placeholder="اكْتُبْ هَدَفَكَ هُنَا..."
                  className="w-full p-3 rounded-xl border-2 border-gray-200 text-right focus:border-blue-500 focus:outline-none"
                  style={{ fontFamily: "'Cairo', sans-serif" }} />
              )}
            </div>
            <button onClick={confirmGoal} disabled={!goal || (goal === "custom" && !customGoal.trim())}
              className="w-full py-3 bg-blue-700 text-white rounded-xl font-bold disabled:opacity-40">التَّالِي: أُخَطِّطُ 🗺️</button>
          </div>
        )}

        {/* ── 🗺️ خطتي للتعلم ── */}
        {flowStep === "plan" && (
          <div className="bg-white rounded-2xl p-5 shadow">
            <h2 className="text-right font-bold text-lg text-blue-800 mb-1">🗺️ خُطَّتِي لِلتَّعَلُّمِ</h2>
            <p className="text-right text-sm text-gray-500 mb-4">رَتِّبْ خُطُوَاتِ إِنْجَازِ مَهَمَّتِكَ بِالضَّغْطِ عَلَيْهَا بِالتَّرْتِيبِ الَّذِي تَرَاهُ مُنَاسِبًا:</p>
            <div className="flex flex-col gap-2 mb-4">
              {PLAN_STEPS_CANONICAL.map(step => {
                const idx = planSelection.indexOf(step);
                return (
                  <button key={step} onClick={() => !planChecked && togglePlanStep(step)}
                    className={`p-3 rounded-xl text-right border-2 flex justify-between items-center transition-all ${idx !== -1 ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"}`}>
                    <span>{step}</span>
                    {idx !== -1 && <span className="w-6 h-6 shrink-0 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">{idx + 1}</span>}
                  </button>
                );
              })}
            </div>
            {!planChecked ? (
              <button disabled={planSelection.length < PLAN_STEPS_CANONICAL.length} onClick={confirmPlan}
                className="w-full py-3 bg-blue-700 text-white rounded-xl font-bold disabled:opacity-40">✅ تَحَقَّقْ مِنَ التَّرْتِيبِ</button>
            ) : (
              <div className="bg-blue-50 rounded-xl p-3 text-right">
                <p className="text-sm text-blue-800 leading-relaxed">
                  {planSelection.join("|") === PLAN_STEPS_CANONICAL.join("|")
                    ? "👏 تَرْتِيبٌ مُمْتَازٌ! هَذَا بِالضَّبْطِ أَفْضَلُ أُسْلُوبٍ لِلتَّنْظِيمِ الذَّاتِيِّ."
                    : "👍 تَرْتِيبٌ مَقْبُولٌ! تَذَكَّرْ: قِرَاءَةُ السُّؤَالِ، ثُمَّ التَّفْكِيرُ، ثُمَّ الْإِجَابَةُ، ثُمَّ الْمُرَاجَعَةُ — عَادَةً مَا يُعْطِي أَفْضَلَ النَّتَائِجِ."}
                </p>
                <button onClick={() => setFlowStep("task")}
                  className="mt-3 text-sm px-4 py-2 rounded-lg bg-blue-700 text-white font-bold">ابْدَأِ التَّنْفِيذَ ✍️</button>
              </div>
            )}
          </div>
        )}

        {/* ── ✍️ أنفذ (الأنشطة الحالية) ── */}
        {flowStep === "task" && activity === "quiz" && !done && (
          <div className="bg-white rounded-2xl p-5 shadow">
            <div className="w-full h-2 bg-gray-200 rounded-full mb-4">
              <div className="h-2 rounded-full bg-blue-600 transition-all" style={{ width: `${(quizIdx / quiz.length) * 100}%` }} />
            </div>
            <p className="text-right text-sm text-gray-500 mb-3">السُّؤَالُ {quizIdx + 1} مِنْ {quiz.length}</p>
            <h2 className="text-right font-bold text-lg text-blue-800 mb-4">{quiz[quizIdx].q}</h2>
            <div className="flex flex-col gap-2">
              {quiz[quizIdx].options.map((opt, i) => (
                <button key={i} onClick={() => selected === null && handleQuizAnswer(i)}
                  className={`p-3 rounded-xl text-right transition-all border-2 ${selected === i ? (i === quiz[quizIdx].correct ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50") : "border-gray-200 bg-white hover:border-blue-300"}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {flowStep === "task" && activity === "quiz" && done && (
          <div className="bg-white rounded-2xl p-5 shadow text-center">
            <p className="text-4xl mb-3">🎉</p>
            <h2 className="font-bold text-xl text-blue-800 mb-2">أَحْسَنْتَ!</h2>
            <p className="text-gray-600">نَتِيجَتُكَ: {score} / {quiz.length}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setQuizIdx(0); setSelected(null); setScore(0); setDone(false); }}
                className="flex-1 py-2 border-2 border-blue-200 text-blue-700 rounded-xl font-bold">🔄 إِعَادَةُ الِاخْتِبَارِ</button>
              <button onClick={() => setFlowStep("reflect")}
                className="flex-1 py-2 bg-blue-700 text-white rounded-xl font-bold">التَّالِي: أَتَأَمَّلُ 🪞</button>
            </div>
          </div>
        )}

        {flowStep === "task" && activity === "order" && (
          <div className="bg-white rounded-2xl p-5 shadow">
            <h2 className="text-right font-bold text-lg text-blue-800 mb-2">🔤 رَتِّبِ الْكَلِمَاتِ</h2>
            <div className="bg-green-50 rounded-xl p-3 text-right mb-4">
              <p className="text-sm font-semibold text-green-800">الْكَلِمَاتُ: «{wordOrder[0].words.join(" – ")}»</p>
            </div>
            <textarea value={wordAnswer} onChange={e => setWordAnswer(e.target.value)}
              placeholder="اكْتُبِ الْجُمْلَةَ الصَّحِيحَةَ هُنَا..."
              className="w-full h-24 p-3 rounded-xl border-2 border-gray-200 text-right resize-none focus:border-blue-500 focus:outline-none mb-3"
              style={{ fontFamily: "'Cairo', sans-serif" }} />
            {!checked && (
              <button onClick={checkOrderAnswer} className="w-full py-3 bg-green-700 text-white rounded-xl font-bold">✅ تَحَقَّقْ</button>
            )}
            {checked && renderCheckResult(wordAnswer.trim() === wordOrder[0].answer, wordOrder[0].answer)}
          </div>
        )}

        {flowStep === "task" && activity === "fill" && (
          <div className="bg-white rounded-2xl p-5 shadow">
            <h2 className="text-right font-bold text-lg text-purple-800 mb-2">✏️ أَكْمِلِ الْجُمْلَةَ</h2>
            <div className="bg-purple-50 rounded-xl p-3 text-right mb-4">
              <p className="font-semibold text-purple-800">«{fillIn[0].sentence}»</p>
            </div>
            <input value={fillAnswer} onChange={e => setFillAnswer(e.target.value)}
              placeholder="أَكْمِلِ الْفَرَاغَ..."
              className="w-full p-3 rounded-xl border-2 border-gray-200 text-right focus:border-purple-500 focus:outline-none mb-3"
              style={{ fontFamily: "'Cairo', sans-serif" }} />
            {!checked && (
              <button onClick={checkFillAnswer} className="w-full py-3 bg-purple-700 text-white rounded-xl font-bold">✅ تَحَقَّقْ</button>
            )}
            {checked && renderCheckResult(fillAnswer.trim().includes("جميل"), fillIn[0].answer)}
          </div>
        )}

        {/* ── 🤖 اسأل بذكاء ── */}
        {flowStep === "task" && activity === "ask" && (
          <div className="bg-white rounded-2xl p-5 shadow">
            <h2 className="text-right font-bold text-lg text-blue-800 mb-2">🤖 اسْأَلْ بِذَكَاءٍ</h2>
            <p className="text-right text-sm text-gray-500 mb-4">
              لَدَيْكَ كَلِمَةٌ أَوْ قَاعِدَةٌ لَمْ تَفْهَمْهَا؟ اكْتُبْ سُؤَالَكَ لِلْمُعَلِّمِ الذَّكِيِّ بِوُضُوحٍ:
            </p>
            <textarea value={question} onChange={e => setQuestion(e.target.value)}
              placeholder="مِثَالُ: لِمَاذَا نَكْتُبُ همزة الوصل بِدُونِ همزة فَوْقَ الْأَلِفِ؟"
              className="w-full h-24 p-3 rounded-xl border-2 border-gray-200 text-right resize-none focus:border-blue-500 focus:outline-none mb-3"
              style={{ fontFamily: "'Cairo', sans-serif" }} disabled={!!aiAnswer} />
            {!aiAnswer && (
              <button onClick={askQuestion} disabled={!question.trim() || asking}
                className="w-full py-3 bg-blue-700 text-white rounded-xl font-bold disabled:opacity-40">
                {asking ? "جَارٍ التَّفْكِيرُ..." : "📨 أَرْسِلْ سُؤَالِي"}
              </button>
            )}
            {aiAnswer && (
              <div className="bg-blue-50 rounded-xl p-3 text-right mt-1">
                <p className="text-xs text-blue-500 font-bold mb-1">🤖 الْمُعَلِّمُ الذَّكِيُّ:</p>
                <p className="text-blue-800 text-sm leading-relaxed">{aiAnswer}</p>
                <button onClick={() => setFlowStep("reflect")}
                  className="mt-3 text-sm px-4 py-2 rounded-lg bg-blue-700 text-white font-bold">
                  التَّالِي: أَتَأَمَّلُ فِي تَعَلُّمِي 🪞
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── 🧠 أنا المعلم ── */}
        {flowStep === "task" && activity === "teacher" && (
          <div className="bg-white rounded-2xl p-5 shadow">
            <h2 className="text-right font-bold text-lg text-blue-800 mb-2">🧠 أَنَا الْمُعَلِّمُ</h2>
            <div className="bg-gray-50 rounded-xl p-3 text-right mb-2">
              <p className="text-sm font-semibold text-gray-700">❓ {teacherItem.question}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-right mb-4">
              <p className="text-xs text-blue-500 font-bold mb-1">🤖 قَالَ الْمُعَلِّمُ الذَّكِيُّ:</p>
              <p className="text-blue-800 text-sm">{teacherItem.aiAnswer}</p>
            </div>

            {!teacherSubmitted ? (
              <>
                <p className="text-right text-sm font-bold text-gray-600 mb-2">هَلْ تُوَافِقُ عَلَى هَذِهِ الْإِجَابَةِ؟</p>
                <div className="flex gap-2 mb-3">
                  <button onClick={() => setStudentAgrees(true)}
                    className={`flex-1 py-2 rounded-xl border-2 font-bold text-sm ${studentAgrees === true ? "border-blue-500 bg-blue-50 text-blue-800" : "border-gray-200"}`}>
                    ✅ أُوَافِقُ
                  </button>
                  <button onClick={() => setStudentAgrees(false)}
                    className={`flex-1 py-2 rounded-xl border-2 font-bold text-sm ${studentAgrees === false ? "border-blue-500 bg-blue-50 text-blue-800" : "border-gray-200"}`}>
                    ❌ لَا أُوَافِقُ
                  </button>
                </div>
                {studentAgrees === false && (
                  <textarea value={correction} onChange={e => setCorrection(e.target.value)}
                    placeholder="مَا الْإِجَابَةُ الصَّحِيحَةُ فِي رَأْيِكَ؟ وَلِمَاذَا؟"
                    className="w-full h-20 p-3 rounded-xl border-2 border-gray-200 text-right resize-none focus:border-blue-500 focus:outline-none mb-3"
                    style={{ fontFamily: "'Cairo', sans-serif" }} />
                )}
                <button onClick={submitTeacherCheck}
                  disabled={studentAgrees === null || (studentAgrees === false && !correction.trim())}
                  className="w-full py-3 bg-blue-700 text-white rounded-xl font-bold disabled:opacity-40">✅ تَأَكَّدْ</button>
              </>
            ) : (
              <div className={`rounded-xl p-3 text-right ${studentAgrees === false ? "bg-green-50" : "bg-amber-50"}`}>
                {studentAgrees === false ? (
                  <p className="text-green-700 font-bold text-sm mb-1">
                    {teacherCorrectionMatches ? "👏 أَحْسَنْتَ! اكْتَشَفْتَ الْخَطَأَ فِعْلًا." : "👍 جَيِّدٌ أَنَّكَ لَمْ تُوَافِقْ، لَكِنَّ تَصْحِيحَكَ يَحْتَاجُ مُرَاجَعَةً."}
                  </p>
                ) : (
                  <p className="text-amber-700 font-bold text-sm mb-1">
                    🔎 فِي الْحَقِيقَةِ، إِجَابَةُ الْمُعَلِّمِ الذَّكِيِّ كَانَتْ خَاطِئَةً! لَا بَأْسَ، هَذَا تَمَامًا سَبَبُ أَهَمِّيَّةِ التَّحَقُّقِ دَائِمًا.
                  </p>
                )}
                <p className="text-sm text-gray-700 mt-1"><b>✅ الْإِجَابَةُ الصَّحِيحَةُ:</b> {teacherItem.correctAnswer}</p>
                <p className="text-xs text-gray-500 mt-1">{teacherItem.explanation}</p>
                <button onClick={() => setFlowStep("reflect")}
                  className="mt-3 text-sm px-4 py-2 rounded-lg bg-blue-700 text-white font-bold">
                  التَّالِي: أَتَأَمَّلُ فِي تَعَلُّمِي 🪞
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── ✍️ اكتب ثم حسّن ── */}
        {flowStep === "task" && activity === "improve" && (
          <div className="bg-white rounded-2xl p-5 shadow">
            <h2 className="text-right font-bold text-lg text-blue-800 mb-2">✍️ اكْتُبْ ثُمَّ حَسِّنْ</h2>
            <div className="bg-blue-50 rounded-xl p-3 text-right mb-4">
              <p className="text-sm font-semibold text-blue-800">{IMPROVE_PROMPT}</p>
            </div>

            {improveError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 mb-3 text-center">
                <p className="text-red-600 text-sm">⚠️ {improveError}</p>
              </div>
            )}

            {improveStage === "draft1" && (
              <>
                <textarea value={draft1} onChange={e => setDraft1(e.target.value)}
                  placeholder="اكْتُبْ مُحَاوَلَتَكَ الْأُولَى هُنَا..."
                  className="w-full h-32 p-3 rounded-xl border-2 border-gray-200 text-right resize-none focus:border-blue-500 focus:outline-none mb-3"
                  style={{ fontFamily: "'Cairo', sans-serif" }} />
                <button onClick={submitDraft1} disabled={draft1.trim().length < 10 || improveLoading}
                  className="w-full py-3 bg-blue-700 text-white rounded-xl font-bold disabled:opacity-40">
                  {improveLoading ? "جَارٍ الْمُرَاجَعَةُ..." : "✅ أَرْسِلِ الْمُحَاوَلَةَ الْأُولَى"}
                </button>
              </>
            )}

            {improveStage === "feedback1" && draft1Result && (
              <div className="space-y-3">
                <div className="bg-amber-50 rounded-xl p-3 text-right">
                  <p className="text-amber-800 font-bold text-sm mb-1">
                    🔎 وَجَدْتُ {(draft1Result.errors?.length || 0)} مَوَاضِعَ قَدْ تَحْتَاجُ إِلَى مُرَاجَعَةٍ. حَاوِلِ اكْتِشَافَهَا بِنَفْسِكَ أَوَّلًا!
                  </p>
                  <p className="text-xs text-amber-700">{draft1Result.feedback}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-xl p-2 text-center">
                    <p className="text-lg font-bold text-blue-700">{draft1Result.spelling_score}%</p>
                    <p className="text-xs text-gray-500">الْإِمْلَاءُ</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2 text-center">
                    <p className="text-lg font-bold text-blue-700">{draft1Result.structure_score}%</p>
                    <p className="text-xs text-gray-500">التَّرْكِيبُ</p>
                  </div>
                </div>
                {(draft1Result.improvements || []).length > 0 && (
                  <div className="bg-blue-50 rounded-xl p-3 text-right">
                    <p className="text-xs font-bold text-blue-700 mb-1">💡 أَشْيَاءُ لِلِانْتِبَاهِ إِلَيْهَا:</p>
                    {draft1Result.improvements.map((im: string, i: number) => (
                      <p key={i} className="text-xs text-blue-700">• {im}</p>
                    ))}
                  </div>
                )}
                <button onClick={() => setImproveStage("draft2")}
                  className="w-full py-3 bg-blue-700 text-white rounded-xl font-bold">✍️ اكْتُبِ النُّسْخَةَ الْمُحَسَّنَةَ</button>
              </div>
            )}

            {improveStage === "draft2" && (
              <>
                <p className="text-right text-sm text-gray-500 mb-2">اكْتُبِ النُّسْخَةَ الْمُحَسَّنَةَ مُسْتَفِيدًا مِمَّا لَاحَظْتَهُ:</p>
                <textarea value={draft2} onChange={e => setDraft2(e.target.value)}
                  placeholder="النُّسْخَةُ الثَّانِيَةُ..."
                  className="w-full h-32 p-3 rounded-xl border-2 border-gray-200 text-right resize-none focus:border-blue-500 focus:outline-none mb-3"
                  style={{ fontFamily: "'Cairo', sans-serif" }} />
                <button onClick={submitDraft2} disabled={draft2.trim().length < 10 || improveLoading}
                  className="w-full py-3 bg-blue-700 text-white rounded-xl font-bold disabled:opacity-40">
                  {improveLoading ? "جَارٍ الْمُقَارَنَةُ..." : "✅ قَارِنْ بِالْمُحَاوَلَةِ الْأُولَى"}
                </button>
              </>
            )}

            {improveStage === "compare" && draft1Result && draft2Result && (
              <div className="space-y-3">
                <p className="text-right font-bold text-green-700 text-sm">📊 مُقَارَنَةُ مُحَاوَلَتَيْكَ:</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">الْمُحَاوَلَةُ الْأُولَى</p>
                    <p className="text-2xl font-bold text-gray-600">{draft1Result.overall_score}%</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-green-500 mb-1">الْمُحَاوَلَةُ الثَّانِيَةُ</p>
                    <p className="text-2xl font-bold text-green-700">{draft2Result.overall_score}%</p>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-right">
                  <p className="text-sm text-blue-800 font-bold">
                    {draft2Result.overall_score > draft1Result.overall_score
                      ? `📈 تَحَسَّنْتَ بِنِسْبَةِ ${draft2Result.overall_score - draft1Result.overall_score}%! أَحْسَنْتَ.`
                      : "👍 حَافَظْتَ عَلَى مُسْتَوَاكَ. رَاجِعْ التَّعْلِيقَاتِ لِمُحَاوَلَةٍ أَقْوَى فِي الْمَرَّةِ الْقَادِمَةِ."}
                  </p>
                </div>
                <button onClick={() => setFlowStep("reflect")}
                  className="w-full py-3 bg-blue-700 text-white rounded-xl font-bold">التَّالِي: أَتَأَمَّلُ فِي تَعَلُّمِي 🪞</button>
              </div>
            )}
          </div>
        )}

        {/* ── 🎙️ تحدث ثم قيّم نفسك ── */}
        {flowStep === "task" && activity === "speak" && (
          <div className="bg-white rounded-2xl p-5 shadow">
            <h2 className="text-right font-bold text-lg text-blue-800 mb-2">🎙️ تَحَدَّثْ ثُمَّ قَيِّمْ نَفْسَكَ</h2>
            <div className="bg-blue-50 rounded-xl p-3 text-right mb-4">
              <p className="text-sm font-semibold text-blue-800">{SPEAK_PROMPT}</p>
            </div>

            {!audioBlobState && (
              <div className="text-center">
                {speakError && <p className="text-red-500 text-sm mb-2">{speakError}</p>}
                {micError && <MicPermissionCard info={micError} onRetry={startSpeakRecording} />}
                {!micError && (
                  <>
                    {!recording && <p className="text-xs text-gray-400 mb-2">قَدْ يَطْلُبُ مِنْكَ الْمُتَصَفِّحُ إِذْنَ اسْتِخْدَامِ الْمِيكْرُوفُونِ — اضْغَطْ "سَمَاحٌ / Allow".</p>}
                    <p className="text-2xl font-bold text-blue-700 mb-3">{speakFmt(speakTimer)}</p>
                    <button onClick={recording ? stopSpeakRecording : startSpeakRecording}
                      className={`w-20 h-20 rounded-full text-3xl text-white shadow-lg ${recording ? "bg-red-600 animate-pulse" : "bg-blue-700"}`}>
                      {recording ? "⏹️" : "🎙️"}
                    </button>
                    <p className="text-xs text-gray-400 mt-2">{recording ? "جَارٍ التَّسْجِيلُ... اضْغَطْ لِإِنْهَائِهِ" : "اضْغَطْ لِبَدْءِ التَّسْجِيلِ"}</p>
                  </>
                )}
              </div>
            )}

            {audioBlobState && !selfRatingSubmitted && (
              <div>
                <p className="text-center text-green-600 font-bold text-sm mb-3">✅ تَمَّ التَّسْجِيلُ! الْآنَ قَيِّمْ نَفْسَكَ أَوَّلًا (قَبْلَ رَأْيِ الذَّكَاءِ الِاصْطِنَاعِيِّ):</p>
                <div className="space-y-2 mb-4">
                  {SELF_RATING_CRITERIA.map(c => (
                    <div key={c.key} className="flex items-center justify-between">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(v => (
                          <button key={v} onClick={() => rateSelf(c.key, v)}
                            className="text-xl"
                            style={{ opacity: (selfRatings[c.key] || 0) >= v ? 1 : 0.25 }}>⭐</button>
                        ))}
                      </div>
                      <span className="text-sm text-gray-600 font-semibold">{c.label}</span>
                    </div>
                  ))}
                </div>
                <button onClick={submitSelfRatingThenAI}
                  disabled={Object.keys(selfRatings).length < SELF_RATING_CRITERIA.length || speakLoading}
                  className="w-full py-3 bg-blue-700 text-white rounded-xl font-bold disabled:opacity-40">
                  {speakLoading ? "جَارٍ التَّحْلِيلُ..." : "✅ تَأْكِيدُ تَقْيِيمِي"}
                </button>
              </div>
            )}

            {selfRatingSubmitted && (
              <div className="space-y-3">
                {speakError && <p className="text-red-500 text-sm text-center">{speakError}</p>}
                {speakResult && (
                  <div className="bg-blue-50 rounded-xl p-3 text-right">
                    <p className="text-xs text-blue-500 font-bold mb-1">🤖 تَقْيِيمُ الذَّكَاءِ الِاصْطِنَاعِيِّ:</p>
                    <p className="text-blue-800 text-sm font-bold">النَّتِيجَةُ الْعَامَّةُ: {speakResult.overall ?? "—"}%</p>
                    {speakResult.feedback && <p className="text-blue-700 text-xs mt-1">{speakResult.feedback}</p>}
                  </div>
                )}
                {(speakResult || speakError) && (
                  <button onClick={() => setFlowStep("reflect")}
                    className="w-full py-3 bg-blue-700 text-white rounded-xl font-bold">التَّالِي: أَتَأَمَّلُ فِي تَعَلُّمِي 🪞</button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 🪞 ماذا تعلمت؟ ── */}
        {flowStep === "reflect" && (
          <div className="bg-white rounded-2xl p-5 shadow">
            <h2 className="text-right font-bold text-lg text-blue-800 mb-1">🪞 مَاذَا تَعَلَّمْتُ؟</h2>
            <p className="text-right text-sm text-gray-500 mb-4">خُذْ لَحْظَةً لِلتَّأَمُّلِ فِي رِحْلَتِكَ (يُمْكِنُكَ الْكِتَابَةُ بِاخْتِصَارٍ):</p>
            <div className="space-y-3">
              <div>
                <label className="block text-right text-sm font-semibold text-gray-600 mb-1">مَاذَا تَعَلَّمْتَ؟</label>
                <textarea value={reflection.learned} onChange={e => setReflection({ ...reflection, learned: e.target.value })}
                  className="w-full p-3 rounded-xl border-2 border-gray-200 text-right resize-none focus:border-blue-500 focus:outline-none" rows={2}
                  style={{ fontFamily: "'Cairo', sans-serif" }} />
              </div>
              <div>
                <label className="block text-right text-sm font-semibold text-gray-600 mb-1">مَا الشَّيْءُ الَّذِي كَانَ صَعْبًا؟</label>
                <textarea value={reflection.hard} onChange={e => setReflection({ ...reflection, hard: e.target.value })}
                  className="w-full p-3 rounded-xl border-2 border-gray-200 text-right resize-none focus:border-blue-500 focus:outline-none" rows={2}
                  style={{ fontFamily: "'Cairo', sans-serif" }} />
              </div>
              <div>
                <label className="block text-right text-sm font-semibold text-gray-600 mb-1">كَيْفَ سَأَتَعَلَّمُهُ بِصُورَةٍ أَفْضَلَ فِي الْمَرَّةِ الْقَادِمَةِ؟</label>
                <textarea value={reflection.better} onChange={e => setReflection({ ...reflection, better: e.target.value })}
                  className="w-full p-3 rounded-xl border-2 border-gray-200 text-right resize-none focus:border-blue-500 focus:outline-none" rows={2}
                  style={{ fontFamily: "'Cairo', sans-serif" }} />
              </div>
            </div>
            <button onClick={() => { updateJourney({ stage: 8 }); resetToHome(); }}
              className="w-full py-3 mt-4 bg-emerald-600 text-white rounded-xl font-bold">✅ إِنْهَاءُ الرِّحْلَةِ وَالْعَوْدَةُ 🌱</button>
          </div>
        )}
      </div>
    </div>
  );
}
