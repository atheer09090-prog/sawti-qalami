import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { evaluateSpeech, diacritizeText, getSpeakingLessons } from "@/lib/api";
import { playSound, stopSound, playEffect, stopAll, audioFile } from "@/lib/audio";
import { setState, getState } from "@/lib/store";

const DEFAULT_LESSONS = [
  { id: "summer", title: "وَصْفُ رِحْلَةٍ صَيْفِيَّةٍ", level: "سَهْلٌ", icon: "🏖️", desc: "تَحَدَّثْ عَنْ عُطْلَتِكَ الصَّيْفِيَّةِ", topics: ["رِحْلَةٌ بَحْرِيَّةٌ", "رِحْلَةٌ جَبَلِيَّةٌ", "صُورَةٌ دَالَّةٌ عَلَى تَعَلُّمٍ", "رِحْلَةٌ جَوِّيَّةٌ"] },
  { id: "earth", title: "قِرَاءَةُ مَنْشُورٍ تَوْعَوِيٍّ — سَاعَةُ الأَرْضِ", level: "مُتَوَسِّطٌ", icon: "🌍", desc: "اقْرَأِ الْمَنْشُورَ وَأَجِبْ عَنِ الأَسْئِلَةِ", topics: [] },
  { id: "opinion", title: "التَّعْبِيرُ عَنِ الرَّأْيِ", level: "مُتَقَدِّمٌ", icon: "💬", desc: "عَبِّرْ عَنْ رَأْيِكَ بِأُسْلُوبٍ لُغَوِيٍّ سَلِيمٍ", topics: [] },
];

const TOPIC_ICONS: Record<string, string> = {
  "رِحْلَةٌ بَحْرِيَّةٌ": "🌊", "رِحْلَةٌ جَبَلِيَّةٌ": "⛰️",
  "صُورَةٌ دَالَّةٌ عَلَى تَعَلُّمٍ": "📚", "رِحْلَةٌ جَوِّيَّةٌ": "✈️",
};

