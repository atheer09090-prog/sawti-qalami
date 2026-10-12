import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { BarChart3, ChevronDown, HelpCircle, Home, Layers, LogOut, MessageSquareHeart, Star, Trophy } from "lucide-react";
import { getState, logout, type StudentData } from "@/lib/store";
import { OnboardingTour } from "@/components/OnboardingTour";
import { SusSurvey } from "@/components/SusSurvey";
import { cn } from "@/lib/utils";
import { avatarSrc } from "./helpers";

const NAV = [
  { to: "/dashboard", label: "الرَّئِيسِيَّةُ", icon: Home, match: (p: string) => p === "/dashboard" },
  { to: "/skills", label: "الْمَهَارَاتُ", icon: Layers, match: (p: string) => p.startsWith("/skills") || p.startsWith("/writing-games") },
  { to: "/assessments", label: "تَقْيِيمَاتِي", icon: BarChart3, match: (p: string) => p.startsWith("/assessments") },
];

/** مسارات الطالب التي تظهر فيها الواجهة الموحّدة (الدروس الغامرة وصفحات الدخول بدونها). */
export function usesShell(path: string): boolean {
  return path === "/dashboard" || path.startsWith("/skills") || path === "/assessments" || path === "/writing-games";
}

export function AppShell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [student, setStudent] = useState<StudentData>(getState());
  const [menu, setMenu] = useState(false);
  const [tour, setTour] = useState(false);
  const [rate, setRate] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // النجوم والنقاط تتغير أثناء اللعب: نُحدّثها عند كل تنقّل وعند العودة للتبويب
  useEffect(() => { setStudent(getState()); setMenu(false); }, [location]);
  useEffect(() => {
    const refresh = () => setStudent(getState());
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [menu]);

  const go = (to: string) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) return;
    e.preventDefault(); setLocation(to);
  };

  return (
    <div className="flex min-h-screen flex-col" dir="rtl">
      {tour && <OnboardingTour onFinish={() => setTour(false)} />}
      {rate && <SusSurvey onClose={() => setRate(false)} />}

      <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur-md">
        <div className="page-container flex h-16 items-center gap-3 md:gap-6">
          <a href="/dashboard" onClick={go("/dashboard")} className="flex shrink-0 items-center gap-2.5 rounded-lg" aria-label="صوتي قلمي — الصفحة الرئيسية">
            <img src="/assets/logo.png" alt="" className="h-10 w-10 object-contain" />
            <span className="hidden text-lg font-bold text-primary sm:inline">صوتي قلمي</span>
          </a>

          <nav className="hidden items-center gap-1 md:flex" aria-label="التنقل الرئيسي">
            {NAV.map(({ to, label, icon: Icon, match }) => {
              const active = match(location);
              return (
                <a key={to} href={to} onClick={go(to)} aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative inline-flex min-h-[40px] items-center gap-2 rounded-lg px-3.5 text-[15px] transition-colors",
                    active ? "bg-primary-soft font-semibold text-primary" : "font-medium text-text-secondary hover:bg-surface-subtle hover:text-text-primary",
                  )}>
                  <Icon size={18} strokeWidth={1.85} aria-hidden />
                  {label}
                </a>
              );
            })}
          </nav>

          <div className="ms-auto flex items-center gap-2">
            <span className="badge badge-reward hidden !px-3 !py-1 tabular-nums sm:inline-flex" title="عدد النقاط">
              <Trophy size={15} strokeWidth={2} aria-hidden />{student.points ?? 0}
              <span className="font-medium opacity-80">نُقْطَةً</span>
            </span>
            <span className="badge badge-reward !px-3 !py-1 tabular-nums" title="عدد النجوم">
              <Star size={15} strokeWidth={2} fill="currentColor" aria-hidden />{student.stars ?? 0}
              <span className="hidden font-medium opacity-80 sm:inline">نَجْمَةً</span>
            </span>

            <div className="relative" ref={menuRef}>
              <button type="button" onClick={() => setMenu(m => !m)} aria-haspopup="menu" aria-expanded={menu}
                aria-label="قائمة الحساب"
                className="flex min-h-[44px] items-center gap-2 rounded-xl border border-transparent px-1.5 py-1 transition-colors hover:border-border hover:bg-surface-subtle">
                <img src={avatarSrc(student.avatar)} alt="" className="size-9 rounded-full border-2 border-primary/70 bg-white object-contain" />
                <span className="hidden max-w-[120px] truncate text-sm font-semibold text-text-primary lg:inline">{student.name}</span>
                <ChevronDown size={16} className={cn("text-text-muted transition-transform", menu && "rotate-180")} aria-hidden />
              </button>
              {menu && (
                <div role="menu" className="menu-enter card absolute end-0 top-full z-50 mt-2 w-60 overflow-hidden p-1.5 shadow-lg">
                  <div className="border-b border-border px-3 pb-2.5 pt-2">
                    <p className="truncate font-semibold text-text-primary">{student.name}</p>
                    <p className="t-caption text-text-muted">{student.grade}</p>
                  </div>
                  <MenuItem icon={HelpCircle} onClick={() => { setMenu(false); setTour(true); }}>دَلِيلُ الِاسْتِخْدَامِ</MenuItem>
                  <MenuItem icon={MessageSquareHeart} onClick={() => { setMenu(false); setRate(true); }}>قَيِّمْ تَجْرِبَتَكَ</MenuItem>
                  <div className="my-1 border-t border-border" />
                  <MenuItem icon={LogOut} danger onClick={() => { logout(); setLocation("/"); }}>تَسْجِيلُ الْخُرُوجِ</MenuItem>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 md:pb-8">{children}</main>

      {/* تنقّل الهاتف: شريط سفلي بأهداف لمس ≥ 44px */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }} aria-label="التنقل الرئيسي">
        <div className="mx-auto grid max-w-md grid-cols-3">
          {NAV.map(({ to, label, icon: Icon, match }) => {
            const active = match(location);
            return (
              <a key={to} href={to} onClick={go(to)} aria-current={active ? "page" : undefined}
                className={cn("relative flex min-h-[58px] flex-col items-center justify-center gap-0.5 text-[12px] transition-colors",
                  active ? "font-semibold text-primary" : "font-medium text-text-muted")}>
                {active && <span className="absolute inset-x-6 top-0 h-[3px] rounded-b-full bg-primary" aria-hidden />}
                <Icon size={22} strokeWidth={active ? 2.1 : 1.75} aria-hidden />
                {label}
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function MenuItem({ icon: Icon, children, onClick, danger }: { icon: typeof Home; children: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" role="menuitem" onClick={onClick}
      className={cn("flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors",
        danger ? "text-error hover:bg-error-soft" : "text-text-primary hover:bg-surface-subtle")}>
      <Icon size={18} strokeWidth={1.85} aria-hidden />{children}
    </button>
  );
}
