# Nutrient OS Product Requirements Document

Version: 3.0  
Status: Working Draft  
Last Updated: June 2026

## What This Is

Nutrient OS is a nutrition dashboard that models a user's estimated nutrient state over time and recommends the single highest-impact food action they can take right now.

It is not a calorie counter or food diary. It is a nutrient state tracker.

Core question: **What does my body actually need next?**

## Problem

Most nutrition apps assume food consumed equals nutrition received. Nutrient status is affected by:

- What was eaten
- How much was absorbed
- How much was utilized
- What is stored and for how long
- What has depleted since last intake

Nutrient OS tracks state across time instead of resetting every day.

## Core Insight

Nutrients have different persistence windows:

| Category | Examples | Persistence |
| --- | --- | --- |
| Very short | Vitamin C, most B vitamins | Hours to days |
| Short | Magnesium, Potassium | Days |
| Medium | Iron, Zinc | Weeks |
| Long | Omega-3 tissue levels | Weeks to months |
| Very long | Vitamin B12, Vitamin D, Vitamin A | Months to years |

## Model

The system maintains a rolling weighted estimate of nutrient coverage per nutrient.

Default 7-day weighting:

| Day | Weight |
| --- | --- |
| Today | 1.00 |
| Yesterday | 0.85 |
| 2 days ago | 0.70 |
| 3 days ago | 0.55 |
| 4 days ago | 0.40 |
| 5 days ago | 0.25 |
| 6 days ago | 0.10 |

Long-storage nutrients use a 30-day window with slower decay. Short-lived nutrients use a 3-day window.

Coverage status:

- Healthy: at least 80%
- Declining: 40-79%
- Gap: below 40%

The model can estimate likely decline, strongest gap-closing foods, and absorption effects from pairings and timing. It cannot determine serum levels, genetic variation, medication effects, or GI condition effects without external input.

## Home Screen

The primary view shows:

- Nutrient status at a glance
- Confidence indicator
- Healthy, declining, and gap groups
- One recommended intervention
- Expected nutrient impact
- Nutritional ROI and evidence rating
- Safety language: “Based on your logs. Not a medical assessment.”

## Nutrients Tracked

- Vitamins: A, B1, B2, B3, B5, B6, B7, B9, B12, C, D, E, K
- Minerals: Calcium, Magnesium, Potassium, Sodium, Iron, Zinc, Copper, Selenium, Manganese, Iodine, Phosphorus
- Fatty acids: Omega-3, Omega-6
- Protein: Essential amino acid profile, Leucine adequacy
- Fiber: Total, Soluble, Insoluble

## Logging

MVP supports text logging:

```text
grilled salmon with spinach and lemon
```

The text is parsed against USDA FoodData Central. Users confirm or correct before data is ingested.

Future inputs:

- Barcode scan through Open Food Facts
- Meal photo through Claude Vision

## Recommendation Engine

Foods receive a personalized ROI score based on:

- Expected gap closure
- Bioavailability
- Nutrient density per calorie
- Practical relevance from previous logs

The system surfaces:

- One best next food
- One best meal for tonight
- One best grocery add for the week

## Nutrient Synergies

Modeled pairings:

- Vitamin C plus non-heme iron increases iron absorption
- Dietary fat supports vitamins A, D, E, and K absorption
- Protein distribution across meals supports muscle protein synthesis

Modeled inhibitors:

- Coffee or tea near iron
- Excess calcium near iron
- Phytates near zinc or iron

## Confidence

| Days logged | Confidence | Meaning |
| --- | --- | --- |
| 1-3 | Low | Early estimates, wide uncertainty |
| 4-10 | Moderate | Trends becoming visible |
| 11-21 | High | Reliable directional picture |
| 21+ | Very High | Strong model, approaching bloodwork-useful |

## Tech Stack

- Frontend: React, Vite, Tailwind CSS
- Data: USDA FoodData Central API
- Barcode: Open Food Facts API
- Photo logging: Claude Vision, planned for V2
- Storage: localStorage for MVP
- Hosting: Vercel free tier

## MVP Scope

In:

- Nutrient dashboard
- 7-day rolling state model with decay
- Meal text logging and USDA lookup
- Single food recommendation
- Confidence indicator
- Nutrient detail view

Out:

- Barcode scan
- Meal photo
- User accounts or backend
- Exercise integration
- Supplement assessment
- Bloodwork upload

## Success Criteria

- A user changes a food decision because of a recommendation
- A user can name their most deficient nutrient after one week
- Confidence score increases as users log meals
- More than 70% of manual-test users rate recommendations as relevant
