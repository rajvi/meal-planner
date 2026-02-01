import os
import requests
import pulp
import random
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

SPOONACULAR_API_KEY = os.getenv("SPOONACULAR_API_KEY") or os.getenv("VITE_SPOONACULAR_API_KEY")

def fetch_recipes(query: str, meal_type: str, number: int = 20) -> List[Dict]:
    """
    Fetch vegan recipes from Spoonacular.
    """
    if not SPOONACULAR_API_KEY:
        raise Exception("Spoonacular API Key missing")
    
    url = "https://api.spoonacular.com/recipes/complexSearch"
    params = {
        "apiKey": SPOONACULAR_API_KEY,
        "query": query,
        "type": meal_type,
        "diet": "vegan",
        "number": number,
        "addRecipeInformation": True,
        "addRecipeNutrition": True,
        "fillIngredients": True,
        "instructionsRequired": True,
        "sort": "random" # Get different results each time
    }
    
    response = requests.get(url, params=params)
    if response.status_code != 200:
        print(f"Error fetching {meal_type}: {response.text}")
        return []
        
    data = response.json()
    return data.get("results", [])

def extract_nutrients(recipe: Dict) -> Dict:
    """Helper to extract relevant nutrients from recipe data."""
    nutrients = recipe.get("nutrition", {}).get("nutrients", [])
    
    data = {
        "id": recipe["id"],
        "title": recipe["title"],
        "image": recipe.get("image"),
        "readyInMinutes": recipe.get("readyInMinutes"),
        "servings": recipe.get("servings"),
        "calories": 0,
        "protein": 0,
        "fat": 0,
        "carbs": 0
    }
    
    for n in nutrients:
        if n["name"] == "Calories":
            data["calories"] = round(n["amount"])
        elif n["name"] == "Protein":
            data["protein"] = round(n["amount"])
        elif n["name"] == "Fat":
            data["fat"] = round(n["amount"])
        elif n["name"] == "Carbohydrates":
            data["carbs"] = round(n["amount"])
            
    return data

