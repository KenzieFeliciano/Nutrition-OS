export default function SectionLabel({ children, className = '' }) {
  return (
    <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] text-ink/40 ${className}`}>{children}</p>
  );
}
