import { CheckCircle2, MicOff, RotateCw } from "lucide-react";
import type { MicErrorInfo } from "@/lib/mic";
import { Btn } from "@/components/ds";

/**
 * بطاقة موحّدة لعرض مشاكل الميكروفون (رفض الإذن، لا يوجد جهاز، قيد الاستخدام...)
 * بدل رسالة حمراء تقنية صغيرة. تُستخدم في كل صفحات تسجيل الصوت بالبرنامج.
 */
export function MicPermissionCard({ info, onRetry }: { info: MicErrorInfo; onRetry: () => void }) {
  return (
    <div dir="rtl" className="alert alert-error mb-4 flex-col text-right" role="alert">
      <div className="flex items-start gap-3">
        <MicOff size={22} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">{info.title}</p>
          <p className="t-small mt-0.5">{info.message}</p>
        </div>
      </div>
      {info.steps.length > 0 && (
        <ul className="t-small list-inside list-disc space-y-1 ps-1">
          {info.steps.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      )}
      {info.canRetry && <Btn variant="danger" icon={RotateCw} block onClick={onRetry}>الْمُحَاوَلَةُ مَرَّةً أُخْرَى</Btn>}
    </div>
  );
}

/** شارة صغيرة تُعرض فور انتهاء التسجيل بنجاح، قبل ظهور نتيجة التقييم */
export function MicDoneNotice() {
  return (
    <div dir="rtl" role="status" className="alert alert-success mb-3 items-center">
      <CheckCircle2 size={20} strokeWidth={1.75} aria-hidden />
      <p className="text-sm font-medium">تَمَّ تَسْجِيلُ صَوْتِكَ بِنَجَاحٍ، جَارٍ تَحْلِيلُهُ الْآنَ...</p>
    </div>
  );
}
