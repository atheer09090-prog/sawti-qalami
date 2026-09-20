import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { evaluateSpeech, diacritizeText, getSpeakingLessons } from "@/lib/api";
import { playSound, stopSound, playEffect, stopAll, audioFile } from "@/lib/audio";
import { setState, getState } from "@/lib/store";
import { classifyMicError, checkMicSupport, type MicErrorInfo } from "@/lib/mic";
import { MicPermissionCard, MicDoneNotice } from "@/components/MicPermissionCard";
import { ResultSkeleton } from "@/components/ResultSkeleton";

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
      <button onClick={onBack} className="text-green-600 text-sm mb-3 flex items-center gap-1">← تَغْيِيرُ الْمَوْضُوعِ</button>

      {/* ١) الوسيلة البصرية: منشور توعوي نصّي (إن وُجد)، وإلا صورة أو فيديو */}
      {data.poster ? (
        <div className="rounded-2xl overflow-hidden mb-4 shadow-sm border-2" style={{ borderColor: "#1a5c2a" }}>
          <div className="p-3 text-center" style={{ background: "linear-gradient(135deg, #1a5c2a, #2d7a3e)" }}>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/25 text-white">📢 مَنْشُورٌ تَوْعَوِيٌّ</span>
          </div>
          <div className="p-5 text-center" style={{ background: "#f7fbf8" }}>
            <p className="font-bold text-xl mb-3" style={{ color: "#1a5c2a" }}>{data.poster.title}</p>
            <p className="text-gray-700 text-sm leading-loose">{data.poster.body}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden mb-4 shadow-sm" style={{ aspectRatio: "16/9", background: "#dcf5e7" }}>
          {data.video ? (
            <video controls className="w-full h-full object-cover" src={data.video} />
          ) : (
            <img src={data.image} alt={topic} className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          )}
        </div>
      )}

      <h2 className="text-right font-bold text-xl mb-4" style={{ color: "#1a5c2a" }}>{TOPIC_ICONS[topic] ?? "📌"} {topic}</h2>

      {/* ٢) بطاقة أهداف النشاط */}
      <div className="rounded-2xl p-4 mb-4 shadow-sm" style={{ background: "#fff" }}>
        <p className="font-bold text-right mb-2" style={{ color: "#1a5c2a" }}>🎯 أَهْدَافُ النَّشَاطِ</p>
        <ul className="text-right text-gray-700 text-sm space-y-1.5 leading-relaxed">
          {data.objectives.map((o, i) => <li key={i}>• {o}</li>)}
        </ul>
      </div>

      {/* ٣) بطاقة الكلمات المساعدة */}
      <div className="rounded-2xl p-4 mb-4 shadow-sm" style={{ background: "#fff" }}>
        <p className="font-bold text-right mb-3" style={{ color: "#1a5c2a" }}>🗝️ كَلِمَاتٌ تُسَاعِدُكَ</p>
        <div className="flex flex-wrap gap-2 justify-end">
          {data.keywords.map((k, i) => (
            <span key={i} className="text-sm px-3 py-1.5 rounded-full font-medium" style={{ background: "#dcf5e7", color: "#1a5c2a" }}>{k}</span>
          ))}
        </div>
      </div>

      {/* ٤) بطاقة الأسئلة الإرشادية */}
      <div className="rounded-2xl p-4 mb-5 shadow-sm" style={{ background: "#fff" }}>
        <p className="font-bold text-right mb-2" style={{ color: "#1a5c2a" }}>❓ أَسْئِلَةٌ تُسَاعِدُكَ عَلَى التَّحَدُّثِ</p>
        <ul className="text-right text-gray-700 text-sm space-y-1.5 leading-relaxed">
          {data.questions.map((q, i) => <li key={i}>• {q}</li>)}
        </ul>
      </div>

      {/* ٥) زر بدء التحدث — يختفي بعد الضغط ليُفسح المجال لواجهة التسجيل أسفله،
             بينما تبقى الأهداف والكلمات والأسئلة ظاهرة طوال وقت التحدث */}
      {!started ? (
        <button onClick={onStart}
          className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-md active:scale-95 transition-all"
          style={{ background: "linear-gradient(135deg, #1a5c2a, #2d7a3e)" }}>
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
          topics: backendTopics.length > 0 ? backendTopics : local.topics,
        };
      });
      // أضِف أي درس محلي جديد غير موجود بعد في بيانات الباكند
      for (const local of DEFAULT_LESSONS) {
        if (!merged.some((m: any) => m.id === local.id)) merged.push(local);
      }
      setLessons(merged);
    });
  }, []);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [topicStarted, setTopicStarted] = useState(false); // هل ضغط الطالب "ابدأ التحدث" بعد صفحة النشاط؟
  const [recording, setRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [micError, setMicError] = useState<MicErrorInfo | null>(null);
  const [justFinished, setJustFinished] = useState(false);
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
    setError(""); setResult(null); setMicError(null); setJustFinished(false);
    const supportIssue = checkMicSupport();
    if (supportIssue) { setMicError(supportIssue); return; }
    stopSound(); // Stop intro audio BEFORE recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,   // إلغاء صدى الصوت
          noiseSuppression: true,   // تقليل ضوضاء الخلفية (مهم في بيئة الفصل)
          autoGainControl: true,    // ضبط تلقائي لمستوى الصوت (يفيد أصوات الأطفال المنخفضة)
          sampleRate: 16000,        // يطابق معدل أخذ العينات الأصلي لنموذج Whisper
          channelCount: 1,          // صوت أحادي (mono) — يكفي للكلام ويطابق ما يتوقعه Whisper،
                                     // ويقلل حجم الملف دون أي تأثير على وضوح الصوت
        },
      });
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
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        // نستخدم نفس نوع MIME الفعلي الذي سجّل به المتصفح، بدل افتراض "audio/webm"
        // دائماً — هذا يضمن تطابق محتوى الملف مع الصيغة المُرسَلة للباك إند بدقة.
        const blob = new Blob(chunksRef.current, { type: actualMimeType });
        setJustFinished(true);
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
          setError("تَعَذَّرَ الِاتِّصَالُ بِالْخَادِمِ. تَأَكَّدْ مِنِ اتِّصَالِكَ بِالإِنْتَرْنِتِ، ثُمَّ حَاوِلْ مَرَّةً أُخْرَى.");
        }
        setJustFinished(false);
        setLoading(false);
      };
      mr.start(1000);
      mediaRef.current = mr;
      setRecording(true); setTimer(0);
      timerRef.current = setInterval(() => {
        setTimer(t => { if (t >= 119) { stopRecording(); return t; } return t + 1; });
      }, 1000);
    } catch (err) {
      setMicError(classifyMicError(err));
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
            <button key={l.id} onClick={() => {
                setSelectedLesson(l);
                // إن كان الدرس بلا قائمة مواضيع متعددة (كـ"ساعة الأرض")، نعرض صفحة نشاطه مباشرة
                setSelectedTopic(l.topics.length === 0 && TOPIC_ACTIVITIES[l.title] ? l.title : "");
                setTopicStarted(false);
              }}
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
          onClick={() => { setSelectedLesson(null); setResult(null); setSelectedTopic(""); setTopicStarted(false); setError(""); setMicError(null); setJustFinished(false); }}
          className="text-green-600 text-sm mb-3 flex items-center gap-1">
          ← الْعَوْدَةُ لِلدُّرُوسِ
        </button>
        <div className="bg-white rounded-2xl p-5 shadow">
          <h2 className="text-right font-bold text-xl mb-2">{selectedLesson.icon} {selectedLesson.title}</h2>
          <p className="text-right text-gray-500 text-sm mb-4">{selectedLesson.desc}</p>

          {selectedLesson.topics.length > 0 && !selectedTopic && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {selectedLesson.topics.map((t) => (
                <button key={t} onClick={() => { setSelectedTopic(t); setTopicStarted(false); }}
                  className="p-3 rounded-xl text-sm font-bold transition-all"
                  style={{ background: "#dcf5e7", color: "#1a5c2a" }}>
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
                  <p className="text-gray-400 text-xs">تَحَدَّثْ الْآنَ بِوُضُوحٍ، وَاضْغَطْ ⏹️ عِنْدَ الِانْتِهَاءِ</p>
                </div>
              )}

              {justFinished && !recording && loading && <MicDoneNotice />}

              {!micError && (
                <div className="text-center mb-4">
                  <button
                    onClick={recording ? stopRecording : startRecording}
                    disabled={loading}
                    className="w-20 h-20 rounded-full text-3xl text-white shadow-lg transition-all hover:scale-105 disabled:opacity-50"
                    style={recording
                      ? { background: "#dc2626" }
                      : { background: "linear-gradient(135deg, #1a5c2a, #2d7a3e)" }}
                  >
                    {recording ? "⏹️" : "🎙️"}
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

          {loading && <ResultSkeleton label="جَارٍ تَحْلِيلُ صَوْتِكَ بِالذَّكَاءِ الِاصْطِنَاعِيِّ..." />}

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
              {/* Skill breakdown — تختلف المعايير حسب نوع النشاط */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {(selectedLesson?.id === "opinion" ? [
                  { label: "🗣️ وُضُوحُ الرَّأْيِ",     value: result.opinion_clarity,  color: "#1a5c2a", bg: "#dcf5e7", tip: "هل عبّرت عن رأيك بوضوح منذ البداية؟" },
                  { label: "📌 قُوَّةُ الْأَسْبَابِ",    value: result.reasons_score,    color: "#7c3aed", bg: "#ede9f5", tip: "هل دعمت رأيك بسبب أو أكثر؟" },
                  { label: "🗝️ عِبَارَاتُ الرَّأْيِ",   value: result.phrases_score,    color: "#0c7490", bg: "#e0f7fa", tip: "استخدام: أعتقد، في رأيي، لأن، لذلك" },
                  { label: "🔗 تَرَابُطُ الْأَفْكَارِ",  value: result.coherence_score,  color: "#b45309", bg: "#fef3e2", tip: "تسلسل الأفكار بشكل منطقي" },
                  { label: "🏁 الْخَاتِمَةُ",           value: result.conclusion_score, color: "#dc2626", bg: "#fee2e2", tip: "هل ختمت حديثك بشكل مناسب؟" },
                ] : selectedLesson?.id === "earth" ? [
                  { label: "🧠 فَهْمُ الْفِكْرَةِ",      value: result.understanding_score, color: "#1a5c2a", bg: "#dcf5e7", tip: "هل فهمت فكرة المنشور الرئيسة؟" },
                  { label: "🎯 تَوْضِيحُ الْهَدَفِ",     value: result.goal_score,          color: "#7c3aed", bg: "#ede9f5", tip: "هل وضّحت الهدف من المنشور؟" },
                  { label: "💡 مُفْرَدَاتُ الْمَوْضُوعِ", value: result.vocabulary_score,     color: "#0c7490", bg: "#e0f7fa", tip: "استخدام كلمات مرتبطة بالموضوع" },
                  { label: "🔗 تَرَابُطُ الْأَفْكَارِ",  value: result.coherence_score,      color: "#b45309", bg: "#fef3e2", tip: "تسلسل الأفكار بشكل منطقي" },
                  { label: "🌱 رَأْيٌ/اقْتِرَاحٌ",       value: result.opinion_score,        color: "#dc2626", bg: "#fee2e2", tip: "هل قدّمت رأياً أو اقتراحاً مناسباً؟" },
                ] : [
                  { label: "🗣️ وُضُوحُ النُّطْقِ",   value: result.pronunciation,                              color: "#1a5c2a", bg: "#dcf5e7",  tip: "مدى وضوح نطق الكلمات" },
                  { label: "📝 بِنَاءُ الْجُمَلِ",    value: result.sentence_structure,                         color: "#7c3aed", bg: "#ede9f5",  tip: "ترتيب الكلمات وتكوين الجمل" },
                  { label: "💡 ثَرَاءُ الْمُفْرَدَاتِ", value: result.vocabulary ?? result.grammar ?? 0,          color: "#0c7490", bg: "#e0f7fa",  tip: "تنوع الكلمات المستخدمة" },
                  { label: "🔗 تَرَابُطُ الْأَفْكَارِ", value: result.coherence ?? result.sentence_structure ?? 0, color: "#b45309", bg: "#fef3e2",  tip: "ترتيب الأفكار وتسلسلها" },
                ]).map(({label,value,color,bg,tip})=>(
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
                <div className="bg-amber-50 rounded-xl p-3 mb-3 border border-amber-100">
                  <p className="font-bold text-amber-700 text-sm mb-2 text-right">💡 اقْتِرَاحَاتُ التَّحْسِينِ:</p>
                  <ul className="text-right text-sm text-gray-700 space-y-1">
                    {result.suggestions.map((s: string, i: number) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              )}
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
