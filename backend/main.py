from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from config import supabase
from planner import generate_perfect_week

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
            "image_url": item["image"],
            "ready_in_minutes": item.get("readyInMinutes"),
            "preparation_minutes": item.get("preparationMinutes"),
            "cooking_minutes": item.get("cookingMinutes"),
            "servings": item.get("servings"),
            "ingredients": item.get("ingredients"),
            "instructions": item.get("instructions"),
            "summary": item.get("summary")
        })
        
    insert_res = supabase.table("meal_plans").insert(rows).execute()
    
    return {"status": "success", "count": len(rows)}
