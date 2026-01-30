# Plant-Based Meal Planner

An open-source plant-based meal planning app focused on hitting daily nutritional goals (e.g. protein).

## Tech Stack
- React + TypeScript
- Python (FastAPI)
- Supabase (Auth + Postgres)

## Status
🔨 MVP in progress

## License
AGPL-3.0

## Nutrition Calculation Formulas
Calculations are based on the **Mifflin-St Jeor Equation** for BMR and standard TDEE multipliers.

**Basal Metabolic Rate (BMR):**
- **Male**: `10 * weight(kg) + 6.25 * height(cm) - 5 * age(y) + 5`
- **Female**: `10 * weight(kg) + 6.25 * height(cm) - 5 * age(y) - 161`

**Total Daily Energy Expenditure (TDEE):**
`BMR * Activity Multiplier`
- Lightly Active: 1.375
- Moderately Active: 1.55
- Very Active: 1.725
- Extra Active: 1.9
- *Sedentary default: 1.2*

**Goal Adjustments:**
- Weight Loss: -500 kcal
- Muscle Gain: +250 kcal
- Maintenance: 0 kcal

**Macronutrients:**
- Protein: 0.8g - 1.4g per kg bodyweight (Based on Activity/Goal)
- Fat: 30% of Total Calories
- Carbohydrates: Remainder of Calories

**Micronutrients:**
- Iron: 8mg (Male), 18mg (Female)
- Calcium: 1000mg
- Vitamin B12: 2.4mcg