import { ArrowRight, MousePointer2 } from "lucide-react";

export function GameBackButton({ onBack }: { onBack: () => void }) {
  return <button type="button" className="game-back-button" onClick={onBack}>
    <ArrowRight size={18} aria-hidden="true" />العودة إلى المهام
  </button>;
}

// Position and animation belong to separate elements so bobbing cannot reset the offset.
export function GameMapHint({ x, y, onActivate }: { x: number; y: number; onActivate: () => void }) {
  return <div className="game-map-hint" style={{ left: `clamp(80px, ${x}%, calc(100% - 80px))`, top: `calc(${y}% + 34px)` }}>
    <button type="button" onClick={onActivate}>
      <MousePointer2 size={17} aria-hidden="true" />اضْغَطْ هُنَا
    </button>
  </div>;
}
