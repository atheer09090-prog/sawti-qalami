import { ActivityHeader } from "@/components/ActivityUI";
import { ArrowLeft, Mic, Square } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { evaluateSpeech, diacritizeText, getSpeakingLessons, describeError, getToken } from "@/lib/api";
import { playSound, stopSound, playEffect, stopAll, audioFile } from "@/lib/audio";
import { setState, getState } from "@/lib/store";
import { classifyMicError, checkMicSupport, type MicErrorInfo } from "@/lib/mic";
import { MicPermissionCard, MicDoneNotice } from "@/components/MicPermissionCard";
import { ResultSkeleton } from "@/components/ResultSkeleton";
import { AudioWaveform } from "@/components/AudioWaveform";
import { SpeakingLessonArt } from "@/components/SpeakingLessonArt";

const DEFAULT_LESSONS = [
  { id: "summer", title: "وَصْفُ رِحْلَةٍ صَيْفِيَّةٍ", level: "سَهْلٌ", icon: "🏖️", desc: "تَحَدَّثْ عَنْ عُطْلَتِكَ الصَّيْفِيَّةِ", topics: ["رِحْلَةٌ بَحْرِيَّةٌ", "رِحْلَةٌ جَبَلِيَّةٌ", "صُورَةٌ دَالَّةٌ عَلَى تَعَلُّمٍ", "رِحْلَةٌ جَوِّيَّةٌ"] },
  { id: "earth", title: "قِرَاءَةُ مَنْشُورٍ تَوْعَوِيٍّ — سَاعَةُ الأَرْضِ", level: "مُتَوَسِّطٌ", icon: "🌍", desc: "اقْرَأِ الْمَنْشُورَ وَأَجِبْ عَنِ الأَسْئِلَةِ", topics: [] },
  { id: "opinion", title: "التَّعْبِيرُ عَنِ الرَّأْيِ", level: "مُتَقَدِّمٌ", icon: "💬", desc: "عَبِّرْ عَنْ رَأْيِكَ بِأُسْلُوبٍ لُغَوِيٍّ سَلِيمٍ", topics: [
    "هَلْ يَنْبَغِي تَقْلِيلُ اسْتِخْدَامِ الْأَجْهِزَةِ الْإِلِكْتْرُونِيَّةِ؟",
    "هَلِ الْمُحَافَظَةُ عَلَى الْبِيئَةِ مَسْؤُولِيَّةُ الْجَمِيعِ؟",
    "هَلِ الْقِرَاءَةُ أَفْضَلُ مِنْ مُشَاهَدَةِ الْفِيدْيُوهَاتِ؟",
  ] },
];

const TOPIC_ICONS: Record<string, string> = {
  "رِحْلَةٌ بَحْرِيَّةٌ": "🌊", "رِحْلَةٌ جَبَلِيَّةٌ": "⛰️",
  "صُورَةٌ دَالَّةٌ عَلَى تَعَلُّمٍ": "📚", "رِحْلَةٌ جَوِّيَّةٌ": "✈️",
  "هَلْ يَنْبَغِي تَقْلِيلُ اسْتِخْدَامِ الْأَجْهِزَةِ الْإِلِكْتْرُونِيَّةِ؟": "📱",
  "هَلِ الْمُحَافَظَةُ عَلَى الْبِيئَةِ مَسْؤُولِيَّةُ الْجَمِيعِ؟": "🌳",
  "هَلِ الْقِرَاءَةُ أَفْضَلُ مِنْ مُشَاهَدَةِ الْفِيدْيُوهَاتِ؟": "📚",
  "قِرَاءَةُ مَنْشُورٍ تَوْعَوِيٍّ — سَاعَةُ الأَرْضِ": "🌍",
};

/* ══════════════════════════════════════════════════════════════
   بيانات "صفحة النشاط" لكل موضوع — Data-driven: لإضافة موضوع جديد
   مستقبلاً، فقط أضف كائناً جديداً هنا بنفس المفتاح (عنوان الموضوع
   كما يظهر في topics أعلاه)، بدون أي تعديل في الواجهة.

   image/video: ضع مسار الملف بعد إضافته لمجلد client/public/assets/topics
   (المسارات أدناه Placeholder فقط، استبدلها بمساراتك الفعلية).
   ══════════════════════════════════════════════════════════════ */
type TopicActivity = {
  image?: string;
  video?: string;
  poster?: { title: string; body: string }; // منشور توعوي نصّي (Placeholder) بدل صورة حقيقية
  objectives: string[];
  keywords: string[];
  questions: string[];
};

