import { defaultProfile } from '../data/nutrientConfig.js';

const STORAGE_KEY = 'nutritionos:v1';

export const initialState = {
  profile: defaultProfile,
  meals: [],
  bloodwork: [],
};

export function loadNutritionState() {
  if (typeof window === 'undefined') return initialState;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw);
    return {
      ...initialState,
      ...parsed,
      profile: { ...defaultProfile, ...(parsed.profile || {}) },
      meals: Array.isArray(parsed.meals) ? parsed.meals : [],
      bloodwork: Array.isArray(parsed.bloodwork) ? parsed.bloodwork : [],
    };
  } catch {
    return initialState;
  }
}

export function saveNutritionState(state) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearNutritionState() {
  window.localStorage.removeItem(STORAGE_KEY);
}
