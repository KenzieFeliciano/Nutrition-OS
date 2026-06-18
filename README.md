# Nutrient OS

Nutrient OS is a nutrition dashboard that models estimated nutrient state over time and surfaces the single highest-impact food action a user can take right now.

It is not a calorie counter, macro tracker, diet plan, or medical device. The app answers one question: **What does my body actually need next, based on my logs?**

## MVP

The first version focuses on:

- Nutrient status dashboard with healthy, declining, and gap states
- Confidence indicator based on days logged
- Text meal logging against USDA FoodData Central
- Rolling weighted nutrient coverage model
- Single recommended food intervention with expected nutrient impact
- Nutrient detail view for trends, sources, and absorption context

Out of MVP: barcode scan, meal photo, accounts, backend, exercise integration, supplement assessment, and bloodwork upload.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Add a USDA FoodData Central API key to `.env`:

```bash
VITE_USDA_FDC_API_KEY=your_key_here
```

## Scripts

- `npm run dev`: start local development server
- `npm run build`: create production build
- `npm run preview`: preview production build locally

## Project Structure

```text
src/
  data/
    nutrientConfig.js
  lib/
    nutrientModel.js
    fdcApi.js
    roiEngine.js
    photoAnalysis.js
  components/
    Dashboard.jsx
    NutrientRow.jsx
    Recommendation.jsx
    MealLogger.jsx
    NutrientDetail.jsx
```

## Safety Language

Every estimate should be presented as an estimate from logged data. The UI should use language like “Based on your logs” and avoid medical claims.
