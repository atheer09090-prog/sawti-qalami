# صوتي قلمي — تقرير المعاينة المحلية

التغييرات محلية فقط. لم يُنفّذ push أو نشر أو تعديل للـBackend. رابط المعاينة: http://127.0.0.1:3000/ . يظهر زر «معاينة التصميم محليًا» في بيئة التطوير دون إنشاء حساب أو إرسال بيانات نموذجية إلى الخادم. لا يظهر هذا الزر في Production Build.

## ما تغيّر

| الصفحة | قبل | بعد |
|---|---|---|
| الدخول والتسجيل | بطاقة ضيقة وخلفية مصورة وظلال قوية | تكوين بعمودين، الشعار المرسل، حقول أوضح، عناوين مرتبطة بالحقول، تكوين عمودي للهاتف |
| عن البرنامج | خطان وتدرجات وظلال مختلفة | خط موحد وأسطح وألوان متناسقة مع الاحتفاظ بالنص التعليمي |
| لوحة الطالب | بطاقات تنقل وخروج بنفس الوزن | ترحيب، أربع إحصاءات، إجراء متابعة، مسارات مهارات، الرسم البياني، الوصول لدليل الاستخدام والتقييم |
| المهارات | أزرار متداخلة وبطاقات متعددة الألوان | روابط بطاقات مستقلة، أيقونات Lucide، تقدم قابل للقراءة بقارئ الشاشة، تفاصيل المسارات |
| التحدث | زر Emoji وإرسال تلقائي عند الإيقاف | أيقونة ميكروفون/إيقاف، حالة تسجيل، استماع بعد التسجيل، إعادة التسجيل ثم إرسال صريح للتقييم؛ معايير التقييم والنقاط كما هي |
| الكتابة | مساحة صغيرة ثابتة للكتابة | مساحة كتابة أكبر قابلة لتغيير الارتفاع، اسم وصول، عدادات الكلمات والجمل الحالية، أسطح نتائج موحدة |
| التقييمات | رأس ملون وأسطح منفصلة | عنوان موحد، تنقل مشترك، حالة فارغة قابلة للتنفيذ عند انعدام التقدم |
| التعلم الذاتي | خطوط وظلال وألوان رأس متباينة | الخط والهوية والأسطح المشتركة مع بقاء مراحل التعلم والمحتوى |
| ألعاب الهمزة | خطوط مختلطة وحركات ضغط قوية | خط موحد وحركة أخف وأسطح مشتركة؛ ألوان المشاهد والمحتوى وآلية اللعب محفوظة |
| المستكشف | خطوط مختلطة وظلال كبيرة | توحيد الخط والألوان الأساسية وتهدئة الظلال والحركة |
| الغواص | خطوط مختلطة وظلال كبيرة | توحيد الخط والألوان الأساسية وتهدئة الظلال والحركة |
| المنطاد | خطوط مختلطة وbounce | خط موحد وحركة أقل مع بقاء المشاهد والأهداف |
| اختيار الفصل | هوية قديمة وخط منفصل | الخط والشعار والألوان الأساسية الجديدة |
| دخول المعلم | خلفية مصورة وبطاقة مستقلة | تكوين مطابق لهوية الدخول مع عنوان وحقل وصول واضح |
| لوحة المعلم | تبويبات Emoji وتباعد غير متناسق | أيقونات Lucide للتبويبات، مساحات أوسع، رأس منضبط، بحث باسم وصول واضح، أسطح أخف |
| المعلم الذكي | Emoji وشفافية قوية ويتداخل مع تنقل الهاتف | أيقونة واضحة، سطح أبيض، زر إغلاق مسمى، موضع أعلى تنقل الهاتف |

## النظام المشترك

IBM Plex Sans Arabic؛ أخضر داكن وعاجي ومريمي وذهبي محدود؛ بطاقات 18px، حدود وظلال خفيفة، أزرار رئيسية 48px، انتقال صفحة 280ms وتفاعلات 200ms، واحترام prefers-reduced-motion. أُزيل منع تكبير الصفحة.

