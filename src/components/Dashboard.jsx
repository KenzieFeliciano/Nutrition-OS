import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Home, Leaf, Settings, Trash2, X } from 'lucide-react';
import { nutrients } from '../data/nutrientConfig.js';
import { analyzeMealPhoto, getFdcFood, parseMealText, searchFdcFoods } from '../lib/apiClient.js';
import { compressImage, createThumbnail } from '../lib/imageUtils.js';
import { buildFoodLog, estimateNutrientState, getDailyScoreHistory, sumNutrients } from '../lib/nutrientModel.js';
import { getBestRecommendation } from '../lib/roiEngine.js';
import { clearNutritionState, loadNutritionState, saveNutritionState } from '../lib/storage.js';
import { demoState } from '../data/demoState.js';
import AssistantChat from './AssistantChat.jsx';
import FocusOverlay from './FocusOverlay.jsx';
import HelixScene from './HelixSceneDemo.jsx';
import MealLogger from './MealLogger.jsx';
import SectionLabel from './SectionLabel.jsx';
import SolBlob from './SolBlob.jsx';

// generic USDA records (SR Legacy/Foundation) match home-cooked meals far
// better than the branded flood, so rank them first while keeping relevance
const dataTypeRank = { 'SR Legacy': 0, Foundation: 0, 'Survey (FNDDS)': 1, Branded: 2 };

function sortMatches(foods) {
  return [...foods].sort((a, b) => (dataTypeRank[a.dataType] ?? 3) - (dataTypeRank[b.dataType] ?? 3));
}

function getGreeting(hour = new Date().getHours()) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function IntroGreeting({ name, assistantName, onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2800);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className="intro-overlay fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-oat bg-hud-grid"
      onClick={onDone}
    >
      <div className="px-6 text-center">
        <p className="intro-rise text-[10px] font-semibold uppercase tracking-[0.5em] text-muted">Nutrient OS</p>
        <h1 className="intro-rise mt-5 font-display text-6xl font-semibold tracking-tight text-ink sm:text-8xl">
          {getGreeting()}, {name}.
        </h1>
        <p className="intro-rise intro-rise-late mt-5 text-[11px] uppercase tracking-[0.3em] text-ink/40">
          {assistantName} is calibrating your nutrient state
        </p>
      </div>
    </div>
  );
}

function BackgroundFX() {
  const glowRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const el = glowRef.current;
    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 3 };
    const target = { ...pos };
    let raf;

    const onMove = (event) => {
      target.x = event.clientX;
      target.y = event.clientY;
    };
    const loop = () => {
      pos.x += (target.x - pos.x) * 0.07;
      pos.y += (target.y - pos.y) * 0.07;
      if (el) el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('pointermove', onMove);
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <>
      <div className="bg-blob bg-blob-1" />
      <div className="bg-blob bg-blob-2" />
      <div className="bg-blob bg-blob-3" />
      <div id="cursor-glow" ref={glowRef} />
    </>
  );
}

function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <p className="font-doto text-xl font-bold leading-none text-ink">
      {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </p>
  );
}

function StatStrip({ score, mealCount, confidence }) {
  const today = new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });
  const stats = [
    { label: 'Score', value: score },
    { label: 'Meals logged', value: mealCount },
    { label: 'Confidence', value: confidence.label },
    { label: 'Date', value: today },
  ];

  return (
    <footer className="mt-4 flex flex-wrap items-end justify-between gap-x-10 gap-y-3 border-t border-ink/10 pt-4">
      <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
        {stats.map((stat) => (
          <div key={stat.label}>
            <SectionLabel className="!text-[9px]">{stat.label}</SectionLabel>
            <p className="mt-1 font-doto text-xl font-bold leading-none text-ink">{stat.value}</p>
          </div>
        ))}
        <div>
          <SectionLabel className="!text-[9px]">Local time</SectionLabel>
          <div className="mt-1">
            <LiveClock />
          </div>
        </div>
      </div>
      <p className="text-[9px] uppercase tracking-[0.2em] text-ink/35">Based on your logs · Not a medical assessment</p>
    </footer>
  );
}

