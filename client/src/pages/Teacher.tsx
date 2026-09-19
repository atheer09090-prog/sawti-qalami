import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { getState } from "@/lib/store";
import { DICTATION_QUESTIONS } from "@/lib/dictation-data";
import {
  getSpeakingLessons, addSpeakingLesson, updateSpeakingLesson, deleteSpeakingLesson,
  getWritingTopics, addWritingTopic, updateWritingTopic, deleteWritingTopic,
  getSelfLearning, addQuizQuestion, updateQuizQuestion, deleteQuizQuestion,
  addWordOrder, updateWordOrder, deleteWordOrder,
  addFillIn, updateFillIn, deleteFillIn,
  getHamzaJourneys, updateHamzaJourney, resetHamzaJourney,
  teacherLogin, listStudents, saveStudentRecordByKey, downloadStudentReport, listReviews, getSusSummary, API_BASE,
} from "@/lib/api";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Cell,
} from "recharts";

/* ── طُلَّابٌ حَقِيقِيُّونَ (مِنَ الْخَادِمِ) ──
   كل طالب يسجّل دخول باسمه وصفّه يُحفظ سجلّه تلقائيًا على الخادم
   (راجع lib/store.ts + app/routers/students.py). هنا نجلب هذه
   السجلّات الحقيقية ونحوّلها لشكل موحّد تعرضه لوحة المعلم. */
interface RealStudent {
  key: string;      // name|grade — لتحديد الطالب في الواجهة (قوائم/تحديد) فقط
  dbKey: string;     // المفتاح الحقيقي للسجل في قاعدة البيانات — يُستخدم عند الحفظ
  name: string;
  grade: string;
  avatar: string;
  points: number;
  stars: number;
  speaking: number;
  writing: number;
  selfLearning: number;
  teacherComment: string;
  raw: any;          // السجلّ الكامل كما أتى من الخادم (لازم عند الحفظ حتى لا تُفقد حقول أخرى)
}

function mapStudentRecord(r: any): RealStudent {
  return {
    key: `${r.name || ""}|${r.grade || ""}`,
    dbKey: r._key || `${r.name || ""}|${r.grade || ""}`,
    name: r.name || "طَالِبٌ",
    grade: r.grade || "",
    avatar: r.avatar || "👦",
    points: r.points || 0,
    stars: r.stars || 0,
    speaking: r.speakingProgress || 0,
    writing: r.writingProgress || 0,
    selfLearning: r.selfLearningProgress || 0,
    teacherComment: r.teacherComment || "",
    raw: r,
  };
}

const MOCK_LESSONS = {
  speaking: [
    { title: "رِحْلَةٌ إِلَى الطَّبِيعَةِ", students: 4, status: "active" },
    { title: "دَرْسُ سَاعَةِ الأَرْضِ", students: 3, status: "active" },
    { title: "الْحِوَارُ الْيَوْمِيُّ", students: 0, status: "soon" },
  ],
  writing: [
    { title: "الإِفْلَاءُ التَّفَاعُلِيُّ", students: 5, status: "active" },
    { title: "التَّعْبِيرُ الْكِتَابِيُّ", students: 3, status: "active" },
    { title: "قَوَاعِدُ الإِمْلَاءِ", students: 0, status: "soon" },
  ],
  selfLearning: [
    { title: "الْقِرَاءَةُ الثَّقَافِيَّةُ", students: 4, status: "active" },
    { title: "الْمُفْرَدَاتُ الْجَدِيدَةُ", students: 2, status: "active" },
    { title: "الأَنْمَاطُ اللُّغَوِيَّةُ", students: 0, status: "soon" },
  ],
};


/* ══════════════════════════════════════════════════════════════
   أَلْعَابُ الْهَمْزَةِ الْحَالِيَّةُ لَدَى الطَّالِبِ (٣ رَحَلَاتٍ تَفَاعُلِيَّةٍ)
   البيانات الوصفية (عنوان/أيقونة/لون/رابط) ثابتة هنا، أمّا المحتوى
   القابل للتعديل (القاعدة، الكلمات، الخيارات، التعليلات) فيُجلب
   حيًّا من /lessons/hamza-journeys ويمكن للمعلم تعديله من هذه الصفحة
   — وأي تعديل يظهر فورًا لدى الطالب لأن صفحات الألعاب الثلاث تقرأ
   نفس الـ API (مع نسخة احتياطية داخلية إذا تعذّر الاتصال بالخادم).
   ══════════════════════════════════════════════════════════════ */
const HAMZA_JOURNEYS: Record<"l1"|"l2"|"l3", {
  title: string; sub: string; icon: string; color: string; bg: string; route: string;
}> = {
  l1: {
    title: "رِحْلَةُ الْمُسْتَكْشِفِ التَّفَاعُلِيَّةُ",
    sub: "الْهَمْزَةُ الْمُتَوَسِّطَةُ عَلَى نَبْرَةٍ (يَاء) — قَاعِدَةُ الْكَسْرَةِ",
    icon: "🗺️", color: "#059669", bg: "linear-gradient(135deg,#064e3b,#059669)",
    route: "/writing-games/treasure-map",
  },
  l2: {
    title: "الْغَوَّاصُ وَصَائِدُ اللَّآلِئِ",
    sub: "الْهَمْزَةُ الْمُتَوَسِّطَةُ مُنْفَرِدَةً عَلَى السَّطْرِ",
    icon: "🤿", color: "#1d4ed8", bg: "linear-gradient(135deg,#0c4a6e,#0891b2)",
    route: "/writing-games/diver-pearl",
  },
  l3: {
    title: "قَائِدُ الْمِنْطَادِ وَجَزِيرَةُ الْكَنْزِ",
    sub: "الْهَمْزَةُ الْمُتَطَرِّفَةُ — أَلِف / وَاو / يَاء / السَّطْر",
    icon: "🎈", color: "#b45309", bg: "linear-gradient(135deg,#1e3a8a,#3b82f6)",
    route: "/writing-games/balloon",
  },
};

/* نوع الحقل القابل للتعديل:
   - text: نص واحد (القاعدة أو تعليل مرحلة)
   - textList: قائمة نصوص مستقلة (تعليلات مرحلة الفرز الثلاثية)
   - options: مجموعة خيارات وواحد منها فقط صحيح (راديو)
   - pairs: أزواج (كلمة صحيحة / كلمة بها خطأ) وواحدة من كل زوج هي الصحيحة */
type FieldKind = "text" | "textList" | "options" | "pairs";
type FieldDef = { key: string; label: string; icon: string; kind: FieldKind };

