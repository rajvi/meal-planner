import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../hooks/useAuth";

interface Ingredient {
    name: string;
    amount: number;
    unit: string;
}

interface RecipeDetail {
    id: string;
    recipe_title: string;
    meal_type: string;
    calories: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
    image_url: string;
    ready_in_minutes: number;
    preparation_minutes: number;
    cooking_minutes: number;
    servings: number;
    ingredients: Ingredient[];
    instructions: string;
    summary: string;
}

export default function RecipeDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchRecipe() {
            if (!user || !id) return;

            // 1. Fetch from Supabase
            const { data, error } = await supabase
                .from("meal_plans")
                .select("*")
                .eq("id", id)
                .eq("user_id", user.id)
                .single();

            if (error) {
                console.error("Error fetching recipe:", error);
                navigate("/dashboard");
                return;
            }

            // 2. If no instructions, fetch from backend (Lazy Load)
            if (!data.instructions) {
                console.log("No instructions found, lazy loading from backend...");
                try {
                    const response = await fetch(`http://127.0.0.1:8000/api/recipe-details/${id}`);
                    if (response.ok) {
                        const fullData = await response.json();
                        setRecipe(fullData);
                    } else {
                        setRecipe(data); // Fallback to partial data if backend fails
                    }
                } catch (err) {
                    console.error("Lazy load failed:", err);
                    setRecipe(data);
                }
            } else {
                setRecipe(data);
            }

            setLoading(false);
        }

        fetchRecipe();
    }, [id, user, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            </div>
        );
    }

    if (!recipe) return null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans pb-12">
            {/* Header / Navigation */}
            <nav className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center">
                        <button
                            onClick={() => navigate("/dashboard")}
                            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition"
                        >
                            <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
                {/* Banner Section */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-xl">
                    <div className="md:flex">
                        <div className="md:w-1/2">
                            <img
                                src={recipe.image_url || "https://spoonacular.com/recipeImages/default.jpg"}
                                alt={recipe.recipe_title}
                                className="h-full w-full object-cover"
                            />
                        </div>
                        <div className="p-8 md:w-1/2">
                            <div className="uppercase tracking-wide text-sm text-green-600 font-semibold mb-2">
                                {recipe.meal_type.replace('_', ' ')}
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight mb-4">
                                {recipe.recipe_title}
                            </h1>

                            <div className="flex flex-wrap gap-4 mb-6">
                                <div className="bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full flex items-center">
                                    <span className="text-green-700 dark:text-green-300 text-sm font-medium">
                                        {recipe.ready_in_minutes} min
                                    </span>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full flex items-center">
                                    <span className="text-blue-700 dark:text-blue-300 text-sm font-medium">
                                        {recipe.servings} servings
                                    </span>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="border border-gray-100 dark:border-gray-700 rounded-2xl p-3 flex flex-col items-center">
                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{recipe.calories}</span>
                                    <span className="text-xs text-gray-500 uppercase">kcal</span>
                                </div>
                                <div className="border border-gray-100 dark:border-gray-700 rounded-2xl p-3 flex flex-col items-center">
                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{recipe.protein_g}g</span>
                                    <span className="text-xs text-gray-500 uppercase">Protein</span>
                                </div>
                                <div className="border border-gray-100 dark:border-gray-700 rounded-2xl p-3 flex flex-col items-center">
                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{recipe.carbs_g || 0}g</span>
                                    <span className="text-xs text-gray-500 uppercase">Carbs</span>
                                </div>
                                <div className="border border-gray-100 dark:border-gray-700 rounded-2xl p-3 flex flex-col items-center">
                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{recipe.fat_g || 0}g</span>
                                    <span className="text-xs text-gray-500 uppercase">Fat</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="mt-8 grid md:grid-cols-3 gap-8">
                    {/* Left Column: Ingredients */}
                    <div className="md:col-span-1">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Ingredients</h2>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
                            <ul className="space-y-4">
                                {recipe.ingredients?.map((ing, idx) => (
                                    <li key={idx} className="flex items-start">
                                        <div className="h-5 w-5 rounded border border-gray-300 mt-0.5 mr-3 flex-shrink-0"></div>
                                        <div>
                                            <span className="text-gray-900 dark:text-white font-medium">
                                                {Math.round(ing.amount * 100) / 100} {ing.unit}
                                            </span>
                                            <span className="text-gray-600 dark:text-gray-400 ml-1">
                                                {ing.name}
                                            </span>
                                        </div>
                                    </li>
                                )) || <li className="text-gray-500">No ingredients available</li>}
                            </ul>
                        </div>
                    </div>

                    {/* Right Column: Instructions \u0026 Summary */}
                    <div className="md:col-span-2 space-y-8">
                        {/* Summary */}
                        {recipe.summary && (
                            <section>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Summary</h2>
                                <div
                                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 text-gray-600 dark:text-gray-400 leading-relaxed text-sm whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={{ __html: recipe.summary }}
                                />
                            </section>
                        )}

                        {/* Instructions */}
                        <section>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Instructions</h2>
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
                                {recipe.instructions ? (
                                    <div
                                        className="text-gray-700 dark:text-gray-300 leading-relaxed space-y-4 instructions-content"
                                        dangerouslySetInnerHTML={{ __html: recipe.instructions }}
                                    />
                                ) : (
                                    <p className="text-gray-500 italic">No detailed instructions provided. Check the "Summary" or visit the original recipe.</p>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
