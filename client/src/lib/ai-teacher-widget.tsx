import { useState, useRef, useEffect } from "react";
import { askSmartTeacher } from "./api";

/* ══════════════════════════════════════════════════════════════
   🤖 شخصية «المعلم الذكي» — زر عائم بشكل شخصية ودودة، يفتح لوحة
   محادثة جانبية عند الضغط عليه، يشرح ويعطي أمثلة إضافية للطالب.
   يستخدم نفس نقطة النهاية /api/eval/ask المبنية أصلًا لنشاط
   "🤖 اسأل بذكاء" في قسم التعلم الذاتي — بلا أي backend إضافي.
   ══════════════════════════════════════════════════════════════ */

type ChatMsg = { role: "user" | "ai"; text: string };

const GREETING = "مرحبًا! أنا معلمك الذكي 🤖 اسألني عن أي كلمة أو قاعدة ما فهمتها، أو اطلب مني مثالاً إضافيًا.";

const SUGGESTIONS = [
  "📚 اشرح لي متى نكتب همزة الوصل",
  "📝 أعطني مثالاً على جملة فعلية",
  "💡 كيف أحسّن خطي وكتابتي؟",
];

export default function AiTeacherWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([{ role: "ai", text: GREETING }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setMessages(m => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    const answer = await askSmartTeacher(q);
    setLoading(false);
    setMessages(m => [...m, { role: "ai", text: answer }]);
  }

  return (
    <>
      {/* ── الزر العائم (الشخصية) ── */}
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="المعلم الذكي"
          className="fixed bottom-5 left-5 z-40 w-16 h-16 rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
          style={{ background: "linear-gradient(135deg,#1a5c2a,#2d7a3e)", border: "3px solid white" }}>
          <span className="text-3xl">🤖</span>
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white"
            style={{ background: "#f5c842", animation: "aiPulse 1.6s ease-in-out infinite" }} />
        </button>
      )}

      {/* ── البطاقة العائمة (المحادثة) ── */}
      {open && (
        <>
          {/* طبقة شفافة لإغلاق البطاقة عند الضغط خارجها (بدون تعتيم الخلفية) */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div dir="rtl"
            className="fixed bottom-5 left-5 z-50 w-[360px] max-w-[92vw] h-[520px] max-h-[75vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.82)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.5)",
              animation: "aiPopIn 0.2s ease-out",
            }}
            onClick={e => e.stopPropagation()}>

            {/* الرأس */}
            <div className="p-3.5 flex items-center justify-between text-white shrink-0"
              style={{ background: "linear-gradient(135deg,#1a5c2a,#2d7a3e)" }}>
              <button onClick={() => setOpen(false)} className="text-white/80 text-lg leading-none px-1">✕</button>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="font-bold text-sm">الْمُعَلِّمُ الذَّكِيُّ</p>
                  <p className="text-[11px] text-white/70">اسْأَلْ أَوِ اطْلُبْ مِثَالًا إِضَافِيًّا</p>
                </div>
                <span className="text-2xl">🤖</span>
              </div>
            </div>

            {/* الرسائل */}
            <div ref={listRef} className="flex-1 overflow-y-auto p-3.5 space-y-2.5" style={{ fontFamily: "'Cairo', sans-serif" }}>
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    m.role === "user" ? "bg-gray-100/90 text-gray-800" : "bg-green-50/90 text-green-900 border border-green-100"
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}

              {/* اقتراحات سريعة — تظهر فقط في بداية المحادثة */}
              {messages.length === 1 && !loading && (
                <div className="flex flex-col gap-1.5 items-end">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)}
                      className="text-xs px-3 py-1.5 rounded-xl border-2 text-right hover:bg-green-50 transition-all bg-white/70"
                      style={{ borderColor: "#a7f3d0", color: "#1a5c2a" }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {loading && (
                <div className="flex justify-end">
                  <div className="bg-green-50/90 border border-green-100 rounded-2xl px-3.5 py-2 text-sm text-green-700">
                    جَارٍ التَّفْكِيرُ...
                  </div>
                </div>
              )}
            </div>

            {/* صندوق الإدخال */}
            <div className="p-2.5 border-t border-white/40 flex gap-2 shrink-0" style={{ background: "rgba(255,255,255,0.4)" }}>
              <button onClick={() => send()} disabled={!input.trim() || loading}
                className="px-3.5 py-2 rounded-xl text-white font-bold text-sm disabled:opacity-40 shrink-0"
                style={{ background: "#1a5c2a" }}>
                إِرْسَالٌ
              </button>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
                placeholder="اكْتُبْ سُؤَالَكَ هُنَا..."
                className="flex-1 min-w-0 px-3 py-2 rounded-xl border-2 border-gray-200 bg-white/80 text-right focus:border-green-500 focus:outline-none text-sm"
                style={{ fontFamily: "'Cairo', sans-serif" }} />
            </div>
          </div>

          <style>{`
            @keyframes aiPopIn { from { opacity: 0; transform: translateY(12px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes aiPulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.3); } }
          `}</style>
        </>
      )}
    </>
  );
}
