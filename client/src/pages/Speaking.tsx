import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { evaluateSpeech, diacritizeText, getSpeakingLessons, describeError } from "@/lib/api";
import { playSound, stopSound, playEffect, stopAll, audioFile } from "@/lib/audio";
import { setState, getState } from "@/lib/store";
import { classifyMicError, checkMicSupport, type MicErrorInfo } from "@/lib/mic";
import { MicPermissionCard } from "@/components/MicPermissionCard";
import { RecordingCard } from "@/components/RecordingCard";
import {
  AlertCircle, ArrowLeft, AudioLines, Brain, CheckCircle2, FileText, Flag, HelpCircle, KeyRound, Lightbulb, Link2,
  ListOrdered, Megaphone, MessageSquare, Mic, Quote, RotateCcw, Target, Leaf, Pin,
} from "lucide-react";
import { Btn, CriterionTile, ErrorState, PageHeader, ProcessingState, ResultList, ScoreCard, SectionHeader } from "@/components/ds";

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

function TopicBriefing({ topic, data, onBack }: { topic: string; data: TopicActivity; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <Btn variant="ghost" size="sm" icon={RotateCcw} onClick={onBack}>تَغْيِيرُ الْمَوْضُوعِ</Btn>

      {/* ١) الوسيلة البصرية: منشور توعوي نصّي (إن وُجد)، وإلا صورة أو فيديو */}
      {data.poster ? (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 bg-primary px-5 py-2.5 text-sm font-semibold text-white">
            <Megaphone size={17} strokeWidth={1.85} aria-hidden /> مَنْشُورٌ تَوْعَوِيٌّ
          </div>
          <div className="bg-primary-soft/40 p-5 text-center md:p-6">
            <p className="t-section mb-3 text-primary">{data.poster.title}</p>
            <p className="t-body text-text-primary">{data.poster.body}</p>
          </div>
        </div>
      ) : (data.video || data.image) ? (
        <div className="card overflow-hidden bg-primary-soft" style={{ aspectRatio: "16/9" }}>
          {data.video ? (
            <video controls className="size-full object-cover" src={data.video} />
          ) : (
            <img src={data.image} alt={topic} className="size-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          )}
        </div>
      ) : null}

      <h2 className="t-section flex items-center gap-2 text-text-primary">
        <span className="grid size-10 place-items-center rounded-xl bg-skill-soft text-lg">{TOPIC_ICONS[topic] ?? "📌"}</span>{topic}
      </h2>

      {/* ٢) أهداف النشاط */}
      <section className="card card-pad">
        <h3 className="t-card-title mb-2 flex items-center gap-2 text-primary"><Target size={19} strokeWidth={1.85} aria-hidden /> أَهْدَافُ النَّشَاطِ</h3>
        <ul className="t-body space-y-1 text-text-secondary">
          {data.objectives.map((o, i) => <li key={i} className="flex gap-2"><span className="mt-3 size-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden />{o}</li>)}
        </ul>
      </section>

      {/* ٣) الكلمات المساعدة */}
      <section className="card card-pad">
        <h3 className="t-card-title mb-3 flex items-center gap-2 text-primary"><KeyRound size={19} strokeWidth={1.85} aria-hidden /> كَلِمَاتٌ تُسَاعِدُكَ</h3>
        <ul className="flex flex-wrap gap-2">
          {data.keywords.map((k, i) => <li key={i} className="badge badge-primary !px-3.5 !py-1 !text-[0.9375rem]">{k}</li>)}
        </ul>
      </section>

      {/* ٤) الأسئلة الإرشادية */}
      <section className="card card-pad">
        <h3 className="t-card-title mb-2 flex items-center gap-2 text-primary"><HelpCircle size={19} strokeWidth={1.85} aria-hidden /> أَسْئِلَةٌ تُسَاعِدُكَ عَلَى التَّحَدُّثِ</h3>
        <ul className="t-body space-y-1 text-text-secondary">
          {data.questions.map((q, i) => <li key={i} className="flex gap-2"><span className="mt-3 size-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden />{q}</li>)}
        </ul>
      </section>
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
  const resultRef = useRef<HTMLDivElement | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);   // التسجيل بانتظار الاستماع/الإرسال (يُحفَظ إن فشل الإرسال)
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
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
    setError(""); setResult(null); setMicError(null); setJustFinished(false); clearPending();
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
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        // نستخدم نفس نوع MIME الفعلي الذي سجّل به المتصفح، بدل افتراض "audio/webm"
        // دائماً — هذا يضمن تطابق محتوى الملف مع الصيغة المُرسَلة للباك إند بدقة.
        const blob = new Blob(chunksRef.current, { type: actualMimeType });
        // مرحلة مراجعة: يستمع الطالب لتسجيله ثم يرسله للتقييم أو يعيد التسجيل
        setPendingBlob(blob);
        setReviewUrl(URL.createObjectURL(blob));
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

  // عند ظهور النتيجة (أسفل صفحة طويلة) نمرّر إليها بنعومة
  useEffect(() => {
    if (result && !loading) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result, loading]);

  /** إرسال التسجيل المحفوظ للتقييم. عند الفشل يبقى التسجيل محفوظًا ليُعاد الإرسال دون إعادة التحدث. */
  async function submitRecording() {
    if (!pendingBlob) return;
    setError(""); setLoading(true);
    try {
      const res = await evaluateSpeech(pendingBlob, selectedTopic, 0, selectedLesson?.id || "");
      setResult(res);
      if (res.transcript) {
        // Show raw transcript immediately, then enhance with diacritics
        setEnhancedTranscript(res.transcript);
        diacritizeText(res.transcript).then((diacritized) => {
          setEnhancedTranscript(diacritized);
        });
      }
      const score = res.overall || 0;
      // إن لم يُتعرَّف على أي كلام (نص فارغ) لا تُمنح نجمة؛ كانت تُمنح نجمة واحدة حتى مع الدرجة 0
      const noSpeech = !res.transcript || !res.transcript.trim();
      const newStars = noSpeech ? 0 : score >= 90 ? 5 : score >= 70 ? 4 : score >= 50 ? 3 : score >= 30 ? 2 : 1;
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
      clearPending();
    } catch (e) {
      setError(describeError(e, "تَعَذَّرَ الِاتِّصَالُ بِالْخَادِمِ. تَأَكَّدْ مِنِ اتِّصَالِكَ بِالإِنْتَرْنِتِ، ثُمَّ حَاوِلْ مَرَّةً أُخْرَى."));
    }
    setLoading(false);
  }

  function clearPending() {
    setPendingBlob(null);
    setReviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
  }

  function retakeRecording() { clearPending(); startRecording(); }

  function resetToLessons() {
    clearPending();
    setSelectedLesson(null); setResult(null); setSelectedTopic(""); setTopicStarted(false); setError(""); setMicError(null); setJustFinished(false);
  }

  function stopRecording() {
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  /* ───────── قائمة دروس التحدث ───────── */
  if (!selectedLesson) return (
    <div className="page-container page-section skill-speaking">
      <PageHeader skill="speaking" icon={Mic} title="مَهَارَةُ التَّحَدُّثِ"
        description="تَعَلَّمِ التَّعْبِيرَ الشَّفَهِيَّ وَالتَّحَدُّثَ بِثِقَةٍ."
        back={{ label: "الْمَهَارَاتُ", to: "/skills" }} />
      <SectionHeader title="دُرُوسُ التَّحَدُّثِ" description="اخْتَرْ دَرْسًا لِتَبْدَأَ." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {lessons.map((l, i) => (
          <button key={l.id} type="button" style={{ ["--i" as string]: i }}
            onClick={() => {
              setSelectedLesson(l);
              // إن كان الدرس بلا قائمة مواضيع متعددة (كـ"ساعة الأرض")، نعرض صفحة نشاطه مباشرة
              setSelectedTopic(l.topics.length === 0 && TOPIC_ACTIVITIES[l.title] ? l.title : "");
              setTopicStarted(false);
            }}
            className="card card-interactive card-pad stagger-in group flex flex-col gap-3 text-right">
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-14 place-items-center rounded-2xl bg-skill-soft text-3xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">{l.icon}</span>
              <span className="badge badge-skill">{l.level}</span>
            </div>
            <div className="flex-1">
              <h3 className="t-card-title text-text-primary">{l.title}</h3>
              <p className="t-small mt-1 text-text-secondary">{l.desc}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              ابْدَأِ الدَّرْسَ <ArrowLeft size={16} strokeWidth={2} className="transition-transform duration-200 group-hover:-translate-x-1" aria-hidden />
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  /* ───────── لوحة التسجيل (تُستخدم بجانب صفحة النشاط أو وحدها) ───────── */
  const activity = selectedTopic ? TOPIC_ACTIVITIES[selectedTopic] : undefined;
  const showRecorder = topicStarted || (selectedTopic && !activity) || (selectedLesson.topics.length === 0 && !selectedTopic);
  const needsTopic = selectedLesson.topics.length > 0 && !selectedTopic;

  const recordingPanel = (
    <div className="space-y-4">
      {!showRecorder ? (
        <section className="card card-pad text-center">
          <span className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary"><Mic size={28} strokeWidth={1.75} /></span>
          <h3 className="t-card-title text-text-primary">هَلْ أَنْتَ جَاهِزٌ لِلتَّحَدُّثِ؟</h3>
          <p className="t-small mb-4 mt-1 text-text-secondary">اقْرَأِ الْأَهْدَافَ وَالْكَلِمَاتِ وَالْأَسْئِلَةَ، ثُمَّ ابْدَأْ. سَتَبْقَى أَمَامَكَ أَثْنَاءَ التَّحَدُّثِ.</p>
          <Btn size="lg" block icon={Mic} onClick={() => setTopicStarted(true)}>ابْدَأِ التَّحَدُّثَ</Btn>
        </section>
      ) : micError ? (
        <MicPermissionCard info={micError} onRetry={startRecording} />
      ) : loading ? (
        <ProcessingState icon={AudioLines} title="جَارٍ تَحْلِيلُ تَسْجِيلِكَ..." description="قَدْ يَسْتَغْرِقُ ذَلِكَ عِدَّةَ ثَوَانٍ." />
      ) : (
        <RecordingCard
          recording={recording} busy={loading} timer={timer} stream={mediaRef.current?.stream ?? null}
          topic={selectedTopic || undefined}
          onToggle={recording ? stopRecording : startRecording}
          review={pendingBlob && reviewUrl && !recording ? { url: reviewUrl, onRetry: retakeRecording, onSubmit: submitRecording } : undefined}
        />
      )}
      {error && <ErrorState message={error} onRetry={pendingBlob ? submitRecording : startRecording} />}
    </div>
  );

  /* ───────── نتيجة التقييم ───────── */
  const criteria = selectedLesson.id === "opinion" ? [
    { icon: MessageSquare, label: "وُضُوحُ الرَّأْيِ",     value: result?.opinion_clarity,  tip: "هل عبّرت عن رأيك بوضوح منذ البداية؟" },
    { icon: Pin,           label: "قُوَّةُ الْأَسْبَابِ",   value: result?.reasons_score,    tip: "هل دعمت رأيك بسبب أو أكثر؟" },
    { icon: Quote,         label: "عِبَارَاتُ الرَّأْيِ",   value: result?.phrases_score,    tip: "استخدام: أعتقد، في رأيي، لأن، لذلك" },
    { icon: Link2,         label: "تَرَابُطُ الْأَفْكَارِ", value: result?.coherence_score,  tip: "تسلسل الأفكار بشكل منطقي" },
    { icon: Flag,          label: "الْخَاتِمَةُ",          value: result?.conclusion_score, tip: "هل ختمت حديثك بشكل مناسب؟" },
  ] : selectedLesson.id === "earth" ? [
    { icon: Brain,         label: "فَهْمُ الْفِكْرَةِ",      value: result?.understanding_score, tip: "هل فهمت فكرة المنشور الرئيسة؟" },
    { icon: Target,        label: "تَوْضِيحُ الْهَدَفِ",     value: result?.goal_score,          tip: "هل وضّحت الهدف من المنشور؟" },
    { icon: Lightbulb,     label: "مُفْرَدَاتُ الْمَوْضُوعِ", value: result?.vocabulary_score,     tip: "استخدام كلمات مرتبطة بالموضوع" },
    { icon: Link2,         label: "تَرَابُطُ الْأَفْكَارِ",  value: result?.coherence_score,      tip: "تسلسل الأفكار بشكل منطقي" },
    { icon: Leaf,          label: "رَأْيٌ/اقْتِرَاحٌ",       value: result?.opinion_score,        tip: "هل قدّمت رأياً أو اقتراحاً مناسباً؟" },
  ] : [
    { icon: MessageSquare, label: "وُضُوحُ الْكَلَامِ",   value: result?.pronunciation,                               tip: "مدى وضوح كلامك كما فهمه النظام" },
    { icon: ListOrdered,   label: "بِنَاءُ الْجُمَلِ",    value: result?.sentence_structure,                          tip: "ترتيب الكلمات وتكوين الجمل" },
    { icon: Lightbulb,     label: "ثَرَاءُ الْمُفْرَدَاتِ", value: result?.vocabulary ?? result?.grammar ?? 0,         tip: "تنوع الكلمات المستخدمة" },
    { icon: Link2,         label: "تَرَابُطُ الْأَفْكَارِ", value: result?.coherence ?? result?.sentence_structure ?? 0, tip: "ترتيب الأفكار وتسلسلها" },
  ];

  // تظليل الكلمات الخاطئة في نص الطالب (منطق كما كان)
  const transcriptNode = (() => {
    const text: string = enhancedTranscript || result?.transcript || "";
    const errors: any[] = result?.errors || [];
    if (!errors.length) return text;
    const stripDia = (s: string) => s.replace(/[ً-ٰٟ]/g, "");
    const wrongSet = new Set(errors.map((e: any) => stripDia(e.wrong || "")));
    return text.split(/(\s+)/).map((w: string, i: number) => {
      if (/^\s+$/.test(w)) return w;
      const clean = stripDia(w.replace(/[.,،؟!؛:]/g, ""));
      return wrongSet.has(clean)
        ? <mark key={i} className="rounded bg-error-soft px-0.5 text-error" style={{ textDecoration: "underline wavy var(--error)", textUnderlineOffset: 5 }}>{w}</mark>
        : <span key={i}>{w}</span>;
    });
  })();

  /* ───────── صفحة الدرس ───────── */
  return (
    <div className="page-container page-section skill-speaking">
      <PageHeader skill="speaking" icon={Mic} title={selectedLesson.title} description={selectedLesson.desc}
        back={{ label: "الْعَوْدَةُ لِلدُّرُوسِ", onClick: resetToLessons }} />

      {needsTopic && (
        <section aria-label="اختيار الموضوع">
          <SectionHeader title="اخْتَرْ مَوْضُوعَكَ" description="سَتَتَحَدَّثُ عَنْهُ لِمُدَّةِ دَقِيقَتَيْنِ." />
          <div className="grid gap-3 sm:grid-cols-2">
            {selectedLesson.topics.map((t, i) => (
              <button key={t} type="button" style={{ ["--i" as string]: i }}
                onClick={() => { setSelectedTopic(t); setTopicStarted(false); }}
                className="card card-interactive stagger-in flex items-center gap-3.5 p-4 text-right">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-skill-soft text-2xl">{TOPIC_ICONS[t] ?? "📌"}</span>
                <span className="t-card-title text-text-primary">{t}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* صفحة النشاط (تبقى ظاهرة أثناء التحدث) + التسجيل بجانبها على الشاشات الواسعة */}
      {selectedTopic && activity && (
        <div className="grid items-start gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3"><TopicBriefing topic={selectedTopic} data={activity} onBack={() => { clearPending(); setSelectedTopic(""); setTopicStarted(false); setResult(null); }} /></div>
          <div className="lg:sticky lg:top-24 lg:col-span-2">{recordingPanel}</div>
        </div>
      )}
      {!needsTopic && !(selectedTopic && activity) && <div className="mx-auto max-w-xl">{recordingPanel}</div>}

      {result && !loading && (
        <div ref={resultRef} className="mt-10 scroll-mt-24 space-y-4 page-enter" aria-live="polite">
          <SectionHeader title="نَتِيجَتُكَ" description="هَذَا مَا حَلَّلَهُ النِّظَامُ مِنْ تَسْجِيلِكَ." />
          <ScoreCard score={result.overall || 0} feedback={result.feedback} />

          {result.transcript && (
            <section className="card card-pad">
              <h3 className="t-card-title mb-2 flex items-center gap-2 text-text-primary"><FileText size={19} strokeWidth={1.85} className="text-primary" aria-hidden /> مَا قُلْتَهُ</h3>
              <p className="font-reading text-lg text-text-primary" style={{ lineHeight: 2.2 }}>{transcriptNode}</p>
            </section>
          )}

          <div className={`grid gap-3 sm:grid-cols-2 ${criteria.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            {criteria.map((c, i) => <CriterionTile key={c.label} index={i} icon={c.icon} label={c.label} value={c.value ?? 0} tip={c.tip} />)}
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            {Array.isArray(result.strengths) && result.strengths.length > 0 && (
              <ResultList tone="success" icon={CheckCircle2} title="نِقَاطُ الْقُوَّةِ">
                <ul className="t-body space-y-1 text-text-secondary">{result.strengths.map((x: string, i: number) => <li key={i} className="flex gap-2"><CheckCircle2 size={16} className="mt-2 shrink-0 text-success" aria-hidden />{x}</li>)}</ul>
              </ResultList>
            )}
            {Array.isArray(result.suggestions) && result.suggestions.length > 0 && (
              <ResultList tone="warning" icon={Lightbulb} title="اقْتِرَاحَاتُ التَّحْسِينِ">
                <ul className="t-body space-y-1 text-text-secondary">{result.suggestions.map((x: string, i: number) => <li key={i} className="flex gap-2"><Lightbulb size={16} className="mt-2 shrink-0 text-warning" aria-hidden />{x}</li>)}</ul>
              </ResultList>
            )}
          </div>

          {result.errors?.length > 0 && (
            <ResultList tone="error" icon={AlertCircle} title="أَخْطَاءٌ مُكْتَشَفَةٌ">
              <ul className="space-y-2">
                {result.errors.map((e: any, i: number) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-subtle px-3.5 py-2.5">
                    <span className="flex items-center gap-2 font-semibold">
                      <span className="text-error line-through decoration-2">{e.wrong}</span>
                      <ArrowLeft size={14} className="text-text-muted" aria-hidden />
                      <span className="text-success">{e.correct}</span>
                    </span>
                    <span className="t-small text-text-secondary">{e.explanation}</span>
                  </li>
                ))}
              </ul>
            </ResultList>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Btn icon={RotateCcw} onClick={() => { setResult(null); startRecording(); }}>تَدَرَّبْ مَرَّةً أُخْرَى</Btn>
            <Btn variant="outline" onClick={resetToLessons}>الْعَوْدَةُ لِلدُّرُوسِ</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
