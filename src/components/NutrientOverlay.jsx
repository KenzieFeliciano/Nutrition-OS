import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { decayProfiles, nutrientInfo, pairingTips } from '../data/nutrientConfig.js';
import SectionLabel from './SectionLabel.jsx';

const statusColor = {
  healthy: 'bg-sage',
  declining: 'bg-gold',
  gap: 'bg-clay',
};

const personalizedTargets = {
  protein: 'personalized to your body weight and activity',
  calories: 'estimated from your weight, height, and activity',
  'fiber-total': 'scaled to your calorie target',
};

function basisLine(nutrient) {
  const profile = decayProfiles[nutrient.decayProfile] ?? decayProfiles.short;
  const targetBasis = personalizedTargets[nutrient.id] || 'the recommended daily intake for your age and sex';
  return `Your decay-weighted intake over the last ${profile.windowDays} days (recent meals count most) ÷ your target of ${nutrient.target} ${nutrient.unit}, which is ${targetBasis}. This nutrient persists ${profile.persistence.toLowerCase()}, so the window matches how long it lingers in the body.`;
}

function NutrientDetailRow({ nutrient }) {
  const [open, setOpen] = useState(false);
  const value = Math.min(Math.max(nutrient.coverage, 0), 100);
  const info = nutrientInfo[nutrient.id];
  const pairing = pairingTips[nutrient.id];

  return (
    <div className="border-b border-ink/[0.06] last:border-b-0">
      <button
        type="button"
        className="flex w-full items-center gap-3 py-2 text-left"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span className="w-24 shrink-0 truncate text-xs font-medium text-ink">{nutrient.name}</span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
          <span className={`block h-full rounded-full ${statusColor[nutrient.status]}`} style={{ width: `${value}%` }} />
        </span>
        <span className="w-9 shrink-0 text-right font-doto text-sm font-bold leading-none text-ink">{nutrient.coverage}</span>
        <ChevronDown size={13} className={`shrink-0 text-ink/35 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="quote-fade space-y-2 pb-3 pl-1 pr-7 text-[11px] leading-relaxed text-ink/65">
          {info && (
            <p className="inline-flex items-center gap-2">
              <span className="rounded-full bg-butter px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-ink/60">
                {info.tag}
              </span>
            </p>
          )}
          {info && <p>{info.fact}</p>}
          <p>
            <span className="font-semibold text-ink/75">How this % is read: </span>
            {basisLine(nutrient)}
          </p>
          {pairing && (
            <p>
              <span className="font-semibold text-ink/75">Best paired: </span>
              {pairing}
            </p>
          )}
          {nutrient.calibrated && (
            <p className="text-gold">Adjusted by your recent {nutrient.labStatus} lab result.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function NutrientOverlay({ rows, onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/25 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-ink/5 bg-cream p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <SectionLabel>Nutrient state</SectionLabel>
            <h2 className="mt-1 font-display text-2xl font-medium italic text-ink">All {rows.length} tracked</h2>
            <p className="mt-1 text-xs text-ink/50">Tap any nutrient for how its percentage is calculated and why it matters.</p>
          </div>
          <button
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card text-ink/55 transition hover:text-ink"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>
        <div className="mt-4 grid gap-x-10 sm:grid-cols-2">
          <div>
            {rows.slice(0, Math.ceil(rows.length / 2)).map((nutrient) => (
              <NutrientDetailRow key={nutrient.id} nutrient={nutrient} />
            ))}
          </div>
          <div>
            {rows.slice(Math.ceil(rows.length / 2)).map((nutrient) => (
              <NutrientDetailRow key={nutrient.id} nutrient={nutrient} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
