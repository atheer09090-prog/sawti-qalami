/** صورة الأفاتار حسب المعرّف المحفوظ في حساب الطالب (نفس المنطق القديم المتكرر في 3 صفحات). */
export function avatarSrc(avatar?: string): string {
  const base = avatar === "boy1" || avatar === "boy2" ? "omani-boy" : avatar === "girl1" ? "omani-girl" : "omani-girl2";
  return `/assets/${base}.png`;
}

export type Skill = "speaking" | "writing" | "learning";
export const skillClass = (skill?: Skill) => (skill ? `skill-${skill}` : "");
