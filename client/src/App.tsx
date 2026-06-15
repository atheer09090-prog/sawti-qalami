import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Skills from "./pages/Skills";
import Speaking from "./pages/Speaking";
import Writing from "./pages/Writing";
import SelfLearning from "./pages/SelfLearning";
import Assessments from "./pages/Assessments";
import Teacher from "./pages/Teacher";
import ClassSelection from "./pages/ClassSelection";
import NotFound from "./pages/NotFound";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/skills" component={Skills} />
      <Route path="/skills/speaking" component={Speaking} />
      <Route path="/skills/writing" component={Writing} />
      <Route path="/skills/self-learning" component={SelfLearning} />
      <Route path="/assessments" component={Assessments} />
      <Route path="/teacher" component={Teacher} />
      <Route path="/class-selection" component={ClassSelection} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}