المكونات الجديدة في ProductUI.tsx: Brand، ProductShell، PageHeader، LearningCards، ProgressMeter، EmptyState، PageSkeleton. حُسّنت أيضًا مكونات الأزرار والتحميل الحالية. لا توجد مكتبات جديدة.

## التحقق

- npm run check / tsc --noEmit: ناجح.
- npm run build: ناجح.
- git diff --check: ناجح.
- 14 مسارًا × 6 عروض (390، 430، 768، 1024، 1280، 1440): 84 قياسًا للشاشات الأولية دون تمدد أفقي. التفاصيل في responsive-checks.json.
- فُحص ظهور الشعار والدخول ولوحة الطالب والمهارات في المتصفح.
- أُصلحت أخطاء TypeScript سابقة في مسارات المكونات المكررة وتعريف أنواع قوائم خيارات الألعاب، دون تغيير الخوارزميات.

## حدود التحقق وما يحتاج مراجعة فعلية

لم يُختبر تسجيل ميكروفون حقيقي وإرساله للتقييم، أو الدخول بحساب معلم وإجراءات التعديل والتصدير. فحص الأحجام يغطي الشاشات الأولية ولا يثبت جميع حالات كل نشاط أو نافذة. يلزم اختبار هذه المسارات قبل اعتماد النشر. لا توجد دعوى بأن جميع تفاصيل الوصول والحالات الداخلية خضعت لتدقيق كامل. بعض زخارف المحتوى التعليمي ومشاهد الألعاب محفوظة عمدًا. يُظهر Node 26 تحذير deprecation من أدوات التطوير، والبناء ينجح.

## الملفات المعدلة أو المضافة

- [client/index.html](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/index.html>)
- [client/src/App.tsx](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/App.tsx>)
- [client/src/components/OnboardingTour.tsx](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/components/OnboardingTour.tsx>)
- [client/src/components/ResultSkeleton.tsx](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/components/ResultSkeleton.tsx>)
- [client/src/components/SusSurvey.tsx](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/components/SusSurvey.tsx>)
- [client/src/components/components/MicPermissionCard.tsx](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/components/components/MicPermissionCard.tsx>)
- [client/src/components/components/OnboardingTour.tsx](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/components/components/OnboardingTour.tsx>)
- [client/src/components/components/RecordingCard.tsx](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/components/components/RecordingCard.tsx>)
- [client/src/components/components/SusSurvey.tsx](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/components/components/SusSurvey.tsx>)
- [client/src/components/ui/button.tsx](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/components/ui/button.tsx>)
- [client/src/index.css](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/index.css>)
- [client/src/lib/ai-teacher-widget.tsx](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/lib/ai-teacher-widget.tsx>)
- [client/src/pages/Assessments.tsx](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/pages/Assessments.tsx>)
- [client/src/pages/BalloonHamzaLesson.tsx](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/pages/BalloonHamzaLesson.tsx>)
- [client/src/pages/ClassSelection.tsx](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/pages/ClassSelection.tsx>)
- [client/src/pages/Dashboard.tsx](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/pages/Dashboard.tsx>)
- [client/src/pages/DiverPearlLesson.tsx](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/pages/DiverPearlLesson.tsx>)
- [client/src/pages/Home.tsx](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/pages/Home.tsx>)
- [client/src/pages/Login.tsx](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/pages/Login.tsx>)
- [client/src/pages/SelfLearning.tsx](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/pages/SelfLearning.tsx>)
- [client/src/pages/Skills.tsx](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/pages/Skills.tsx>)
- [client/src/pages/Speaking.tsx](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/pages/Speaking.tsx>)
- [client/src/pages/Teacher.tsx](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/pages/Teacher.tsx>)
- [client/src/pages/TreasureMapLesson.tsx](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/pages/TreasureMapLesson.tsx>)
- [client/src/pages/Writing.tsx](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/pages/Writing.tsx>)
- [client/src/pages/WritingGames.tsx](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/pages/WritingGames.tsx>)
- [.gitignore](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/.gitignore>)
- [client/public/assets/brand-logo.png](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/public/assets/brand-logo.png>)
- [client/src/components/ProductUI.tsx](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/src/components/ProductUI.tsx>)

