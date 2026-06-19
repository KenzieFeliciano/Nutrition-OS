import { useEffect } from 'react';
import { ArrowUpRight, ImageUp, Sparkles, X } from 'lucide-react';
import { demoState } from '../data/demoState.js';
import { recipes } from '../data/recipes.js';
import SectionLabel from './SectionLabel.jsx';

const statusColor = {
  gap: 'bg-clay',
  declining: 'bg-gold',
  healthy: 'bg-sage',
};

// Crisp HTML twin of whichever helix card was clicked — readable + interactive.
function SectionBody({ id }) {
  if (id === 'score') {
    return (
      <div className="flex flex-col items-center py-6">
        <p className="font-doto text-7xl font-bold leading-none text-ink">{demoState.score}</p>
        <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-ink/40">/100 nourished · {demoState.confidence}</p>
        <p className="mt-5 text-sm leading-relaxed text-ink/60">
          Up {demoState.delta7} points over the last 7 days. The wireframe knot at the center of your vortex draws itself
          closed as this score approaches 100.
        </p>
      </div>
    );
  }
  if (id === 'gaps') {
    return (
      <div className="mt-2">
        {demoState.gaps.map((gap) => (
          <div key={gap.id} className="flex items-center gap-3 border-b border-ink/[0.06] py-2.5 last:border-b-0">
            <p className="w-28 shrink-0 text-sm font-medium text-ink">{gap.name}</p>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
              <span className={`block h-full rounded-full ${statusColor[gap.status]}`} style={{ width: `${Math.min(gap.coverage, 100)}%` }} />
            </span>
            <p className="w-10 shrink-0 text-right font-doto text-base font-bold text-ink">{gap.coverage}</p>
          </div>
        ))}
      </div>
    );
  }
  if (id === 'today') {
    return (
      <div className="mt-2">
        {demoState.today.map((row) => (
          <div key={row.name} className="flex items-baseline justify-between gap-3 border-b border-ink/[0.06] py-3 last:border-b-0">
            <p className="text-sm font-medium text-ink">{row.name}</p>
            <p className="font-doto text-2xl font-bold leading-none text-ink">
              {row.remaining}
              <span className="ml-1 text-xs font-normal text-ink/40">{row.unit}</span>
            </p>
          </div>
        ))}
      </div>
    );
  }
  if (id === 'action') {
    return (
      <div className="mt-2">
        <h3 className="font-display text-3xl font-medium italic text-ink">{demoState.action.food}</h3>
        <p className="mt-3 text-sm leading-relaxed text-ink/60">{demoState.action.why}</p>
        <p className="mt-4 font-doto text-base font-bold text-ink">{demoState.action.impact}</p>
        <p className="mt-4 border-t border-ink/10 pt-3 text-xs leading-relaxed text-ink/55">
          <span className="font-semibold text-ink/70">{demoState.action.roi} ROI</span> · {demoState.action.synergy}
        </p>
      </div>
    );
  }
  if (id === 'meals') {
    return (
      <div className="mt-2">
        {demoState.meals.map((meal) => (
          <div key={meal.summary} className="flex items-center gap-3 border-b border-ink/[0.06] py-2.5 last:border-b-0">
            <span className="h-10 w-10 shrink-0 rounded-lg" style={{ background: meal.tone }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{meal.summary}</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-ink/40">{meal.time}</p>
            </div>
          </div>
        ))}
        <button
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink/15 bg-cream px-3 py-3 text-sm font-medium text-ink transition hover:border-ink/30"
          type="button"
        >
          <ImageUp size={15} className="text-ink/55" />
          Log a meal (demo)
        </button>
      </div>
    );
  }
  if (id === 'wisdom') {
    return (
      <div className="flex min-h-[14rem] flex-col justify-center py-4">
        <p className="font-display text-xl font-medium italic leading-relaxed text-ink">“{demoState.wisdom.text}”</p>
        <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-ink/45">{demoState.wisdom.tradition}</p>
      </div>
    );
  }
  if (id === 'nutrients') {
    return (
      <div className="mt-3 max-h-[24rem] overflow-y-auto pr-1">
        {demoState.nutrients26.map((nutrient) => (
          <div key={nutrient.name} className="flex items-center gap-3 border-b border-ink/[0.06] py-2 last:border-b-0">
            <span className={`h-2 w-2 shrink-0 rounded-full ${statusColor[nutrient.status]}`} />
            <p className="w-28 shrink-0 text-sm font-medium text-ink">{nutrient.name}</p>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
              <span className={`block h-full rounded-full ${statusColor[nutrient.status]}`} style={{ width: `${Math.min(nutrient.pct, 100)}%` }} />
            </span>
            <p className="w-10 shrink-0 text-right font-doto text-base font-bold text-ink">{nutrient.pct}</p>
          </div>
        ))}
      </div>
    );
  }
  if (id === 'recipes') {
    return (
      <div className="mt-2">
        {recipes.map((recipe) => (
          <a
            key={recipe.id}
            href={recipe.source}
            target="_blank"
            rel="noreferrer"
            className="group block border-b border-ink/[0.06] py-3 last:border-b-0"
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-ink group-hover:text-clay">{recipe.name}</p>
              <ArrowUpRight size={14} className="shrink-0 text-ink/30 transition group-hover:text-clay" />
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-gold">{recipe.targets.join(' · ')} · {recipe.time}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-ink/55">{recipe.why}</p>
            <p className="mt-1.5 text-[11px] text-ink/45">{recipe.ingredients.join(', ')}</p>
          </a>
        ))}
      </div>
    );
  }
  if (id === 'podcast') {
    return (
      <div className="mt-2 py-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-gold">Huberman Lab · Ep. 68</p>
        <h3 className="mt-2 font-display text-2xl font-medium italic text-ink">Light and Circadian Rhythms</h3>
        <p className="mt-3 text-sm leading-relaxed text-ink/60">
          Ten to twenty minutes of morning sunlight sets your circadian rhythm, sharpens focus, and improves sleep.
        </p>
      </div>
    );
  }
  return null;
}

const SECTION_TITLES = {
  score: 'Nourished score',
  gaps: 'Nutrient state',
  today: 'Today remaining',
  action: 'Best next action',
  meals: 'Meal log',
  wisdom: 'Ancient wisdom',
  nutrients: 'Nutrients',
  recipes: 'Recipes',
  podcast: 'Podcast insight',
};

export default function FocusOverlay({ entry, onClose }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isTile = entry.kind === 'tile';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="sol-widget-enter w-full max-w-md rounded-2xl border border-gold/30 bg-card p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={13} className="text-gold" />
            <SectionLabel>{isTile ? 'Nutrient' : SECTION_TITLES[entry.id]}</SectionLabel>
          </div>
          <button
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream text-ink/55 transition hover:text-ink"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {isTile ? (
          <div className="mt-2 flex flex-col items-center py-6">
            <p className="font-display text-2xl font-medium italic text-ink">{entry.nutrient.name}</p>
            <p className="mt-4 font-doto text-6xl font-bold leading-none text-ink">
              {entry.nutrient.pct}
              <span className="text-2xl text-ink/40">%</span>
            </p>
            <span
              className={`mt-4 rounded-full px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-cream ${statusColor[entry.nutrient.status]}`}
            >
              {entry.nutrient.status}
            </span>
          </div>
        ) : (
          <SectionBody id={entry.id} />
        )}

        <p className="mt-4 text-center text-[9px] uppercase tracking-[0.2em] text-ink/35">esc or click outside to return to the vortex</p>
      </div>
    </div>
  );
}
