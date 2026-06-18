import { fallbackFoods } from '../data/nutrientConfig.js';

function getTopGaps(nutrientState, limit = 5) {
  return nutrientState
    .filter((nutrient) => nutrient.optimize && nutrient.coverage < 80)
    .sort((a, b) => a.coverage - b.coverage)
    .slice(0, limit);
}

function scoreCandidate(candidate, gaps) {
  const gapScore = gaps.reduce((score, gap) => {
    const amount = candidate.nutrients[gap.id] || 0;
    const closure = gap.target ? Math.min((amount / gap.target) * 100, 40) : 0;
    const urgency = Math.max(100 - gap.coverage, 0) / 100;
    return score + closure * urgency;
  }, 0);

  const caloriePenalty = Math.max((candidate.calories || candidate.nutrients.calories || 0) / 850, 0);
  return Math.round(Math.max(gapScore - caloriePenalty, 0));
}

function getTimingInsight(meals) {
  if (!meals.length) {
    return 'Log your first meal to make timing and pairing guidance specific.';
  }

  const lastMeal = meals.at(-1);
  const hour = new Date().getHours();
  const lastFoods = (lastMeal.foods || []).map((food) => food.name.toLowerCase()).join(' ');

  if (lastFoods.includes('coffee') || lastFoods.includes('tea')) {
    return 'Keep iron-rich foods away from coffee or tea when possible.';
  }

  if (hour >= 16) {
    return 'Tonight is a good window to close longer-lasting mineral and omega-3 gaps.';
  }

  return 'Next meal can focus on short-lived nutrients before today closes.';
}

function getSynergyNote(gaps) {
  const ids = new Set(gaps.map((gap) => gap.id));

  if (ids.has('iron') && ids.has('vitamin-c')) {
    return 'Pair vitamin C with plant iron to improve absorption.';
  }

  if (ids.has('vitamin-d') || ids.has('vitamin-a') || ids.has('vitamin-e') || ids.has('vitamin-k')) {
    return 'Include dietary fat with fat-soluble vitamins A, D, E, and K.';
  }

  if (ids.has('protein')) {
    return 'Spread protein across meals for better daily adequacy.';
  }

  return 'Choose foods that close multiple gaps without overshooting calories.';
}

export function getBestRecommendation({ nutrientState = [], meals = [] }) {
  const gaps = getTopGaps(nutrientState);

  if (!gaps.length) {
    return {
      food: 'Keep your next meal balanced',
      score: 100,
      roi: 'Stable',
      evidence: 'Based on logged USDA nutrients',
      whyNow: 'Your logged nutrient state is currently above the gap threshold.',
      impact: [],
      timing: getTimingInsight(meals),
      synergy: 'Maintain variety across protein, fiber, minerals, and fat-soluble vitamins.',
    };
  }

  const ranked = fallbackFoods
    .map((food) => ({ ...food, score: scoreCandidate(food, gaps) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const impact = gaps
    .map((gap) => {
      const amount = best.nutrients[gap.id] || 0;
      const delta = gap.target ? Math.round((amount / gap.target) * 100) : 0;
      return { nutrient: gap.name, delta };
    })
    .filter((item) => item.delta > 0)
    .slice(0, 3);

  return {
    food: best.name,
    score: best.score,
    roi: best.score >= 35 ? 'Very High' : best.score >= 18 ? 'High' : 'Moderate',
    evidence: 'USDA-backed gaps + rule-based absorption logic',
    whyNow: `${gaps[0].name} is the lowest estimated nutrient state at ${gaps[0].coverage}%.`,
    impact,
    timing: getTimingInsight(meals),
    synergy: getSynergyNote(gaps),
  };
}