أضيفت أيضًا ملفات هذا التقرير والتدقيق وسجلات البناء ونتائج الأحجام وصورة الدخول داخل docs/.

## تحديث الصور والشعار — 30 أكتوبر 2026

- إزالة خلفية الشعار من بكسلات المصدر الأصلي بملف مستقل `brand-logo-transparent.png`، مع بقاء المصدر دون تعديل وبأبعاد 732×716. ألوان البكسلات المعتمة مطابقة للمصدر؛ حواف المزج عولجت لإزالة اللون العاجي. جرى فحص النتيجة على خلفية فاتحة وأخرى داكنة.
- إنشاء رسمين جديدين: منظر مائي لجبال عُمان وساحلها ونخيلها وزخارف مستوحاة من الهوية، ومشهد طالب وطالبة يتعلمان. استُخدمت نسخ WebP بحجم يقارب 293 و288 كيلوبايت بدل ملفات PNG الكبيرة.
- خلفية مشتركة أكثر حيوية، ورأس مصور للوحة الطالب والمهارات، وتكوين دافئ للدخول، وبطاقات عاجية ومريمية وذهبية هادئة.
- لا تغيير للمحتوى التعليمي أو API أو منطق الأنشطة في هذا التحديث. لم يُنفّذ رفع أو نشر.
- فحص 6 صفحات متأثرة × 6 عروض = 36 قياسًا دون تمدد أفقي. التفاصيل في illustrated-responsive-checks.json. يظل الفحص مقتصرًا على الشاشات الأولية.
- npm run check وnpm run build ناجحان. لا مكتبات جديدة داخل تطبيق الويب؛ أدوات معالجة الصور مثبتة في مجلد مؤقت فقط.

ملفات هذا التحديث الإضافية:
- [client/public/assets/brand-logo-transparent.png](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/public/assets/brand-logo-transparent.png>)
- [client/public/assets/oman-learning-world.webp](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/public/assets/oman-learning-world.webp>)
- [client/public/assets/learning-together.webp](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/client/public/assets/learning-together.webp>)
- [docs/tools/extract_logo.py](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/docs/tools/extract_logo.py>)
- [docs/illustrated-responsive-checks.json](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/docs/illustrated-responsive-checks.json>)
- [docs/screenshots/logo-transparency-qa.jpg](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/docs/screenshots/logo-transparency-qa.jpg>)
- [docs/screenshots/illustrated-login.png](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/docs/screenshots/illustrated-login.png>)
- [docs/screenshots/illustrated-dashboard.png](</Users/Atheer/Documents/ChatGPT/Sawti qalmi/sawti-qalami/docs/screenshots/illustrated-dashboard.png>)

## تخفيف الزحام البصري

إزالة الخلفية المصورة الممتدة خلف محتوى الصفحات، واعتماد أرضية عاجية هادئة. حصر الصورة في مساحة الترحيب، تقليل ارتفاعها، توحيد خلفيات البطاقات وإزالة الشرائط الملونة والتدرجات الزائدة. الشعار الشفاف محفوظ. التعديل في index.css فقط؛ نجح فحص TypeScript والبناء وgit diff --check. المعاينة محلية ولم يحدث رفع أو نشر.

## تكوين الصوت والقلم

تحديث Dashboard.tsx وSkills.tsx وProductUI.tsx وindex.css: ترحيب بتحرير طباعي وصورة مستقلة، شريط إحصاءات دون بطاقات، مساحة تحدث بارزة بموجة زخرفية صامتة، مسارات كتابة وتعلم ذاتي بتكوين مختلف، وإحصاءات جانبية. صفحة المهارات تستخدم صفوفًا مفتوحة ولقطة معمارية صغيرة. بقيت بيانات التقدم وحسابها والروابط والأنشطة كما هي. لا مكتبات جديدة. نجح TypeScript والبناء وgit diff --check. فحصت الصفحتان على الأحجام الستة دون تمدد أفقي؛ التفاصيل في studio-responsive-checks.json. التغيير محلي فقط.
