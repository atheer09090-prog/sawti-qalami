import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Skills from "./pages/Skills";
import Speaking from "./pages/Speaking";
import Writing from "./pages/Writing";
import SelfLearning from "./pages/SelfLearning";
import Assessments from "./pages/Assessments";
import Teacher from "./pages/Teacher";
import ClassSelection from "./pages/ClassSelection";
import WritingGames from "./pages/WritingGames";
import TreasureMapLesson from "./pages/TreasureMapLesson";
import DiverPearlLesson from "./pages/DiverPearlLesson";
import BalloonHamzaLesson from "./pages/BalloonHamzaLesson";
import NotFound from "./pages/NotFound";
import { initGenderFromStore } from "./lib/audio";
import AiTeacherWidget from "./lib/ai-teacher-widget";

// استعادة جنس الصوت من الحالة المحفوظة عند كل تحميل للتطبيق
initGenderFromStore();

function Router() {
  return (
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