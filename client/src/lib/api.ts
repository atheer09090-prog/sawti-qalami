const API_BASE = import.meta.env.VITE_API_URL || "https://sawti-0k3n.onrender.com/api";

export async function diacritizeText(text: string): Promise<string> {
  if (!text) return text;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: "أنت مساعد متخصص في اللغة العربية. مهمتك الوحيدة هي إضافة التشكيل الكامل وعلامات الترقيم المناسبة للنص العربي المُدخل. أعد النص كاملاً مع التشكيل فقط، بدون أي شرح أو إضافات.",
        messages: [{ role: "user", content: `أضف التشكيل الكامل وعلامات الترقيم لهذا النص:\n${text}` }],
      }),
    });
    if (!res.ok) return text;
    const data = await res.json();
    const result = data?.content?.[0]?.text?.trim();
    return result || text;
  } catch {
    return text;
  }
}

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

export async function evaluateContext(text: string): Promise<Array<{original: string; suggested: string; rule: string}>> {
  try {
    const res = await fetch(`${API_BASE}/eval/context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.suggestions || [];
  } catch {
    return [];
  }
}

// ── Lessons API ──
const LESSONS_BASE = `${API_BASE.replace("/api", "")}/api/lessons`;

export async function getSpeakingLessons() {
  try {
    const res = await fetch(`${LESSONS_BASE}/speaking`);
    return res.ok ? res.json() : null;
  } catch { return null; }
}

export async function getWritingTopics() {
  try {
    const res = await fetch(`${LESSONS_BASE}/writing`);
    return res.ok ? res.json() : null;
  } catch { return null; }
}

export async function addSpeakingLesson(lesson: object) {
  const res = await fetch(`${LESSONS_BASE}/speaking`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lesson),
  });
  return res.json();
}

export async function addWritingTopic(topic: object) {
  const res = await fetch(`${LESSONS_BASE}/writing`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(topic),
  });
  return res.json();
}

export async function updateSpeakingLesson(id: string, lesson: object) {
  const res = await fetch(`${LESSONS_BASE}/speaking/${id}`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lesson),
  });
  return res.json();
}

export async function updateWritingTopic(id: string, topic: object) {
  const res = await fetch(`${LESSONS_BASE}/writing/${id}`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(topic),
  });
  return res.json();
}

export async function deleteSpeakingLesson(id: string) {
  await fetch(`${LESSONS_BASE}/speaking/${id}`, { method: "DELETE" });
}

export async function deleteWritingTopic(id: string) {
  await fetch(`${LESSONS_BASE}/writing/${id}`, { method: "DELETE" });
}
