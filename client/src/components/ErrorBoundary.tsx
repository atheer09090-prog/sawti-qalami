import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, type ReactNode } from "react";
import { Brand } from "@/components/ProductUI";
interface Props { children: ReactNode }
interface State { hasError: boolean }
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError:false };
  static getDerivedStateFromError(): State { return {hasError:true}; }
  componentDidCatch(error: Error) { console.error("صوتي قلمي: تعذّر عرض الصفحة",error); }
  render() {
    if(this.state.hasError) return <div className="not-found-page error-recovery-page" dir="rtl"><Brand large /><span className="not-found-art" aria-hidden="true"><AlertTriangle size={60} strokeWidth={1.2} /></span><h1>تعذّر عرض هذه الصفحة.</h1><p role="alert">جرّب إعادة التحميل للمتابعة. إذا استمرت المشكلة، حاول مرة أخرى بعد قليل.</p><button className="sawti-btn-primary" onClick={()=>window.location.reload()}><RotateCcw size={17} aria-hidden="true" />إعادة تحميل الصفحة</button></div>;
    return this.props.children;
  }
}
export default ErrorBoundary;
