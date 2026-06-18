# Nutrient OS Architecture

## System Shape

Nutrient OS is a client-only React app for MVP. It stores user logs locally, estimates nutrient coverage over time, and recommends one food action based on the largest personalized nutrient gaps.

## Data Flow

```text
Meal text input
  -> USDA FoodData Central search
  -> user confirmation/correction
  -> local meal log
  -> nutrient model
  -> nutrient state dashboard
  -> ROI recommendation
```

## Core Modules

- `src/data/nutrientConfig.js`: nutrient list, RDA values, decay profiles, confidence levels
- `src/lib/fdcApi.js`: USDA FoodData Central API boundary
- `src/lib/nutrientModel.js`: weighted intake, coverage percentage, status calculation
- `src/lib/roiEngine.js`: personalized food scoring and recommendation selection
- `src/lib/photoAnalysis.js`: V2 placeholder for meal photo analysis

## Nutrient Model

The model compares weighted intake against each nutrient's RDA. Nutrient-specific decay profiles control the lookback window and weighting curve.

Coverage maps to status:

- Healthy: at least 80%
- Declining: 40-79%
- Gap: below 40%

All outputs are estimates based on logs, not medical assessments.

## API Boundaries

USDA FoodData Central is the MVP source for text meal lookup and nutrient facts. The browser reads the API key from `VITE_USDA_FDC_API_KEY`.

Open Food Facts and Claude Vision are roadmap integrations. They should eventually normalize into the same confirmed meal-log format used by text logging.

## Storage

MVP storage should use `localStorage`:

- meal logs
- corrected food matches
- user confirmation history
- lightweight recommendation feedback

No backend, auth, or account data should be added for MVP.

## UI Principles

- Show one specific recommendation, not a feed of generic advice
- Keep confidence visible
- Label estimates as “Based on your logs”
- Make correction effortless because logging errors are the primary model risk
