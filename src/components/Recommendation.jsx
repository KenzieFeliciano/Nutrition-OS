import { Sparkles } from 'lucide-react';
import SectionLabel from './SectionLabel.jsx';

export default function Recommendation({ recommendation }) {
  const impactLine = recommendation.impact.map((item) => `${item.nutrient} +${item.delta}%`).join(' · ');

  return (
    <section className="card-hover rounded-2xl border border-ink/5 bg-butter p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>Best next action</SectionLabel>
        <Sparkles size={14} className="text-ink/45" />
      </div>
      <h3 className="mt-2 font-display text-xl font-medium italic text-ink">{recommendation.food}</h3>
      <p className="mt-2 text-xs leading-relaxed text-ink/60">{recommendation.whyNow}</p>
      {impactLine && <p className="mt-2 font-doto text-sm font-bold text-ink">{impactLine}</p>}
      <p className="mt-3 border-t border-ink/10 pt-2.5 text-[11px] leading-relaxed text-ink/55">
        <span className="font-semibold text-ink/70">{recommendation.roi} ROI</span> · {recommendation.synergy}
      </p>
    </section>
  );
}
