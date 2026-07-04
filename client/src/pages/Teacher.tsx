import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { getState } from "@/lib/store";
import { DICTATION_QUESTIONS } from "@/lib/dictation-data";
import {
  getSpeakingLessons, addSpeakingLesson, updateSpeakingLesson, deleteSpeakingLesson,
  getWritingTopics, addWritingTopic, updateWritingTopic, deleteWritingTopic,
} from "@/lib/api";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Cell,
} from "recharts";

/* ── Mock Data (matches screenshots) ── */
const MOCK_STUDENTS = [
  { id: 1, name: "أَحْمَدُ بْنُ سَالِمٍ", grade: "الصف السادس", stars: 8, points: 245, avatar: "👦", speaking: 72, writing: 58, selfLearning: 85 },
  { id: 2, name: "فَاطِمَةُ بِنْتُ خَالِدٍ", grade: "الصف السادس", stars: 14, points: 380, avatar: "👧", speaking: 90, writing: 75, selfLearning: 95 },
  { id: 3, name: "مُحَمَّدُ بْنُ عَبْدِاللَّهِ", grade: "الصف السادس", stars: 4, points: 120, avatar: "🧒", speaking: 45, writing: 30, selfLearning: 60 },
  { id: 4, name: "نُورَةُ بِنْتُ سَعِيدٍ", grade: "الصف السادس", stars: 10, points: 290, avatar: "👶", speaking: 65, writing: 80, selfLearning: 70 },
  { id: 5, name: "سَارَةُ بِنْتُ عُمَرَ", grade: "الصف السادس", stars: 6, points: 170, avatar: "👧", speaking: 55, writing: 65, selfLearning: 75 },
];

const MOCK_REVIEWS = [
  { id: 1, student: "أَحْمَدُ بْنُ سَالِمٍ", date: "2024-03-10", quality: 5, ease: 5, benefit: 5, comment: "الْمَنْصَةُ رَائِعَةٌ وَسَهْلَةُ الِاسْتِخْدَامِ" },
  { id: 2, student: "فَاطِمَةُ بِنْتُ خَالِدٍ", date: "2024-03-11", quality: 5, ease: 5, benefit: 5, comment: "أَحْبَبْتُ دُرُوسَ التَّحَدُّثِ كَثِيرًا" },
  { id: 3, student: "نُورَةُ بِنْتُ سَعِيدٍ", date: "2024-03-12", quality: 5, ease: 3, benefit: 5, comment: "الْمُحْتَوَى مُمْتَازٌ وَمُفِيدٌ جِدًّا" },
];

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

function avgSkill(students: typeof MOCK_STUDENTS, key: "speaking"|"writing"|"selfLearning") {
  return Math.round(students.reduce((s, st) => s + st[key], 0) / students.length);
}