const FIELD_DEFS: Record<"l1"|"l2"|"l3", FieldDef[]> = {
  l1: [
    { key: "rule", label: "الْقَاعِدَةُ اللُّغَوِيَّةُ", icon: "📖", kind: "text" },
    { key: "rock1Sets", label: "🪨 الصَّخْرَةُ ١ — أَزْوَاجُ الْكَلِمَاتِ (فَرْزُ الْبَوَّابَةِ)", icon: "🪨", kind: "pairs" },
    { key: "rock1Explanations", label: "🪨 تَعْلِيلَاتُ الصَّخْرَةِ ١", icon: "💡", kind: "textList" },
    { key: "rock2Explanation", label: "🪨 تَعْلِيلُ الصَّخْرَةِ ٢ (تَرْتِيبُ الْحَرَكَاتِ)", icon: "💡", kind: "text" },
    { key: "rock3Options", label: "🪨 الصَّخْرَةُ ٣ — اخْتِيَارُ السَّبَبِ (مُطْمَئِن)", icon: "🪨", kind: "options" },
    { key: "rock3Explanation", label: "🪨 تَعْلِيلُ الصَّخْرَةِ ٣", icon: "💡", kind: "text" },
    { key: "rock4Options", label: "🏆 بَوَّابَةُ الْكَنْزِ (بِئْر)", icon: "🔑", kind: "options" },
    { key: "rock4Explanation", label: "🏆 تَعْلِيلُ بَوَّابَةِ الْكَنْزِ", icon: "💡", kind: "text" },
  ],
  l2: [
    { key: "rule", label: "الْقَاعِدَةُ اللُّغَوِيَّةُ", icon: "📖", kind: "text" },
    { key: "oyster1Sets", label: "🐚 الْمَحَارَةُ ١ — أَزْوَاجُ الْكَلِمَاتِ", icon: "🐚", kind: "pairs" },
    { key: "oyster1Explanations", label: "🐚 تَعْلِيلَاتُ الْمَحَارَةِ ١", icon: "💡", kind: "textList" },
    { key: "oyster2AlefOptions", label: "🐚 الْمَحَارَةُ ٢ — حَرَكَةُ الْأَلِفِ (قِراءَة)", icon: "🐚", kind: "options" },
    { key: "oyster2HamzaOptions", label: "🐚 الْمَحَارَةُ ٢ — حَرَكَةُ الْهَمْزَةِ (قِراءَة)", icon: "🐚", kind: "options" },
    { key: "oyster2Explanation", label: "🐚 تَعْلِيلُ الْمَحَارَةِ ٢", icon: "💡", kind: "text" },
    { key: "oyster3Options", label: "🐚 الْمَحَارَةُ ٣ — اخْتِيَارُ السَّبَبِ (نُبُوءَة)", icon: "🐚", kind: "options" },
    { key: "oyster3Explanation", label: "🐚 تَعْلِيلُ الْمَحَارَةِ ٣", icon: "💡", kind: "text" },
    { key: "oyster4Options", label: "🏆 صُنْدُوقُ الْكَنْزِ الْغَارِقُ (رَدَاءَة)", icon: "🦪", kind: "options" },
    { key: "oyster4Explanation", label: "🏆 تَعْلِيلُ الصُّنْدُوقِ", icon: "💡", kind: "text" },
  ],
  l3: [
    { key: "rule", label: "الْقَاعِدَةُ اللُّغَوِيَّةُ", icon: "📖", kind: "text" },
    { key: "cloud1Options", label: "☁️ الْغَيْمَةُ ١ — مَوْقِعُ الْهَمْزَةِ الْمُتَطَرِّفَةِ", icon: "☁️", kind: "options" },
    { key: "cloud1Explanation", label: "☁️ تَعْلِيلُ الْغَيْمَةِ ١", icon: "💡", kind: "text" },
    { key: "cloud2Options", label: "☁️ الْغَيْمَةُ ٢ — حَرَكَةُ الطَّاءِ (شَاطِئ)", icon: "☁️", kind: "options" },
    { key: "cloud2Explanation", label: "☁️ تَعْلِيلُ الْغَيْمَةِ ٢", icon: "💡", kind: "text" },
    { key: "cloud3Options", label: "☁️ الْغَيْمَةُ ٣ — سَبَبُ هَمْزَةِ (يَجْرُؤ)", icon: "☁️", kind: "options" },
    { key: "cloud3Explanation", label: "☁️ تَعْلِيلُ الْغَيْمَةِ ٣", icon: "💡", kind: "text" },
    { key: "cloud4Options", label: "🏝️ جَزِيرَةُ الْكَنْزِ الطَّائِرَةُ (دِفْء)", icon: "🏝️", kind: "options" },
    { key: "cloud4Explanation", label: "🏝️ تَعْلِيلُ الْجَزِيرَةِ", icon: "💡", kind: "text" },
  ],
};

/* ── Sub-components ── */
function StarRating({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= value ? "#f5c842" : "#d1d5db", fontSize: "14px" }}>★</span>
      ))}
    </span>
  );
}

function avgSkill(students: RealStudent[], key: "speaking"|"writing"|"selfLearning") {
  if (students.length === 0) return 0;
  return Math.round(students.reduce((s, st) => s + st[key], 0) / students.length);
}

