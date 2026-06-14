/**
 * Sawti Qalami — Central Audio Manager
 * Ensures only ONE sound plays at a time, with clean stop/fade logic.
 */

let _current: HTMLAudioElement | null = null;

function stopCurrent() {
  if (_current) {
    _current.pause();
    _current.currentTime = 0;
    _current = null;
  }
}

/**
 * Play a sound file. Stops any currently-playing audio first.
 * @param src   Path to audio file (e.g. "/assets/welcome.wav")
 * @param vol   Volume 0–1 (default 0.5)
 * @param loop  Whether to loop (default false)
 * @returns The HTMLAudioElement so caller can stop it if needed
 */
export function playSound(src: string, vol = 0.5, loop = false): HTMLAudioElement {
  stopCurrent();
  const audio = new Audio(src);
  audio.volume = vol;
  audio.loop = loop;
  audio.play().catch(() => {});
  _current = audio;
  // Auto-clear reference when sound ends
  audio.addEventListener("ended", () => {
    if (_current === audio) _current = null;
  });
  return audio;
}

/**
 * Stop whatever is currently playing (call on page unmount).
 */
export function stopSound() {
  stopCurrent();
}

/**
 * Play a one-shot effect (achievement, correct, tryagain).
 * Does NOT stop background/loop audio — overlays briefly.
 * But does stop another effect if one is already going.
 */
let _effect: HTMLAudioElement | null = null;
export function playEffect(src: string, vol = 0.7) {
  if (_effect) { _effect.pause(); _effect.currentTime = 0; }
  const audio = new Audio(src);
  audio.volume = vol;
  audio.play().catch(() => {});
  _effect = audio;
  audio.addEventListener("ended", () => { if (_effect === audio) _effect = null; });
}
