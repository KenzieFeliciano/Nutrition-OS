import {
  confidenceLevels,
  decayProfiles,
  nutrientAliases,
  nutrients,
  profileTargets,
  statusThresholds,
} from '../data/nutrientConfig.js';

const dayMs = 24 * 60 * 60 * 1000;

const activityFactors = { sedentary: 1.3, moderate: 1.5, active: 1.75 };
const proteinPerKg = { sedentary: 0.8, moderate: 1.2, active: 1.6 };

export function getProfileTargets(profile) {
  const base = profileTargets[profile.sex]?.[profile.ageRange] ?? profileTargets.female['19-30'];
  const weightKg = Number(profile.weightLb) * 0.4536;
  const heightCm = Number(profile.heightIn) * 2.54;

  if (!weightKg || !heightCm) return base;

  // Mifflin-St Jeor BMR scaled by activity; protein per kg of body weight;
  // fiber at the AI of 14g per 1000 kcal.
  const age = 25;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (profile.sex === 'male' ? 5 : -161);
  const activity = activityFactors[profile.activity] ?? activityFactors.moderate;
  const calories = Math.round(bmr * activity);
  const protein = Math.round(weightKg * (proteinPerKg[profile.activity] ?? proteinPerKg.moderate));

  return {
    ...base,
    calories,
    protein: Math.max(protein, base.protein),
    'fiber-total': Math.round((calories / 1000) * 14),
  };
}

const CALIBRATION_WINDOW_DAYS = 120;

export function getLabCalibration(nutrientId, bloodwork = [], now = new Date()) {
  const entries = bloodwork
    .filter((entry) => entry.nutrientId === nutrientId)
    .sort((a, b) => new Date(b.takenAt) - new Date(a.takenAt));
  const latest = entries[0];
  if (!latest) return null;

  // lab influence fades linearly back to "trust the food log" over ~4 months
  const fade = Math.max(0, 1 - daysBetween(now, latest.takenAt) / CALIBRATION_WINDOW_DAYS);
  if (fade <= 0) return null;
  if (latest.status === 'low') return { multiplier: 1 - 0.4 * fade, status: latest.status };
  if (latest.status === 'high') return { multiplier: 1 + 0.25 * fade, status: latest.status };
  return { multiplier: 1, status: latest.status };
}

export function getConfidence(daysLogged = 0) {
  return confidenceLevels.find((level) => daysLogged >= level.minDays && daysLogged <= level.maxDays) ?? confidenceLevels[0];
}

export function getNutrientStatus(coverage = 0) {
  if (coverage >= statusThresholds.healthy) return 'healthy';
  if (coverage >= statusThresholds.declining) return 'declining';
  return 'gap';
}

export function getDecayProfile(profileName) {
  return decayProfiles[profileName] ?? decayProfiles.short;
}

// Local calendar date, not UTC — toISOString would roll "today" into
// tomorrow during the evening for anyone west of Greenwich.
export function getDayKey(date = new Date()) {
  const day = new Date(date);
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
}

export function daysBetween(later, earlier) {
  const laterDay = new Date(getDayKey(later)).getTime();
  const earlierDay = new Date(getDayKey(earlier)).getTime();
  return Math.max(0, Math.round((laterDay - earlierDay) / dayMs));
}

export function sumNutrients(items = []) {
  return items.reduce((totals, item) => {
    Object.entries(item.nutrients || {}).forEach(([nutrientId, amount]) => {
      totals[nutrientId] = (totals[nutrientId] || 0) + Number(amount || 0);
    });
    return totals;
  }, {});
}

export function extractNutrientsFromFdcFood(food, grams = 100) {
  const multiplier = Number(grams || 100) / 100;
  const totals = {};

  (food.foodNutrients || []).forEach((entry) => {
    const nutrient = entry.nutrient || {};
    // FDC responses carry both the FDC nutrient id (nutrient.id / nutrientId)
    // and the legacy NDB number (nutrient.number / nutrientNumber); the alias
    // table is keyed by FDC id, so try every candidate.
    const candidates = [nutrient.id, entry.nutrientId, nutrient.number, entry.nutrientNumber];
    const nutrientId = candidates.map((value) => nutrientAliases[String(value ?? '')]).find(Boolean);
    const rawAmount = entry.amount ?? entry.value ?? entry.nutrient?.amount;

    if (!nutrientId || rawAmount == null) return;

    totals[nutrientId] = (totals[nutrientId] || 0) + Number(rawAmount) * multiplier;
  });

  return totals;
}