function SolWidget({ thinking, assistantName, contextSummary, onThinkingChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-30 flex flex-col items-end gap-3">
      {open && (
        <div className="sol-widget-enter w-[20.5rem] rounded-2xl border border-ink/10 bg-card/95 p-4 shadow-2xl shadow-ink/20 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-base font-medium italic text-ink">{assistantName}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] text-ink/40">
                <span className="status-pulse h-1.5 w-1.5 rounded-full bg-gold" />
                {thinking ? 'Thinking' : 'Online'} · wellness intelligence
              </p>
            </div>
            <button
              className="flex h-7 w-7 items-center justify-center rounded-full bg-cream text-ink/50 transition hover:text-ink"
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              <X size={13} />
            </button>
          </div>
          <div className="mt-3">
            <AssistantChat
              contextSummary={contextSummary}
              assistantName={assistantName}
              onThinkingChange={onThinkingChange}
            />
          </div>
        </div>
      )}
      <button
        className="sol-float group flex items-center gap-2.5 rounded-full border border-ink/10 bg-card/90 py-1.5 pl-1.5 pr-5 shadow-lg shadow-ink/10 backdrop-blur transition hover:shadow-xl hover:shadow-gold/20"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? `Hide ${assistantName}` : `Ask ${assistantName}`}
      >
        <SolBlob thinking={thinking} size={44} />
        <span className="text-sm font-medium text-ink/75 transition group-hover:text-ink">
          {open ? 'Close' : `Ask ${assistantName}`}
        </span>
      </button>
    </div>
  );
}

function LogToast({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div className="fixed bottom-6 left-6 z-40 max-w-xs rounded-2xl border border-ink/5 bg-butter p-4 shadow-xl">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-cream">
          <Check size={12} />
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/60">Meal logged</p>
      </div>
      {!!toast.deltas.length && (
        <p className="mt-2.5 font-doto text-base font-bold text-ink">
          {toast.deltas.map((delta) => `${delta.name} +${delta.pct}%`).join(' · ')}
        </p>
      )}
    </div>
  );
}


const labNutrients = nutrients.filter((nutrient) => nutrient.optimize);

