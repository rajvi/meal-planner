import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import ProgressTracker from "./ProgressTracker";

interface DailyTargets {
  calories_kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  iron_mg: number;
  vitamin_b12_mcg: number;
  calcium_mg: number;
}

interface MealPlanItem {
  id: string;
  day_of_week: number; // 0=Sun
  meal_type: string;
  recipe_title: string;
  calories: number;
  protein_g: number;
  image_url: string;
  ready_in_minutes: number;
  servings: number;
  is_eaten?: boolean;
  fat_g?: number;
  carbs_g?: number;
  iron_mg?: number;
  calcium_mg?: number;
  vitamin_b12_mcg?: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [targets, setTargets] = useState<DailyTargets | null>(null);
  const [loadingTargets, setLoadingTargets] = useState(true);

  // Meal Plan State
  const [mealPlan, setMealPlan] = useState<MealPlanItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealPlanItem | null>(null); // For detailed view


  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoadingTargets(true);
      try {
        // 1. Fetch Targets
        const { data: targetData, error: targetError } = await supabase
          .from("daily_targets")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (targetError && targetError.code !== "PGRST116") {
          console.error(targetError);
        }
        if (targetData) setTargets(targetData);

        // 2. Fetch Meal Plan
        const { data: planData, error: planError } = await supabase
          .from("meal_plans")
          .select("*")
          .eq("user_id", user.id)
          .order("day_of_week", { ascending: true });

        if (planError) {
          console.error(planError);
        }
        if (planData) setMealPlan(planData);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoadingTargets(false);
      }
    };

    fetchData();
  }, [user]);

  // Calculate planned calories for TODAY
  const currentDayIndex = new Date().getDay();

  // Calculate Planned Totals (sum of all meals for today)
  const todayMeals = mealPlan.filter(m => m.day_of_week === currentDayIndex);

  const planned = {
    calories: todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0),
    protein: todayMeals.reduce((sum, m) => sum + (m.protein_g || 0), 0),
    fat: todayMeals.reduce((sum, m) => sum + (m.fat_g || 0), 0),
    carbs: todayMeals.reduce((sum, m) => sum + (m.carbs_g || 0), 0),
    iron: todayMeals.reduce((sum, m) => sum + (m.iron_mg || 0), 0),
    calcium: todayMeals.reduce((sum, m) => sum + (m.calcium_mg || 0), 0),
    b12: todayMeals.reduce((sum, m) => sum + (m.vitamin_b12_mcg || 0), 0),
  };

  const consumed = {
    calories: todayMeals.filter(m => m.is_eaten).reduce((sum, m) => sum + (m.calories || 0), 0),
    protein: todayMeals.filter(m => m.is_eaten).reduce((sum, m) => sum + (m.protein_g || 0), 0),
    fat: todayMeals.filter(m => m.is_eaten).reduce((sum, m) => sum + (m.fat_g || 0), 0),
    carbs: todayMeals.filter(m => m.is_eaten).reduce((sum, m) => sum + (m.carbs_g || 0), 0),
    iron: todayMeals.filter(m => m.is_eaten).reduce((sum, m) => sum + (m.iron_mg || 0), 0),
    calcium: todayMeals.filter(m => m.is_eaten).reduce((sum, m) => sum + (m.calcium_mg || 0), 0),
    b12: todayMeals.filter(m => m.is_eaten).reduce((sum, m) => sum + (m.vitamin_b12_mcg || 0), 0),
  };

  const handleToggleEaten = async (mealId: string, currentState: boolean) => {
    if (!user) return;
    const newState = !currentState;

    try {
      // 1. Update meal_plans table
      const { error: updateError } = await supabase
        .from("meal_plans")
        .update({ is_eaten: newState })
        .eq("id", mealId);

      if (updateError) throw updateError;

      // 2. Update local state
      setMealPlan(prev => prev.map(m => m.id === mealId ? { ...m, is_eaten: newState } : m));

      // 3. Recalculate totals for daily_logs
      // We need to fetch the updated state of all meals for today
      const today = new Date().toISOString().split('T')[0];
      const todayMealsUpdated = mealPlan.map(m => m.id === mealId ? { ...m, is_eaten: newState } : m)
        .filter(m => m.day_of_week === currentDayIndex && m.is_eaten);

      const logData = {
        user_id: user.id,
        log_date: today,
        calories_consumed: todayMealsUpdated.reduce((sum, m) => sum + (m.calories || 0), 0),
        protein_consumed_g: todayMealsUpdated.reduce((sum, m) => sum + (m.protein_g || 0), 0),
        fat_consumed_g: todayMealsUpdated.reduce((sum, m) => sum + (m.fat_g || 0), 0),
        carbs_consumed_g: todayMealsUpdated.reduce((sum, m) => sum + (m.carbs_g || 0), 0),
        iron_consumed_mg: todayMealsUpdated.reduce((sum, m) => sum + (m.iron_mg || 0), 0),
        calcium_consumed_mg: todayMealsUpdated.reduce((sum, m) => sum + (m.calcium_mg || 0), 0),
        b12_consumed_mcg: todayMealsUpdated.reduce((sum, m) => sum + (m.vitamin_b12_mcg || 0), 0),
      };

      // 4. Upsert into daily_logs
      const { error: upsertError } = await supabase
        .from("daily_logs")
        .upsert(logData, { onConflict: 'user_id,log_date' });

      if (upsertError) throw upsertError;

    } catch (err) {
      console.error("Error toggling meal:", err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/signin");
  };

  const handleGeneratePlan = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      // Call Backend API
      const response = await fetch(`http://127.0.0.1:8000/api/generate-plan/${user.id}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate plan");
      }

      // Refresh Plan from DB
      const { data: planData, error: planError } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("user_id", user.id)
        .order("day_of_week", { ascending: true });

      if (planError) {
        console.error(planError);
      }
      if (planData) setMealPlan(planData);

    } catch (error) {
      console.error("Error generating plan:", error);
      alert("Failed to generate plan. Ensure backend is running.");
    } finally {
      setGenerating(false);
    }
  };

  // Helper to group meals by day
  // Helper to group meals by day
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const mealOrder = ['breakfast', 'am_snack', 'lunch', 'pm_snack', 'dinner', 'dessert', 'snack'];

  const mealsByDay = (dayIndex: number) => {
    return mealPlan
      .filter(m => m.day_of_week === dayIndex)
      .sort((a, b) => {
        const indexA = mealOrder.indexOf(a.meal_type.toLowerCase());
        const indexB = mealOrder.indexOf(b.meal_type.toLowerCase());
        const rankA = indexA === -1 ? 99 : indexA;
        const rankB = indexB === -1 ? 99 : indexB;
        return rankA - rankB;
      });
  };

  const formatMealType = (type: string) => {
    switch (type) {
      case 'am_snack': return 'AM Snack';
      case 'pm_snack': return 'PM Snack';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans">
      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold text-green-600">Meal Planner</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500 dark:text-gray-300 hidden sm:block">
                {user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:dark:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">

        {/* Daily Targets Section */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Targets</h2>
            {/* Add Edit/Recalculate button later if needed */}
          </div>

          {!loadingTargets && !targets && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    No nutrition targets found. Please complete the <a href="/intake" className="font-medium underline hover:text-yellow-600">Intake Form</a> (if you haven't) or update your profile.
                  </p>
                </div>
              </div>
            </div>
          )}

          {targets && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Calories */}
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {/* Icon */}
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-xl">🔥</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate dark:text-gray-400">Calories</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900 dark:text-white">{targets.calories_kcal}</div>
                          <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                            kcal
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Protein */}
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">🫛</div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate dark:text-gray-400">Protein</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900 dark:text-white">{targets.protein_g}</div>
                          <div className="ml-2 flex items-baseline text-sm font-semibold text-gray-500">
                            g
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Carbs */}
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">🍞</div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate dark:text-gray-400">Carbs</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900 dark:text-white">{targets.carbs_g}</div>
                          <div className="ml-2 flex items-baseline text-sm font-semibold text-gray-500">
                            g
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fat */}
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">🥑</div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate dark:text-gray-400">Fat</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900 dark:text-white">{targets.fat_g}</div>
                          <div className="ml-2 flex items-baseline text-sm font-semibold text-gray-500">
                            g
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Micronutrients */}
          {targets && (
            <>
              {/* Micronutrients */}
              <div className="mt-8">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">Micronutrient Goals</h3>
                <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    <li className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Iron</p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {targets.iron_mg} mg
                          </p>
                        </div>
                      </div>
                    </li>
                    <li className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Calcium</p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {targets.calcium_mg} mg
                          </p>
                        </div>
                      </div>
                    </li>
                    <li className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Vitamin B12</p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {targets.vitamin_b12_mcg} mcg
                          </p>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Progress Tracker Section */}
              <div className="px-4 py-8 sm:px-0">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Progress Tracker</h2>
                  <p className="text-xs italic text-gray-500 dark:text-gray-400 mt-1">
                    We've built in a 5% buffer to give you flexibility while still hitting your targets.
                  </p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ProgressTracker
                    label="Calories"
                    unit="kcal"
                    target={targets.calories_kcal}
                    planned={planned.calories}
                    consumed={consumed.calories}
                  />
                  <ProgressTracker
                    label="Protein"
                    unit="g"
                    target={targets.protein_g}
                    planned={planned.protein}
                    consumed={consumed.protein}
                  />
                  <ProgressTracker
                    label="Iron"
                    unit="mg"
                    target={targets.iron_mg}
                    planned={planned.iron}
                    consumed={consumed.iron}
                  />
                  <ProgressTracker
                    label="Calcium"
                    unit="mg"
                    target={targets.calcium_mg}
                    planned={planned.calcium}
                    consumed={consumed.calcium}
                  />
                  <ProgressTracker
                    label="Vitamin B12"
                    unit="mcg"
                    target={targets.vitamin_b12_mcg}
                    planned={planned.b12}
                    consumed={consumed.b12}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Meal Plan Section */}
        <div className="px-4 py-8 sm:px-0 border-t border-gray-200 dark:border-gray-700 mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Weekly Plan</h2>
            <button
              onClick={handleGeneratePlan}
              disabled={generating || !targets}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate Meal Plan"}
            </button>
          </div>

          <div className="space-y-8">
            {days.map((dayName, index) => {
              const dailyMeals = mealsByDay(index);
              if (dailyMeals.length === 0) return null;

              return (
                <div key={dayName} className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-700 sm:px-6 flex justify-between items-end">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      {dayName}
                    </h3>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-4 mb-[-4px]">
                      Log
                    </div>
                  </div>
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {dailyMeals.map((meal) => (
                      <li key={meal.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition group">
                        <div className="px-4 py-4 sm:px-6 flex items-center">
                          {/* Eaten Toggle */}
                          <div className="flex flex-col items-center mr-6">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleEaten(meal.id, !!meal.is_eaten);
                              }}
                              className={`h-10 w-10 rounded-full border-2 flex items-center justify-center transition-all ${meal.is_eaten
                                ? "bg-green-500 border-green-500 text-white shadow-lg scale-110"
                                : "border-gray-200 dark:border-gray-600 hover:border-green-400 text-transparent bg-white dark:bg-gray-800"
                                }`}
                              title={meal.is_eaten ? "Logged as eaten" : "Click to mark as eaten and track nutrition"}
                            >
                              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          </div>

                          <div
                            className="flex items-center flex-1 cursor-pointer"
                            onClick={() => navigate(`/recipe/${meal.id}`)}
                          >
                            <div className="flex-shrink-0 h-16 w-16">
                              <img className="h-16 w-16 rounded object-cover" src={meal.image_url || "https://spoonacular.com/recipeImages/default.jpg"} alt={meal.recipe_title} />
                            </div>
                            <div className="ml-4 flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-green-600 truncate">
                                  {formatMealType(meal.meal_type)}
                                </p>
                                <div className="ml-2 flex-shrink-0 flex">
                                  <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    {meal.calories} kcal
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2 sm:flex sm:justify-between">
                                <div className="sm:flex">
                                  <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                    {meal.recipe_title}
                                  </p>
                                </div>
                                <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0">
                                  <p>Protein: {meal.protein_g}g</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}

            {mealPlan.length === 0 && !generating && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No meal plan generated yet. Click the button above to start!
              </div>
            )}
          </div>
        </div>

      </main>

      {/* Meal Details Modal */}
      {selectedMeal && (
        <div className="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setSelectedMeal(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                      {selectedMeal.recipe_title}
                    </h3>
                    <div className="mt-4">
                      <img src={selectedMeal.image_url || "https://spoonacular.com/recipeImages/default.jpg"} alt={selectedMeal.recipe_title} className="w-full h-48 object-cover rounded-md mb-4" />
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 dark:text-gray-300">
                        <div>
                          <span className="font-bold block">Calories</span>
                          {selectedMeal.calories} kcal
                        </div>
                        <div>
                          <span className="font-bold block">Protein</span>
                          {selectedMeal.protein_g} g
                        </div>
                        <div>
                          <span className="font-bold block">Ready In</span>
                          {selectedMeal.ready_in_minutes || "N/A"} min
                        </div>
                        <div>
                          <span className="font-bold block">Servings</span>
                          {selectedMeal.servings || "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" onClick={() => setSelectedMeal(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
