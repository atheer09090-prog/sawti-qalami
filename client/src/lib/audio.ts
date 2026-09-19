/**
 * Sawti Qalami — Central Audio Manager (v3)
 * Single source of truth for ALL audio. One sound at a time.
 */

let _bgAudio: HTMLAudioElement | null = null;
let _effectAudio: HTMLAudioElement | null = null;
let _gender: "male" | "female" = "male";

/* ── Gender ── */
export function setGender(g: "male" | "female") { _gender = g; }
export function getGender() { return _gender; }

/** Call once at app startup to restore gender from saved avatar */
export function initGenderFromStore() {
  try {
    const raw = localStorage.getItem("sawti_qalami_v2_state");
    if (raw) {
      const { avatar } = JSON.parse(raw);
      const isFemale = avatar === "girl1" || avatar === "girl2";
      _gender = isFemale ? "female" : "male";
    }
  } catch { /* ignore */ }
}

/* ── Stop ALL audio (call on every page unmount) ── */
export function stopAll() {
  if (_bgAudio) { _bgAudio.pause(); _bgAudio.currentTime = 0; _bgAudio = null; }
  if (_effectAudio) { _effectAudio.pause(); _effectAudio.currentTime = 0; _effectAudio = null; }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function stopSound() { stopAll(); }

/* ── Play background/intro audio ── */
export function playSound(src: string, vol = 0.5): HTMLAudioElement {
  stopAll();
  const a = new Audio(src);
  a.volume = vol;
  a.play().catch(() => {});
  _bgAudio = a;
  a.addEventListener("ended", () => { if (_bgAudio === a) _bgAudio = null; });
  return a;
}

/* ── Play intro WAV then TTS after it ends (no overlap) ── */
export function playSoundThenSpeak(src: string, ttsText: string, vol = 0.5) {
  stopAll();
  const a = new Audio(src);
  a.volume = vol;
  _bgAudio = a;
  a.addEventListener("ended", () => {
    if (_bgAudio === a) _bgAudio = null;
    speak(ttsText);
  });
  a.play().catch(() => speak(ttsText)); // fallback if audio fails
}

/** Returns gender-appropriate audio path based on actual filenames */
export function audioFile(base: string): string {
  if (_gender !== "female") return base;
  const map: Record<string, string> = {
    "/assets/welcome.mp3":               "/assets/Welcome-girl.mp3",
    "/assets/correct.mp3":               "/assets/correct-girl.mp3",
    "/assets/tryagain.mp3":              "/assets/tryagain-girl.mp3",
    "/assets/achievement.mp3":           "/assets/achievement-girl.mp3",
    "/assets/lesson-speaking-intro.mp3": "/assets/lesson-speaking-intro-girl.mp3",
    "/assets/lesson-writing-intro.mp3":  "/assets/lesson-writing-intro-girl.mp3",
    "/assets/lesson-earth-hour.mp3":     "/assets/lesson-earth-hour-girl.mp3",
  };
  return map[base] ?? base;
}

/* ── Play short effect (correct / tryagain / achievement) ── */
export function playEffect(src: string, vol = 0.7) {
  if (_effectAudio) { _effectAudio.pause(); _effectAudio.currentTime = 0; }
  const a = new Audio(src);
  a.volume = vol;
  a.play().catch(() => {});
  _effectAudio = a;
  a.addEventListener("ended", () => { if (_effectAudio === a) _effectAudio = null; });
}

/* ── TTS ── */
function getVoice(gender: "male" | "female") {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const ar = voices.filter(v => v.lang.startsWith("ar"));
  if (!ar.length) return voices[0] || null;
  const femaleKeys = ["female","woman","fatima","laila","hoda","samira"];
  if (gender === "female") {
    return ar.find(v => femaleKeys.some(k => v.name.toLowerCase().includes(k))) || ar[0];
  }
  return ar.find(v => !femaleKeys.some(k => v.name.toLowerCase().includes(k))) || ar[0];
}

export function speak(text: string, vol = 0.9) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel(); // stop any previous TTS
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ar-SA";
  u.rate = _gender === "female" ? 1.0 : 0.8;
  u.pitch = _gender === "female" ? 1.6 : 0.6;
  u.volume = vol;
  const go = () => {
    const v = getVoice(_gender);
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  };
  window.speechSynthesis.getVoices().length > 0
    ? go()
    : window.speechSynthesis.addEventListener("voiceschanged", go, { once: true });
}

/* ── Predefined TTS messages ── */
export const TTS = {
  welcome: (name: string) =>
    _gender === "female"
      ? `أهلاً يا ${name}! أنا معلّمتك. هيّا نتعلّم معاً!`
      : `أهلاً يا ${name}! أنا معلّمك. هيّا نبدأ!`,
  lessonSpeaking: () =>
    _gender === "female" ? "استمعي ثم تحدّثي بثقة!" : "استمع ثم تحدّث بثقة!",
  lessonWriting: () =>
    _gender === "female" ? "اكتبي بعناية وراجعي الإملاء!" : "اكتب بعناية وراجع الإملاء!",
  correct: () => _gender === "female" ? "أحسنتِ!" : "أحسنت!",
  tryAgain: () => _gender === "female" ? "حاولي مرة أخرى!" : "حاول مرة أخرى!",
};
