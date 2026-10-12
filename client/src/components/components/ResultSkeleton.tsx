import { Skeleton } from "@/components/ui/skeleton";

/**
 * هيكل تحميل (Skeleton) عام يُعرض في مكان بطاقة النتيجة أثناء انتظار
 * تقييم الخادم (تحدث أو كتابة)، بدل شاشة فارغة أو نص "جارٍ..." وحده.
 * الشكل عام (دائرة نتيجة + أسطر + شرائح صغيرة) ليُناسب بطاقات النتائج
 * المختلفة في المنصة دون الحاجة لنسخة منفصلة لكل صفحة.
 */
export function ResultSkeleton({ label = "جارٍ تحليل إجابتك..." }: { label?: string }) {
  return (
    <div dir="rtl" className="bg-white rounded-2xl p-5 shadow mt-4 text-center" aria-live="polite" aria-label={label}>
      <p className="text-sm text-gray-400 mb-4">⏳ {label}</p>
      <div className="flex justify-center mb-4">
        <Skeleton className="w-20 h-20 rounded-full" />
      </div>
      <div className="space-y-2 mb-4">
        <Skeleton className="h-3 w-3/4 mx-auto" />
        <Skeleton className="h-3 w-1/2 mx-auto" />
      </div>
      <div className="flex gap-2 justify-center">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}