const TOPIC_ACTIVITIES: Record<string, TopicActivity> = {
  "رِحْلَةٌ بَحْرِيَّةٌ": {
    image: "/assets/topics/sea-trip.jpg",
    objectives: [
      "أَنْ يَصِفَ الطَّالِبُ رِحْلَةً بَحْرِيَّةً.",
      "أَنْ يَذْكُرَ الْمَكَانَ.",
      "أَنْ يَصِفَ الطَّقْسَ.",
      "أَنْ يَتَحَدَّثَ عَنِ الْأَنْشِطَةِ الَّتِي قَامَ بِهَا.",
      "أَنْ يَسْتَخْدِمَ جُمَلًا مُتَرَابِطَةً وَوَاضِحَةً.",
    ],
    keywords: ["الْبَحْرُ", "السَّفِينَةُ", "الشَّاطِئُ", "الْأَمْوَاجُ", "السَّمَكُ", "الْغَوْصُ", "السِّبَاحَةُ", "الرِّمَالُ", "الشَّمْسُ", "الْمَنْظَرُ الْجَمِيلُ"],
    questions: ["أَيْنَ ذَهَبْتَ؟", "مَعَ مَنْ ذَهَبْتَ؟", "مَاذَا شَاهَدْتَ؟", "مَاذَا فَعَلْتَ؟", "مَا أَكْثَرُ شَيْءٍ أَعْجَبَكَ؟", "هَلْ تَوَدُّ تَكْرَارَ هَذِهِ الرِّحْلَةِ؟ وَلِمَاذَا؟"],
  },
  "رِحْلَةٌ جَبَلِيَّةٌ": {
    image: "/assets/topics/mountain-trip.jpg",
    objectives: [
      "أَنْ يَصِفَ الطَّالِبُ رِحْلَةً جَبَلِيَّةً.",
      "أَنْ يَذْكُرَ الْمَكَانَ.",
      "أَنْ يَصِفَ الطَّقْسَ وَالطَّبِيعَةَ.",
      "أَنْ يَتَحَدَّثَ عَنِ الْأَنْشِطَةِ الَّتِي قَامَ بِهَا.",
      "أَنْ يَسْتَخْدِمَ جُمَلًا مُتَرَابِطَةً وَوَاضِحَةً.",
    ],
    keywords: ["الْجَبَلُ", "الْقِمَّةُ", "التَّسَلُّقُ", "الْهَوَاءُ النَّقِيُّ", "الْأَشْجَارُ", "الْمُخَيَّمُ", "الْمَشْيُ", "الطَّبِيعَةُ", "الْبُرُودَةُ", "الْمَنْظَرُ الْخَلَّابُ"],
    questions: ["أَيْنَ ذَهَبْتَ؟", "مَعَ مَنْ ذَهَبْتَ؟", "مَاذَا شَاهَدْتَ؟", "مَاذَا فَعَلْتَ؟", "مَا أَكْثَرُ شَيْءٍ أَعْجَبَكَ؟", "هَلْ تَوَدُّ تَكْرَارَ هَذِهِ الرِّحْلَةِ؟ وَلِمَاذَا؟"],
  },
  "رِحْلَةٌ جَوِّيَّةٌ": {
    image: "/assets/topics/flight-trip.jpg",
    objectives: [
      "أَنْ يَصِفَ الطَّالِبُ رِحْلَةً جَوِّيَّةً.",
      "أَنْ يَذْكُرَ الْوِجْهَةَ الَّتِي سَافَرَ إِلَيْهَا.",
      "أَنْ يَصِفَ شُعُورَهُ أَثْنَاءَ الطَّيَرَانِ.",
      "أَنْ يَتَحَدَّثَ عَمَّا شَاهَدَهُ مِنَ الْمَطَارِ وَالطَّائِرَةِ.",
      "أَنْ يَسْتَخْدِمَ جُمَلًا مُتَرَابِطَةً وَوَاضِحَةً.",
    ],
    keywords: ["الطَّائِرَةُ", "الْمَطَارُ", "الرَّحْلَةُ", "السَّفَرُ", "الْجَوَازُ", "الْحَقَائِبُ", "السَّمَاءُ", "الْمُضِيفُ", "الْمَقْعَدُ", "الْهُبُوطُ"],
    questions: ["إِلَى أَيْنَ سَافَرْتَ؟", "مَعَ مَنْ سَافَرْتَ؟", "مَاذَا شَاهَدْتَ مِنَ النَّافِذَةِ؟", "كَيْفَ كَانَ شُعُورُكَ؟", "مَا أَكْثَرُ شَيْءٍ أَعْجَبَكَ؟", "هَلْ تَوَدُّ السَّفَرَ مَرَّةً أُخْرَى؟ وَلِمَاذَا؟"],
  },
  "صُورَةٌ دَالَّةٌ عَلَى تَعَلُّمٍ": {
    image: "/assets/topics/learning.jpg",
    objectives: [
      "أَنْ يَصِفَ الطَّالِبُ مَوْقِفًا تَعَلَّمَ مِنْهُ شَيْئًا جَدِيدًا.",
      "أَنْ يَذْكُرَ مَا تَعَلَّمَهُ بِالتَّحْدِيدِ.",
      "أَنْ يَصِفَ الْمَكَانَ وَالْأَشْخَاصَ الْمُشَارِكِينَ.",
      "أَنْ يَتَحَدَّثَ عَنْ شُعُورِهِ تُجَاهَ مَا تَعَلَّمَهُ.",
      "أَنْ يَسْتَخْدِمَ جُمَلًا مُتَرَابِطَةً وَوَاضِحَةً.",
    ],
    keywords: ["التَّعَلُّمُ", "الْمَعْرِفَةُ", "الْمُعَلِّمُ", "الْكِتَابُ", "الْمَهَارَةُ", "التَّجْرِبَةُ", "الِاكْتِشَافُ", "الْفَهْمُ", "التَّدْرِيبُ", "النَّجَاحُ"],
    questions: ["مَاذَا تَعَلَّمْتَ؟", "أَيْنَ تَعَلَّمْتَ ذَلِكَ؟", "مَنْ عَلَّمَكَ؟", "كَيْفَ شَعَرْتَ بَعْدَ أَنْ تَعَلَّمْتَ؟", "هَلِ اسْتَخْدَمْتَ مَا تَعَلَّمْتَهُ لَاحِقًا؟", "لِمَاذَا هَذَا الْأَمْرُ مُهِمٌّ بِالنِّسْبَةِ لَكَ؟"],
  },
  "هَلْ يَنْبَغِي تَقْلِيلُ اسْتِخْدَامِ الْأَجْهِزَةِ الْإِلِكْتْرُونِيَّةِ؟": {
    image: "/assets/topics/devices.jpg",
    objectives: [
      "أَنْ يُعَبِّرَ الطَّالِبُ عَنْ رَأْيِهِ بِوُضُوحٍ.",
      "أَنْ يَذْكُرَ سَبَبَيْنِ أَوْ أَكْثَرَ يَدْعَمَانِ رَأْيَهُ.",
      "أَنْ يَسْتَخْدِمَ عِبَارَاتٍ مُنَاسِبَةً لِإِبْدَاءِ الرَّأْيِ.",
      "أَنْ يُنَظِّمَ أَفْكَارَهُ فِي تَسَلْسُلٍ مَنْطِقِيٍّ.",
    ],
    keywords: ["أَعْتَقِدُ", "فِي رَأْيِي", "لِأَنَّ", "مُفِيدٌ", "مُضِرٌّ", "الْهَاتِفُ", "الْإِنْتَرْنِتُ", "الدِّرَاسَةُ", "التَّرْفِيهُ", "تَنْظِيمُ الْوَقْتِ"],
    questions: ["مَا رَأْيُكَ فِي كَثْرَةِ اسْتِخْدَامِ الْأَجْهِزَةِ الْإِلِكْتْرُونِيَّةِ؟", "لِمَاذَا تُؤَيِّدُ أَوْ تُعَارِضُ ذَلِكَ؟", "مَا فَوَائِدُهَا؟", "مَا أَضْرَارُهَا؟", "كَيْفَ يُمْكِنُ اسْتِخْدَامُهَا بِطَرِيقَةٍ صَحِيحَةٍ؟"],
  },
  "هَلِ الْمُحَافَظَةُ عَلَى الْبِيئَةِ مَسْؤُولِيَّةُ الْجَمِيعِ؟": {
    image: "/assets/topics/environment.jpg",
    objectives: [
      "أَنْ يُعَبِّرَ الطَّالِبُ عَنْ رَأْيِهِ.",
      "أَنْ يَذْكُرَ أَمْثِلَةً مِنَ الْحَيَاةِ الْيَوْمِيَّةِ.",
      "أَنْ يَقْتَرِحَ حُلُولًا لِلْمُحَافَظَةِ عَلَى الْبِيئَةِ.",
      "أَنْ يَسْتَخْدِمَ جُمَلًا مُتَرَابِطَةً.",
    ],
    keywords: ["الْبِيئَةُ", "الْأَشْجَارُ", "التَّلَوُّثُ", "النَّظَافَةُ", "إِعَادَةُ التَّدْوِيرِ", "الْمِيَاهُ", "الْمَسْؤُولِيَّةُ", "التَّعَاوُنُ", "الْمُسْتَقْبَلُ", "الْمُحَافَظَةُ"],
    questions: ["هَلْ تَرَى أَنَّ الْمُحَافَظَةَ عَلَى الْبِيئَةِ مُهِمَّةٌ؟", "لِمَاذَا؟", "مَاذَا تَسْتَطِيعُ أَنْ تَفْعَلَ؟", "كَيْفَ يُمْكِنُ لِلْمَدْرَسَةِ أَوِ الْأُسْرَةِ أَنْ تُسَاعِدَ؟", "مَا أَثَرُ الْمُحَافَظَةِ عَلَى الْبِيئَةِ عَلَى الْمُجْتَمَعِ؟"],
  },
  "هَلِ الْقِرَاءَةُ أَفْضَلُ مِنْ مُشَاهَدَةِ الْفِيدْيُوهَاتِ؟": {
    image: "/assets/topics/reading.jpg",
    objectives: [
      "أَنْ يُقَارِنَ الطَّالِبُ بَيْنَ وَسِيلَتَيْنِ لِلتَّعَلُّمِ.",
      "أَنْ يُوَضِّحَ أَسْبَابَ اخْتِيَارِهِ.",
      "أَنْ يَسْتَخْدِمَ أَلْفَاظًا مُنَاسِبَةً لِلْمُقَارَنَةِ.",
      "أَنْ يَخْتِمَ بِرَأْيٍ شَخْصِيٍّ.",
    ],
    keywords: ["الْقِرَاءَةُ", "الْمَعْرِفَةُ", "التَّعَلُّمُ", "الْكُتُبُ", "الْمَكْتَبَةُ", "الْمَعْلُومَاتُ", "الْفَهْمُ", "التَّرْكِيزُ", "الْخَيَالُ", "الثَّقَافَةُ"],
    questions: ["أَيَّهُمَا تُفَضِّلُ: الْقِرَاءَةَ أَمْ مُشَاهَدَةَ الْفِيدْيُوهَاتِ؟", "لِمَاذَا؟", "مَاذَا تَسْتَفِيدُ مِنَ الْقِرَاءَةِ؟", "هَلِ الْفِيدْيُو يُغْنِي عَنِ الْكِتَابِ؟", "كَيْفَ يُمْكِنُ أَنْ نَجْعَلَ الْقِرَاءَةَ عَادَةً يَوْمِيَّةً؟"],
  },
  "قِرَاءَةُ مَنْشُورٍ تَوْعَوِيٍّ — سَاعَةُ الأَرْضِ": {
    poster: {
      title: "🌍 سَاعَةُ الْأَرْضِ",
      body: "انْضَمَّ إِلَيْنَا يَوْمَ السَّبْتِ الْأَخِيرِ مِنْ شَهْرِ مَارِسَ، مِنَ السَّاعَةِ ٨:٣٠ إِلَى ٩:٣٠ مَسَاءً، وَأَطْفِئِ الْأَنْوَارَ لِمُدَّةِ سَاعَةٍ وَاحِدَةٍ! مُبَادَرَةٌ عَالَمِيَّةٌ يُشَارِكُ فِيهَا مَلَايِينُ النَّاسِ حَوْلَ الْعَالَمِ لِلتَّوْعِيَةِ بِأَهَمِّيَّةِ تَرْشِيدِ اسْتِهْلَاكِ الطَّاقَةِ وَالْمُحَافَظَةِ عَلَى كَوْكَبِ الْأَرْضِ لِأَجْيَالِنَا الْقَادِمَةِ. كُلُّ فَرْدٍ يَصْنَعُ فَرْقًا! 💚",
    },
    objectives: [
      "أَنْ يَقْرَأَ الطَّالِبُ الْمَنْشُورَ قِرَاءَةً صَحِيحَةً.",
      "أَنْ يَفْهَمَ الْفِكْرَةَ الرَّئِيسَةَ.",
      "أَنْ يُوَضِّحَ الْهَدَفَ مِنَ الْمَنْشُورِ.",
      "أَنْ يُعَبِّرَ عَنْ رَأْيِهِ فِي أَهَمِّيَّةِ الْمُبَادَرَةِ.",
      "أَنْ يَسْتَخْدِمَ جُمَلًا مُتَرَابِطَةً وَوَاضِحَةً.",
    ],
    keywords: ["سَاعَةُ الْأَرْضِ", "الْبِيئَةُ", "الْمُحَافَظَةُ", "الطَّاقَةُ", "الْكَهْرَبَاءُ", "تَرْشِيدٌ", "الْمُشَارَكَةُ", "الْمُجْتَمَعُ", "كَوْكَبُ الْأَرْضِ", "الْمُسْتَقْبَلُ", "التَّلَوُّثُ", "الْوَعْيُ"],
    questions: ["مَا عُنْوَانُ الْمَنْشُورِ؟", "مَا الْفِكْرَةُ الرَّئِيسَةُ الَّتِي يَتَحَدَّثُ عَنْهَا؟", "مَا الْهَدَفُ مِنْ هَذَا الْمَنْشُورِ؟", "لِمَاذَا تُعَدُّ سَاعَةُ الْأَرْضِ مُهِمَّةً؟", "كَيْفَ يُمْكِنُ أَنْ نُشَارِكَ فِي هَذِهِ الْمُبَادَرَةِ؟", "مَا الَّذِي تَعَلَّمْتَهُ مِنْ هَذَا الْمَنْشُورِ؟", "هَلْ تَنْصَحُ الْآخَرِينَ بِالْمُشَارَكَةِ؟ وَلِمَاذَا؟"],
  },
};

