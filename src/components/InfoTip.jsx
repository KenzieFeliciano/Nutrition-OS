import { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';

// Small click-to-open info popover used to tuck nutrient facts behind an icon
// so the surface stays calm. Closes on outside click or Escape.
export default function InfoTip({ children, label = 'More info', align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        className={`flex h-4 w-4 items-center justify-center rounded-full text-ink/30 transition hover:text-gold ${
          open ? 'text-gold' : ''
        }`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        aria-label={label}
      >
        <Info size={13} />
      </button>
      {open && (
        <span
          className={`quote-fade absolute bottom-6 z-50 w-64 rounded-xl border border-ink/10 bg-card p-3 text-left text-[11px] leading-relaxed text-ink/70 shadow-xl ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </span>
      )}
    </span>
  );
}