function TopStudents({ students }: { students: typeof MOCK_STUDENTS }) {
  const sorted = [...students].sort((a, b) => b.points - a.points).slice(0, 3);
  const medals = ["🥇", "🥈", "🥉"];
  const bgs = ["#fef9e7", "#f5f5f5", "#fff8f0"];
  return (
    <div>
      <h3 className="font-bold text-lg mb-3 text-right" style={{ color: "#b45309" }}>🏆 أَفْضَلُ الطُّلَّابِ أَدَاءً</h3>
      <div className="grid grid-cols-3 gap-2">
        {sorted.map((s, i) => (
          <div key={s.id} className="rounded-2xl p-3 text-center" style={{ background: bgs[i], border: i === 0 ? "2px solid #f5c842" : "1px solid #e5e7eb" }}>
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
  const [tab, setTab] = useState<"overview"|"students"|"reviews"|"lessons"|"dictation">("overview");
  const [speakingLessons, setSpeakingLessons] = useState<any[]>([]);
  const [writingTopics, setWritingTopics] = useState<any[]>([]);
  const [lessonModal, setLessonModal] = useState<{type:"speaking"|"writing"; item:any|null} | null>(null);
  const [lessonForm, setLessonForm] = useState<any>({});

  useEffect(() => {
    getSpeakingLessons().then(d => { if (d) setSpeakingLessons(d); });
    getWritingTopics().then(d => { if (d) setWritingTopics(d); });
  }, []);

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
  const [selectedStudent, setSelectedStudent] = useState<typeof MOCK_STUDENTS[0] | null>(null);
  const [comment, setComment] = useState("");

  const filteredStudents = MOCK_STUDENTS.filter(s =>
    s.name.includes(searchQ) || s.grade.includes(searchQ)
  );

  const avgSpeaking = avgSkill(MOCK_STUDENTS, "speaking");
  const avgWriting = avgSkill(MOCK_STUDENTS, "writing");
  const avgSelf = avgSkill(MOCK_STUDENTS, "selfLearning");
  const avgOverall = Math.round((avgSpeaking + avgWriting + avgSelf) / 3);

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
    { id: "dictation", label: "رِحْلَةُ الإِمْلَاءِ", icon: "🦋" },
  ] as const;

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
                { label: "إِجْمَالِيُّ الطُّلَّابِ", value: MOCK_STUDENTS.length, icon: "👥", color: "#1a5c2a" },
                { label: "مُتَوَسِّطُ الأَدَاءِ", value: `${avgOverall}%`, icon: "📈", color: "#2563eb" },
                { label: "إِجْمَالِيُّ النُّقَاطِ", value: MOCK_STUDENTS.reduce((s,x) => s+x.stars, 0), icon: "⭐", color: "#b45309" },
                { label: "التَّقْيِيمَاتُ الْمُسْتَلَمَةُ", value: MOCK_REVIEWS.length, icon: "💬", color: "#7c3aed" },
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
              <TopStudents students={MOCK_STUDENTS} />
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

            <div className="space-y-3">
              {filteredStudents.map(s => {
                const avg = Math.round((s.speaking + s.writing + s.selfLearning) / 3);
                const avgColor = avg >= 70 ? "#1a5c2a" : avg >= 50 ? "#d97706" : "#dc2626";
                return (
                  <div key={s.id} className="bg-white rounded-2xl p-4 shadow-sm">
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
                    {/* Teacher comment area */}
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => setSelectedStudent(selectedStudent?.id === s.id ? null : s)}
                        className="text-xs px-3 py-1 rounded-full border font-bold transition-all hover:bg-green-50"
                        style={{ borderColor: "#1a5c2a", color: "#1a5c2a" }}>
                        💬 إِضَافَةُ تَعْلِيقٍ
                      </button>
                    </div>
                    {selectedStudent?.id === s.id && (
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => setSelectedStudent(null)}
                          className="px-3 py-1 bg-green-700 text-white rounded-lg text-xs font-bold">
                          حِفْظٌ
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
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { label: "الْمُتَوَسِّطُ الْعَامُّ", value: "4.4", icon: "🏆" },
                { label: "جَوْدَةُ الْمُحْتَوَى", value: "4.7", icon: "⭐" },
                { label: "سُهُولَةُ الِاسْتِخْدَامِ", value: "4.0", icon: "🖱️" },
                { label: "مُتَوَسِّطُ الْفَائِدَةِ", value: "4.7", icon: "📚" },
              ].map(k => (
                <div key={k.label} className="bg-white rounded-2xl p-4 text-center shadow-sm">
                  <div className="text-2xl mb-1">{k.icon}</div>
                  <p className="text-3xl font-bold" style={{ color: "#1a5c2a" }}>{k.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{k.label}</p>
                  <p className="text-xs text-gray-400">مِنْ 5</p>
                </div>
              ))}
            </div>
            {/* Reviews list */}
            <div className="space-y-3">
              {MOCK_REVIEWS.map(r => (
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
                  <div className="bg-amber-50 rounded-xl px-4 py-2 text-right border-r-4" style={{ borderColor: "#f5c842" }}>
                    <p className="text-sm text-gray-700">"{r.comment}"</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LESSONS ── */}
        {tab === "lessons" && (
          <div className="space-y-5">
            {/* Speaking Lessons */}
            <div className="rounded-2xl p-4" style={{ background: "#dcf5e7", border: "1px solid #86efac" }}>
              <div className="flex justify-between items-center mb-3">
                <button onClick={() => { setLessonModal({type:"speaking", item:null}); setLessonForm({}); }}
                  className="text-xs px-3 py-1.5 rounded-lg text-white font-bold" style={{ background: "#1a5c2a" }}>
                  + دَرْسٌ جَدِيدٌ
                </button>
                <h3 className="font-bold text-lg" style={{ color: "#1a5c2a" }}>🎙️ مَهَارَةُ التَّحَدُّثِ</h3>
              </div>
              <div className="space-y-2">
                {speakingLessons.map((l: any) => (
                  <div key={l.id} className="bg-white rounded-xl p-3 flex justify-between items-center">
                    <div className="flex gap-2">
                      <button onClick={() => handleDeleteSpeaking(l.id)}
                        className="text-xs px-2 py-1 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">🗑️</button>
                      <button onClick={() => { setLessonModal({type:"speaking", item:l}); setLessonForm({...l, topics: l.topics?.join("، ")}); }}
                        className="text-xs px-2 py-1 bg-green-50 rounded-lg hover:bg-green-100" style={{ color: "#1a5c2a" }}>✏️ تَعْدِيلٌ</button>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm" style={{ color: "#1a5c2a" }}>{l.icon} {l.title}</p>
                      <p className="text-xs text-gray-400">{l.level} • {l.topics?.length || 0} مَوَاضِيعُ</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Writing Topics */}
            <div className="rounded-2xl p-4" style={{ background: "#fef3e2", border: "1px solid #fcd34d" }}>
              <div className="flex justify-between items-center mb-3">
                <button onClick={() => { setLessonModal({type:"writing", item:null}); setLessonForm({}); }}
                  className="text-xs px-3 py-1.5 rounded-lg text-white font-bold bg-amber-600">
                  + مَوْضُوعٌ جَدِيدٌ
                </button>
                <h3 className="font-bold text-lg text-amber-800">✏️ مَهَارَةُ الْكِتَابَةِ</h3>
              </div>
              <div className="space-y-2">
                {writingTopics.map((t: any) => (
                  <div key={t.id} className="bg-white rounded-xl p-3 flex justify-between items-center">
                    <div className="flex gap-2">
                      <button onClick={() => handleDeleteWriting(t.id)}
                        className="text-xs px-2 py-1 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">🗑️</button>
                      <button onClick={() => { setLessonModal({type:"writing", item:t}); setLessonForm({...t, hints: t.hints?.join("، ")}); }}
                        className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100">✏️ تَعْدِيلٌ</button>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-amber-800">{t.icon} {t.title}</p>
                      <p className="text-xs text-gray-400">{t.hints?.length || 0} تَلْمِيحَاتٌ</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal */}
            {lessonModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}
                onClick={() => setLessonModal(null)}>
                <div className="bg-white rounded-2xl p-6 w-full mx-4 shadow-2xl" style={{ maxWidth: 480 }}
                  onClick={e => e.stopPropagation()} dir="rtl">
                  <h3 className="font-bold text-lg mb-4 text-right" style={{ color: "#1a5c2a" }}>
                    {lessonModal.item ? "✏️ تَعْدِيلٌ" : "➕ إِضَافَةٌ جَدِيدَةٌ"} —{" "}
                    {lessonModal.type === "speaking" ? "دَرْسُ التَّحَدُّثِ" : "مَوْضُوعُ الْكِتَابَةِ"}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">الْعُنْوَانُ *</label>
                      <input value={lessonForm.title || ""} onChange={e => setLessonForm((p:any) => ({...p, title: e.target.value}))}
                        className="w-full px-3 py-2 border-2 rounded-xl text-right focus:outline-none focus:border-green-400"
                        placeholder="عنوان الدرس..." style={{ fontFamily: "'Cairo', sans-serif" }} />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-sm text-gray-600 block mb-1">الأَيْقُونَةُ</label>
                        <input value={lessonForm.icon || ""} onChange={e => setLessonForm((p:any) => ({...p, icon: e.target.value}))}
                          className="w-full px-3 py-2 border-2 rounded-xl text-center focus:outline-none focus:border-green-400"
                          placeholder="🎙️" />
                      </div>
                      {lessonModal.type === "speaking" && (
                        <div className="flex-1">
                          <label className="text-sm text-gray-600 block mb-1">الْمُسْتَوَى</label>
                          <select value={lessonForm.level || "سَهْلٌ"} onChange={e => setLessonForm((p:any) => ({...p, level: e.target.value}))}
                            className="w-full px-3 py-2 border-2 rounded-xl text-right focus:outline-none focus:border-green-400">
                            <option value="سَهْلٌ">سَهْلٌ</option>
                            <option value="مُتَوَسِّطٌ">مُتَوَسِّطٌ</option>
                            <option value="مُتَقَدِّمٌ">مُتَقَدِّمٌ</option>
                          </select>
                        </div>
                      )}
                    </div>
                    {lessonModal.type === "speaking" && (
                      <div>
                        <label className="text-sm text-gray-600 block mb-1">الْوَصْفُ</label>
                        <input value={lessonForm.desc || ""} onChange={e => setLessonForm((p:any) => ({...p, desc: e.target.value}))}
                          className="w-full px-3 py-2 border-2 rounded-xl text-right focus:outline-none focus:border-green-400"
                          placeholder="وصف الدرس..." style={{ fontFamily: "'Cairo', sans-serif" }} />
                      </div>
                    )}
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">
                        {lessonModal.type === "speaking" ? "الْمَوَاضِيعُ (افصل بـ ،)" : "التَّلْمِيحَاتُ (افصل بـ ،)"}
                      </label>
                      <textarea value={lessonModal.type === "speaking" ? (lessonForm.topics || "") : (lessonForm.hints || "")}
                        onChange={e => setLessonForm((p:any) => ({...p, [lessonModal.type === "speaking" ? "topics" : "hints"]: e.target.value}))}
                        className="w-full px-3 py-2 border-2 rounded-xl text-right focus:outline-none focus:border-green-400 resize-none"
                        rows={2} placeholder="موضوع ١، موضوع ٢، ..." style={{ fontFamily: "'Cairo', sans-serif" }} />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-5">
                    <button onClick={() => setLessonModal(null)}
                      className="flex-1 py-2 border-2 border-gray-200 rounded-xl text-gray-500 font-bold hover:bg-gray-50">إِلْغَاءٌ</button>
                    <button onClick={lessonModal.type === "speaking" ? saveSpeakingLesson : saveWritingTopic}
                      className="flex-1 py-2 rounded-xl text-white font-bold" style={{ background: "#1a5c2a" }}>
                      💾 حِفْظٌ
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DICTATION JOURNEY ── */}
        {tab === "dictation" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <button className="text-sm px-4 py-2 rounded-xl border-2 font-bold transition-all hover:bg-green-50"
                style={{ borderColor: "#1a5c2a", color: "#1a5c2a" }}>
                🔄 إِعَادَةُ الضَّبْطِ الِافْتِرَاضِيِّ
              </button>
              <div className="text-right">
                <h2 className="font-bold" style={{ color: "#1a5c2a" }}>🦋 تَعْدِيلُ أَسْئِلَةِ رِحْلَةِ الإِمْلَاءِ</h2>
                <p className="text-xs text-gray-500">{DICTATION_QUESTIONS.length} أَسْئِلَةٌ — اضْغَطْ عَلَى أَيِّ سُؤَالٍ لِتَعْدِيلِهِ</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DICTATION_QUESTIONS.map((q, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group">
                  {/* Visual area */}
                  <div className="h-32 overflow-hidden">
                    <img src={q.img} alt="" className="w-full h-full object-cover" />
                  </div>
                  {/* Info */}
                  <div className="p-3 text-right">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ background: "#f0faf3", color: "#1a5c2a" }}>
                        {q.type}
                      </span>
                      <p className="font-bold text-lg" style={{ fontFamily: "'Amiri', serif" }}>{q.word}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {q.opts.map((opt, j) => (
                        <div key={j} className={`text-sm px-3 py-1.5 rounded-lg text-right ${opt === q.correct ? "font-bold text-white" : "text-gray-500 bg-gray-50"}`}
                          style={opt === q.correct ? { background: "#1a5c2a" } : {}}>
                          {opt === q.correct ? "✅ " : ""}{opt}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1 justify-end">
                      <span>{q.hint}</span>
                      <span>💡</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}