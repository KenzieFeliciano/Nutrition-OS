const statusColor = {
  healthy: 'bg-sage',
  declining: 'bg-gold',
  gap: 'bg-clay',
};

const DOTS = 12;

export default function NutrientRow({ nutrient }) {
  const value = Math.min(Math.max(nutrient.coverage, 0), 100);
  const filled = Math.round((value / 100) * DOTS);

  return (
    <div className="flex items-center gap-3 border-b border-ink/[0.06] py-[7px] last:border-b-0">
      <p className="w-24 shrink-0 truncate text-xs font-medium text-ink">
        {nutrient.name}
        {nutrient.calibrated && (
          <span
            className="ml-1.5 rounded-full bg-butter px-1.5 py-px align-middle text-[8px] font-semibold uppercase tracking-[0.1em] text-ink/60"
            title={`Calibrated by your ${nutrient.labStatus} lab result`}
          >
            lab
          </span>
        )}
      </p>
      <div className="flex flex-1 justify-between gap-[3px]">
        {Array.from({ length: DOTS }, (_, index) => (
          <span
            key={index}
            className={`dot-in h-[5px] w-[5px] rounded-full ${index < filled ? statusColor[nutrient.status] : 'bg-ink/10'}`}
            style={{ animationDelay: `${index * 40}ms` }}
          />
        ))}
      </div>
      <p className="w-11 shrink-0 text-right font-doto text-sm font-bold leading-none text-ink">
        {nutrient.coverage}
        <span className="text-[10px] text-ink/40">%</span>
      </p>
    </div>
  );
}