function TopStudents({ students }: { students: RealStudent[] }) {
  const sorted = [...students].sort((a, b) => b.points - a.points).slice(0, 3);
  const medals = ["🥇", "🥈", "🥉"];
  const bgs = ["#fef9e7", "#f5f5f5", "#fff8f0"];
  if (sorted.length === 0) {
    return (
      <div>
        <h3 className="font-bold text-lg mb-3 text-right" style={{ color: "#b45309" }}>🏆 أَفْضَلُ الطُّلَّابِ أَدَاءً</h3>
        <p className="text-center text-gray-400 text-sm py-4">لَا يُوجَدُ طُلَّابٌ مُسَجَّلُونَ بَعْدُ.</p>
      </div>
    );
  }
  return (
    <div>
      <h3 className="font-bold text-lg mb-3 text-right" style={{ color: "#b45309" }}>🏆 أَفْضَلُ الطُّلَّابِ أَدَاءً</h3>
      <div className="grid grid-cols-3 gap-2">
        {sorted.map((s, i) => (
          <div key={s.key} className="rounded-2xl p-3 text-center" style={{ background: bgs[i], border: i === 0 ? "2px solid #f5c842" : "1px solid #e5e7eb" }}>
            <div className="text-2xl mb-1">{medals[i]}</div>
            <p className="font-bold text-sm">{s.name}</p>
            <p className="text-xs text-gray-400">{s.stars} نَجْمَةٌ · {s.points} نُقْطَةٌ</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Teacher Page ── */
export default function Teacher() {
  const [, setLocation] = useLocation();

  // ── بَوَّابَةُ دُخُولِ الْمُعَلِّمِ بِرَمْزِ وُصُولٍ ──
  // نستخدم sessionStorage (وليس localStorage) حتى يُطلب الرمز من جديد
  // في كل جلسة متصفح جديدة، مع بقاء الدخول ساريًا أثناء التنقل بين
  // تبويبات الصفحة نفسها دون إعادة إدخاله كل مرة.
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("sawti_teacher_authed") === "1");
  const [code, setCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [authChecking, setAuthChecking] = useState(false);

  async function handleTeacherLogin() {
    if (!code.trim()) { setAuthError("الرجاء إدخال رمز الدخول"); return; }
    setAuthChecking(true);
    setAuthError("");
    const ok = await teacherLogin(code.trim());
    setAuthChecking(false);
    if (ok) {
      sessionStorage.setItem("sawti_teacher_authed", "1");
      setAuthed(true);
    } else {
      setAuthError("رَمْزُ الدُّخُولِ غَيْرُ صَحِيحٍ");
    }
  }

  const [tab, setTab] = useState<"overview"|"students"|"reviews"|"lessons">("overview");
  const [speakingLessons, setSpeakingLessons] = useState<any[]>([]);
  const [writingTopics, setWritingTopics] = useState<any[]>([]);
  const [lessonsTab, setLessonsTab] = useState<"speaking"|"writing"|"self"|"games"|"dictation">("speaking");
  const [dictationQuestions, setDictationQuestions] = useState<any[]>([]);
  const [dictationModal, setDictationModal] = useState<{idx: number|null} | null>(null);
  const [dictationForm, setDictationForm] = useState<any>({});

  useEffect(() => {
    getSelfLearning(); // already called above
    // جلب أسئلة الإملاء من backend
    fetch(`${import.meta.env.VITE_API_URL || "https://sawti-0k3n.onrender.com/api"}/lessons/dictation`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.length) setDictationQuestions(d); else setDictationQuestions(DICTATION_QUESTIONS); });
  }, []);

  async function saveDictation() {
    if (!dictationModal) return;
    const f = dictationForm;
    if (!f.word?.trim()) return alert("أدخل الكلمة");
    const q = {
      word: f.word, type: f.type || "", correct: f.correct || "",
      opts: f.opts?.split(/[،,]/).map((o:string) => o.trim()).filter(Boolean) || [],
      hint: f.hint || "", img: f.img || "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&q=80",
    };
    const API = `${import.meta.env.VITE_API_URL || "https://sawti-0k3n.onrender.com/api"}/lessons/dictation`;
    if (dictationModal.idx !== null) {
      await fetch(`${API}/${dictationModal.idx}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(q) });
    } else {
      await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(q) });
    }
    const d = await fetch(API).then(r => r.json());
    setDictationQuestions(d);
    setDictationModal(null);
  }

  async function deleteDictation(idx: number) {
    if (!confirm("حذف؟")) return;
    const API = `${import.meta.env.VITE_API_URL || "https://sawti-0k3n.onrender.com/api"}/lessons/dictation`;
    await fetch(`${API}/${idx}`, { method: "DELETE" });
    const d = await fetch(API).then(r => r.json());
    setDictationQuestions(d);
  }

  // ── أَلْعَابُ الْهَمْزَةِ — ثَلَاثُ رَحَلَاتٍ تَفَاعُلِيَّةٍ ──
  // (رِحْلَةُ الْمُسْتَكْشِفِ / الْغَوَّاصُ وَصَائِدُ اللَّآلِئِ / قَائِدُ الْمِنْطَادِ)
  // البيانات الوصفية (عنوان/أيقونة/لون) ثابتة في HAMZA_JOURNEYS، أمّا
  // محتوى كل رحلة (القاعدة، الكلمات، الخيارات، التعليلات) فيُجلب من
  // /lessons/hamza-journeys ويمكن تعديله هنا مباشرة — وأي حفظ يظهر
  // فورًا لدى الطالب لأن صفحات الألعاب الثلاث تقرأ نفس الـ API.
  const [gamesLesson, setGamesLesson] = useState<"l1"|"l2"|"l3">("l1");
  const [journeysContent, setJourneysContent] = useState<any>(null);
  const [journeysLoading, setJourneysLoading] = useState(true);

  useEffect(() => {
    getHamzaJourneys().then(d => { setJourneysContent(d); setJourneysLoading(false); });
  }, []);

  async function refreshJourneys() {
    const d = await getHamzaJourneys();
    if (d) setJourneysContent(d);
  }

  const [journeyEditModal, setJourneyEditModal] = useState<FieldDef | null>(null);
  const [journeyEditForm, setJourneyEditForm] = useState<any>(null);
  const [journeySaving, setJourneySaving] = useState(false);

  function openJourneyEdit(field: FieldDef) {
    const current = journeysContent?.[gamesLesson]?.[field.key];
    // نسخة عميقة حتى لا نُعدِّل الحالة الأصلية قبل الحفظ
    setJourneyEditForm(current !== undefined ? JSON.parse(JSON.stringify(current)) : null);
    setJourneyEditModal(field);
  }

  async function saveJourneyField() {
    if (!journeyEditModal) return;
    setJourneySaving(true);
    const ok = await updateHamzaJourney(gamesLesson, { [journeyEditModal.key]: journeyEditForm });
    setJourneySaving(false);
    if (!ok) { alert("⚠️ تعذّر الحفظ. تحقّق من اتصالك بالخادم."); return; }
    await refreshJourneys();
    setJourneyEditModal(null);
  }

  async function handleResetJourney() {
    if (!confirm("إِعَادَةُ هَذِهِ الرَّحْلَةِ بِالْكَامِلِ إِلَى مُحْتَوَاهَا الِافْتِرَاضِيِّ؟")) return;
    const ok = await resetHamzaJourney(gamesLesson);
    if (!ok) { alert("⚠️ تعذّر تنفيذ الإعادة."); return; }
    await refreshJourneys();
  }

  const [lessonModal, setLessonModal] = useState<{type:"speaking"|"writing"; item:any|null} | null>(null);
  const [lessonForm, setLessonForm] = useState<any>({});

  useEffect(() => {
    getSpeakingLessons().then(d => { if (d) setSpeakingLessons(d); });
    getWritingTopics().then(d => { if (d) setWritingTopics(d); });
  }, []);

  const [slData, setSlData] = useState<any>({ quiz: [], word_order: [], fill_in: [] });
  const [slModal, setSlModal] = useState<{type: "quiz"|"order"|"fill"; idx: number|null} | null>(null);
  const [slForm, setSlForm] = useState<any>({});

  useEffect(() => {
    getSelfLearning().then(d => { if (d) setSlData(d); });
  }, []);

  async function refreshSL() {
    const d = await getSelfLearning();
    if (d) setSlData(d);
  }

  async function saveSLItem() {
    if (!slModal) return;
    const { type, idx } = slModal;
    if (type === "quiz") {
      if (!slForm.q?.trim()) return alert("أدخل نص السؤال");
      const opts = slForm.options?.split(/[،,]/).map((o:string) => o.trim()).filter(Boolean) || [];
      if (opts.length < 2) return alert("أدخل خيارين على الأقل مفصولين بـ ،");
      const q = { q: slForm.q, options: opts, correct: parseInt(slForm.correct) || 0 };
      idx !== null ? await updateQuizQuestion(idx, q) : await addQuizQuestion(q);
    } else if (type === "order") {
      if (!slForm.answer?.trim()) return alert("أدخل الجملة الصحيحة");
      const words = slForm.words?.split("،").map((w:string) => w.trim()).filter(Boolean) || [];
      if (words.length < 2) return alert("أدخل الكلمات مفصولة بـ ،");
      const q = { words, answer: slForm.answer };
      idx !== null ? await updateWordOrder(idx, q) : await addWordOrder(q);
    } else {
      if (!slForm.sentence?.trim() || !slForm.answer?.trim()) return alert("أدخل الجملة والإجابة");
      const q = { sentence: slForm.sentence, answer: slForm.answer };
      idx !== null ? await updateFillIn(idx, q) : await addFillIn(q);
    }
    await refreshSL();
    setSlModal(null);
  }

  async function saveSpeakingLesson() {
    const f = lessonForm;
    if (!f.title?.trim()) return alert("أدخل عنوان الدرس");
    const lesson = {
      id: f.id || f.title.replace(/\s+/g, "-").substring(0, 20) + "-" + Date.now(),
      title: f.title, level: f.level || "سَهْلٌ",
      icon: f.icon || "📖", desc: f.desc || "",
      topics: f.topics ? f.topics.split("،").map((t:string) => t.trim()).filter(Boolean) : [],
    };
    if (f.id) { await updateSpeakingLesson(f.id, lesson); }
    else { await addSpeakingLesson(lesson); }
    const data = await getSpeakingLessons();
    if (data) setSpeakingLessons(data);
    setLessonModal(null);
  }

  async function saveWritingTopic() {
    const f = lessonForm;
    if (!f.title?.trim()) return alert("أدخل عنوان الموضوع");
    const topic = {
      id: f.id || f.title.replace(/\s+/g, "-").substring(0, 20) + "-" + Date.now(),
      title: f.title, icon: f.icon || "✏️",
      hints: f.hints ? f.hints.split("،").map((h:string) => h.trim()).filter(Boolean) : [],
    };
    if (f.id) { await updateWritingTopic(f.id, topic); }
    else { await addWritingTopic(topic); }
    const data = await getWritingTopics();
    if (data) setWritingTopics(data);
    setLessonModal(null);
  }

  async function handleDeleteSpeaking(id: string) {
    if (!confirm("هل تريد حذف هذا الدرس؟")) return;
    await deleteSpeakingLesson(id);
    setSpeakingLessons(p => p.filter(l => l.id !== id));
  }

  async function handleDeleteWriting(id: string) {
    if (!confirm("هل تريد حذف هذا الموضوع؟")) return;
    await deleteWritingTopic(id);
    setWritingTopics(p => p.filter(t => t.id !== id));
  }
  const [teacherName] = useState("aa");
  const [searchQ, setSearchQ] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<RealStudent | null>(null);
  const [comment, setComment] = useState("");

  // ── جلب بيانات الطلاب الحقيقيين من الخادم ──
  const [students, setStudents] = useState<RealStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [savingComment, setSavingComment] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);

  // ── جلب تقييمات الطلاب الحقيقية لتجربة استخدام البرنامج ──
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [susSummary, setSusSummary] = useState<{ count: number; average: number | null; bands: Record<string, number> } | null>(null);

  useEffect(() => {
    if (!authed) return;
    refreshStudents();
    refreshReviews();
    getSusSummary().then(setSusSummary);
  }, [authed]);

  async function refreshStudents() {
    setStudentsLoading(true);
    const raw = await listStudents();
    setStudents(raw.map(mapStudentRecord));
    setStudentsLoading(false);
  }

  async function refreshReviews() {
    setReviewsLoading(true);
    const data = await listReviews();
    setReviews(data);
    setReviewsLoading(false);
  }

  async function saveComment(s: RealStudent) {
    setSavingComment(true);
    await saveStudentRecordByKey(s.dbKey, { ...s.raw, teacherComment: comment });
    await refreshStudents();
    setSavingComment(false);
    setSelectedStudent(null);
  }

  async function handleDownloadReport(s: RealStudent) {
    setDownloadingReport(s.key);
    const ok = await downloadStudentReport({
      name: s.name, grade: s.grade,
      speaking_progress: s.speaking, writing_progress: s.writing, self_learning_progress: s.selfLearning,
      teacher_comment: s.teacherComment, points: s.points, stars: s.stars,
    });
    if (!ok) alert("⚠️ تعذّر توليد التقرير. حاول مرة أخرى.");
    setDownloadingReport(null);
  }

  const filteredStudents = students.filter(s =>
    s.name.includes(searchQ) || s.grade.includes(searchQ)
  );

  const avgSpeaking = avgSkill(students, "speaking");
  const avgWriting = avgSkill(students, "writing");
  const avgSelf = avgSkill(students, "selfLearning");
  const avgOverall = students.length ? Math.round((avgSpeaking + avgWriting + avgSelf) / 3) : 0;

  const radarData = [
    { axis: "التَّحَدُّثُ", value: avgSpeaking },
    { axis: "الْكِتَابَةُ", value: avgWriting },
    { axis: "التَّقْيِيمُ", value: 65 },
    { axis: "التَّعَلُّمُ", value: avgSelf },
    { axis: "النُّقَاطُ", value: 72 },
  ];

  const barData = [
    { name: "التَّحَدُّثُ", value: avgSpeaking, fill: "#1a5c2a" },
    { name: "الْكِتَابَةُ", value: avgWriting, fill: "#b45309" },
    { name: "التَّعَلُّمُ الذَّاتِيُّ", value: avgSelf, fill: "#1d4ed8" },
  ];

  const TABS = [
    { id: "overview", label: "نَظْرَةٌ عَامَّةٌ", icon: "📊" },
    { id: "students", label: "الطُّلَّابُ", icon: "👥" },
    { id: "reviews", label: "التَّقْيِيمَاتُ", icon: "⭐" },
    { id: "lessons", label: "الدُّرُوسُ", icon: "📚" },
  ] as const;

  // ── إذا لم يُدخِل المعلم رمز الدخول الصحيح بعد، نعرض بوابة الدخول
  // فقط بدل كامل لوحة التحكم (بنفس هوية صفحة تسجيل دخول الطالب) ──
  if (!authed) {
    return (
      <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{
          backgroundImage: "url('/assets/bg-main.png')", backgroundSize: "cover",
          backgroundPosition: "center", backgroundAttachment: "fixed", fontFamily: "'Cairo', sans-serif",
        }}>
        <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl">
          <div className="pt-8 pb-6 px-6 text-center"
            style={{ background: "linear-gradient(160deg, #1a5c2a 0%, #2d7a3e 70%, #1a5c2a 100%)" }}>
            <img src="/assets/logo.png" alt="صوتي قلمي" className="w-24 h-24 object-contain mx-auto mb-2"
              style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.3))" }} />
            <h1 style={{ fontFamily: "'Amiri', serif", color: "#f5c842", fontSize: "1.6rem", fontWeight: 700 }}>
              🎓 دُخُولُ الْمُعَلِّمِ
            </h1>
          </div>
          <div className="bg-white px-6 py-6">
            <label className="block text-right text-gray-600 mb-1.5 font-semibold text-sm">
              رَمْزُ الدُّخُولِ:
            </label>
            <input type="password" value={code}
              onChange={(e) => { setCode(e.target.value); setAuthError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleTeacherLogin()}
              placeholder="أَدْخِلْ رَمْزَ الْوُصُولِ الْخَاصَّ بِكَ"
              className="w-full px-4 py-3 rounded-xl border-2 text-right focus:outline-none text-base mb-2"
              style={{ borderColor: authError ? "#dc2626" : "#e5e7eb" }} autoFocus />
            {authError && <p className="text-red-500 text-xs text-right mb-2">{authError}</p>}
            <button onClick={handleTeacherLogin} disabled={authChecking}
              className="w-full py-3 rounded-xl text-white font-bold mt-2 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #1a5c2a 0%, #2d7a3e 100%)" }}>
              {authChecking ? "جَارٍ التَّحَقُّقُ..." : "دُخُولٌ"}
            </button>
            <button onClick={() => setLocation("/")}
              className="w-full py-2 mt-2 text-sm text-gray-400 font-bold">
              ← الرُّجُوعُ لِتَسْجِيلِ دُخُولِ الطَّالِبِ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "#f5f0e8", minHeight: "100vh" }}>
      {/* ── Top bar ── */}
      <div className="flex justify-between items-center px-4 py-3 text-white"
        style={{ background: "linear-gradient(135deg, #1a5c2a 0%, #2d7a3e 100%)" }}>
        <div className="flex items-center gap-2">
          <button onClick={() => setLocation("/")}
            className="bg-white/20 hover:bg-white/30 text-white text-sm px-3 py-1 rounded-full transition-all">
            خُرُوجٌ
          </button>
          <div className="bg-white/20 rounded-full px-3 py-1 text-sm flex items-center gap-1">
            <span>🎓</span>
            <span className="font-bold">{teacherName}</span>
            <span className="text-xs opacity-75">مَرْحَباً</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs opacity-75">مَنْصَةُ صَوْتِي قَلَمِي</p>
          <p className="font-bold text-sm">لَوْحَةُ تَحَكُّمِ الْمُعَلِّمِ</p>
        </div>
        <img src="/assets/logo.png" alt="" className="w-10 h-10 object-contain" />
      </div>

      {/* ── Tab bar ── */}
      <div className="bg-white shadow-sm border-b border-gray-100 overflow-x-auto">
        <div className="flex min-w-max">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className="px-4 py-3 text-sm font-bold transition-all whitespace-nowrap border-b-2"
              style={{
                borderColor: tab === t.id ? "#1a5c2a" : "transparent",
                color: tab === t.id ? "#1a5c2a" : "#6b7280",
                background: tab === t.id ? "#f0faf3" : "transparent",
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5">

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "إِجْمَالِيُّ الطُّلَّابِ", value: students.length, icon: "👥", color: "#1a5c2a" },
                { label: "مُتَوَسِّطُ الأَدَاءِ", value: `${avgOverall}%`, icon: "📈", color: "#2563eb" },
                { label: "إِجْمَالِيُّ النُّقَاطِ", value: students.reduce((s,x) => s+x.stars, 0), icon: "⭐", color: "#b45309" },
                { label: "التَّقْيِيمَاتُ الْمُسْتَلَمَةُ", value: reviews.length, icon: "💬", color: "#7c3aed" },
              ].map(k => (
                <div key={k.label} className="bg-white rounded-2xl p-4 shadow-sm text-center">
                  <div className="text-3xl mb-1">{k.icon}</div>
                  <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{k.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Radar */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-bold text-right mb-3" style={{ color: "#1a5c2a" }}>🎯 مُؤَشِّرَاتُ الأَدَاءِ</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fontFamily: "'Cairo', sans-serif" }} />
                    <Radar dataKey="value" stroke="#1a5c2a" fill="#1a5c2a" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              {/* Bar */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-bold text-right mb-3" style={{ color: "#1a5c2a" }}>📊 مُتَوَسِّطُ الْمَهَارَاتِ</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "'Cairo', sans-serif" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <TopStudents students={students} />
            </div>
          </div>
        )}

        {/* ── STUDENTS ── */}
        {tab === "students" && (
          <div>
            <div className="relative mb-4">
              <input
                value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="🔍 بَحْثٌ عَنِ الطَّالِبِ..."
                className="w-full px-4 py-3 pr-10 rounded-xl border-2 text-right focus:outline-none bg-white shadow-sm"
                style={{ borderColor: "#e5e7eb", fontFamily: "'Cairo', sans-serif" }}
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                {filteredStudents.length} طَالِبٌ
              </span>
            </div>

            <div className="flex justify-end mb-3">
              <button onClick={refreshStudents} disabled={studentsLoading}
                className="text-xs px-3 py-1.5 rounded-lg border-2 font-bold disabled:opacity-50"
                style={{ borderColor: "#1a5c2a", color: "#1a5c2a" }}>
                {studentsLoading ? "⏳ جَارٍ التَّحْدِيثُ..." : "🔄 تَحْدِيثٌ"}
              </button>
            </div>

            {studentsLoading && (
              <p className="text-center text-gray-400 text-sm py-10">⏳ جَارٍ تَحْمِيلُ بَيَانَاتِ الطُّلَّابِ...</p>
            )}

            {!studentsLoading && students.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                <p className="text-4xl mb-2">👥</p>
                <p className="font-bold text-gray-600">لَا يُوجَدُ طُلَّابٌ مُسَجَّلُونَ بَعْدُ</p>
                <p className="text-xs text-gray-400 mt-1">سَيَظْهَرُ الطُّلَّابُ هُنَا تِلْقَائِيًّا بَعْدَ أَوَّلِ تَسْجِيلِ دُخُولٍ لَهُمْ.</p>
              </div>
            )}

            {!studentsLoading && students.length > 0 && filteredStudents.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-10">لَا تُوجَدُ نَتَائِجُ مُطَابِقَةٌ لِبَحْثِكَ.</p>
            )}

            <div className="space-y-3">
              {filteredStudents.map(s => {
                const avg = Math.round((s.speaking + s.writing + s.selfLearning) / 3);
                const avgColor = avg >= 70 ? "#1a5c2a" : avg >= 50 ? "#d97706" : "#dc2626";
                return (
                  <div key={s.key} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{s.avatar}</span>
                        <div className="text-right">
                          <p className="font-bold">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.grade} · {s.stars} ⭐ · {s.points} نُقْطَةٌ</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold" style={{ color: avgColor }}>{avg}%</span>
                    </div>
                    {[
                      { label: "تَحَدُّثٌ", val: s.speaking, color: "#1a5c2a" },
                      { label: "كِتَابَةٌ", val: s.writing, color: "#b45309" },
                      { label: "تَعَلُّمٌ ذَاتِيٌّ", val: s.selfLearning, color: "#1d4ed8" },
                    ].map(skill => (
                      <div key={skill.label} className="mb-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>{skill.val}%</span>
                          <span>{skill.label}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-2 rounded-full transition-all" style={{ width: `${skill.val}%`, background: skill.color }} />
                        </div>
                      </div>
                    ))}
                    {s.teacherComment && (
                      <p className="text-xs bg-gray-50 rounded-lg p-2 text-right text-gray-600 mt-2">💬 {s.teacherComment}</p>
                    )}
                    {/* Teacher comment + report area */}
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => { setSelectedStudent(selectedStudent?.key === s.key ? null : s); setComment(s.teacherComment); }}
                        className="text-xs px-3 py-1 rounded-full border font-bold transition-all hover:bg-green-50"
                        style={{ borderColor: "#1a5c2a", color: "#1a5c2a" }}>
                        💬 {s.teacherComment ? "تَعْدِيلُ التَّعْلِيقِ" : "إِضَافَةُ تَعْلِيقٍ"}
                      </button>
                      <button onClick={() => handleDownloadReport(s)} disabled={downloadingReport === s.key}
                        className="text-xs px-3 py-1 rounded-full border font-bold transition-all hover:bg-blue-50 disabled:opacity-50"
                        style={{ borderColor: "#1d4ed8", color: "#1d4ed8" }}>
                        {downloadingReport === s.key ? "⏳ جَارٍ التَّحْمِيلُ..." : "📄 تَحْمِيلُ تَقْرِيرٍ"}
                      </button>
                    </div>
                    {selectedStudent?.key === s.key && (
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => saveComment(s)} disabled={savingComment}
                          className="px-3 py-1 bg-green-700 text-white rounded-lg text-xs font-bold disabled:opacity-50">
                          {savingComment ? "..." : "حِفْظٌ"}
                        </button>
                        <input
                          value={comment} onChange={e => setComment(e.target.value)}
                          placeholder="اكْتُبْ تَعْلِيقَكَ..."
                          className="flex-1 px-3 py-1 rounded-lg border text-right text-sm focus:outline-none"
                          style={{ fontFamily: "'Cairo', sans-serif" }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── REVIEWS ── */}
        {tab === "reviews" && (
          <div>
            {/* ── استبيان SUS (أداة التقييم العلمية) ── */}
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-5 border-2" style={{ borderColor: "#dcf5e7" }}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-sm" style={{ color: "#1a5c2a" }}>📋 استبيان قابلية الاستخدام (SUS)</h3>
                <a
                  href={`${API_BASE}/sus/export`}
                  target="_blank" rel="noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg border-2 font-bold"
                  style={{ borderColor: "#1a5c2a", color: "#1a5c2a" }}
                >
                  ⬇️ تصدير البيانات الكاملة (JSON)
                </a>
              </div>
              {!susSummary || susSummary.count === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">لَا تُوجَدُ إِجَابَاتٌ عَلَى الِاسْتِبْيَانِ بَعْدُ.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-gray-50 rounded-xl p-2">
                    <p className="text-2xl font-bold" style={{ color: "#1a5c2a" }}>{susSummary.average}</p>
                    <p className="text-[10px] text-gray-400">مُتَوَسِّطُ SUS</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2">
                    <p className="text-2xl font-bold text-gray-600">{susSummary.count}</p>
                    <p className="text-[10px] text-gray-400">عَدَدُ الْمُشَارِكِينَ</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-2">
                    <p className="text-2xl font-bold text-green-600">{susSummary.bands.good}</p>
                    <p className="text-[10px] text-gray-400">جَيِّدٌ (70+)</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-2">
                    <p className="text-2xl font-bold text-red-500">{susSummary.bands.poor}</p>
                    <p className="text-[10px] text-gray-400">يَحْتَاجُ تَحْسِينًا (أقل من 50)</p>
                  </div>
                </div>
              )}
            </div>

            <h3 className="font-bold text-sm text-gray-500 mb-2">⭐ التقييمات القديمة (نجوم بسيطة)</h3>
            {(() => {
              const n = reviews.length;
              const avg = (key: "quality"|"ease"|"benefit") =>
                n ? (reviews.reduce((s, r) => s + (r[key] || 0), 0) / n) : 0;
              const avgQuality = avg("quality");
              const avgEase = avg("ease");
              const avgBenefit = avg("benefit");
              const avgOverall = n ? (avgQuality + avgEase + avgBenefit) / 3 : 0;
              const kpis = [
                { label: "الْمُتَوَسِّطُ الْعَامُّ", value: n ? avgOverall.toFixed(1) : "—", icon: "🏆" },
                { label: "جَوْدَةُ الْمُحْتَوَى", value: n ? avgQuality.toFixed(1) : "—", icon: "⭐" },
                { label: "سُهُولَةُ الِاسْتِخْدَامِ", value: n ? avgEase.toFixed(1) : "—", icon: "🖱️" },
                { label: "مُتَوَسِّطُ الْفَائِدَةِ", value: n ? avgBenefit.toFixed(1) : "—", icon: "📚" },
              ];
              return (
                <>
                  {/* Summary KPIs */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {kpis.map(k => (
                      <div key={k.label} className="bg-white rounded-2xl p-4 text-center shadow-sm">
                        <div className="text-2xl mb-1">{k.icon}</div>
                        <p className="text-3xl font-bold" style={{ color: "#1a5c2a" }}>{k.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{k.label}</p>
                        <p className="text-xs text-gray-400">مِنْ 5</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end mb-3">
                    <button onClick={refreshReviews} disabled={reviewsLoading}
                      className="text-xs px-3 py-1.5 rounded-lg border-2 font-bold disabled:opacity-50"
                      style={{ borderColor: "#1a5c2a", color: "#1a5c2a" }}>
                      {reviewsLoading ? "⏳ جَارٍ التَّحْدِيثُ..." : "🔄 تَحْدِيثٌ"}
                    </button>
                  </div>

                  {reviewsLoading && (
                    <p className="text-center text-gray-400 text-sm py-10">⏳ جَارٍ تَحْمِيلُ التَّقْيِيمَاتِ...</p>
                  )}

                  {!reviewsLoading && n === 0 && (
                    <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                      <p className="text-4xl mb-2">⭐</p>
                      <p className="font-bold text-gray-600">لَا تُوجَدُ تَقْيِيمَاتٌ بَعْدُ</p>
                      <p className="text-xs text-gray-400 mt-1">سَتَظْهَرُ هُنَا تِلْقَائِيًّا عِنْدَمَا يُقَيِّمُ الطُّلَّابُ الْمَنْصَةَ مِنْ صَفْحَتِهِمِ الرَّئِيسِيَّةِ.</p>
                    </div>
                  )}

                  {/* Reviews list */}
                  <div className="space-y-3">
                    {reviews.slice().reverse().map(r => (
                      <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-xs text-gray-400">{r.date}</p>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{r.student}</span>
                            <span className="text-gray-400">👤</span>
                          </div>
                        </div>
                        <div className="flex gap-4 justify-end mb-2">
                          {[
                            { label: "جَوْدَةٌ", val: r.quality },
                            { label: "سُهُولَةٌ", val: r.ease },
                            { label: "فَائِدَةٌ", val: r.benefit },
                          ].map(x => (
                            <div key={x.label} className="text-center">
                              <p className="text-xs text-gray-400 mb-1">{x.label}</p>
                              <StarRating value={x.val} />
                            </div>
                          ))}
                        </div>
                        {r.comment && (
                          <div className="bg-amber-50 rounded-xl px-4 py-2 text-right border-r-4" style={{ borderColor: "#f5c842" }}>
                            <p className="text-sm text-gray-700">"{r.comment}"</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* ── LESSONS ── */}
        {tab === "lessons" && (
          <div className="space-y-4">
            {/* Sub-tabs */}
            <div className="flex gap-2 flex-wrap bg-white rounded-2xl p-2 shadow-sm">
              {[
                { id: "speaking", label: "🎙️ التَّحَدُّثُ", color: "#1a5c2a" },
                { id: "writing",  label: "✏️ الْكِتَابَةُ", color: "#b45309" },
                { id: "self",     label: "🧠 التَّعَلُّمُ الذَّاتِيُّ", color: "#1d4ed8" },
                { id: "games",    label: "🎮 أَلْعَابُ الْهَمْزَةِ", color: "#ea580c" },
                { id: "dictation",label: "🦋 رِحْلَةُ الإِمْلَاءِ", color: "#7c3aed" },
              ].map(t => (
                <button key={t.id} onClick={() => setLessonsTab(t.id as any)}
                  className="flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all"
                  style={{ background: lessonsTab === t.id ? t.color : "transparent", color: lessonsTab === t.id ? "#fff" : "#6b7280", minWidth: 100 }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── التحدث ── */}
            {lessonsTab === "speaking" && (
              <div className="rounded-2xl p-4" style={{ background: "#dcf5e7", border: "1px solid #86efac" }}>
                <div className="flex justify-between items-center mb-3">
                  <button onClick={() => { setLessonModal({type:"speaking", item:null}); setLessonForm({}); }}
                    className="text-xs px-3 py-1.5 rounded-lg text-white font-bold" style={{ background: "#1a5c2a" }}>+ دَرْسٌ جَدِيدٌ</button>
                  <h3 className="font-bold text-lg" style={{ color: "#1a5c2a" }}>🎙️ دُرُوسُ التَّحَدُّثِ</h3>
                </div>
                <div className="space-y-2">
                  {speakingLessons.map((l: any) => (
                    <div key={l.id} className="bg-white rounded-xl p-3 flex justify-between items-center">
                      <div className="flex gap-2">
                        <button onClick={() => handleDeleteSpeaking(l.id)} className="text-xs px-2 py-1 bg-red-50 text-red-500 rounded-lg">🗑️</button>
                        <button onClick={() => { setLessonModal({type:"speaking", item:l}); setLessonForm({...l, topics: l.topics?.join("، ")}); }}
                          className="text-xs px-2 py-1 bg-green-50 rounded-lg" style={{ color: "#1a5c2a" }}>✏️ تَعْدِيلٌ</button>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm" style={{ color: "#1a5c2a" }}>{l.icon} {l.title}</p>
                        <p className="text-xs text-gray-400">{l.level} • {l.topics?.length || 0} مَوَاضِيعُ</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── الكتابة ── */}
            {lessonsTab === "writing" && (
              <div className="rounded-2xl p-4" style={{ background: "#fef3e2", border: "1px solid #fcd34d" }}>
                <div className="flex justify-between items-center mb-3">
                  <button onClick={() => { setLessonModal({type:"writing", item:null}); setLessonForm({}); }}
                    className="text-xs px-3 py-1.5 rounded-lg text-white font-bold bg-amber-600">+ مَوْضُوعٌ جَدِيدٌ</button>
                  <h3 className="font-bold text-lg text-amber-800">✏️ مَوَاضِيعُ الْكِتَابَةِ</h3>
                </div>
                <div className="space-y-2">
                  {writingTopics.map((t: any) => (
                    <div key={t.id} className="bg-white rounded-xl p-3 flex justify-between items-center">
                      <div className="flex gap-2">
                        <button onClick={() => handleDeleteWriting(t.id)} className="text-xs px-2 py-1 bg-red-50 text-red-500 rounded-lg">🗑️</button>
                        <button onClick={() => { setLessonModal({type:"writing", item:t}); setLessonForm({...t, hints: t.hints?.join("، ")}); }}
                          className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-lg">✏️ تَعْدِيلٌ</button>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-amber-800">{t.icon} {t.title}</p>
                        <p className="text-xs text-gray-400">{t.hints?.length || 0} تَلْمِيحَاتٌ</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── التعلم الذاتي ── */}
            {lessonsTab === "self" && (
              <div className="space-y-4">
                {/* Header */}
                <div className="rounded-2xl p-4 text-right" style={{ background: "linear-gradient(135deg, #1d4ed8, #2563eb)" }}>
                  <h2 className="text-white font-bold text-xl">🧠 مَهَارَةُ التَّعَلُّمِ الذَّاتِيِّ</h2>
                  <p className="text-blue-200 text-sm mt-1">أَسْئِلَةٌ تَفَاعُلِيَّةٌ — اضْغَطْ عَلَى أَيِّ سُؤَالٍ لِتَعْدِيلِهِ أَوْ أَضِفْ جَدِيدًا</p>
                  <div className="flex gap-3 mt-3">
                    <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">🧠 {(slData.quiz||[]).length} سُؤَالَ اخْتِبَارٍ</span>
                    <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">🔤 {(slData.word_order||[]).length} تَرْتِيبَ كَلِمَاتٍ</span>
                    <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">✏️ {(slData.fill_in||[]).length} إِكْمَالَ جُمْلَةٍ</span>
                  </div>
                </div>
                {/* Quiz */}
                <div className="rounded-2xl p-4" style={{ background: "#dbeafe", border: "1px solid #93c5fd" }}>
                  <div className="flex justify-between items-center mb-3">
                    <button onClick={() => { setSlModal({type:"quiz", idx:null}); setSlForm({}); }}
                      className="text-xs px-3 py-1.5 rounded-lg text-white font-bold bg-blue-700">+ سُؤَالٌ جَدِيدٌ</button>
                    <h3 className="font-bold text-lg text-blue-800">🧠 أَسْئِلَةُ الِاخْتِبَارِ</h3>
                  </div>
                  <div className="space-y-2">
                    {(slData.quiz || []).map((q: any, i: number) => (
                      <div key={i} className="bg-white rounded-xl p-3 text-right">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex gap-2">
                            <button onClick={async () => { if (!confirm("حذف؟")) return; await deleteQuizQuestion(i); refreshSL(); }}
                              className="text-xs px-2 py-1 bg-red-50 text-red-500 rounded-lg">🗑️</button>
                            <button onClick={() => { setSlModal({type:"quiz", idx:i}); setSlForm({...q, options: q.options?.join("، ")}); }}
                              className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-lg">✏️</button>
                          </div>
                          <p className="font-bold text-sm text-blue-800">{q.q}</p>
                        </div>
                        <p className="text-xs text-gray-400">✅ {q.options?.[q.correct]}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Word Order */}
                <div className="rounded-2xl p-4" style={{ background: "#dcf5e7", border: "1px solid #86efac" }}>
                  <div className="flex justify-between items-center mb-3">
                    <button onClick={() => { setSlModal({type:"order", idx:null}); setSlForm({}); }}
                      className="text-xs px-3 py-1.5 rounded-lg text-white font-bold" style={{ background: "#1a5c2a" }}>+ سُؤَالٌ جَدِيدٌ</button>
                    <h3 className="font-bold text-lg" style={{ color: "#1a5c2a" }}>🔤 تَرْتِيبُ الْكَلِمَاتِ</h3>
                  </div>
                  <div className="space-y-2">
                    {(slData.word_order || []).map((q: any, i: number) => (
                      <div key={i} className="bg-white rounded-xl p-3 text-right">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex gap-2">
                            <button onClick={async () => { if (!confirm("حذف؟")) return; await deleteWordOrder(i); refreshSL(); }}
                              className="text-xs px-2 py-1 bg-red-50 text-red-500 rounded-lg">🗑️</button>
                            <button onClick={() => { setSlModal({type:"order", idx:i}); setSlForm({...q, words: q.words?.join("، ")}); }}
                              className="text-xs px-2 py-1 bg-green-50 rounded-lg" style={{ color: "#1a5c2a" }}>✏️</button>
                          </div>
                          <p className="font-bold text-sm" style={{ color: "#1a5c2a" }}>{q.answer}</p>
                        </div>
                        <p className="text-xs text-gray-400">{q.words?.join(" — ")}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Fill In */}
                <div className="rounded-2xl p-4" style={{ background: "#f3e8ff", border: "1px solid #d8b4fe" }}>
                  <div className="flex justify-between items-center mb-3">
                    <button onClick={() => { setSlModal({type:"fill", idx:null}); setSlForm({}); }}
                      className="text-xs px-3 py-1.5 rounded-lg text-white font-bold bg-purple-700">+ سُؤَالٌ جَدِيدٌ</button>
                    <h3 className="font-bold text-lg text-purple-800">✏️ أَكْمِلِ الْجُمْلَةَ</h3>
                  </div>
                  <div className="space-y-2">
                    {(slData.fill_in || []).map((q: any, i: number) => (
                      <div key={i} className="bg-white rounded-xl p-3 text-right">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex gap-2">
                            <button onClick={async () => { if (!confirm("حذف؟")) return; await deleteFillIn(i); refreshSL(); }}
                              className="text-xs px-2 py-1 bg-red-50 text-red-500 rounded-lg">🗑️</button>
                            <button onClick={() => { setSlModal({type:"fill", idx:i}); setSlForm({...q}); }}
                              className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-lg">✏️</button>
                          </div>
                          <p className="font-bold text-sm text-purple-800">{q.sentence}</p>
                        </div>
                        <p className="text-xs text-gray-400">الإجابة: {q.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── أَلْعَابُ الْهَمْزَةِ ── */}
            {lessonsTab === "games" && (
              <div className="space-y-4">
                {/* Header */}
                <div className="rounded-2xl p-4 text-right" style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)" }}>
                  <h2 className="text-white font-bold text-xl">🎮 أَلْعَابُ الْهَمْزَةِ</h2>
                  <p className="text-white/60 text-sm mt-1">
                    ٣ رَحَلَاتٍ تَفَاعُلِيَّةٍ — عَدِّلِ الْكَلِمَاتِ وَالْخِيَارَاتِ وَالتَّعْلِيلَاتِ، وَتَظْهَرُ التَّعْدِيلَاتُ فَوْرًا لَدَى الطَّالِبِ
                  </p>
                  {/* Journey selector */}
                  <div className="flex gap-2 mt-3">
                    {(Object.keys(HAMZA_JOURNEYS) as Array<"l1"|"l2"|"l3">).map(id => {
                      const j = HAMZA_JOURNEYS[id];
                      return (
                        <button key={id} onClick={() => setGamesLesson(id)}
                          className="flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all"
                          style={{ background: gamesLesson === id ? j.color : "rgba(255,255,255,0.1)", color: "white" }}>
                          {j.icon} {j.title}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── تفاصيل الرحلة المختارة ── */}
                {(() => {
                  const meta = HAMZA_JOURNEYS[gamesLesson];
                  const content = journeysContent?.[gamesLesson];
                  const fields = FIELD_DEFS[gamesLesson];
                  return (
                    <div className="space-y-3">
                      {/* بطاقة الرحلة + رابط المعاينة + إعادة الافتراضي */}
                      <div className="rounded-2xl overflow-hidden shadow-md">
                        <div className="p-4 flex items-center gap-3" style={{ background: meta.bg }}>
                          <span className="text-4xl">{meta.icon}</span>
                          <div className="text-right flex-1">
                            <h3 className="text-white font-bold text-lg leading-snug">{meta.title}</h3>
                            <p className="text-white/70 text-sm mt-0.5">{meta.sub}</p>
                          </div>
                        </div>
                        <div className="bg-white p-3 flex justify-between items-center gap-2">
                          <button onClick={() => setLocation(meta.route)}
                            className="text-xs px-3 py-1.5 rounded-lg text-white font-bold"
                            style={{ background: meta.color }}>
                            👁️ مُعَايَنَةٌ كَمَا يَرَاهَا الطَّالِبُ
                          </button>
                          <button onClick={handleResetJourney}
                            className="text-xs px-3 py-1.5 rounded-lg text-red-600 font-bold border-2 border-red-200">
                            ↺ إِعَادَةٌ لِلِافْتِرَاضِيِّ
                          </button>
                        </div>
                      </div>

                      {journeysLoading && (
                        <p className="text-center text-gray-400 text-sm py-8">⏳ جَارٍ تَحْمِيلُ الْمُحْتَوَى...</p>
                      )}

                      {!journeysLoading && !content && (
                        <p className="text-center text-red-400 text-sm py-8">⚠️ تَعَذَّرَ تَحْمِيلُ مُحْتَوَى هَذِهِ الرِّحْلَةِ مِنَ الْخَادِمِ.</p>
                      )}

                      {/* الحقول القابلة للتعديل */}
                      {!journeysLoading && content && fields.map(field => {
                        const value = content[field.key];
                        return (
                          <div key={field.key} className="rounded-2xl p-4" style={{ background: "#f5f0e8", border: "1px solid #e5e7eb" }}>
                            <div className="flex justify-between items-center mb-3 gap-2">
                              <button onClick={() => openJourneyEdit(field)}
                                className="text-xs px-3 py-1 rounded-lg text-white font-bold shrink-0"
                                style={{ background: meta.color }}>
                                ✏️ تَعْدِيلٌ
                              </button>
                              <h4 className="font-bold text-sm text-right" style={{ color: meta.color }}>{field.label}</h4>
                            </div>

                            {field.kind === "text" && (
                              <p className="text-sm text-gray-700 text-right leading-relaxed bg-white rounded-xl px-3 py-2"
                                style={{ fontFamily: "'Amiri',serif" }}>{value}</p>
                            )}

                            {field.kind === "textList" && (
                              <div className="space-y-1.5">
                                {(value as string[] ?? []).map((t, i) => (
                                  <p key={i} className="text-sm text-gray-700 text-right bg-white rounded-xl px-3 py-2"
                                    style={{ fontFamily: "'Amiri',serif" }}>{t}</p>
                                ))}
                              </div>
                            )}

                            {field.kind === "options" && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(value as any[] ?? []).map((op, i) => (
                                  <div key={i} className="bg-white rounded-xl px-3 py-2 text-right flex items-center justify-between gap-2">
                                    <span className="text-sm font-bold" style={{ fontFamily: "'Amiri',serif", color: "#374151" }}>{op.label ?? op.text}</span>
                                    <span>{op.correct ? "✅" : "❌"}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {field.kind === "pairs" && (
                              <div className="space-y-2">
                                {(value as any[][] ?? []).map((pair, i) => (
                                  <div key={i} className="flex gap-2">
                                    {pair.map((op: any, j: number) => (
                                      <div key={j} className="flex-1 bg-white rounded-xl px-3 py-2 text-right flex items-center justify-between gap-2">
                                        <span className="text-sm font-bold" style={{ fontFamily: "'Amiri',serif", color: "#374151" }}>{op.label ?? op.text}</span>
                                        <span>{op.correct ? "✅" : "❌"}</span>
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* ── Modal تعديل حقل من رحلة الهمزة ── */}
                {journeyEditModal && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={() => setJourneyEditModal(null)}>
                    <div className="bg-white rounded-2xl p-4 w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                      <h3 className="font-bold text-base text-right mb-3">{journeyEditModal.label}</h3>

                      {journeyEditModal.kind === "text" && (
                        <textarea value={journeyEditForm ?? ""} onChange={e => setJourneyEditForm(e.target.value)}
                          className="w-full border-2 border-gray-200 rounded-xl p-3 text-right text-sm" rows={4}
                          style={{ fontFamily: "'Amiri',serif" }} />
                      )}

                      {journeyEditModal.kind === "textList" && (
                        <div className="space-y-2">
                          {((journeyEditForm ?? []) as string[]).map((t, i) => (
                            <textarea key={i} value={t} rows={2}
                              onChange={e => setJourneyEditForm((prev: string[]) => prev.map((x, idx) => idx === i ? e.target.value : x))}
                              className="w-full border-2 border-gray-200 rounded-xl p-2 text-right text-sm" style={{ fontFamily: "'Amiri',serif" }} />
                          ))}
                        </div>
                      )}

                      {journeyEditModal.kind === "options" && (
                        <div className="space-y-2">
                          {((journeyEditForm ?? []) as any[]).map((op, i) => {
                            const fieldName = op.label !== undefined ? "label" : "text";
                            return (
                              <div key={i} className="flex items-center gap-2">
                                <input type="radio" name="correct-option" checked={!!op.correct}
                                  onChange={() => setJourneyEditForm((prev: any[]) => prev.map((x, idx) => ({ ...x, correct: idx === i })))} />
                                <input value={op[fieldName]}
                                  onChange={e => setJourneyEditForm((prev: any[]) => prev.map((x, idx) => idx === i ? { ...x, [fieldName]: e.target.value } : x))}
                                  className="flex-1 border-2 border-gray-200 rounded-xl p-2 text-right text-sm" style={{ fontFamily: "'Amiri',serif" }} />
                              </div>
                            );
                          })}
                          <p className="text-xs text-gray-400 text-right">✓ حَدِّدِ الدَّائِرَةَ أَمَامَ الْإِجَابَةِ الصَّحِيحَةِ</p>
                        </div>
                      )}

                      {journeyEditModal.kind === "pairs" && (
                        <div className="space-y-3">
                          {((journeyEditForm ?? []) as any[][]).map((pair, pi) => (
                            <div key={pi} className="border border-gray-200 rounded-xl p-2 space-y-1">
                              {pair.map((op: any, oi: number) => {
                                const fieldName = op.label !== undefined ? "label" : "text";
                                return (
                                  <div key={oi} className="flex items-center gap-2">
                                    <input type="radio" name={`pair-${pi}`} checked={!!op.correct}
                                      onChange={() => setJourneyEditForm((prev: any[][]) => prev.map((p, pidx) => pidx === pi ? p.map((x, oidx) => ({ ...x, correct: oidx === oi })) : p))} />
                                    <input value={op[fieldName]}
                                      onChange={e => setJourneyEditForm((prev: any[][]) => prev.map((p, pidx) => pidx === pi ? p.map((x, oidx) => oidx === oi ? { ...x, [fieldName]: e.target.value } : x) : p))}
                                      className="flex-1 border-2 border-gray-200 rounded-xl p-2 text-right text-sm" style={{ fontFamily: "'Amiri',serif" }} />
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                          <p className="text-xs text-gray-400 text-right">✓ حَدِّدِ الدَّائِرَةَ أَمَامَ الْكَلِمَةِ الصَّحِيحَةِ إِمْلَائِيًّا فِي كُلِّ زَوْجٍ</p>
                        </div>
                      )}

                      <div className="flex gap-2 mt-4">
                        <button onClick={() => setJourneyEditModal(null)}
                          className="flex-1 py-2 border-2 border-gray-200 rounded-xl text-gray-500 font-bold">إِلْغَاءٌ</button>
                        <button onClick={saveJourneyField} disabled={journeySaving}
                          className="flex-1 py-2 rounded-xl text-white font-bold bg-green-700 disabled:opacity-50">
                          {journeySaving ? "..." : "💾 حِفْظٌ"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}



            {/* ── رحلة الإملاء ── */}
            {lessonsTab === "dictation" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <button onClick={() => { setDictationModal({idx:null}); setDictationForm({}); }}
                    className="text-xs px-3 py-1.5 rounded-lg text-white font-bold" style={{ background: "#7c3aed" }}>+ سُؤَالٌ جَدِيدٌ</button>
                  <h3 className="font-bold text-lg text-purple-800">🦋 أَسْئِلَةُ رِحْلَةِ الإِمْلَاءِ ({dictationQuestions.length})</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dictationQuestions.map((q: any, i: number) => (
                    <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                      <div className="h-24 overflow-hidden">
                        <img src={q.img} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="p-3 text-right">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex gap-1">
                            <button onClick={() => deleteDictation(i)} className="text-xs px-1.5 py-0.5 bg-red-50 text-red-500 rounded">🗑️</button>
                            <button onClick={() => { setDictationModal({idx:i}); setDictationForm({...q, opts: q.opts?.join("، ")}); }}
                              className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded">✏️</button>
                          </div>
                          <p className="font-bold text-base" style={{ fontFamily: "'Amiri', serif" }}>{q.word}</p>
                        </div>
                        <p className="text-xs text-purple-600 font-bold">{q.type}</p>
                        <p className="text-xs text-gray-400 mt-0.5">✅ {q.correct}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Dictation Modal */}
                {dictationModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}
                    onClick={() => setDictationModal(null)}>
                    <div className="bg-white rounded-2xl p-5 w-full mx-4 shadow-2xl overflow-y-auto" style={{ maxWidth: 480, maxHeight: "90vh" }}
                      onClick={e => e.stopPropagation()} dir="rtl">
                      <h3 className="font-bold text-lg mb-4 text-purple-800">
                        {dictationModal.idx !== null ? "✏️ تَعْدِيلُ سُؤَالٍ" : "➕ سُؤَالٌ جَدِيدٌ"}
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">الْكَلِمَةُ (مع تشكيل) *</label>
                          <input value={dictationForm.word||""} onChange={e => setDictationForm((p:any)=>({...p,word:e.target.value}))}
                            className="w-full px-3 py-2 border-2 rounded-xl text-right focus:outline-none focus:border-purple-400"
                            placeholder="مثل: بِئْرٌ" style={{fontFamily:"'Amiri',serif",fontSize:"1.1rem"}} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">نَوْعُ الْهَمْزَةِ</label>
                          <select value={dictationForm.type||""} onChange={e => setDictationForm((p:any)=>({...p,type:e.target.value}))}
                            className="w-full px-3 py-2 border-2 rounded-xl text-right focus:outline-none focus:border-purple-400">
                            <option value="">اختر...</option>
                            <option value="الْهَمْزَةُ الْمُتَوَسِّطَةُ">الهمزة المتوسطة</option>
                            <option value="الْهَمْزَةُ الْمُتَطَرِّفَةُ">الهمزة المتطرفة</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">الْخِيَارَاتُ (افصل بـ ،) *</label>
                          <textarea value={dictationForm.opts||""} onChange={e => setDictationForm((p:any)=>({...p,opts:e.target.value}))}
                            className="w-full px-3 py-2 border-2 rounded-xl text-right focus:outline-none focus:border-purple-400 resize-none"
                            rows={2} placeholder="خيار١، خيار٢، خيار٣، خيار٤" style={{fontFamily:"'Amiri',serif"}} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">الإِجَابَةُ الصَّحِيحَةُ *</label>
                          <input value={dictationForm.correct||""} onChange={e => setDictationForm((p:any)=>({...p,correct:e.target.value}))}
                            className="w-full px-3 py-2 border-2 rounded-xl text-right focus:outline-none focus:border-purple-400"
                            placeholder="الكلمة الصحيحة" style={{fontFamily:"'Amiri',serif"}} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">التَّلْمِيحُ</label>
                          <input value={dictationForm.hint||""} onChange={e => setDictationForm((p:any)=>({...p,hint:e.target.value}))}
                            className="w-full px-3 py-2 border-2 rounded-xl text-right focus:outline-none focus:border-purple-400"
                            placeholder="سبب كتابة الهمزة..." style={{fontFamily:"'Cairo',sans-serif"}} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">رَابِطُ الصُّورَةِ</label>
                          <input value={dictationForm.img||""} onChange={e => setDictationForm((p:any)=>({...p,img:e.target.value}))}
                            className="w-full px-3 py-2 border-2 rounded-xl text-right focus:outline-none focus:border-purple-400 text-xs"
                            placeholder="https://..." />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => setDictationModal(null)}
                          className="flex-1 py-2 border-2 border-gray-200 rounded-xl text-gray-500 font-bold">إِلْغَاءٌ</button>
                        <button onClick={saveDictation}
                          className="flex-1 py-2 rounded-xl text-white font-bold bg-purple-700">💾 حِفْظٌ</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal التعلم الذاتي */}
            {slModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}
                onClick={() => setSlModal(null)}>
                <div className="bg-white rounded-2xl p-6 w-full mx-4 shadow-2xl overflow-y-auto" style={{ maxWidth: 480, maxHeight: "90vh" }}
                  onClick={e => e.stopPropagation()} dir="rtl">
                  <h3 className="font-bold text-lg mb-4 text-right text-blue-800">
                    {slModal.idx !== null ? "✏️ تَعْدِيلٌ" : "➕ إِضَافَةٌ"} — {slModal.type === "quiz" ? "سُؤَالُ اخْتِبَارٍ" : slModal.type === "order" ? "تَرْتِيبُ كَلِمَاتٍ" : "إِكْمَالُ جُمْلَةٍ"}
                  </h3>
                  <div className="space-y-3">
                    {slModal.type === "quiz" && (<>
                      <div>
                        <label className="text-sm text-gray-600 block mb-1">نَصُّ السُّؤَالِ *</label>
                        <input value={slForm.q || ""} onChange={e => setSlForm((p:any) => ({...p, q: e.target.value}))}
                          className="w-full px-3 py-2 border-2 rounded-xl text-right focus:outline-none focus:border-blue-400"
                          placeholder="اكتب السؤال..." style={{ fontFamily: "'Cairo', sans-serif" }} />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 block mb-1">الْخِيَارَاتُ (افصل بـ ،) *</label>
                        <textarea value={slForm.options || ""} onChange={e => setSlForm((p:any) => ({...p, options: e.target.value}))}
                          className="w-full px-3 py-2 border-2 rounded-xl text-right focus:outline-none focus:border-blue-400 resize-none"
                          rows={2} placeholder="خيار ١، خيار ٢، خيار ٣، خيار ٤" style={{ fontFamily: "'Cairo', sans-serif" }} />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 block mb-1">رَقْمُ الإِجَابَةِ الصَّحِيحَةِ (يبدأ من ٠)</label>
                        <input type="number" min="0" max="3" value={slForm.correct ?? 0}
                          onChange={e => setSlForm((p:any) => ({...p, correct: parseInt(e.target.value)}))}
                          className="w-full px-3 py-2 border-2 rounded-xl text-right focus:outline-none focus:border-blue-400" />
                      </div>
                    </>)}
                    {slModal.type === "order" && (<>
                      <div>
                        <label className="text-sm text-gray-600 block mb-1">الْكَلِمَاتُ (افصل بـ ،) *</label>
                        <input value={slForm.words || ""} onChange={e => setSlForm((p:any) => ({...p, words: e.target.value}))}
                          className="w-full px-3 py-2 border-2 rounded-xl text-right focus:outline-none focus:border-green-400"
                          placeholder="كلمة١، كلمة٢، كلمة٣" style={{ fontFamily: "'Cairo', sans-serif" }} />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 block mb-1">الْجُمْلَةُ الصَّحِيحَةُ *</label>
                        <input value={slForm.answer || ""} onChange={e => setSlForm((p:any) => ({...p, answer: e.target.value}))}
                          className="w-full px-3 py-2 border-2 rounded-xl text-right focus:outline-none focus:border-green-400"
                          placeholder="الجملة الصحيحة كاملة" style={{ fontFamily: "'Cairo', sans-serif" }} />
                      </div>
                    </>)}
                    {slModal.type === "fill" && (<>
                      <div>
                        <label className="text-sm text-gray-600 block mb-1">الْجُمْلَةُ (ضع ________ مكان الفراغ) *</label>
                        <textarea value={slForm.sentence || ""} onChange={e => setSlForm((p:any) => ({...p, sentence: e.target.value}))}
                          className="w-full px-3 py-2 border-2 rounded-xl text-right focus:outline-none focus:border-purple-400 resize-none"
                          rows={2} placeholder="الجملة مع ________ مكان الفراغ" style={{ fontFamily: "'Cairo', sans-serif" }} />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 block mb-1">الإِجَابَةُ *</label>
                        <input value={slForm.answer || ""} onChange={e => setSlForm((p:any) => ({...p, answer: e.target.value}))}
                          className="w-full px-3 py-2 border-2 rounded-xl text-right focus:outline-none focus:border-purple-400"
                          placeholder="الكلمة الصحيحة" style={{ fontFamily: "'Cairo', sans-serif" }} />
                      </div>
                    </>)}
                  </div>
                  <div className="flex gap-2 mt-5">
                    <button onClick={() => setSlModal(null)}
                      className="flex-1 py-2 border-2 border-gray-200 rounded-xl text-gray-500 font-bold">إِلْغَاءٌ</button>
                    <button onClick={saveSLItem}
                      className="flex-1 py-2 rounded-xl text-white font-bold bg-blue-700">💾 حِفْظٌ</button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}