# Nutrient OS Roadmap

## V1: MVP, Week 1

- Text meal logging
- USDA FoodData Central lookup
- Rolling weighted nutrient model
- Dashboard with nutrient status groups
- Single recommended food action
- Confidence indicator
- Nutrient detail view

## V2: Inputs, Weeks 2-4

- Barcode scan through Open Food Facts
- Meal photo analysis through Claude Vision
- Exercise-aware adjustments through HealthKit

## V3: Depth, Month 2

- Bloodwork upload and model calibration (manual lab entry shipped June 2026; next: exact values + PDF lab report parsing)
- Supplement assessment after legal review
- Grocery ROI view

## V4: Platform, Month 3+

- Backend and accounts (prerequisite for Sol-by-text — meals must live in a database, not localStorage)
- **Sol by text**: text a meal photo to a phone number (Twilio webhook → vision analysis → USDA match → saved to your account); the dashboard becomes the cumulative health interface you check, not the place you log
- Dietitian dashboard
- API for third-party integrations

## Product Guardrails

Nutrient OS is not:

- A calorie counter
- A macro tracker
- A diet plan
- A medical device
- A supplement recommendation engine for MVP
- A replacement for bloodwork

The product has one job: model estimated nutrient state and surface the most efficient food action to improve it.