function TopicBriefing({ topic, data, started, onBack, onStart }: { topic: string; data: TopicActivity; started: boolean; onBack: () => void; onStart: () => void }) {
  return (
    <div>
      <button onClick={onBack} className="text-green-800 text-sm mb-3 flex items-center gap-1">← تَغْيِيرُ الْمَوْضُوعِ</button>

      {/* ١) الوسيلة البصرية: منشور توعوي نصّي (إن وُجد)، وإلا صورة أو فيديو */}
      {data.poster ? (
        <div className="rounded-2xl overflow-hidden mb-4 shadow-sm border-2" style={{ borderColor: "#075348" }}>
          <div className="p-3 text-center" style={{ background: "var(--primary)" }}>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/25 text-white">📢 مَنْشُورٌ تَوْعَوِيٌّ</span>
          </div>
          <div className="p-5 text-center" style={{ background: "#f7fbf8" }}>
            <p className="font-bold text-xl mb-3" style={{ color: "#075348" }}>{data.poster.title}</p>
            <p className="text-gray-700 text-sm leading-loose">{data.poster.body}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden mb-4 shadow-sm" style={{ aspectRatio: "16/9", background: "#e9f0df" }}>
          {data.video ? (
            <video controls className="w-full h-full object-cover" src={data.video} />
          ) : (
            <img src={data.image} alt={topic} className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          )}
        </div>
      )}

      <h2 className="text-right font-bold text-xl mb-4" style={{ color: "#075348" }}>{TOPIC_ICONS[topic] ?? "📌"} {topic}</h2>

      {/* ٢) بطاقة أهداف النشاط */}
      <div className="rounded-2xl p-4 mb-4 shadow-sm" style={{ background: "#fff" }}>
        <p className="font-bold text-right mb-2" style={{ color: "#075348" }}>🎯 أَهْدَافُ النَّشَاطِ</p>
        <ul className="text-right text-gray-700 text-sm space-y-1.5 leading-relaxed">
          {data.objectives.map((o, i) => <li key={i}>• {o}</li>)}
        </ul>
      </div>

      {/* ٣) بطاقة الكلمات المساعدة */}
      <div className="rounded-2xl p-4 mb-4 shadow-sm" style={{ background: "#fff" }}>
        <p className="font-bold text-right mb-3" style={{ color: "#075348" }}>🗝️ كَلِمَاتٌ تُسَاعِدُكَ</p>
        <div className="flex flex-wrap gap-2 justify-end">
          {data.keywords.map((k, i) => (
            <span key={i} className="text-sm px-3 py-1.5 rounded-full font-medium" style={{ background: "#e9f0df", color: "#075348" }}>{k}</span>
          ))}
        </div>
      </div>

      {/* ٤) بطاقة الأسئلة الإرشادية */}
      <div className="rounded-2xl p-4 mb-5 shadow-sm" style={{ background: "#fff" }}>
        <p className="font-bold text-right mb-2" style={{ color: "#075348" }}>❓ أَسْئِلَةٌ تُسَاعِدُكَ عَلَى التَّحَدُّثِ</p>
        <ul className="text-right text-gray-700 text-sm space-y-1.5 leading-relaxed">
          {data.questions.map((q, i) => <li key={i}>• {q}</li>)}
        </ul>
      </div>

      {/* ٥) زر بدء التحدث — يختفي بعد الضغط ليُفسح المجال لواجهة التسجيل أسفله،
             بينما تبقى الأهداف والكلمات والأسئلة ظاهرة طوال وقت التحدث */}
      {!started ? (
        <button onClick={onStart}
          className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-sm active:scale-[0.98] transition-all"
          style={{ background: "var(--primary)" }}>
          ابْدَأِ التَّحَدُّثَ 🎙️
        </button>
      ) : (
        <p className="text-center text-sm text-gray-400">⬇️ تَحَدَّثْ الْآنَ مُسْتَعِينًا بِمَا سَبَقَ</p>
      )}
    </div>
  );
}