export default function Speaking() {
  const [, setLocation] = useLocation();
  const [enhancedTranscript, setEnhancedTranscript] = useState<string | null>(null);
  const [lessons, setLessons] = useState(DEFAULT_LESSONS);
  const [selectedLesson, setSelectedLesson] = useState<typeof DEFAULT_LESSONS[0] | null>(null);

  useEffect(() => {
    getSpeakingLessons().then(data => { if (data) setLessons(data); });
  }, []);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [recording, setRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Play lesson intro audio when lesson selected — stops any prior sound
  useEffect(() => {
    if (!selectedLesson) {
      stopSound();
      return;
    }
    // Play intro sound — gender aware
    const src = selectedLesson.id === "earth"
      ? "/assets/lesson-earth-hour.mp3"
      : "/assets/lesson-speaking-intro.mp3";
    playSound(audioFile(src), 0.5);
    // No cleanup on unmount — sound persists when navigating
  }, [selectedLesson?.id]);

  // Stop intro sound the moment recording starts
  useEffect(() => {
    if (recording) stopAll();
  }, [recording]);

  async function startRecording() {
    setError(""); setResult(null);
    stopSound(); // Stop intro audio BEFORE recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setLoading(true);
        try {
          const res = await evaluateSpeech(blob, selectedTopic, 0, selectedLesson?.id || "");
          setResult(res);
          if (res.transcript) {
            // Show raw transcript immediately, then enhance with diacritics
            setEnhancedTranscript(res.transcript);
            diacritizeText(res.transcript).then((diacritized) => {
              setEnhancedTranscript(diacritized);
            });
          }
          const score = res.overall || 0;
          const newStars = score >= 90 ? 5 : score >= 70 ? 4 : score >= 50 ? 3 : score >= 30 ? 2 : 1;
          setState((prev) => ({
            ...prev,
            speakingProgress: Math.max(prev.speakingProgress, score),
            stars: Math.max(prev.stars, newStars),
            points: prev.points + Math.round(score / 10),
          }));
          // Play achievement sound if score >= 70
          if ((res.overall || 0) >= 70) {
            playEffect(audioFile("/assets/achievement.mp3"), 0.7);
          } else {
            playEffect(audioFile("/assets/tryagain.mp3"), 0.6);
          }
        } catch {
          setError("تَعَذَّرَ الِاتِّصَالُ بِالْخَادِمِ. تَأَكَّدْ مِنِ اتِّصَالِكَ بِالإِنْتَرْنِتِ.");
        }
        setLoading(false);
      };
      mr.start(1000);
      mediaRef.current = mr;
      setRecording(true); setTimer(0);
      timerRef.current = setInterval(() => {
        setTimer(t => { if (t >= 119) { stopRecording(); return t; } return t + 1; });
      }, 1000);
    } catch {
      setError("تَعَذَّرَ الْوُصُولُ لِلْمِيكْرُوفُونِ. تَأَكَّدْ مِنْ مَنْحِ الإِذْنِ.");
    }
  }

  function stopRecording() {
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (!selectedLesson) return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "#f5f0e8", minHeight: "100vh" }}>
      <div className="p-4" style={{ background: "linear-gradient(135deg, #1a5c2a 0%, #2d7a3e 100%)" }}>
        <div className="flex items-center gap-2 mb-2">
          <img src="/assets/logo.png" alt="" className="w-7 h-7 object-contain" />
          <button onClick={() => setLocation("/skills")} className="text-green-200 text-sm">← الْمَهَارَاتُ</button>
        </div>
        <div className="flex justify-between items-center">
          <div className="text-right">
            <h1 className="text-2xl font-bold text-white">مَهَارَةُ التَّحَدُّثِ</h1>
            <p className="text-green-200 text-sm">تَعَلَّمِ التَّعْبِيرَ الشَّفَهِيَّ وَالتَّحَدُّثَ بِثِقَةٍ</p>
          </div>
          <span className="text-3xl p-2 bg-green-700 rounded-xl">🎙️</span>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="bg-white rounded-xl p-3 mb-4 flex items-center gap-3 shadow">
          <div className="text-right flex-1">
            <p className="font-bold text-sm">مَرْحَباً يَا بَطَلَ اللُّغَةِ الْعَرَبِيَّةِ! 🌟</p>
            <p className="text-gray-500 text-xs">هُنَا نَتَعَلَّمُ وَنُبْدِعُ مَعًا</p>
          </div>
          <img src="/assets/omani-boy.png" alt="" className="w-10 h-10 object-contain" />
        </div>
        <h2 className="text-right font-bold text-lg mb-3" style={{ color: "#1a5c2a" }}>📚 دُرُوسُ التَّحَدُّثِ</h2>
        <div className="flex flex-col gap-3">
          {lessons.map((l) => (
            <button key={l.id} onClick={() => setSelectedLesson(l)}
              className="p-4 bg-white rounded-xl shadow text-right hover:shadow-md hover:-translate-y-0.5 transition-all flex justify-between items-center">
              <div>
                <div className="flex gap-2 justify-end mb-1">
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">{l.level}</span>
                  <h3 className="font-bold">{l.title}</h3>
                </div>
                <p className="text-gray-500 text-sm">{l.desc}</p>
              </div>
              <span className="text-3xl">{l.icon}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif", background: "#f5f0e8", minHeight: "100vh" }}>
      <div className="p-4 flex items-center gap-3 bg-white shadow-sm">
        <img src="/assets/omani-boy.png" alt="" className="w-10 h-10 object-contain" />
        <div className="text-right">
          <p className="font-bold text-sm">مَرْحَباً يَا بَطَلَ اللُّغَةِ الْعَرَبِيَّةِ! 🌟</p>
          <p className="text-gray-400 text-xs">{getState().name}</p>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-4">
        <button
          onClick={() => { setSelectedLesson(null); setResult(null); setSelectedTopic(""); setError(""); }}
          className="text-green-600 text-sm mb-3 flex items-center gap-1">
          ← الْعَوْدَةُ لِلدُّرُوسِ
        </button>
        <div className="bg-white rounded-2xl p-5 shadow">
          <h2 className="text-right font-bold text-xl mb-2">{selectedLesson.icon} {selectedLesson.title}</h2>
          <p className="text-right text-gray-500 text-sm mb-4">{selectedLesson.desc}</p>

          {selectedLesson.topics.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {selectedLesson.topics.map((t) => (
                <button key={t} onClick={() => setSelectedTopic(t)}
                  className="p-3 rounded-xl text-sm font-bold transition-all"
                  style={selectedTopic === t
                    ? { background: "#1a5c2a", color: "#fff" }
                    : { background: "#dcf5e7", color: "#1a5c2a" }}>
                  {TOPIC_ICONS[t] ?? "📌"} {t}
                </button>
              ))}
            </div>
          )}

          {/* Show mic only after topic selected OR if lesson has no topics */}
          {(selectedTopic || selectedLesson.topics.length === 0) ? (
            <>
              <p className="text-center text-gray-500 text-sm mb-3">
                اضْغَطْ عَلَى الْمِيكْرُوفُونِ وَتَحَدَّثْ لِمُدَّةِ دَقِيقَتَيْنِ
                {selectedTopic && <strong> عَنْ {selectedTopic}</strong>}
              </p>

              {recording && (
                <p className="text-center text-2xl font-mono font-bold text-green-700 mb-2 animate-pulse">
                  🔴 {fmt(timer)} / 2:00
                </p>
              )}

              <div className="text-center mb-4">
                <button
                  onClick={recording ? stopRecording : startRecording}
                  className="w-20 h-20 rounded-full text-3xl text-white shadow-lg transition-all hover:scale-105"
                  style={recording
                    ? { background: "#dc2626" }
                    : { background: "linear-gradient(135deg, #1a5c2a, #2d7a3e)" }}
                >
                  {recording ? "⏹️" : "🎙️"}
                </button>
                <p className="text-gray-500 text-sm mt-2">
                  {recording ? "جَارٍ التَّسْجِيلُ... اضْغَطْ لِلإِيقَافِ" : "اضْغَطْ لِبَدْءِ التَّسْجِيلِ"}
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-4 bg-green-50 rounded-xl border border-green-200 mb-4">
              <p className="text-green-700 font-bold text-sm">👆 اخْتَرْ مَجَالَ التَّحَدُّثِ أَوَّلاً</p>
              <p className="text-gray-400 text-xs mt-1">سَيَظْهَرُ الْمِيكْرُوفُونُ بَعْدَ الِاخْتِيَارِ</p>
            </div>
          )}

          {error && <p className="text-center text-red-500 text-sm mb-3">⚠️ {error}</p>}

          {loading && (
            <div className="text-center py-4">
              <div className="w-12 h-12 border-4 border-green-300 border-t-green-700 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-green-600 text-sm">🔄 جَارٍ تَحْلِيلُ صَوْتِكَ بِالذَّكَاءِ الِاصْطِنَاعِيِّ...</p>
            </div>
          )}

          {result && !loading && (
            <div className="text-right">
              {/* Transcript */}
              {result.transcript && (
                <div className="bg-white rounded-xl p-3 mb-3 border border-green-200">
                  <p className="text-xs text-gray-400 mb-2 text-left">📝 مَا قُلْتَهُ:</p>
                  <p className="text-gray-800 leading-loose text-base font-medium text-right" style={{ fontFamily: "'Cairo', sans-serif", lineHeight: "2.2" }}>
                    {(() => {
                      const text = enhancedTranscript || result.transcript;
                      const errors: any[] = result.errors || [];
                      if (!errors.length) return text;
                      // split into words and highlight wrong ones
                      const stripDia = (s: string) => s.replace(/[ً-ٰٟ]/g, "");
                      const wrongSet = new Set(errors.map((e: any) => stripDia(e.wrong || "")));
                      const words = text.split(/(\s+)/);
                      return words.map((w: string, i: number) => {
                        if (/^\s+$/.test(w)) return w;
                        const clean = stripDia(w.replace(/[.,،؟!؛:]/g, ""));
                        const isWrong = wrongSet.has(clean);
                        return isWrong
                          ? <span key={i} style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 4, padding: "0 2px", textDecoration: "underline wavy #dc2626" }}>{w}</span>
                          : <span key={i}>{w}</span>;
                      });
                    })()}
                  </p>
                </div>
              )}
              {/* Overall score */}
              <div className="rounded-xl p-4 mb-3" style={{ background: (result.overall||0)>=70 ? "linear-gradient(135deg,#dcf5e7,#f0fdf4)" : "linear-gradient(135deg,#fef3e2,#fffbeb)" }}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i=>(
                      <span key={i} style={{color: i<=Math.ceil((result.overall||0)/20)?"#f5c842":"#d1d5db",fontSize:"18px"}}>★</span>
                    ))}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">النَّتِيجَةُ الْكُلِّيَّةُ</p>
                    <p className="text-3xl font-bold" style={{color:(result.overall||0)>=70?"#1a5c2a":"#b45309"}}>{result.overall}%</p>
                  </div>
                </div>
                <p className="text-gray-700 text-sm">{result.feedback}</p>
              </div>
              {/* Skill breakdown */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { label: "🗣️ وُضُوحُ النُّطْقِ",   value: result.pronunciation,                              color: "#1a5c2a", bg: "#dcf5e7",  tip: "مدى وضوح نطق الكلمات" },
                  { label: "📝 بِنَاءُ الْجُمَلِ",    value: result.sentence_structure,                         color: "#7c3aed", bg: "#ede9f5",  tip: "ترتيب الكلمات وتكوين الجمل" },
                  { label: "💡 ثَرَاءُ الْمُفْرَدَاتِ", value: result.vocabulary ?? result.grammar ?? 0,          color: "#0c7490", bg: "#e0f7fa",  tip: "تنوع الكلمات المستخدمة" },
                  { label: "🔗 تَرَابُطُ الْأَفْكَارِ", value: result.coherence ?? result.sentence_structure ?? 0, color: "#b45309", bg: "#fef3e2",  tip: "ترتيب الأفكار وتسلسلها" },
                ].map(({label,value,color,bg,tip})=>(
                  <div key={label} className="rounded-xl p-3 text-center" style={{background:bg}}>
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className="text-xl font-bold" style={{color}}>{value ?? 0}%</p>
                    <div className="w-full h-1.5 bg-white rounded-full mt-1 overflow-hidden">
                      <div className="h-1.5 rounded-full" style={{width:`${value ?? 0}%`,background:color}}/>
                    </div>
                    <p className="text-gray-400 text-xs mt-1">{tip}</p>
                  </div>
                ))}
              </div>
              {/* Errors */}
              {result.errors?.length > 0 && (
                <div className="bg-white rounded-xl p-3 mb-3 border border-red-100">
                  <p className="font-bold text-red-700 text-sm mb-2">❌ أَخْطَاءٌ مُكْتَشَفَةٌ:</p>
                  {result.errors.map((e:any,i:number)=>(
                    <div key={i} className="flex justify-between items-center bg-red-50 rounded-lg px-3 py-2 mb-1 border border-red-100">
                      <p className="text-xs text-gray-500">{e.explanation}</p>
                      <div className="flex items-center gap-2 text-sm font-bold">
                        <span className="text-green-600">{e.correct}</span>
                        <span className="text-gray-400">←</span>
                        <span className="text-red-500 line-through">{e.wrong}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Suggestions */}
              {result.suggestions?.length > 0 && (
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <p className="font-bold text-amber-700 text-sm mb-2">💡 اقْتِرَاحَاتٌ:</p>
                  {result.suggestions.map((s:string,i:number)=>(
                    <p key={i} className="text-sm text-gray-700">• {s}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