function BloodworkCard({ bloodwork, onAdd, onDelete }) {
  const [draft, setDraft] = useState(() => ({
    nutrientId: 'vitamin-d',
    status: 'low',
    takenAt: new Date().toISOString().slice(0, 10),
  }));
  const nutrientName = (id) => labNutrients.find((nutrient) => nutrient.id === id)?.name ?? id;

  return (
    <section className="card-hover rounded-2xl border border-ink/5 bg-card p-5 shadow-sm">
      <SectionLabel>Bloodwork</SectionLabel>
      <p className="mt-3 text-sm leading-relaxed text-ink/60">
        Add markers from recent labs. A low or high result recalibrates that nutrient’s estimate, and the lab’s influence
        fades out over about four months as your food log takes back over.
      </p>

      {!!bloodwork.length && (
        <div className="mt-4 space-y-2">
          {bloodwork.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl bg-cream px-3 py-2">
              <div className="flex items-baseline gap-2">
                <p className="text-sm font-medium text-ink">{nutrientName(entry.nutrientId)}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] ${
                    entry.status === 'low' ? 'bg-clay/15 text-clay' : entry.status === 'high' ? 'bg-gold/20 text-ink/70' : 'bg-sage/20 text-ink/70'
                  }`}
                >
                  {entry.status}
                </span>
                <span className="text-xs text-ink/40">{entry.takenAt}</span>
              </div>
              <button
                className="text-ink/35 transition hover:text-clay"
                type="button"
                onClick={() => onDelete(entry.id)}
                aria-label={`Remove ${nutrientName(entry.nutrientId)} lab entry`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-[1.4fr_1fr_1.2fr_auto] items-end gap-2">
        <label className="block">
          <span className="text-xs text-ink/55">Marker</span>
          <select
            className="mt-1.5 w-full rounded-xl border border-ink/10 bg-cream px-2.5 py-2 text-sm outline-none focus:border-ink/30"
            value={draft.nutrientId}
            onChange={(event) => setDraft({ ...draft, nutrientId: event.target.value })}
          >
            {labNutrients.map((nutrient) => (
              <option key={nutrient.id} value={nutrient.id}>
                {nutrient.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-ink/55">Result</span>
          <select
            className="mt-1.5 w-full rounded-xl border border-ink/10 bg-cream px-2.5 py-2 text-sm outline-none focus:border-ink/30"
            value={draft.status}
            onChange={(event) => setDraft({ ...draft, status: event.target.value })}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-ink/55">Drawn on</span>
          <input
            className="mt-1.5 w-full rounded-xl border border-ink/10 bg-cream px-2.5 py-1.5 text-sm outline-none focus:border-ink/30"
            type="date"
            value={draft.takenAt}
            onChange={(event) => setDraft({ ...draft, takenAt: event.target.value })}
          />
        </label>
        <button
          className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-cream transition hover:bg-ink/90"
          type="button"
          onClick={() => onAdd({ ...draft, id: crypto.randomUUID() })}
        >
          Add
        </button>
      </div>
      <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-ink/35">
        PDF lab upload and exact values are on the roadmap
      </p>
    </section>
  );
}

function SettingsView({ profile, bloodwork, mealCount, onChange, onAddBloodwork, onDeleteBloodwork, onReset }) {
  return (
    <div className="mx-auto mt-6 w-full max-w-xl space-y-4">
      <section className="card-hover rounded-2xl border border-ink/5 bg-card p-5 shadow-sm">
        <SectionLabel>Profile</SectionLabel>
        <label className="mt-4 block">
          <span className="text-xs text-ink/55">Your name, used in your greeting</span>
          <input
            className="mt-1.5 w-full rounded-xl border border-ink/10 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-ink/30"
            type="text"
            value={profile.name || ''}
            onChange={(event) => onChange({ ...profile, name: event.target.value })}
          />
        </label>
        <label className="mt-4 block">
          <span className="text-xs text-ink/55">Assistant name</span>
          <input
            className="mt-1.5 w-full rounded-xl border border-ink/10 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-ink/30"
            type="text"
            value={profile.assistantName || ''}
            onChange={(event) => onChange({ ...profile, assistantName: event.target.value })}
          />
        </label>
        <div className="mt-4">
          <span className="text-xs text-ink/55">Sex, sets RDA targets</span>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {['female', 'male'].map((sex) => (
              <button
                key={sex}
                className={`rounded-xl px-3 py-2 text-sm font-medium capitalize transition ${
                  profile.sex === sex ? 'bg-ink text-cream' : 'bg-cream text-ink/55 hover:text-ink'
                }`}
                type="button"
                onClick={() => onChange({ ...profile, sex })}
              >
                {sex}
              </button>
            ))}
          </div>
        </div>
        <label className="mt-4 block">
          <span className="text-xs text-ink/55">Age range</span>
          <select
            className="mt-1.5 w-full rounded-xl border border-ink/10 bg-cream px-3 py-2 text-sm outline-none focus:border-ink/30"
            value={profile.ageRange}
            onChange={(event) => onChange({ ...profile, ageRange: event.target.value })}
          >
            <option value="19-30">19-30</option>
          </select>
        </label>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-ink/55">Weight (lb)</span>
            <input
              className="mt-1.5 w-full rounded-xl border border-ink/10 bg-cream px-3 py-2 text-sm outline-none focus:border-ink/30"
              type="number"
              min="0"
              placeholder="e.g. 130"
              value={profile.weightLb || ''}
              onChange={(event) => onChange({ ...profile, weightLb: event.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-xs text-ink/55">Height (in)</span>
            <input
              className="mt-1.5 w-full rounded-xl border border-ink/10 bg-cream px-3 py-2 text-sm outline-none focus:border-ink/30"
              type="number"
              min="0"
              placeholder="e.g. 65"
              value={profile.heightIn || ''}
              onChange={(event) => onChange({ ...profile, heightIn: event.target.value })}
            />
          </label>
        </div>
        <label className="mt-4 block">
          <span className="text-xs text-ink/55">Activity level</span>
          <select
            className="mt-1.5 w-full rounded-xl border border-ink/10 bg-cream px-3 py-2 text-sm outline-none focus:border-ink/30"
            value={profile.activity || 'moderate'}
            onChange={(event) => onChange({ ...profile, activity: event.target.value })}
          >
            <option value="sedentary">Sedentary, mostly sitting</option>
            <option value="moderate">Moderate, regular movement or workouts</option>
            <option value="active">Active, training most days</option>
          </select>
        </label>
        <p className="mt-3 text-xs leading-relaxed text-ink/45">
          Weight, height, and activity personalize your calorie target (Mifflin-St Jeor), protein target (g per kg of body
          weight), and fiber target (14g per 1,000 kcal). Leave them blank to use standard RDAs.
        </p>
      </section>

      <BloodworkCard bloodwork={bloodwork} onAdd={onAddBloodwork} onDelete={onDeleteBloodwork} />

      <section className="card-hover rounded-2xl border border-ink/5 bg-card p-5 shadow-sm">
        <SectionLabel>Data</SectionLabel>
        <p className="mt-3 text-sm text-ink/60">
          {mealCount} meal{mealCount === 1 ? '' : 's'} logged, stored only in this browser.
        </p>
        <button
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-clay/15 px-4 py-2.5 text-sm font-medium text-clay transition hover:bg-clay/25"
          type="button"
          onClick={onReset}
        >
          <Trash2 size={14} />
          Reset all data
        </button>
      </section>
    </div>
  );
}

export default function Dashboard() {
  const [nutritionState, setNutritionState] = useState(() => loadNutritionState());
  const [view, setView] = useState('home');
  const [showIntro, setShowIntro] = useState(true);
  const [focusEntry, setFocusEntry] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [pendingFoods, setPendingFoods] = useState([]);
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChatThinking, setIsChatThinking] = useState(false);
  const [toast, setToast] = useState(null);
  const targetsRef = useRef(null);

  useEffect(() => {
    saveNutritionState(nutritionState);
  }, [nutritionState]);

  const model = useMemo(
    () =>
      estimateNutrientState({
        meals: nutritionState.meals,
        profile: nutritionState.profile,
        bloodwork: nutritionState.bloodwork,
      }),
    [nutritionState],
  );
  targetsRef.current = model.targets;
  const dailyScores = useMemo(
    () =>
      getDailyScoreHistory({
        meals: nutritionState.meals,
        profile: nutritionState.profile,
        bloodwork: nutritionState.bloodwork,
      }),
    [nutritionState],
  );
  const recommendation = useMemo(
    () => getBestRecommendation({ nutrientState: model.estimatedState, meals: nutritionState.meals }),
    [model.estimatedState, nutritionState.meals],
  );
  const optimized = model.estimatedState.filter((nutrient) => nutrient.optimize);
  const stateRows = [...optimized].sort((a, b) => a.coverage - b.coverage);
  const focusNutrient = stateRows[0];
  const todayRows = [...optimized].sort((a, b) => b.todayRemaining - a.todayRemaining).slice(0, 5);
  const recentMeals = [...nutritionState.meals].slice(-5).reverse();

  const name = nutritionState.profile.name || 'Kenzie';
  const assistantName = nutritionState.profile.assistantName || 'Sol';
  const solThinking = isAnalyzing || isChatThinking;
  const assistantLine = !nutritionState.meals.length
    ? `Log your first meal in Settings and I'll start mapping your nutrient state.`
    : focusNutrient && focusNutrient.coverage < 80
      ? `Tracking ${optimized.length} nutrients. ${focusNutrient.name} is your biggest gap at ${focusNutrient.coverage}%. ${recommendation.food} closes it fastest.`
      : 'Everything I track is in a healthy range. Keep your next meal balanced and varied.';

  const contextSummary = useMemo(() => {
    const gaps = stateRows.slice(0, 5).map((n) => `${n.name} ${n.coverage}%`).join(', ');
    const today = todayRows.map((n) => `${n.name} ${Math.round(n.todayRemaining)}${n.unit} left`).join(', ');
    const recentMeals = nutritionState.meals.slice(-3).map((meal) => meal.summary).join(' | ') || 'none yet';
    return [
      `User: ${name}, ${nutritionState.profile.sex}, age ${nutritionState.profile.ageRange}.`,
      `Overall nutrient score: ${model.score}/100 (confidence: ${model.confidence.label}).`,
      `Lowest nutrient states: ${gaps}.`,
      `Largest remaining today: ${today}.`,
      `Recent meals: ${recentMeals}.`,
      `Current recommendation: ${recommendation.food}. ${recommendation.whyNow}`,
    ].join('\n');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, nutritionState.meals, nutritionState.profile, recommendation]);

  // photo and text logging share the same "resolve each food against USDA" step
  async function resolveFoods(analysisResult) {
    return Promise.all(
      (analysisResult.foods || []).map(async (analysisFood) => {
        const searchQuery = analysisFood.usdaSearchQuery || analysisFood.name;
        // one failed lookup shouldn't discard the whole meal
        const result = await searchFdcFoods(searchQuery).catch(() => ({ foods: [] }));
        const matches = sortMatches(result.foods || []);
        return {
          id: crypto.randomUUID(),
          analysisFood,
          searchQuery,
          matches,
          selectedFdcId: matches[0]?.fdcId ? String(matches[0].fdcId) : '',
        };
      }),
    );
  }

  async function handleAnalyzeFile(file) {
    setError('');
    setAnalysis(null);
    setPendingFoods([]);
    setIsAnalyzing(true);

    try {
      const compressed = await compressImage(file);
      setImagePreview(compressed);
      const photoAnalysis = await analyzeMealPhoto(compressed);
      const foods = await resolveFoods(photoAnalysis);
      setAnalysis(photoAnalysis);
      setPendingFoods(foods);
      if (!foods.length) {
        setError('The image was analyzed, but no foods were confidently detected.');
      }
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleLogText(text) {
    setError('');
    setAnalysis(null);
    setPendingFoods([]);
    setImagePreview('');
    setIsAnalyzing(true);

    try {
      const parsed = await parseMealText(text);
      const foods = await resolveFoods(parsed);
      setAnalysis(parsed);
      setPendingFoods(foods);
      if (!foods.length) {
        setError('I could not turn that into foods. Try describing it differently.');
      }
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleSelectMatch(itemId, fdcId) {
    setPendingFoods((items) => items.map((item) => (item.id === itemId ? { ...item, selectedFdcId: fdcId } : item)));
  }

  async function handleSearchAgain(itemId, query) {
    const result = await searchFdcFoods(query).catch(() => null);

    setPendingFoods((items) =>
      items.map((item) => {
        if (item.id !== itemId) return item;
        if (!result) return { ...item, searchError: 'USDA search failed. Try again in a moment.' };
        const matches = sortMatches(result.foods || []);
        return {
          ...item,
          searchQuery: query,
          matches,
          selectedFdcId: matches[0]?.fdcId ? String(matches[0].fdcId) : '',
          searchError: matches.length ? '' : 'No USDA results for that search.',
        };
      }),
    );
  }

  function handleCancelPending() {
    setAnalysis(null);
    setPendingFoods([]);
    setImagePreview('');
  }

  async function handleConfirmMeal() {
    setError('');
    setIsSaving(true);

    try {
      // each item fails independently so one flaky USDA lookup can't discard the meal
      const results = await Promise.all(
        pendingFoods
          .filter((item) => item.selectedFdcId)
          .map(async (item) => {
            try {
              const fdcFood = await getFdcFood(item.selectedFdcId);
              const selectedMatch = item.matches.find((match) => String(match.fdcId) === String(item.selectedFdcId));
              return { food: buildFoodLog({ analysisFood: item.analysisFood, fdcFood, selectedMatch }) };
            } catch {
              return { failedName: item.analysisFood.name };
            }
          }),
      );
      const foods = results.filter((result) => result.food).map((result) => result.food);
      const failedNames = results.filter((result) => result.failedName).map((result) => result.failedName);

      if (!foods.length) {
        throw new Error('USDA lookups failed for every item. Wait a moment and press Confirm again.');
      }

      const meal = {
        id: crypto.randomUUID(),
        loggedAt: new Date().toISOString(),
        summary: analysis?.mealSummary || foods.map((food) => food.name).join(', '),
        timingNotes: analysis?.timingNotes || [],
        uncertainty: analysis?.uncertainty || [],
        // localStorage holds ~5MB total, so persist a small thumbnail rather than the full photo
        imagePreview: await createThumbnail(imagePreview),
        foods,
      };

      const added = sumNutrients(foods);
      const targets = targetsRef.current || {};
      const deltas = optimized
        .map((nutrient) => ({
          name: nutrient.name,
          pct: targets[nutrient.id] ? Math.round(((added[nutrient.id] || 0) / targets[nutrient.id]) * 100) : 0,
        }))
        .filter((delta) => delta.pct > 0)
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 3);

      setNutritionState((current) => ({ ...current, meals: [...current.meals, meal] }));
      setToast({ deltas });
      handleCancelPending();
      if (failedNames.length) {
        setError(`Meal logged without ${failedNames.join(', ')}. That USDA lookup kept failing, so re-log it on its own if you like.`);
      }
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    clearNutritionState();
    setNutritionState(loadNutritionState());
    handleCancelPending();
    setError('');
    setView('home');
  }

  const navButtons = (dark) => (
    <nav className="pointer-events-auto flex flex-wrap gap-2">
      {[
        { id: 'home', label: 'Home', icon: Home },
        { id: 'settings', label: 'Settings', icon: Settings },
      ].map((tab) => (
        <button
          key={tab.id}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
            view === tab.id
              ? dark
                ? 'border border-gold/50 bg-gold/15 text-cream'
                : 'bg-ink text-cream'
              : dark
                ? 'border border-white/10 bg-black/30 text-cream/55 hover:text-cream'
                : 'bg-card text-ink/55 hover:text-ink'
          }`}
          type="button"
          onClick={() => setView(tab.id)}
        >
          <tab.icon size={14} />
          {tab.label}
        </button>
      ))}
    </nav>
  );

  if (view === 'home') {
    return (
      <main className="relative h-screen overflow-hidden bg-ivory text-ink">
        {showIntro && <IntroGreeting name={name} assistantName={assistantName} onDone={() => setShowIntro(false)} />}
        <HelixScene onFocus={setFocusEntry} />

        {/* HUD chrome over the vortex */}
        <header className="pointer-events-none absolute inset-x-5 top-5 z-10 flex items-start justify-between gap-4 sm:inset-x-7">
          <div>
            <div className="flex items-center gap-2">
              <span className="status-pulse h-1.5 w-1.5 rounded-full bg-gold" />
              <p className="text-[9px] font-semibold uppercase tracking-[0.4em] text-ink/50">Nutrient OS // living nutrition map</p>
            </div>
            <h1 className="mt-2.5 font-display text-4xl font-semibold tracking-tight text-ink">
              {getGreeting()}, {name}.
            </h1>
            <p className="mt-1.5 max-w-sm text-[11px] leading-relaxed text-muted">
              A living map of your nutrition. Drift the cards and tap any one to see your score, gaps, and the reasoning behind each recommendation.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2.5">
            {navButtons(false)}
            <div className="text-right">
              <p className="font-doto text-base font-bold leading-none text-ink/90">
                {demoState.score}
                <span className="text-ink/40">/100</span>
              </p>
              <p className="mt-1 text-[8px] uppercase tracking-[0.24em] text-ink/45">
                {demoState.nutrients26.length + 6} signals mapped
              </p>
            </div>
          </div>
        </header>



        <div className="emotional-anchor pointer-events-none absolute bottom-16 left-5 z-10 hidden max-w-[19rem] rounded-[1.75rem] border border-white/45 bg-cream/70 px-5 py-4 shadow-2xl shadow-ink/10 backdrop-blur-xl sm:block">
          <p className="font-display text-xl italic leading-tight text-ink">
            Vitamin D is improving faster than expected.
          </p>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted/80">
            Four nutrients reached target this week
          </p>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center">
          <p className="text-[9px] uppercase tracking-[0.26em] text-ink/45">
            drift the map · click a card to focus · pathways show why
          </p>
        </div>

        {focusEntry && <FocusOverlay entry={focusEntry} onClose={() => setFocusEntry(null)} />}
        {toast && <LogToast toast={toast} onDismiss={() => setToast(null)} />}
        <SolWidget
          thinking={solThinking}
          assistantName={assistantName}
          contextSummary={contextSummary}
          onThinkingChange={setIsChatThinking}
        />
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-oat bg-hud-grid px-4 py-5 text-ink sm:px-6 lg:px-10">
      <BackgroundFX />
      {toast && <LogToast toast={toast} onDismiss={() => setToast(null)} />}
      <SolWidget
        thinking={solThinking}
        assistantName={assistantName}
        contextSummary={contextSummary}
        onThinkingChange={setIsChatThinking}
      />
      <div className="relative z-10 mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-butter">
                <Leaf size={11} />
              </span>
              <SectionLabel className="!tracking-[0.4em]">Nutrient OS</SectionLabel>
            </div>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
              {getGreeting()}, {name}.
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-muted">{assistantLine}</p>
          </div>
          {navButtons(false)}
        </header>

        <div className="mx-auto mt-6 w-full max-w-xl">
          <MealLogger
            imagePreview={imagePreview}
            pendingFoods={pendingFoods}
            analysis={analysis}
            isAnalyzing={isAnalyzing}
            isSaving={isSaving}
            error={error}
            onAnalyzeFile={handleAnalyzeFile}
            onLogText={handleLogText}
            onSelectMatch={handleSelectMatch}
            onSearchAgain={handleSearchAgain}
            onConfirmMeal={handleConfirmMeal}
            onCancel={handleCancelPending}
            recentMeals={recentMeals}
          />
        </div>

        <SettingsView
          profile={nutritionState.profile}
          bloodwork={nutritionState.bloodwork}
          mealCount={nutritionState.meals.length}
          onChange={(profile) => setNutritionState((current) => ({ ...current, profile }))}
          onAddBloodwork={(entry) =>
            setNutritionState((current) => ({ ...current, bloodwork: [...current.bloodwork, entry] }))
          }
          onDeleteBloodwork={(id) =>
            setNutritionState((current) => ({
              ...current,
              bloodwork: current.bloodwork.filter((entry) => entry.id !== id),
            }))
          }
          onReset={handleReset}
        />

        <StatStrip score={model.score} mealCount={nutritionState.meals.length} confidence={model.confidence} />
      </div>
    </main>
  );
}