def generate_perfect_week(targets: Dict[str, float]) -> List[Dict]:
    """
    Generates a 7-day meal plan using Linear Programming.
    targets: {'calories': 2000, 'protein': 100, ...}
    """
    
    # 1. Fetch Pool of Recipes
    print("Fetching recipes...")
    # Increased pool size for variety
    breakfasts_raw = fetch_recipes("", "breakfast", 50)
    main_courses_raw = fetch_recipes("", "main course", 100) # For Lunch/Dinner
    snacks_raw = fetch_recipes("", "snack", 50)
    
    breakfasts = [extract_nutrients(r) for r in breakfasts_raw]
    mains = [extract_nutrients(r) for r in main_courses_raw]
    snacks = [extract_nutrients(r) for r in snacks_raw]
    
    if not (breakfasts and mains and snacks):
        print("Not enough recipes found")
        return []

    # 2. Setup LP Problem
    # We want to solve for 7 days * (1 B + 1 L + 1 D + 1 S)
    days = range(7) # 0=Sun, 6=Sat
    
    # Variables: selection_day_recipeID (Binary)
    # We need unique IDs for the vars.
    # Structure: vars[day][type] = pulp.LpVariable
    
    prob = pulp.LpProblem("WeeklyMealPlan", pulp.LpMinimize)
    
    # Decision Variables
    # We will pick 1 B, 1 L, 1 D, 1 S per day
    # Actually, let's keep it simple: pool selection.
    
    # Flatten pools for easier variable creation
    # We need to pick specific indices from the lists for each day
    
    # x_d_i_type: Day d, Index i in type pool
    b_vars = pulp.LpVariable.dicts("Breakfast", ((d, i) for d in days for i in range(len(breakfasts))), cat='Binary')
    l_vars = pulp.LpVariable.dicts("Lunch", ((d, i) for d in days for i in range(len(mains))), cat='Binary')
    d_vars = pulp.LpVariable.dicts("Dinner", ((d, i) for d in days for i in range(len(mains))), cat='Binary') # Sharing main pool
    s_vars = pulp.LpVariable.dicts("Snack", ((d, i) for d in days for i in range(len(snacks))), cat='Binary')

    # Objective: Minimize deviation from calorie target (Simplified: Minimize surplus/deficit via dummy vars, but here just minimizing calorie difference sum is hard with binary.
    # Alternative Objective: Just minimize cost (random) but strictly constrain nutrition?
    # Let's Minimize total nutritional deviation (slacks).
    
    # Actually, simpler: Objective = 0 (Feasibility Problem) or prefer higher protein?
    # Let's maximize protein as a secondary goal? Or just any valid plan.
    prob += 0, "Arbitrary Objective"

    # Constraints per Day
    for d in days:
        # 1. Exact meal counts
        prob += pulp.lpSum([b_vars[d, i] for i in range(len(breakfasts))]) == 1, f"One_Breakfast_Day_{d}"
        prob += pulp.lpSum([l_vars[d, i] for i in range(len(mains))]) == 1, f"One_Lunch_Day_{d}"
        prob += pulp.lpSum([d_vars[d, i] for i in range(len(mains))]) == 1, f"One_Dinner_Day_{d}"
        prob += pulp.lpSum([s_vars[d, i] for i in range(len(snacks))]) == 1, f"One_Snack_Day_{d}"

        # 2. Calorie Range (Target +/- 200)
        daily_cals = (
            pulp.lpSum([breakfasts[i]['calories'] * b_vars[d, i] for i in range(len(breakfasts))]) +
            pulp.lpSum([mains[i]['calories'] * l_vars[d, i] for i in range(len(mains))]) +
            pulp.lpSum([mains[i]['calories'] * d_vars[d, i] for i in range(len(mains))]) +
            pulp.lpSum([snacks[i]['calories'] * s_vars[d, i] for i in range(len(snacks))])
        )
        prob += daily_cals >= targets['calories'] - 200, f"Min_Cals_Day_{d}"
        prob += daily_cals <= targets['calories'] + 200, f"Max_Cals_Day_{d}"

        # 3. Protein Target (At least target)
        daily_protein = (
             pulp.lpSum([breakfasts[i]['protein'] * b_vars[d, i] for i in range(len(breakfasts))]) +
             pulp.lpSum([mains[i]['protein'] * l_vars[d, i] for i in range(len(mains))]) +
             pulp.lpSum([mains[i]['protein'] * d_vars[d, i] for i in range(len(mains))]) +
             pulp.lpSum([snacks[i]['protein'] * s_vars[d, i] for i in range(len(snacks))])
        )
        prob += daily_protein >= targets['protein'] - 5, f"Min_Protein_Day_{d}" # Small buffer
        
        # Avoid repeating the SAME main recipe for Lunch and Dinner on the same day
        # (Optional, but good UX)
        for i in range(len(mains)):
             prob += l_vars[d, i] + d_vars[d, i] <= 1, f"No_Repeat_Main_Day_{d}_Index_{i}"
    
    # VARIETY CONSTRAINTS (Max usage per week)
    # Breakfast: Max 2 repeats
    for i in range(len(breakfasts)):
        prob += pulp.lpSum([b_vars[d, i] for d in days]) <= 2, f"Max_Breakfast_Repeats_Index_{i}"
        
    # Mains: Max 2 repeats (sum of Lunch + Dinner usages)
    for i in range(len(mains)):
        prob += pulp.lpSum([l_vars[d, i] + d_vars[d, i] for d in days]) <= 2, f"Max_Main_Repeats_Index_{i}"
        
    # Snacks: Max 3 repeats
    for i in range(len(snacks)):
        prob += pulp.lpSum([s_vars[d, i] for d in days]) <= 3, f"Max_Snack_Repeats_Index_{i}"

    # Solve
    prob.solve(pulp.PULP_CBC_CMD(msg=False))
    
    if pulp.LpStatus[prob.status] != "Optimal":
        print("Optimization failed to find a valid solution.")
        # Fallback: Try again loose or just return empty?
        return []

    # Compile Results
    final_plan = []
    
    for d in days:
        # Find selected
        # Breakfast
        for i in range(len(breakfasts)):
            if pulp.value(b_vars[d, i]) == 1:
                item = breakfasts[i]
                final_plan.append({**item, "day": d, "type": "breakfast"})
                break
        # Lunch
        for i in range(len(mains)):
            if pulp.value(l_vars[d, i]) == 1:
                item = mains[i]
                final_plan.append({**item, "day": d, "type": "lunch"})
                break
        # Dinner
        for i in range(len(mains)):
            if pulp.value(d_vars[d, i]) == 1:
                item = mains[i]
                final_plan.append({**item, "day": d, "type": "dinner"})
                break
        # Snack
        for i in range(len(snacks)):
            if pulp.value(s_vars[d, i]) == 1:
                item = snacks[i]
                final_plan.append({**item, "day": d, "type": "snack"})
                break
                
    return final_plan
