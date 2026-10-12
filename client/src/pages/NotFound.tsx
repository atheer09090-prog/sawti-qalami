import { Compass, Home } from "lucide-react";
import { useLocation } from "wouter";
import { Btn } from "@/components/ds";

export default function NotFound() {
  const [, setLocation] = useLocation();
  return (
    <div dir="rtl" className="grid min-h-screen place-items-center p-4">
      <div className="page-enter card w-full max-w-md p-8 text-center shadow-md">
        <span className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary"><Compass size={32} strokeWidth={1.75} /></span>
        <p className="text-5xl font-bold tabular-nums text-primary">404</p>
        <h1 className="t-section mt-2 text-text-primary">الصَّفْحَةُ غَيْرُ مَوْجُودَةٍ</h1>
        <p className="t-body mb-6 mt-1 text-text-secondary">رُبَّمَا انْتَقَلَتِ الصَّفْحَةُ أَوْ كُتِبَ الرَّابِطُ بِشَكْلٍ خَاطِئٍ.</p>
        <Btn size="lg" block icon={Home} onClick={() => setLocation("/")}>الْعَوْدَةُ لِلرَّئِيسِيَّةِ</Btn>
      </div>
    </div>
  );
}
