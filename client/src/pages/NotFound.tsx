import { Compass, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Brand } from "@/components/ProductUI";
export default function NotFound() {
  const [, setLocation] = useLocation();
  return <div className="not-found-page" dir="rtl"><Brand large /><span className="not-found-art" aria-hidden="true"><Compass size={74} strokeWidth={1} /></span><p className="studio-eyebrow">404 · لنعد إلى الطريق</p><h1>هذه الصفحة غير موجودة.</h1><p>ربما تغيّر الرابط. يمكنك العودة ومتابعة رحلتك من البداية.</p><button className="sawti-btn-primary" onClick={()=>setLocation("/")}>العودة إلى البداية <ArrowLeft size={18} /></button></div>;
}
