const API_BASE = import.meta.env.VITE_API_URL || "https://sawti-0k3n.onrender.com/api";

export async function evaluateSpeech(
  audioBlob: Blob,
  referenceText?: string,
  studentId: number = 0,
  lessonId: string = ""
) {
  const formData = new FormData();
  formData.append("audio_file", audioBlob, "recording.wav");
  formData.append("student_id", String(studentId));
  formData.append("lesson_id", lessonId);
  if (referenceText) formData.append("reference_text", referenceText);
  const res = await fetch(`${API_BASE}/eval/speech`, { method: "POST", body: formData });
  if (!res.ok) throw new Error("خطأ في تقييم التحدث");
  return res.json();
}

export async function evaluateWriting(
  text: string,
  minWords: number = 20,
  studentId: number = 0,
  lessonId: string = ""
) {
  const res = await fetch(`${API_BASE}/eval/writing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id: studentId, lesson_id: lessonId, text, min_words: minWords }),
  });
  if (!res.ok) throw new Error("خطأ في تقييم الكتابة");
  return res.json();
}
