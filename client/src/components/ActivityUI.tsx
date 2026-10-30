import { ArrowLeft, type LucideIcon } from "lucide-react";

export function ActivityHeader({ title, description, eyebrow, backLabel = "العودة", onBack, icon: Icon }: { title: string; description?: string; eyebrow?: string; backLabel?: string; onBack: () => void; icon?: LucideIcon }) {
  return <header className="activity-heading page-container">
    <button className="activity-back" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" />{backLabel}</button>
    <div className="activity-heading-main"><div>{eyebrow && <p className="studio-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="activity-description">{description}</p>}</div>{Icon && <span className="activity-heading-icon" aria-hidden="true"><Icon size={35} strokeWidth={1.3} /></span>}</div>
  </header>;
}

export function StudentAvatar({ avatar, className = "" }: { avatar?: string; className?: string }) {
  const id = avatar && ["boy1", "boy2", "girl1", "girl2"].includes(avatar) ? avatar : "boy1";
  return <img className={`student-portrait ${className}`} src={`/assets/avatars/${id}-v2.png`} alt="" width={64} height={64} decoding="async" />;
}

export function JourneyCover({ kind }: { kind: "treasure" | "diver" | "balloon" }) {
  return <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    {kind === "treasure" ? <><path fill="#eee5d0" d="M0 0h320v180H0z" /><path d="m64 29 60 10 58-14 74 18-9 103-69-14-59 16-64-17 9-102Z" fill="#fffaf0" stroke="#cebd91" strokeWidth="2" /><path d="m124 39-5 109m63-123-4 107" stroke="#e3d9bc" strokeWidth="2" /><path d="M79 108c24-67 55-22 80-33s16 38 66 20" stroke="#86a085" strokeWidth="3" strokeDasharray="5 7" strokeLinecap="round" /><circle cx="80" cy="108" r="5" fill="#6a8c6b" /><path d="m211 86 14 18m0-18-14 18" stroke="#b59151" strokeWidth="4" strokeLinecap="round" /><path d="m40 53 5 10 11 1-8 8 2 11-10-5-10 5 2-11-8-8 11-1 5-10Z" fill="#b7a26e" /><path d="M267 143v-18m-7 0h14" stroke="#819873" strokeWidth="3" strokeLinecap="round" /></> : kind === "diver" ? <><path fill="#deebe4" d="M0 0h320v180H0z" /><path d="M0 48c41-19 67 14 104 0s65 12 108 0 67 9 108 0v132H0Z" fill="#bad3c7" /><path d="M0 123c49-21 80 9 125-3s87 14 125 1 43-4 70-4v63H0Z" fill="#88b2a1" /><path d="M129 136c-57-25-35-74-2-67 9-34 58-31 66 0 35-8 54 44-3 67h-61Z" fill="#f7f2df" stroke="#b6b590" strokeWidth="2" /><path d="m160 130-33-57m33 57 32-57m-32 57V54" stroke="#ded7b9" strokeWidth="2" /><circle cx="160" cy="122" r="13" fill="#fffdf5" stroke="#d3c49b" strokeWidth="2" /><circle cx="233" cy="47" r="7" stroke="#94b9a5" strokeWidth="2" /><circle cx="250" cy="27" r="4" stroke="#94b9a5" strokeWidth="2" /><path d="M66 167c-17-24 12-34-1-55m13 55c18-19-1-24 10-40" stroke="#5f9178" strokeWidth="4" strokeLinecap="round" /></> : <><path fill="#edf0df" d="M0 0h320v180H0z" /><path d="M0 154c35-24 67-20 99-4s70-19 106-4 78-12 115 0v34H0Z" fill="#d0dbc1" /><path d="M194 59c0 33-30 51-34 65-6-14-36-32-36-65 0-48 70-48 70 0Z" fill="#90ad82" stroke="#6f9165" strokeWidth="2" /><path d="M160 24c-24 27-20 62 0 100 20-38 24-73 0-100Z" fill="#e4d8b4" stroke="#bfb58f" strokeWidth="2" /><path d="m147 119 4 15m22-15-4 15" stroke="#8b8964" strokeWidth="2" /><path d="m147 133 26 0-3 15h-20l-3-15Z" fill="#bba475" /><path d="M54 70c-2-16 19-22 26-10 13-5 24 5 20 14H54Z" fill="#fffdf3" /><path d="M225 96c-2-16 19-22 26-10 13-5 24 5 20 14h-46Z" fill="#fffdf3" /><path d="m242 31 3 8 9 3-9 3-3 8-3-8-9-3 9-3 3-8Z" fill="#c2ac78" /></>}
  </svg>;
}

export function DictationArtwork() {
  return <svg viewBox="0 0 240 240" fill="none" aria-hidden="true"><circle cx="120" cy="120" r="108" fill="#eef0e0" /><g stroke="#fffaf0" strokeWidth="3"><path d="M120 120V29a91 91 0 0 1 86.5 62.9L120 120Z" fill="#597b60" /><path d="m120 120 86.5-28.1a91 91 0 0 1-33 101.7L120 120Z" fill="#b9a06a" /><path d="m120 120 53.5 73.6a91 91 0 0 1-107 0L120 120Z" fill="#8eaa7e" /><path d="m120 120-53.5 73.6a91 91 0 0 1-33-101.7L120 120Z" fill="#9a8061" /><path d="m120 120-86.5-28.1A91 91 0 0 1 120 29v91Z" fill="#a9b9a0" /></g><circle cx="120" cy="120" r="31" fill="#fffaf0" /><path d="m109 133 15-33 8 4-15 33-10 7 2-11Z" fill="#567a5d" /><path d="m111 9 9 19 9-19" fill="#b89e64" /></svg>;
}
