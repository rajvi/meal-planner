import os
import requests
import pulp
import random
from typing import List, Dict, Any
from dotenv import load_dotenv

# Load .env from parent directory
current_dir = os.path.dirname(__file__)
parent_dir = os.path.dirname(current_dir)
dotenv_path = os.path.join(parent_dir, '.env')
load_dotenv(dotenv_path, override=True)

SPOONACULAR_API_KEY = os.getenv("SPOONACULAR_API_KEY")

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
        "maxAlcohol": 0,
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
    
    # Pools
    breakfasts_raw = fetch_recipes("", "breakfast", 50)
    main_courses_raw = fetch_recipes("", "main course", 100)
    
    # Snacks: Solid
    solid_snacks_raw = fetch_recipes("", "snack", 50)
    # Drinks/Smoothies (Spoonacular doesn't have a strict smoothie type, using query)
    smoothies_raw = fetch_recipes("smoothie", "drink", 30)
    drinks_raw = fetch_recipes("", "drink", 30) # General drinks
    
    # Desserts
    desserts_raw = fetch_recipes("", "dessert", 20)
    
    # Extract Nutrients
    breakfasts = [extract_nutrients(r) for r in breakfasts_raw]
    mains = [extract_nutrients(r) for r in main_courses_raw]
    
    # Combine snacks for flexibility but keep track of type
    # Add a 'subtype' field to help with constraints
    solid_snacks = [{**extract_nutrients(r), "subtype": "solid"} for r in solid_snacks_raw]
    smoothies = [{**extract_nutrients(r), "subtype": "smoothie"} for r in smoothies_raw]
    drinks = [{**extract_nutrients(r), "subtype": "drink"} for r in drinks_raw]
    
    all_snacks = solid_snacks + smoothies + drinks
    
    desserts = [extract_nutrients(r) for r in desserts_raw]

    if not (breakfasts and mains and all_snacks):
        print("Not enough recipes found")
        return []

    # 2. Setup LP Problem
    days = range(7) # 0=Sun
    prob = pulp.LpProblem("WeeklyMealPlan", pulp.LpMinimize)
    
    # --- VARIABLES ---

    # Breakfast (1 per day)
    b_vars = pulp.LpVariable.dicts("Breakfast", ((d, i) for d in days for i in range(len(breakfasts))), cat='Binary')
    
    # Lunch & Dinner (Share mains pool, 1 each per day)
    l_vars = pulp.LpVariable.dicts("Lunch", ((d, i) for d in days for i in range(len(mains))), cat='Binary')
    d_vars = pulp.LpVariable.dicts("Dinner", ((d, i) for d in days for i in range(len(mains))), cat='Binary')
    
    # AM Snack (1 per day) - from all_snacks
    am_vars = pulp.LpVariable.dicts("AM_Snack", ((d, i) for d in days for i in range(len(all_snacks))), cat='Binary')
    
    # PM Snack (1 per day) - from all_snacks
    pm_vars = pulp.LpVariable.dicts("PM_Snack", ((d, i) for d in days for i in range(len(all_snacks))), cat='Binary')
    
    # Dessert (Discrete days)
    # We allow dessert on any day, but effectively constrained to 2 days total
    dessert_vars = pulp.LpVariable.dicts("Dessert", ((d, i) for d in days for i in range(len(desserts))), cat='Binary')
    
    # Day-has-dessert indicator (Binary)
    has_dessert = pulp.LpVariable.dicts("HasDessert", (d for d in days), cat='Binary')

    # Main Recipe Usage Indicators (for 3-4 unique constraint)
    is_main_used = pulp.LpVariable.dicts("IsMainUsed", (i for i in range(len(mains))), cat='Binary')


    # --- OBJECTIVE ---
    prob += 0, "Feasibility"


    # --- CONSTRAINTS ---

    for d in days:
        # 1. Meal Slots
        prob += pulp.lpSum([b_vars[d, i] for i in range(len(breakfasts))]) == 1, f"One_Breakfast_{d}"
        prob += pulp.lpSum([l_vars[d, i] for i in range(len(mains))]) == 1, f"One_Lunch_{d}"
        prob += pulp.lpSum([d_vars[d, i] for i in range(len(mains))]) == 1, f"One_Dinner_{d}"
        
        prob += pulp.lpSum([am_vars[d, i] for i in range(len(all_snacks))]) == 1, f"One_AM_{d}"
        prob += pulp.lpSum([pm_vars[d, i] for i in range(len(all_snacks))]) == 1, f"One_PM_{d}"
        
        # Dessert: Sum of recipes selected <= 1 (Optionally 0)
        # And link to has_dessert indicator
        prob += pulp.lpSum([dessert_vars[d, i] for i in range(len(desserts))]) == has_dessert[d], f"Dessert_Selection_{d}"

        # 2. Nutrition Targets
        # Sum of B + L + D + AM + PM + Dessert
        daily_cals = (
            pulp.lpSum([breakfasts[i]['calories'] * b_vars[d, i] for i in range(len(breakfasts))]) +
            pulp.lpSum([mains[i]['calories'] * l_vars[d, i] for i in range(len(mains))]) +
            pulp.lpSum([mains[i]['calories'] * d_vars[d, i] for i in range(len(mains))]) +
            pulp.lpSum([all_snacks[i]['calories'] * am_vars[d, i] for i in range(len(all_snacks))]) +
            pulp.lpSum([all_snacks[i]['calories'] * pm_vars[d, i] for i in range(len(all_snacks))]) +
            pulp.lpSum([desserts[i]['calories'] * dessert_vars[d, i] for i in range(len(desserts))])
        )
        
        daily_protein = (
            pulp.lpSum([breakfasts[i]['protein'] * b_vars[d, i] for i in range(len(breakfasts))]) +
            pulp.lpSum([mains[i]['protein'] * l_vars[d, i] for i in range(len(mains))]) +
            pulp.lpSum([mains[i]['protein'] * d_vars[d, i] for i in range(len(mains))]) +
            pulp.lpSum([all_snacks[i]['protein'] * am_vars[d, i] for i in range(len(all_snacks))]) +
            pulp.lpSum([all_snacks[i]['protein'] * pm_vars[d, i] for i in range(len(all_snacks))]) +
            pulp.lpSum([desserts[i]['protein'] * dessert_vars[d, i] for i in range(len(desserts))])
        )

        prob += daily_cals >= targets['calories'] - 250, f"Min_Cals_{d}" # Relaxed slightly for more meal slots
        prob += daily_cals <= targets['calories'] + 250, f"Max_Cals_{d}"
        prob += daily_protein >= targets['protein'] - 10, f"Min_Protein_{d}"

        # 3. No Same Main on Same Day
        for i in range(len(mains)):
            prob += l_vars[d, i] + d_vars[d, i] <= 1, f"No_Repeat_Main_Day_{d}_{i}"

    
    # --- GLOBAL CONSTRAINTS ---

    # 1. Mains Variety (3-4 unique recipes)
    for i in range(len(mains)):
        # Calculate usage across all days (Lunch + Dinner)
        usage_i = pulp.lpSum([l_vars[d, i] + d_vars[d, i] for d in days])
        
        # Link usage to is_main_used indicator
        # if usage > 0, is_main_used must be 1. M=14 (max possible slots)
        prob += usage_i <= 14 * is_main_used[i], f"Link_Used_Main_{i}"
        
        # if usage == 0, is_main_used can be 0.
        # We explicitly enforce is_main_used <= usage to force it to 0 if usage is 0
        prob += is_main_used[i] <= usage_i, f"Force_Unused_Main_{i}"
        
        # Limit individual recipe repetition (Max ~4)
        prob += usage_i <= 4, f"Max_Repeats_Main_{i}"

    # Sum of unique mains must be between 3 and 4
    prob += pulp.lpSum([is_main_used[i] for i in range(len(mains))]) >= 3, "Min_Unique_Mains"
    prob += pulp.lpSum([is_main_used[i] for i in range(len(mains))]) <= 4, "Max_Unique_Mains"


    # 2. Dessert Logic (Exactly 3 days, Spread out)
    prob += pulp.lpSum([has_dessert[d] for d in days]) == 3, "Three_Desserts_Weekly"
    
    # Non-consecutive desserts: has_dessert[d] + has_dessert[d+1] <= 1
    for d in range(6):
        prob += has_dessert[d] + has_dessert[d+1] <= 1, f"Spread_Dessert_{d}"


    # 3. Snack Logic (Variety between types)
    # Ensure representative mix of Smoothies, Drinks, Solid Snacks across the week (AM + PM = 14 slots)
    
    # Helper lists of indices
    solid_indices = [i for i, s in enumerate(all_snacks) if s['subtype'] == 'solid']
    smoothie_indices = [i for i, s in enumerate(all_snacks) if s['subtype'] == 'smoothie']
    drink_indices = [i for i, s in enumerate(all_snacks) if s['subtype'] == 'drink']

    total_solid = pulp.lpSum([am_vars[d, i] + pm_vars[d, i] for d in days for i in solid_indices])
    total_smoothie = pulp.lpSum([am_vars[d, i] + pm_vars[d, i] for d in days for i in smoothie_indices])
    total_drink = pulp.lpSum([am_vars[d, i] + pm_vars[d, i] for d in days for i in drink_indices])

    # Minimums to ensure rotation ("rotate between...")
    # 14 slots total.
    prob += total_solid >= 4, "Min_Solid_Snacks"
    prob += total_smoothie >= 2, "Min_Smoothies"
    prob += total_drink >= 2, "Min_Drinks"


    # Solve
    prob.solve(pulp.PULP_CBC_CMD(msg=False))
    
    if pulp.LpStatus[prob.status] != "Optimal":
        print("Optimization failed.")
        return []

    # Compile Results
    final_plan = []
    
    for d in days:
        # Breakfast
        for i in range(len(breakfasts)):
            if pulp.value(b_vars[d, i]) == 1:
                final_plan.append({**breakfasts[i], "day": d, "type": "breakfast"})
                break
        
        # AM Snack
        for i in range(len(all_snacks)):
            if pulp.value(am_vars[d, i]) == 1:
                final_plan.append({**all_snacks[i], "day": d, "type": "am_snack"})
                break
                
        # Lunch
        for i in range(len(mains)):
            if pulp.value(l_vars[d, i]) == 1:
                final_plan.append({**mains[i], "day": d, "type": "lunch"})
                break
        
        # PM Snack
        for i in range(len(all_snacks)):
            if pulp.value(pm_vars[d, i]) == 1:
                final_plan.append({**all_snacks[i], "day": d, "type": "pm_snack"})
                break

        # Dinner
        for i in range(len(mains)):
            if pulp.value(d_vars[d, i]) == 1:
                final_plan.append({**mains[i], "day": d, "type": "dinner"})
                break
                
        # Dessert
        if pulp.value(has_dessert[d]) == 1:
            for i in range(len(desserts)):
                if pulp.value(dessert_vars[d, i]) == 1:
                    final_plan.append({**desserts[i], "day": d, "type": "dessert"})
                    break
        
    return final_plan