export default function Speaking() {
  const [, setLocation] = useLocation();
  const [enhancedTranscript, setEnhancedTranscript] = useState<string | null>(null);
  const [lessons, setLessons] = useState(DEFAULT_LESSONS);
  const [selectedLesson, setSelectedLesson] = useState<typeof DEFAULT_LESSONS[0] | null>(null);

  useEffect(() => {
    getSpeakingLessons().then(data => {
      if (!data || !Array.isArray(data)) return;
      // ندمج بيانات الباكند مع الافتراضية: إن كانت مواضيع الباكند لدرسٍ ما فارغة أو غير محدَّثة،
      // نُبقي على مواضيعنا المحلية الأحدث بدل فقدانها بالاستبدال الكامل.
      const merged = data.map((backendLesson: any) => {
        const local = DEFAULT_LESSONS.find(l => l.id === backendLesson.id);
        if (!local) return backendLesson;
        const backendTopics = Array.isArray(backendLesson.topics) ? backendLesson.topics : [];
        return {
          ...local,
          ...backendLesson,
          topics: Array.isArray(backendLesson.topics) ? backendTopics : local.topics,
        };
      });
      setLessons(merged);
    });
  }, []);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [topicStarted, setTopicStarted] = useState(false); // هل ضغط الطالب "ابدأ التحدث" بعد صفحة النشاط؟
  const [recording, setRecording] = useState(false);
  const [pendingRecording, setPendingRecording] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  useEffect(() => () => { if (recordingUrl) URL.revokeObjectURL(recordingUrl); }, [recordingUrl]);
  useEffect(() => { setRecordingUrl(null); setPendingRecording(null); }, [selectedLesson?.id, selectedTopic]);
  const [timer, setTimer] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [micError, setMicError] = useState<MicErrorInfo | null>(null);
  const [justFinished, setJustFinished] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const mountedRef = useRef(true);
  const recordingSessionRef = useRef(0);
  const permissionPendingRef = useRef(false);
  const evaluationIdRef = useRef(0);
  const evaluationAbortRef = useRef<AbortController | null>(null);
  const [acquiringMic, setAcquiringMic] = useState(false);
  const activityRef = useRef("");
  activityRef.current = `${selectedLesson?.id || ""}:${selectedTopic}`;
  const timerRef = useRef<any>(null);

  function disposeRecorder() {
    recordingSessionRef.current += 1;
    clearInterval(timerRef.current);
    const recorder = mediaRef.current;
    mediaRef.current = null;
    if (recorder) {
      recorder.onstop = null;
      recorder.ondataavailable = null;
      recorder.onerror = null;
      if (recorder.state !== "inactive") recorder.stop();
      recorder.stream.getTracks().forEach(track => track.stop());
    }
    evaluationIdRef.current += 1;
    evaluationAbortRef.current?.abort();
    evaluationAbortRef.current = null;
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; disposeRecorder(); stopAll(); };
  }, []);

  useEffect(() => {
    disposeRecorder();
    setRecording(false); setTimer(0); setResult(null); setEnhancedTranscript(null); setLoading(false);
  }, [selectedLesson?.id, selectedTopic]);

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

  async function evaluateRecording(blob: Blob) {
    if (loading || evaluationAbortRef.current) return;
    const requestId = ++evaluationIdRef.current;
    const ownerToken = getToken();
    const active = () => mountedRef.current && requestId === evaluationIdRef.current && ownerToken === getToken();
    const controller = new AbortController();
    evaluationAbortRef.current = controller;
    setError("");
        setJustFinished(true);
        setLoading(true);
        try {
          const res = await evaluateSpeech(blob, selectedTopic, 0, selectedLesson?.id || "", controller.signal);
          if (!active()) return;
          setResult(res);
          setPendingRecording(null);
          if (res.transcript) {
            // Show raw transcript immediately, then enhance with diacritics
            setEnhancedTranscript(res.transcript);
            diacritizeText(res.transcript).then((diacritized) => {
              if (active()) setEnhancedTranscript(diacritized);
            });
          }
          const score = res.overall || 0;
          // إن لم يُتعرَّف على أي كلام (نص فارغ) لا تُمنح نجمة؛ كانت تُمنح نجمة واحدة حتى مع الدرجة 0
          const noSpeech = !res.transcript || !res.transcript.trim();
          const newStars = noSpeech ? 0 : score >= 90 ? 5 : score >= 70 ? 4 : score >= 50 ? 3 : score >= 30 ? 2 : 1;
          setState((prev) => ({
            ...prev,
            speakingProgress: Math.max(prev.speakingProgress, score),
            completedLessons: noSpeech ? prev.completedLessons : Array.from(new Set([...prev.completedLessons, `speaking:${selectedLesson?.id}:${selectedTopic}`])),
            stars: Math.max(prev.stars, newStars),
            points: prev.points + Math.round(score / 10),
          }));
          // Play achievement sound if score >= 70
          if ((res.overall || 0) >= 70) {
            playEffect(audioFile("/assets/achievement.mp3"), 0.7);
          } else {
            playEffect(audioFile("/assets/tryagain.mp3"), 0.6);
          }
        } catch (e) {
          if (active()) setError(describeError(e, "تَعَذَّرَ الِاتِّصَالُ بِالْخَادِمِ. تَأَكَّدْ مِنِ اتِّصَالِكَ بِالإِنْتَرْنِتِ، ثُمَّ حَاوِلْ مَرَّةً أُخْرَى."));
        }
        if (active()) {
          evaluationAbortRef.current = null;
          setJustFinished(false);
          setLoading(false);
        }
  }

  async function startRecording() {
    if (permissionPendingRef.current || recording || loading) return;
    setError(""); setResult(null); setMicError(null); setJustFinished(false);
    const supportIssue = checkMicSupport();
    if (supportIssue) { setMicError(supportIssue); return; }
    setRecordingUrl(null);
    setPendingRecording(null);
    stopSound(); // Stop intro audio BEFORE recording
    permissionPendingRef.current = true;
    setAcquiringMic(true);
    const session = ++recordingSessionRef.current;
    const activity = activityRef.current;
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,   // إلغاء صدى الصوت
          noiseSuppression: true,   // تقليل ضوضاء الخلفية (مهم في بيئة الفصل)
          autoGainControl: true,    // ضبط تلقائي لمستوى الصوت (يفيد أصوات الأطفال المنخفضة)
          sampleRate: 16000,        // يطابق معدل أخذ العينات الأصلي لنموذج Whisper
          channelCount: 1,          // صوت أحادي (mono) — يكفي للكلام ويطابق ما يتوقعه Whisper،
                                     // ويقلل حجم الملف دون أي تأثير على وضوح الصوت
        },
      });
      if (!mountedRef.current || session !== recordingSessionRef.current || activity !== activityRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      const capturedStream = stream;
      // نختار أول صيغة يدعمها المتصفح فعلياً بدل افتراض "audio/webm" دائماً —
      // Safari لا يدعم WebM إطلاقاً، فكان استخدامه يُسقط التسجيل بصمت هناك
      // (يظهر كخطأ "تعذّر الوصول للميكروفون" رغم أن الإذن مُمنوح فعلاً).
      const preferredMimeTypes = [
        "audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus",
      ];
      const supportedMimeType = preferredMimeTypes.find(
        (t) => typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(t)
      );
      const mr = supportedMimeType
        ? new MediaRecorder(stream, { mimeType: supportedMimeType })
        : new MediaRecorder(stream); // آخر حل احتياطي: صيغة المتصفح الافتراضية
      const actualMimeType = mr.mimeType || supportedMimeType || "audio/webm";
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = async () => {
        capturedStream.getTracks().forEach(t => t.stop());
        clearInterval(timerRef.current);
        if (!mountedRef.current || session !== recordingSessionRef.current || activity !== activityRef.current) return;
        setRecording(false);
        // نستخدم نفس نوع MIME الفعلي الذي سجّل به المتصفح، بدل افتراض "audio/webm"
        // دائماً — هذا يضمن تطابق محتوى الملف مع الصيغة المُرسَلة للباك إند بدقة.
        const blob = new Blob(chunks, { type: actualMimeType });
        if (blob.size < 1000) {
          setError("التسجيل قصير جدًا أو فارغ. سجّل مرة أخرى وتحدث لثوانٍ.");
          return;
        }
        setRecordingUrl(URL.createObjectURL(blob));
        setPendingRecording(blob);
      };
      mr.onerror = () => {
        capturedStream.getTracks().forEach(track => track.stop());
        clearInterval(timerRef.current);
        if (mountedRef.current && session === recordingSessionRef.current) {
          setRecording(false);
          setError("تعذّر حفظ التسجيل. حاول التسجيل مرة أخرى.");
        }
      };
      mr.start(1000);
      mediaRef.current = mr;
      setRecording(true); setTimer(0);
      const startedAt = performance.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.min(120, Math.floor((performance.now() - startedAt) / 1000));
        setTimer(elapsed);
        if (elapsed >= 120) stopRecording();
      }, 1000);
    } catch (err) {
      stream?.getTracks().forEach(track => track.stop());
      if (mountedRef.current && session === recordingSessionRef.current) setMicError(classifyMicError(err));
    } finally {
      permissionPendingRef.current = false;
      if (mountedRef.current) setAcquiringMic(false);
    }
  }

  function stopRecording() {
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const avatar = getState().avatar || "boy1";
  const avatarSrc = `/assets/avatars/${["boy1", "boy2", "girl1", "girl2"].includes(avatar) ? avatar : "boy1"}-v2.png`;

  if (!selectedLesson) return (
    <div className="page-container speaking-library" dir="rtl">
      <button className="speaking-back" onClick={() => setLocation("/skills")}>مسارات التعلم <span aria-hidden="true">/</span> التحدث</button>
      <header className="speaking-library-hero">
        <div><p className="studio-eyebrow">مَهَارَةُ التَّحَدُّثِ</p><h1>لكل حكاية صوت.<br /><span>وهنا تبدأ حكايتك.</span></h1><p className="speaking-intro">صِفْ رِحْلَةً، شَارِكْ فِكْرَةً، أَوْ عَبِّرْ عَنْ رَأْيِكَ.<br />اخْتَرْ دَرْسَكَ وَتَحَدَّثْ بِأُسْلُوبِكَ.</p></div>
        <div className="speaking-hero-art" aria-hidden="true"><span className="speaking-hero-ring" /><div className="speaking-hero-mic"><Mic size={56} strokeWidth={1.3} /></div><div className="speaking-hero-waves">{[16,30,43,25,56,38,22].map((height,i)=><span key={i} style={{height}} />)}</div><span className="speaking-art-note">فكرتك، بصوتك.</span></div>
      </header>
      <div className="speaking-library-heading"><div><p className="studio-eyebrow">من أين نبدأ؟</p><h2>دُرُوسُ التَّحَدُّثِ</h2></div><span>{lessons.length} دروس للاستكشاف</span></div>
      <div className="speaking-lesson-grid">
        {lessons.map((l, index) => <button key={l.id} className="speaking-lesson-card" onClick={() => {
          setSelectedLesson(l);
          setSelectedTopic(l.topics.length === 0 && TOPIC_ACTIVITIES[l.title] ? l.title : "");
          setTopicStarted(false);
        }}>
          <div className="speaking-lesson-cover"><SpeakingLessonArt lesson={l.id} /><span className="speaking-lesson-level">{l.level}</span></div>
          <div className="speaking-lesson-copy"><span className="speaking-lesson-number">الدرس {String(index + 1).padStart(2,"0")}</span><h3>{l.title}</h3><p>{l.desc}</p><span className="speaking-lesson-action">استكشف الدرس <ArrowLeft size={18} aria-hidden="true" /></span></div>
        </button>)}
      </div>
      <aside className="speaking-coach-note"><img src={avatarSrc} alt="" /><div><strong>خذ وقتك، وصوتك سيكبر مع كل محاولة.</strong><p>اختر موضوعك، رتّب أفكارك، ثم سجّل صوتك عندما تكون مستعدًا.</p></div></aside>
    </div>
  );

  return (
    <div dir="rtl" className="activity-page speaking-workspace-page">
      <ActivityHeader title={selectedLesson.title} eyebrow="مهارة التحدث" description={selectedLesson.desc} backLabel="العودة للدروس" onBack={()=>{setSelectedLesson(null);setResult(null);setSelectedTopic("");setTopicStarted(false);setError("");setMicError(null);setJustFinished(false);}} icon={Mic} />
      <div className="activity-body">
        <div className="surface-card bg-white rounded-2xl p-5 shadow">


          {selectedLesson.topics.length > 0 && !selectedTopic && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {selectedLesson.topics.map((t) => (
                <button key={t} onClick={() => { setSelectedTopic(t); setTopicStarted(false); }}
                  className="p-3 rounded-xl text-sm font-bold transition-all"
                  style={{ background: "#e9f0df", color: "#075348" }}>
                  {TOPIC_ICONS[t] ?? "📌"} {t}
                </button>
              ))}
            </div>
          )}

          {/* صفحة النشاط الوسيطة: تظهر بعد اختيار الموضوع، وتبقى ظاهرة أثناء التحدث أيضاً */}
          {selectedTopic && TOPIC_ACTIVITIES[selectedTopic] && (
            <TopicBriefing
              topic={selectedTopic}
              data={TOPIC_ACTIVITIES[selectedTopic]}
              started={topicStarted}
              onBack={() => setSelectedTopic("")}
              onStart={() => setTopicStarted(true)}
            />
          )}

          {/* واجهة التسجيل الحالية — بلا أي تغيير في منطقها، تظهر بعد الضغط على "ابدأ التحدث"
              أو مباشرة إن كان الموضوع بلا صفحة نشاط مُعدّة، أو إن كان الدرس بلا مواضيع أصلاً */}
          {(topicStarted || (selectedTopic && !TOPIC_ACTIVITIES[selectedTopic]) || (selectedLesson.topics.length === 0 && !selectedTopic)) ? (
            <div className={selectedTopic && TOPIC_ACTIVITIES[selectedTopic] ? "mt-5 pt-5 border-t border-gray-200" : ""}>
              {!recording && !loading && !result && (
                <p className="text-center text-gray-500 text-sm mb-3">
                  اضْغَطْ عَلَى الْمِيكْرُوفُونِ وَتَحَدَّثْ لِمُدَّةِ دَقِيقَتَيْنِ
                  {selectedTopic && <strong> عَنْ {selectedTopic}</strong>}
                  <br />
                  <span className="text-xs text-gray-400">قَدْ يَطْلُبُ مِنْكَ الْمُتَصَفِّحُ إِذْنَ اسْتِخْدَامِ الْمِيكْرُوفُونِ — اضْغَطْ "سَمَاحٌ / Allow".</span>
                </p>
              )}

              {micError && <MicPermissionCard info={micError} onRetry={startRecording} />}

              {recording && (
                <div className="text-center mb-2">
                  <p className="text-2xl font-mono font-bold text-green-700 mb-1 animate-pulse">
                    🔴 جَارٍ التَّسْجِيلُ... {fmt(timer)} / 2:00
                  </p>
                  <AudioWaveform stream={mediaRef.current?.stream ?? null} color="#075348" />
                  <p className="text-gray-400 text-xs mt-1">تَحَدَّثْ الْآنَ بِوُضُوحٍ، وَاضْغَطْ ⏹️ عِنْدَ الِانْتِهَاءِ</p>
                </div>
              )}

              {justFinished && !recording && loading && <MicDoneNotice />}

              {!micError && !pendingRecording && !result && (
                <div className="text-center mb-4">
                  <button
                    onClick={recording ? stopRecording : startRecording}
                    disabled={loading || acquiringMic}
                    aria-busy={acquiringMic}
                    aria-label={recording ? "إيقاف التسجيل" : "بدء تسجيل الصوت"}
                    aria-pressed={recording}
                    className="record-control w-20 h-20 rounded-full text-white shadow-sm transition-colors inline-flex items-center justify-center disabled:opacity-50"
                    style={recording
                      ? { background: "#dc2626" }
                      : { background: "var(--primary)" }}
                  >
                    {recording ? <Square size={26} fill="currentColor" aria-hidden="true" /> : <Mic size={30} aria-hidden="true" />}
                  </button>
                  {!recording && !loading && (
                    <p className="text-gray-500 text-sm mt-2">اضْغَطْ لِبَدْءِ التَّسْجِيلِ</p>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {error && (
            <div dir="rtl" className="text-center bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
              <p className="text-red-600 text-sm">⚠️ {error}</p>
              <button onClick={startRecording} className="mt-2 text-xs font-bold text-red-700 underline">
                إِعَادَةُ الْمُحَاوَلَةِ
              </button>
            </div>
          )}

          {recordingUrl && !recording && <section className="surface-card p-5 mt-4"><h3 className="font-semibold mb-3">استمع إلى تسجيلك</h3><audio controls src={recordingUrl} className="w-full" aria-label="تشغيل تسجيلك الصوتي" />{pendingRecording && !loading && !result && <div className="flex flex-wrap gap-3 mt-4"><button className="sawti-btn-primary flex-1" onClick={() => evaluateRecording(pendingRecording)}>إرسال للتقييم</button><button className="sawti-btn-outline" onClick={startRecording}>إعادة التسجيل</button></div>}</section>}

          {loading && <ResultSkeleton label="جَارٍ تَحْلِيلُ صَوْتِكَ بِالذَّكَاءِ الِاصْطِنَاعِيِّ..." />}

          {result && !loading && (
            <div
              className="text-right animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              {/* Transcript */}
              {result.transcript && (
                <div className="surface-card bg-white rounded-xl p-3 mb-3 border border-green-200">
                  <p className="text-xs text-gray-400 mb-2 text-left">📝 مَا قُلْتَهُ:</p>
                  <p className="text-gray-800 leading-loose text-base font-medium text-right" style={{ fontFamily: "var(--font-brand)", lineHeight: "2.2" }}>
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
              <div className="rounded-xl p-4 mb-3" style={{ background: (result.overall||0)>=70 ? "linear-gradient(135deg,#e9f0df,#f4f7ed)" : "linear-gradient(135deg,#fef3e2,#fffbeb)" }}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i=>(
                      <span key={i} style={{color: i<=Math.ceil((result.overall||0)/20)?"#c6a260":"#d1d5db",fontSize:"18px"}}>★</span>
                    ))}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">النَّتِيجَةُ الْكُلِّيَّةُ</p>
                    <p className="text-3xl font-bold" style={{color:(result.overall||0)>=70?"#075348":"#8a7247"}}>{result.overall}%</p>
                  </div>
                </div>
                <p className="text-gray-700 text-sm">{result.feedback}</p>
              </div>
              {/* Skill breakdown — تختلف المعايير حسب نوع النشاط */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {(selectedLesson?.id === "opinion" ? [
                  { label: "🗣️ وُضُوحُ الرَّأْيِ",     value: result.opinion_clarity,  color: "#075348", bg: "#e9f0df", tip: "هل عبّرت عن رأيك بوضوح منذ البداية؟" },
                  { label: "📌 قُوَّةُ الْأَسْبَابِ",    value: result.reasons_score,    color: "#887247", bg: "#f2efdf", tip: "هل دعمت رأيك بسبب أو أكثر؟" },
                  { label: "🗝️ عِبَارَاتُ الرَّأْيِ",   value: result.phrases_score,    color: "#537561", bg: "#eef2e3", tip: "استخدام: أعتقد، في رأيي، لأن، لذلك" },
                  { label: "🔗 تَرَابُطُ الْأَفْكَارِ",  value: result.coherence_score,  color: "#8a7247", bg: "#fef3e2", tip: "تسلسل الأفكار بشكل منطقي" },
                  { label: "🏁 الْخَاتِمَةُ",           value: result.conclusion_score, color: "#dc2626", bg: "#fee2e2", tip: "هل ختمت حديثك بشكل مناسب؟" },
                ] : selectedLesson?.id === "earth" ? [
                  { label: "🧠 فَهْمُ الْفِكْرَةِ",      value: result.understanding_score, color: "#075348", bg: "#e9f0df", tip: "هل فهمت فكرة المنشور الرئيسة؟" },
                  { label: "🎯 تَوْضِيحُ الْهَدَفِ",     value: result.goal_score,          color: "#887247", bg: "#f2efdf", tip: "هل وضّحت الهدف من المنشور؟" },
                  { label: "💡 مُفْرَدَاتُ الْمَوْضُوعِ", value: result.vocabulary_score,     color: "#537561", bg: "#eef2e3", tip: "استخدام كلمات مرتبطة بالموضوع" },
                  { label: "🔗 تَرَابُطُ الْأَفْكَارِ",  value: result.coherence_score,      color: "#8a7247", bg: "#fef3e2", tip: "تسلسل الأفكار بشكل منطقي" },
                  { label: "🌱 رَأْيٌ/اقْتِرَاحٌ",       value: result.opinion_score,        color: "#dc2626", bg: "#fee2e2", tip: "هل قدّمت رأياً أو اقتراحاً مناسباً؟" },
                ] : [
                  { label: "🗣️ وُضُوحُ الْكَلَامِ",   value: result.pronunciation,                              color: "#075348", bg: "#e9f0df",  tip: "مدى وضوح كلامك كما فهمه النظام" },
                  { label: "📝 بِنَاءُ الْجُمَلِ",    value: result.sentence_structure,                         color: "#887247", bg: "#f2efdf",  tip: "ترتيب الكلمات وتكوين الجمل" },
                  { label: "💡 ثَرَاءُ الْمُفْرَدَاتِ", value: result.vocabulary ?? result.grammar ?? 0,          color: "#537561", bg: "#eef2e3",  tip: "تنوع الكلمات المستخدمة" },
                  { label: "🔗 تَرَابُطُ الْأَفْكَارِ", value: result.coherence ?? result.sentence_structure ?? 0, color: "#8a7247", bg: "#fef3e2",  tip: "ترتيب الأفكار وتسلسلها" },
                ]).map(({label,value,color,bg,tip}, i)=>(
                  <div
                    key={label}
                    className="rounded-xl p-3 text-center animate-in fade-in slide-in-from-bottom-1"
                    style={{background:bg, animationDelay:`${50*i}ms`, animationDuration:"200ms", animationFillMode:"both"}}
                  >
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className="text-xl font-bold" style={{color}}>{value ?? 0}%</p>
                    <div className="w-full h-1.5 bg-white rounded-full mt-1 overflow-hidden">
                      <div className="h-1.5 rounded-full" style={{width:`${value ?? 0}%`,background:color}}/>
                    </div>
                    <p className="text-gray-400 text-xs mt-1">{tip}</p>
                  </div>
                ))}
              </div>
              {/* نقاط القوة */}
              {Array.isArray(result.strengths) && result.strengths.length > 0 && (
                <div className="bg-green-50 rounded-xl p-3 mb-3 border border-green-100">
                  <p className="font-bold text-green-700 text-sm mb-2 text-right">✅ نِقَاطُ الْقُوَّةِ:</p>
                  <ul className="text-right text-sm text-gray-700 space-y-1">
                    {result.strengths.map((s: string, i: number) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              )}
              {/* اقتراحات التحسين */}
              {Array.isArray(result.suggestions) && result.suggestions.length > 0 && (
                <div className="bg-[#faf6e9] rounded-xl p-3 mb-3 border border-[#f3ecd5]">
                  <p className="font-bold text-[#8a7247] text-sm mb-2 text-right">💡 اقْتِرَاحَاتُ التَّحْسِينِ:</p>
                  <ul className="text-right text-sm text-gray-700 space-y-1">
                    {result.suggestions.map((s: string, i: number) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              )}
              {/* Errors */}
              {result.errors?.length > 0 && (
                <div className="surface-card bg-white rounded-xl p-3 mb-3 border border-red-100">
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
                <div className="bg-[#faf6e9] rounded-xl p-3 border border-[#f3ecd5]">
                  <p className="font-bold text-[#8a7247] text-sm mb-2">💡 اقْتِرَاحَاتٌ:</p>
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
