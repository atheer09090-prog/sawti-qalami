# صوتي قلمي — الواجهة (React + TypeScript + Vite)

منصة تعليمية لتطوير مهارات اللغة العربية (التحدث والكتابة) للمرحلة الابتدائية: دروس وألعاب وتقييم آلي ولوحة معلم. الواجهة عربية بالكامل (RTL) مع التشكيل.

## المتطلبات
- Node.js 20+ و npm (أو pnpm)
- Backend يعمل (انظر `sawti-backend/README.md`)

## التشغيل
```bash
npm install
cp .env.example .env     # اضبط VITE_API_URL
npm run dev              # http://localhost:3000
```

## متغيرات البيئة
| المتغير | الوصف |
|---|---|
| `VITE_API_URL` | رابط الـBackend وينتهي بـ `/api`، مثل `https://api.domain.com/api` |

## فحوص وبناء الإنتاج
```bash
npm run check            # TypeScript
npm run build            # ينتج dist/public
npm run preview
```
> ملاحظة: `tsc` يُظهر حاليًا 22 خطأ قديمًا في `WritingGames.tsx` (أنواع `unknown`) لا تمنع البناء.

## النشر (Vercel)
- Build: `vite build`، Output: `dist/public`، ومتغير `VITE_API_URL` في إعدادات المشروع.
- `vercel.json` يعيد توجيه كل المسارات إلى `index.html` (SPA).
- **مهم:** أضف نطاق الواجهة إلى `ALLOWED_ORIGINS` في الـBackend، وإلا سيحجب CORS الطلبات.

## لوحة المعلم
`/teacher` — تطلب رمز المعلم؛ الخادم يُصدر جلسة (8 ساعات) تُحفَظ في `sessionStorage` وتُرسَل كـ Bearer في كل طلب حسّاس. عند انتهائها تعود الصفحة لشاشة الدخول تلقائيًا.

## الاختبارات
اختبارات الأمان والمنطق في الـBackend (`pytest`). الواجهة: يكفي نجاح `npm run check` و`npm run build`.
