import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

interface DailyTargets {
  calories_kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  iron_mg: number;
  vitamin_b12_mcg: number;
  calcium_mg: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [targets, setTargets] = useState<DailyTargets | null>(null);
  const [loadingTargets, setLoadingTargets] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchTargets = async () => {
      try {
        const { data, error } = await supabase
          .from("daily_targets")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          // PGRST116 is "Row not found", which might happen if calculation failed or not done.
          console.error(error);
        }

        if (data) {
          setTargets(data);
        }
      } catch (error) {
        console.error("Error fetching targets:", error);
      } finally {
        setLoadingTargets(false);
      }
    };

    fetchTargets();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/signin");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans">
      {/* Navbar / Header */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
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
          )}

        </div>
      </main>
    </div>
  );
}
