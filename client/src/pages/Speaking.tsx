import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { evaluateSpeech } from "@/lib/api";
import { playSound, stopSound, playEffect } from "@/lib/audio";
import { setState, getState } from "@/lib/store";

const LESSONS = [
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
  const [selectedLesson, setSelectedLesson] = useState<typeof LESSONS[0] | null>(null);
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
    const audioFile = selectedLesson.id === "earth"
      ? "/assets/lesson-earth-hour.wav"
      : "/assets/lesson-speaking-intro.wav";
    playSound(audioFile, 0.55);
    return () => stopSound();
  }, [selectedLesson?.id]);

  async function startRecording() {
    setError(""); setResult(null);
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
          setState((prev) => ({ ...prev, speakingProgress: Math.max(prev.speakingProgress, res.overall || 0) }));
          // Play achievement sound if score >= 70
          if ((res.overall || 0) >= 70) {
            playEffect("/assets/achievement.wav", 0.7);
          } else {
            playEffect("/assets/tryagain.wav", 0.6);
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
          <span className="text-3xl p-2 bg-green-700 rounded-xl">🎙️</span>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-white">مَهَارَةُ التَّحَدُّثِ</h1>
            <p className="text-green-200 text-sm">تَعَلَّمِ التَّعْبِيرَ الشَّفَهِيَّ وَالتَّحَدُّثَ بِثِقَةٍ</p>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="bg-white rounded-xl p-3 mb-4 flex items-center gap-3 shadow">
          <img src="/assets/omani-boy.png" alt="" className="w-10 h-10 object-contain" />
          <div className="text-right">
            <p className="font-bold text-sm">مَرْحَباً يَا بَطَلَ اللُّغَةِ الْعَرَبِيَّةِ! 🌟</p>
            <p className="text-gray-500 text-xs">هُنَا نَتَعَلَّمُ وَنُبْدِعُ مَعًا</p>
          </div>
        </div>
        <h2 className="text-right font-bold text-lg mb-3" style={{ color: "#1a5c2a" }}>📚 دُرُوسُ التَّحَدُّثِ</h2>
        <div className="flex flex-col gap-3">
          {LESSONS.map((l) => (
            <button key={l.id} onClick={() => setSelectedLesson(l)}
              className="p-4 bg-white rounded-xl shadow text-right hover:shadow-md hover:-translate-y-0.5 transition-all flex justify-between items-center">
              <span className="text-3xl">{l.icon}</span>
              <div>
                <div className="flex gap-2 justify-end mb-1">
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">{l.level}</span>
                  <h3 className="font-bold">{l.title}</h3>
                </div>
                <p className="text-gray-500 text-sm">{l.desc}</p>
              </div>
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
              className="w-20 h-20 rounded-full text-3xl text-white shadow-lg transition-all"
              style={recording
                ? { background: "#dc2626" }
                : { background: "linear-gradient(135deg, #1a5c2a, #2d7a3e)", transform: "scale(1)" }}
            >
              {recording ? "⏹️" : "🎙️"}
            </button>
            <p className="text-gray-500 text-sm mt-2">
              {recording ? "جَارٍ التَّسْجِيلُ... اضْغَطْ لِلإِيقَافِ" : "اضْغَطْ لِبَدْءِ التَّسْجِيلِ"}
            </p>
          </div>

          {error && <p className="text-center text-red-500 text-sm mb-3">⚠️ {error}</p>}

          {loading && (
            <div className="text-center py-4">
              <div className="w-12 h-12 border-4 border-green-300 border-t-green-700 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-green-600 text-sm">🔄 جَارٍ تَحْلِيلُ صَوْتِكَ بِالذَّكَاءِ الِاصْطِنَاعِيِّ...</p>
            </div>
          )}

          {result && !loading && (
            <div className="bg-green-50 rounded-xl p-4 text-right border border-green-100">
              {result.transcript && (
                <div className="bg-white rounded-lg p-3 mb-3 border border-green-200">
                  <p className="text-xs text-gray-400 mb-1">📝 مَا قُلْتَهُ:</p>
                  <p className="text-gray-700 leading-relaxed">{result.transcript}</p>
                </div>
              )}
              <p className="font-bold text-green-800 mb-3">✨ {result.feedback}</p>
              <div className="flex gap-1 mb-3 items-center">
                {[1,2,3,4].map(i => (
                  <span key={i} className={i <= Math.ceil((result.overall || 0) / 25) ? "text-yellow-400 text-xl" : "text-gray-300 text-xl"}>⭐</span>
                ))}
                <span className="mr-2 font-bold text-green-700 text-lg">{result.overall}%</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { label: "النُّطْقُ", value: result.pronunciation },
                  { label: "بِنَاءُ الْجُمَلِ", value: result.sentence_structure },
                  { label: "التَّشْكِيلُ", value: result.diacritics },
                  { label: "الإِعْرَابُ", value: result.grammar },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white rounded-lg p-2 text-center border border-green-100">
                    <p className="text-gray-500 text-xs">{label}</p>
                    <p className="font-bold text-green-700 text-lg">{value}%</p>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1">
                      <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
