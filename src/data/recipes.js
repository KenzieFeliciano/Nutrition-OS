// Healthy recipes that target the demo's biggest nutrient gaps (vitamin D,
// iron, omega-3, magnesium). Each one is a real, simple home recipe; the source
// links point to the public recipe databases they were adapted from so the card
// can send people somewhere to cook from.
export const recipes = [
  {
    id: 'salmon-greens-bowl',
    name: 'Salmon and lemon greens bowl',
    time: '25 min',
    targets: ['Vitamin D', 'Omega-3'],
    ingredients: ['Salmon fillet', 'Baby kale', 'Quinoa', 'Lemon', 'Olive oil'],
    why: 'Salmon is one of the few foods with real vitamin D, and the olive oil helps it absorb.',
    source: 'https://www.eatingwell.com/recipe/250827/salmon-rice-bowl/',
  },
  {
    id: 'lentil-spinach-stew',
    name: 'Lentil and spinach stew',
    time: '35 min',
    targets: ['Iron', 'Fiber'],
    ingredients: ['Brown lentils', 'Spinach', 'Tomato', 'Garlic', 'Cumin'],
    why: 'Lentils and spinach are plant iron heavyweights. Add a squeeze of lemon so the iron absorbs.',
    source: 'https://www.themealdb.com/meal/52869',
  },
  {
    id: 'sardine-avocado-toast',
    name: 'Sardine and avocado toast',
    time: '10 min',
    targets: ['Omega-3', 'Calcium'],
    ingredients: ['Sardines', 'Avocado', 'Whole grain bread', 'Red onion', 'Chili flakes'],
    why: 'Sardines pack omega-3 and, with the bones, calcium too. Fast enough for a weekday.',
    source: 'https://www.bbcgoodfood.com/recipes/sardines-toast',
  },
  {
    id: 'pumpkin-seed-yogurt',
    name: 'Yogurt with pumpkin seeds and berries',
    time: '5 min',
    targets: ['Magnesium', 'Calcium'],
    ingredients: ['Greek yogurt', 'Pumpkin seeds', 'Blueberries', 'Honey'],
    why: 'Pumpkin seeds are a top magnesium source, and the yogurt carries calcium and protein.',
    source: 'https://www.eatingwell.com/recipe/270408/yogurt-with-berries-seeds/',
  },
];
