import { useEffect, useState } from 'react';
import { wisdomFacts } from '../data/wisdomFacts.js';
import SectionLabel from './SectionLabel.jsx';

const ROTATE_MS = 45000;

export default function QuoteCard() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * wisdomFacts.length));

  useEffect(() => {
    const timer = setInterval(() => setIndex((current) => (current + 1) % wisdomFacts.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  const fact = wisdomFacts[index];

  return (
    <section
      className="card-hover flex flex-1 cursor-pointer flex-col rounded-2xl border border-ink/5 bg-card p-6 shadow-sm"
      onClick={() => setIndex((current) => (current + 1) % wisdomFacts.length)}
      title="Click for another"
    >
      <SectionLabel>Ancient wisdom</SectionLabel>
      <div key={index} className="quote-fade flex min-h-0 flex-1 flex-col justify-center py-3">
        <p className="font-display text-lg font-medium italic leading-relaxed text-ink">{fact.text}</p>
        <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-ink/45">{fact.tradition}</p>
      </div>
    </section>
  );
}