export function buildFoodLog({ analysisFood, fdcFood, selectedMatch }) {
  const grams = Number(analysisFood.estimatedGrams || analysisFood.quantity || 100);

  return {
    id: crypto.randomUUID(),
    name: analysisFood.name,
    displayName: selectedMatch?.description || fdcFood.description || analysisFood.name,
    fdcId: fdcFood.fdcId,
    dataType: fdcFood.dataType,
    estimatedGrams: grams,
    confidence: analysisFood.confidence ?? 0.6,
    prepStyle: analysisFood.prepStyle || 'unspecified',
    usdaSearchQuery: analysisFood.usdaSearchQuery || analysisFood.name,
    nutrients: extractNutrientsFromFdcFood(fdcFood, grams),
  };
}

export function calculateTodayRemaining(meals, targets, now = new Date()) {
  const today = getDayKey(now);
  const todayFoods = meals.filter((meal) => getDayKey(meal.loggedAt) === today).flatMap((meal) => meal.foods || []);
  const consumed = sumNutrients(todayFoods);

  return Object.entries(targets).reduce((remaining, [nutrientId, target]) => {
    if (target == null) return remaining;
    const eaten = consumed[nutrientId] || 0;
    remaining[nutrientId] = {
      target,
      consumed: eaten,
      remaining: Math.max(target - eaten, 0),
      coverage: target > 0 ? Math.min(Math.round((eaten / target) * 100), 999) : 0,
    };
    return remaining;
  }, {});
}

export function calculateWeightedCoverage({ nutrient, meals = [], targets, now = new Date() }) {
  const target = targets[nutrient.id];
  if (!target) return null;

  const profile = getDecayProfile(nutrient.decayProfile);
  const weightedTotal = meals.reduce((total, meal) => {
    const ageDays = daysBetween(now, meal.loggedAt);
    if (ageDays >= profile.windowDays) return total;

    const weight = profile.weights[ageDays] ?? profile.weights.at(-1);
    const mealTotals = sumNutrients(meal.foods || []);
    return total + (mealTotals[nutrient.id] || 0) * weight;
  }, 0);

  return {
    weightedTotal,
    coverage: Math.min(Math.round((weightedTotal / target) * 100), 999),
  };
}

export function estimateNutrientState({ meals = [], profile, bloodwork = [], now = new Date() }) {
  const targets = getProfileTargets(profile);
  const todayRemaining = calculateTodayRemaining(meals, targets, now);
  const loggedDayCount = new Set(meals.map((meal) => getDayKey(meal.loggedAt))).size;
  const confidence = getConfidence(loggedDayCount);

  const estimatedState = nutrients
    .filter((nutrient) => targets[nutrient.id])
    .map((nutrient) => {
      const result = calculateWeightedCoverage({ nutrient, meals, targets, now });
      const today = todayRemaining[nutrient.id];
      const calibration = getLabCalibration(nutrient.id, bloodwork, now);
      const coverage = Math.min(Math.round((result?.coverage ?? 0) * (calibration?.multiplier ?? 1)), 999);

      return {
        ...nutrient,
        target: targets[nutrient.id],
        weightedTotal: result?.weightedTotal ?? 0,
        todayConsumed: today?.consumed ?? 0,
        todayRemaining: today?.remaining ?? targets[nutrient.id],
        todayCoverage: today?.coverage ?? 0,
        coverage,
        calibrated: Boolean(calibration),
        labStatus: calibration?.status ?? null,
        status: getNutrientStatus(coverage),
      };
    });

  const score = Math.round(
    estimatedState
      .filter((nutrient) => nutrient.optimize)
      .reduce((total, nutrient) => total + Math.min(nutrient.coverage, 100), 0) /
      estimatedState.filter((nutrient) => nutrient.optimize).length || 0,
  );

  return {
    targets,
    todayRemaining,
    estimatedState,
    confidence,
    loggedDayCount,
    score,
  };
}

export function getDailyScoreHistory({ meals = [], profile, bloodwork = [], days = 7, now = new Date() }) {
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(now.getTime() - (days - 1 - index) * dayMs);
    const dayEnd = new Date(`${getDayKey(day)}T23:59:59`);
    const mealsThroughDay = meals.filter((meal) => new Date(meal.loggedAt) <= dayEnd);
    const { score } = estimateNutrientState({ meals: mealsThroughDay, profile, bloodwork, now: dayEnd });
    return { day: getDayKey(day), score };
  });
}
