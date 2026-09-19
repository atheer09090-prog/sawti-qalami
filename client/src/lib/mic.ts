/**
 * Sawti Qalami — رسائل ميكروفون موحّدة لكل حالات تسجيل الصوت في المنصة.
 * الهدف: بدل رسالة خطأ تقنية واحدة عامة، نميّز بين كل حالة ونعرض للطالب
 * رسالة عربية بسيطة توضّح بالضبط ما حدث وماذا يفعل الآن.
 */

export type MicErrorKind =
  | "denied"        // المستخدم رفض الإذن صراحةً (أو حُظر مسبقًا من إعدادات المتصفح)
  | "no-device"     // لا يوجد ميكروفون متصل بالجهاز إطلاقًا
  | "in-use"        // الميكروفون مستخدَم من برنامج/تبويب آخر
  | "insecure"      // الصفحة تعمل على HTTP بدل HTTPS (المتصفح يمنع الميكروفون)
  | "unsupported"   // المتصفح لا يدعم تسجيل الصوت إطلاقًا
  | "unknown";      // أي خطأ آخر غير متوقّع

export interface MicErrorInfo {
  kind: MicErrorKind;
  title: string;
  message: string;
  /** إرشادات مختصرة إضافية (تُعرض كخطوات صغيرة) — فارغة إن لم تكن هناك حاجة */
  steps: string[];
  /** هل من المنطقي إظهار زر "المحاولة مرة أخرى"؟ */
  canRetry: boolean;
}

/** يفحص إن كانت المنصة تدعم تسجيل الصوت أصلاً في هذا المتصفح/السياق */
export function checkMicSupport(): MicErrorInfo | null {
  if (typeof window === "undefined") return null;
  if (window.isSecureContext === false) {
    return {
      kind: "insecure",
      title: "لا يمكن استخدام الميكروفون",
      message: "يعمل المتصفح على اتصال غير آمن (HTTP)، ولأسباب أمنية لا يسمح المتصفح باستخدام الميكروفون إلا عبر اتصال آمن (HTTPS).",
      steps: ["تأكّد من أن رابط المنصة يبدأ بـ https://", "إن استمرت المشكلة تواصل مع معلّمك."],
      canRetry: false,
    };
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") {
    return {
      kind: "unsupported",
      title: "المتصفح لا يدعم تسجيل الصوت",
      message: "هذا المتصفح لا يدعم خاصية تسجيل الصوت المطلوبة لهذه المنصة.",
      steps: ["جرّب استخدام متصفح حديث مثل Chrome أو Safari أو Edge.", "تأكّد من تحديث المتصفح لآخر إصدار."],
      canRetry: false,
    };
  }
  return null;
}

/** يحوّل خطأ getUserMedia/MediaRecorder إلى رسالة عربية واضحة غير تقنية */
export function classifyMicError(err: unknown): MicErrorInfo {
  const name = (err as any)?.name || "";

  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
    return {
      kind: "denied",
      title: "إذن الميكروفون مرفوض",
      message: "نحتاج إلى إذن استخدام الميكروفون لتسجيل صوتك. يبدو أن الإذن مرفوض حاليًا من إعدادات المتصفح.",
      steps: [
        "اضغط على أيقونة القفل 🔒 أو الميكروفون 🎙️ بجانب رابط الموقع في أعلى المتصفح.",
        "اختر \"السماح\" لاستخدام الميكروفون لهذا الموقع.",
        "أعد تحميل الصفحة ثم اضغط \"المحاولة مرة أخرى\".",
      ],
      canRetry: true,
    };
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return {
      kind: "no-device",
      title: "لم يتم العثور على ميكروفون",
      message: "لم نتمكن من العثور على ميكروفون متصل بجهازك.",
      steps: ["تأكّد من توصيل ميكروفون أو سماعة بها ميكروفون بالجهاز.", "تأكّد أن الجهاز يعمل بشكل سليم من إعدادات النظام."],
      canRetry: true,
    };
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return {
      kind: "in-use",
      title: "الميكروفون قيد الاستخدام",
      message: "يبدو أن الميكروفون مستخدَم حاليًا من برنامج أو تبويب آخر.",
      steps: ["أغلق أي برنامج أو تبويب آخر يستخدم الميكروفون (مثل مكالمة فيديو).", "ثم اضغط \"المحاولة مرة أخرى\"."],
      canRetry: true,
    };
  }
  const support = checkMicSupport();
  if (support) return support;

  return {
    kind: "unknown",
    title: "حدث خطأ أثناء التسجيل",
    message: "لم نتمكن من بدء التسجيل بسبب مشكلة غير متوقعة.",
    steps: ["تأكّد من اتصالك بالإنترنت.", "أعد تحميل الصفحة وحاول مرة أخرى."],
    canRetry: true,
  };
}
