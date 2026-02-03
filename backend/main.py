from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from config import supabase
from planner import generate_perfect_week, fetch_single_recipe

app = FastAPI()

# Allow CORS (Frontend running on localhost:5173 or similar)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Meal Planner Backend"}

@app.post("/api/generate-plan/{user_id}")
async def generate_plan(user_id: str):
    # 1. Fetch Daily Targets
    response = supabase.table("daily_targets").select("*").eq("user_id", user_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="User targets not found. Complete Intake first.")
    
    targets = response.data[0]
    target_cals = targets["calories_kcal"]
    target_protein = targets["protein_g"]
    
    print(f"Generating plan for {user_id}: Target {target_cals}kcal, {target_protein}g Protein")
    
    # 2. Generate Plan
    plan_items = generate_perfect_week({
        "calories": target_cals,
        "protein": target_protein
    })
    
    if not plan_items:
        raise HTTPException(status_code=500, detail="Could not find a valid meal plan. Try adjusting targets.")

    # 3. Save to DB
    # Clear old plan
    supabase.table("meal_plans").delete().eq("user_id", user_id).execute()
    
    # Insert new
    rows = []
    for item in plan_items:
        rows.append({
            "user_id": user_id,
            "day_of_week": item["day"],
            "meal_type": item["type"],
            "recipe_id_external": item["id"],
            "recipe_title": item["title"],
            "calories": item["calories"],
            "protein_g": item["protein"],
            "fat_g": item["fat"],
            "carbs_g": item["carbs"],
            "image_url": item["image"]
        })
        
    insert_res = supabase.table("meal_plans").insert(rows).execute()
    
    return {"status": "success", "count": len(rows)}

@app.get("/api/recipe-details/{meal_id}")
def get_recipe_details(meal_id: str):
    """
    Fetch full recipe details. If missing in DB, fetch from Spoonacular and cache.
    """
    # 1. Check DB first
    res = supabase.table("meal_plans").select("*").eq("id", meal_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Meal not found")
    
    meal = res.data
    
    # 2. If instructions already exist, return it
    if meal.get("instructions"):
        return meal
        
    # 3. Else, fetch from Spoonacular
    print(f"Lazy loading details for recipe {meal['recipe_id_external']}...")
    details = fetch_single_recipe(meal["recipe_id_external"])
    
    if not details:
        raise HTTPException(status_code=500, detail="Could not fetch recipe details")
        
    # 4. Update DB (Cache)
    update_data = {
        "ready_in_minutes": details.get("readyInMinutes"),
        "preparation_minutes": details.get("preparationMinutes"),
        "cooking_minutes": details.get("cookingMinutes"),
        "servings": details.get("servings"),
        "ingredients": details.get("ingredients"),
        "instructions": details.get("instructions"),
        "summary": details.get("summary"),
        # Update macros just in case they were zero or slightly different
        "calories": details.get("calories"),
        "protein_g": details.get("protein"),
        "fat_g": details.get("fat"),
        "carbs_g": details.get("carbs")
    }
    
    supabase.table("meal_plans").update(update_data).eq("id", meal_id).execute()
    
    # Return merged data
    return {**meal, **update_data}
