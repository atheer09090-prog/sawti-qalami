import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Login from "./pages/Login";
import Home from "./pages/Home";
import { initGenderFromStore } from "./lib/audio";
import AiTeacherWidget from "./lib/ai-teacher-widget";

// Login وHome هما نقطتا الدخول الأوليان لكل زائر، فتبقيان مُحمَّلتين
// مباشرة (eager) لتفادي أي وميض تحميل عند أول فتح للبرنامج. كل صفحة
// أخرى (لوحات، دروس، ألعاب) تُحمَّل عند الحاجة فقط (code-splitting) —
// هذا لا يغيّر أي وظيفة أو مسار، فقط يقلّل حجم الحزمة التي يُنزّلها
// المتصفح دفعة واحدة عند أول تحميل.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Skills = lazy(() => import("./pages/Skills"));
const Speaking = lazy(() => import("./pages/Speaking"));
const Writing = lazy(() => import("./pages/Writing"));
const SelfLearning = lazy(() => import("./pages/SelfLearning"));
const Assessments = lazy(() => import("./pages/Assessments"));
const Teacher = lazy(() => import("./pages/Teacher"));
const ClassSelection = lazy(() => import("./pages/ClassSelection"));
const WritingGames = lazy(() => import("./pages/WritingGames"));
const TreasureMapLesson = lazy(() => import("./pages/TreasureMapLesson"));
const DiverPearlLesson = lazy(() => import("./pages/DiverPearlLesson"));
const BalloonHamzaLesson = lazy(() => import("./pages/BalloonHamzaLesson"));
const NotFound = lazy(() => import("./pages/NotFound"));

// استعادة جنس الصوت من الحالة المحفوظة عند كل تحميل للتطبيق
initGenderFromStore();

/** مؤشر تحميل بسيط وخفيف (CSS فقط، بلا مكتبة) يظهر للحظات فقط أثناء
 * جلب كود الصفحة المطلوبة — لا يُستخدَم أي شيء أثقل من هذا عمدًا. */
function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f5f0e8" }}>
      <div
        className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: "#1a5c2a", borderTopColor: "transparent" }}
      />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/about" component={Home} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/skills" component={Skills} />
        <Route path="/skills/speaking" component={Speaking} />
        <Route path="/skills/writing" component={Writing} />
        <Route path="/skills/self-learning" component={SelfLearning} />
        <Route path="/assessments" component={Assessments} />
        <Route path="/teacher" component={Teacher} />
        <Route path="/class-selection" component={ClassSelection} />
        <Route path="/writing-games" component={WritingGames} />
        <Route path="/writing-games/treasure-map" component={TreasureMapLesson} />
        <Route path="/writing-games/diver-pearl" component={DiverPearlLesson} />
        <Route path="/writing-games/balloon" component={BalloonHamzaLesson} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// يظهر زر «المعلم الذكي» في كل صفحات الطالب الرئيسية، ويُخفى في صفحات
// تسجيل الدخول ولوحة المعلم وداخل ألعاب الهمزة الثلاث الغامرة (التي
// لها واجهاتها وحالتها الخاصة ولا ينبغي أن يتداخل معها عنصر عائم).
const AI_WIDGET_HIDDEN_PATHS = [
  "/", "/about", "/class-selection", "/teacher",
  "/writing-games/treasure-map", "/writing-games/diver-pearl", "/writing-games/balloon",
];

function AiTeacherGate() {
  const [location] = useLocation();
  if (AI_WIDGET_HIDDEN_PATHS.includes(location)) return null;
  return <AiTeacherWidget />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
          <AiTeacherGate />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}