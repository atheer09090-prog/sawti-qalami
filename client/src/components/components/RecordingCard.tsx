import { useEffect, useRef, type ReactNode } from "react";
import { Mic, RotateCcw, Send, Square } from "lucide-react";
import { AudioWaveform } from "@/components/AudioWaveform";
import { Btn } from "@/components/ds";
import { cn } from "@/lib/utils";

interface Props {
  recording: boolean;
  busy?: boolean;                 // جارٍ الإرسال/التحليل
  timer: number;                  // ثوانٍ
  maxSeconds?: number;
  stream: MediaStream | null;
  onToggle: () => void;
  topic?: string;
  /** بعد انتهاء التسجيل: استماع ← إعادة ← إرسال */
  review?: { url: string; onRetry: () => void; onSubmit: () => void };
  children?: ReactNode;           // مثلًا بطاقة خطأ الميكروفون
  className?: string;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** بطاقة التسجيل الموحّدة: جاهز ← يسجّل (نبض + مؤقت + موجة) ← استماع وإرسال. */
export function RecordingCard({ recording, busy, timer, maxSeconds = 120, stream, onToggle, topic, review, children, className }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => { if (review?.url) audioRef.current?.load(); }, [review?.url]);

  return (
    <section className={cn("card card-pad skill-speaking", className)} aria-label="التسجيل الصوتي">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="t-card-title text-text-primary">سَجِّلْ تَحَدُّثَكَ</h3>
        {recording ? (
          <span className="badge badge-error" role="status"><span className="size-2 animate-pulse rounded-full bg-error" aria-hidden />جَارٍ التَّسْجِيلُ</span>
        ) : review ? (
          <span className="badge badge-success">تَمَّ التَّسْجِيلُ</span>
        ) : (
          <span className="badge">جَاهِزٌ</span>
        )}
      </div>

      {children}

      {review ? (
        <div className="flex flex-col gap-4">
          <audio ref={audioRef} controls src={review.url} className="w-full" aria-label="استمع إلى تسجيلك" />
          <div className="grid gap-2 sm:grid-cols-2">
            <Btn variant="outline" size="lg" icon={RotateCcw} onClick={review.onRetry} disabled={busy}>إِعَادَةُ التَّسْجِيلِ</Btn>
            <Btn size="lg" icon={Send} onClick={review.onSubmit} loading={busy}>أَرْسِلْ لِلتَّقْيِيمِ</Btn>
          </div>
          <p className="t-caption text-center text-text-muted">اسْتَمِعْ إِلَى تَسْجِيلِكَ، ثُمَّ أَرْسِلْهُ أَوْ أَعِدِ التَّسْجِيلَ.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="relative my-6">
            <button type="button" onClick={onToggle} disabled={busy}
              aria-label={recording ? "إيقاف التسجيل" : "بدء تسجيل الصوت"} aria-pressed={recording}
              className={cn("relative isolate grid size-24 place-items-center rounded-full text-white shadow-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50",
                recording ? "record-pulse bg-error" : "bg-primary hover:shadow-lg")}>
              {recording ? <Square size={30} strokeWidth={2} fill="currentColor" /> : <Mic size={38} strokeWidth={1.75} />}
            </button>
          </div>

          <p className="mt-3 text-3xl font-bold tabular-nums text-text-primary" aria-live="off">
            {fmt(timer)} <span className="text-base font-medium text-text-muted">/ {fmt(maxSeconds)}</span>
          </p>
          <div className="progress mt-2 w-full max-w-[260px]" aria-hidden>
            <div className="h-full rounded-full bg-error" style={{ transform: `scaleX(${Math.min(1, timer / maxSeconds)})`, transformOrigin: "right", transition: "transform 1s linear" }} />
          </div>

          {recording ? (
            <div className="mt-4 w-full">
              <AudioWaveform stream={stream} color="#1a5c2a" />
              <p className="t-small mt-1 text-center text-text-secondary">تَحَدَّثْ بِوُضُوحٍ، وَاضْغَطْ ■ عِنْدَ الِانْتِهَاءِ.</p>
            </div>
          ) : (
            <p className="t-small mt-3 text-center text-text-secondary">
              اضْغَطْ عَلَى الْمِيكْرُوفُونِ وَتَحَدَّثْ لِمُدَّةِ دَقِيقَتَيْنِ{topic && <> عَنْ <strong className="text-text-primary">{topic}</strong></>}.
              <span className="t-caption mt-1 block text-text-muted">قَدْ يَطْلُبُ الْمُتَصَفِّحُ إِذْنَ الْمِيكْرُوفُونِ، اخْتَرْ "سَمَاحٌ / Allow".</span>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
