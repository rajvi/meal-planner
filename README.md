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
Calculations are based on the **IOM Estimated Energy Requirement (EER)** Equation, consistent with USDA DRI standards.

**EER Equation:**
- **Male**: `662 - 9.53*Age + PA * (15.91*Weight + 539.6*Height)`
- **Female**: `354 - 6.91*Age + PA * (9.36*Weight + 726*Height)`
*(Weight in kg, Height in meters)*

**Physical Activity (PA) Coefficients:**
- **Inactive**: 1.0
- **Low Active**: 1.11 (M) / 1.12 (F)
- **Active**: 1.25 (M) / 1.27 (F)
- **Very Active**: 1.48 (M) / 1.45 (F)

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

## Running Locally
1. Create a `.env` file in the root directory with the following variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   SPOONACULAR_API_KEY=your_spoonacular_api_key
   ```
2. Start the backend server:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```
3. Start the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```