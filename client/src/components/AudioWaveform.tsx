import { useEffect, useRef } from "react";

/**
 * موجة صوتية خفيفة تُرسَم أثناء التسجيل، لتعطي الطالب مؤشرًا حيًّا على
 * أن صوته يُلتقَط فعلًا. تعتمد على "صنبور" قراءة فقط (AnalyserNode) على
 * نفس الـ MediaStream — لا تلمس MediaRecorder ولا بيانات التسجيل نفسها
 * بأي شكل، فلا يوجد أي خطر على جودة أو موثوقية التسجيل المُرسَل للخادم.
 * الرسم بسيط (Canvas + requestAnimationFrame) بلا أي مكتبة إضافية.
 */
export function AudioWaveform({ stream, color = "#1a5c2a" }: { stream: MediaStream | null; color?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;

    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser); // صنبور قراءة فقط — لا نعيد التوصيل لمخرج الصوت إطلاقًا
    } catch {
      return; // إن تعذّر لأي سبب، نتجاهل الموجة بصمت دون أي تأثير على التسجيل نفسه
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      if (!analyser || !ctx || !canvas) return;
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const barCount = 28;
      const step = Math.floor(bufferLength / barCount);
      const barWidth = w / barCount;
      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step] || 0;
        const barHeight = Math.max(3, (value / 255) * h);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.55 + (value / 255) * 0.45;
        const x = i * barWidth + barWidth * 0.15;
        ctx.fillRect(x, (h - barHeight) / 2, barWidth * 0.7, barHeight);
      }
    }
    draw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      source?.disconnect();
      analyser?.disconnect();
      audioCtx?.close().catch(() => {});
    };
  }, [stream, color]);

  return <canvas ref={canvasRef} width={220} height={40} aria-hidden="true" className="mx-auto" style={{ display: "block" }} />;
}
