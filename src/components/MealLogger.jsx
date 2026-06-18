import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Camera, Check, ImageUp, Loader2, Mic, Search, X } from 'lucide-react';
import SectionLabel from './SectionLabel.jsx';

const SpeechRecognition =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined;

function TextVoiceInput({ disabled, onSubmit }) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  function toggleMic() {
    if (!SpeechRecognition) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    let base = text ? `${text} ` : '';
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      setText(base + transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    recognitionRef.current?.stop();
    onSubmit(trimmed);
    setText('');
  }

  return (
    <div className="mt-2.5 flex items-center gap-2">
      {SpeechRecognition && (
        <button
          type="button"
          onClick={toggleMic}
          disabled={disabled}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${
            listening ? 'animate-pulse border-clay/40 bg-clay/15 text-clay' : 'border-ink/10 bg-cream text-ink/55 hover:text-ink'
          }`}
          aria-label={listening ? 'Stop recording' : 'Describe meal by voice'}
        >
          <Mic size={15} />
        </button>
      )}
      <input
        className="w-full rounded-full border border-ink/10 bg-cream px-4 py-2 text-xs text-ink outline-none transition placeholder:text-ink/40 focus:border-gold/60"
        type="text"
        value={text}
        disabled={disabled}
        placeholder={listening ? 'Listening…' : 'Or type what you ate…'}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            submit();
          }
        }}
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled || !text.trim()}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-cream transition hover:bg-ink/85 disabled:opacity-40"
        aria-label="Log meal from text"
      >
        <ArrowUp size={15} />
      </button>
    </div>
  );
}

function MatchSearch({ item, onSearchAgain }) {
  const [query, setQuery] = useState(item.searchQuery || item.analysisFood.name);
  const [busy, setBusy] = useState(false);

  async function search() {
    const trimmed = query.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    await onSearchAgain(item.id, trimmed);
    setBusy(false);
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        className="w-full rounded-xl border border-ink/10 bg-card px-3 py-1.5 text-xs text-ink outline-none transition placeholder:text-ink/40 focus:border-gold/60"
        type="text"
        value={query}
        placeholder="Not right? Search USDA differently…"
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            search();
          }
        }}
      />
      <button
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-cream transition hover:bg-ink/85 disabled:opacity-40"
        type="button"
        onClick={search}
        disabled={busy || !query.trim()}
        aria-label="Search USDA"
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
      </button>
    </div>
  );
}

function ConfirmModal({ imagePreview, analysis, pendingFoods, isSaving, onSelectMatch, onSearchAgain, onConfirmMeal, onCancel }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/25 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-ink/5 bg-cream p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <SectionLabel>Confirm meal</SectionLabel>
            <h2 className="mt-1 font-display text-xl font-medium italic text-ink">
              {analysis?.mealSummary || 'Detected foods'}
            </h2>
          </div>
          <button
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card text-ink/55 transition hover:text-ink"
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
          >
            <X size={15} />
          </button>
        </div>

        {imagePreview && <img className="mt-4 h-40 w-full rounded-xl object-cover" src={imagePreview} alt="Uploaded meal" />}

        <div className="mt-4 space-y-3">
          {pendingFoods.map((item) => (
            <div key={item.id} className="rounded-xl border border-ink/5 bg-card p-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-ink">{item.analysisFood.name}</p>
                <p className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-ink/40">
                  ~{Math.round(item.analysisFood.estimatedGrams || 100)}g
                </p>
              </div>
              <select
                className="mt-2 w-full rounded-xl border border-ink/10 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-ink/30"
                value={item.selectedFdcId || ''}
                onChange={(event) => onSelectMatch(item.id, event.target.value)}
              >
                <option value="">No match selected</option>
                {item.matches.map((match) => (
                  <option key={match.fdcId} value={match.fdcId}>
                    {match.description}
                    {match.dataType === 'Branded' && match.brandOwner ? ` (${match.brandOwner})` : ''}
                  </option>
                ))}
              </select>
              <MatchSearch item={item} onSearchAgain={onSearchAgain} />
              {item.searchError && <p className="mt-2 text-xs text-clay">{item.searchError}</p>}
              {!item.matches.length && !item.searchError && (
                <p className="mt-2 text-xs text-clay">No USDA match found — search differently above, or it will be skipped.</p>
              )}
            </div>
          ))}
        </div>

        <button
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-cream transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          disabled={isSaving || pendingFoods.every((item) => !item.selectedFdcId)}
          onClick={onConfirmMeal}
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          Confirm meal
        </button>
      </div>
    </div>
  );
}

export default function MealLogger({
  imagePreview,
  pendingFoods,
  analysis,
  isAnalyzing,
  isSaving,
  error,
  onAnalyzeFile,
  onLogText,
  onSelectMatch,
  onSearchAgain,
  onConfirmMeal,
  onCancel,
  recentMeals,
}) {
  return (
    <section className="card-hover rounded-2xl border border-ink/5 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>Log meal</SectionLabel>
        <Camera size={14} className="text-ink/40" />
      </div>

      <label
        className={`mt-3 flex cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-dashed border-ink/15 bg-cream px-4 py-3.5 transition hover:border-ink/30 ${
          isAnalyzing ? 'scan-shimmer' : ''
        }`}
      >
        {isAnalyzing ? <Loader2 size={16} className="animate-spin text-ink/55" /> : <ImageUp size={16} className="text-ink/55" />}
        <span className="text-xs font-medium text-ink">{isAnalyzing ? 'Analyzing photo…' : 'Upload food photo'}</span>
        <input
          className="sr-only"
          type="file"
          accept="image/*"
          disabled={isAnalyzing || isSaving}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onAnalyzeFile(file);
            event.target.value = '';
          }}
        />
      </label>

      <TextVoiceInput disabled={isAnalyzing || isSaving} onSubmit={onLogText} />

      {error && <p className="mt-3 rounded-xl bg-clay/15 px-3 py-2 text-xs text-clay">{error}</p>}

      {!!recentMeals.length && (
        <div className="mt-3">
          {recentMeals.map((meal) => (
            <div key={meal.id} className="flex items-center gap-2.5 border-b border-ink/[0.06] py-2 last:border-b-0">
              {meal.imagePreview && <img className="h-8 w-8 shrink-0 rounded-lg object-cover" src={meal.imagePreview} alt="" />}
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-ink">{meal.summary}</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-ink/40">
                  {new Date(meal.loggedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingFoods.length > 0 && (
        <ConfirmModal
          imagePreview={imagePreview}
          analysis={analysis}
          pendingFoods={pendingFoods}
          isSaving={isSaving}
          onSelectMatch={onSelectMatch}
          onSearchAgain={onSearchAgain}
          onConfirmMeal={onConfirmMeal}
          onCancel={onCancel}
        />
      )}
    </section>
  );
}
