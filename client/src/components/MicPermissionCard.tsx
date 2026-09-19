import type { MicErrorInfo } from "@/lib/mic";

/**
 * بطاقة موحّدة لعرض مشاكل الميكروفون (رفض الإذن، لا يوجد جهاز، قيد الاستخدام...)
 * بدل رسالة حمراء تقنية صغيرة. تُستخدم في كل صفحات تسجيل الصوت بالبرنامج.
 */
export function MicPermissionCard({ info, onRetry }: { info: MicErrorInfo; onRetry: () => void }) {
  return (
    <div
      dir="rtl"
      className="text-right bg-red-50 border border-red-200 rounded-xl p-4 mb-3"
      role="alert"
    >
      <p className="font-bold text-red-700 text-sm mb-1">🎙️ {info.title}</p>
      <p className="text-red-600 text-sm mb-2">{info.message}</p>
      {info.steps.length > 0 && (
        <ul className="list-disc list-inside text-red-500 text-xs space-y-1 mb-3">
          {info.steps.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      )}
      {info.canRetry && (
        <button
          onClick={onRetry}
          className="w-full py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors"
        >
          🔄 المحاولة مرة أخرى
        </button>
      )}
    </div>
  );
}

/** شارة صغيرة تُعرض فور انتهاء التسجيل بنجاح، قبل ظهور نتيجة التقييم */
export function MicDoneNotice() {
  return (
    <div dir="rtl" className="text-center bg-green-50 border border-green-200 rounded-xl p-2 mb-3">
      <p className="text-green-700 text-sm font-bold">✅ تم تسجيل صوتك بنجاح، جارٍ تحليله الآن...</p>
    </div>
  );
}
