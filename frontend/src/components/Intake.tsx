import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../supabaseClient";

export default function Intake() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        username: "",
        firstName: "",
        lastName: "",
        heightFt: "",
        heightIn: "",
        weightLbs: "",
        activityLevel: "lightly_active", // Default
        fitnessGoal: "maintenance", // Default
        cookingTime: "<30 min", // Default
        allergies: "",
    });

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/signin");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            // 1. Data Conversion
            const heightCm =
                ((parseInt(formData.heightFt) * 12) + parseInt(formData.heightIn)) * 2.54;
            const weightKg = parseFloat(formData.weightLbs) * 0.453592;

            // 2. Prepare Payload
            const updates = {
                id: user.id,
                username: formData.username,
                first_name: formData.firstName,
                last_name: formData.lastName,
                height_cm: heightCm,
                weight_kg: weightKg,
                activity_level: formData.activityLevel,
                fitness_goal: formData.fitnessGoal,
                allergies: formData.allergies,
                profile_complete: true, // Mark as complete
                updated_at: new Date(),
            };

            // 3. Submit to Supabase
            const { error } = await supabase.from("profiles").upsert(updates);

            if (error) {
                throw error;
            }

            // 4. Redirect
            navigate("/dashboard");
        } catch (error: any) {
            alert(error.message || "Error updating profile");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Complete Your Profile
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                            Help us verify your details to personalize your experience.
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        Log Out
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 space-y-8">

                    {/* Personal Info */}
                    <div className="space-y-6">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white border-b pb-2 border-gray-200 dark:border-gray-700">
                            Personal Details
                        </h2>
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                            <div className="sm:col-span-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Username
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        name="username"
                                        required
                                        value={formData.username}
                                        onChange={handleChange}
                                        className="input block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    />
                                </div>
                            </div>

                            <div className="sm:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    First Name
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        name="firstName"
                                        required
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        className="input block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    />
                                </div>
                            </div>

                            <div className="sm:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Last Name
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        name="lastName"
                                        required
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        className="input block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Physical Stats */}
                    <div className="space-y-6">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white border-b pb-2 border-gray-200 dark:border-gray-700">
                            Physical Stats
                        </h2>
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                            <div className="sm:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Height
                                </label>
                                <div className="mt-1 flex space-x-2">
                                    <div className="w-1/2">
                                        <input
                                            type="number"
                                            name="heightFt"
                                            placeholder="ft"
                                            required
                                            min="1"
                                            value={formData.heightFt}
                                            onChange={handleChange}
                                            className="input block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                        />
                                    </div>
                                    <div className="w-1/2">
                                        <input
                                            type="number"
                                            name="heightIn"
                                            placeholder="in"
                                            required
                                            min="0"
                                            max="11"
                                            value={formData.heightIn}
                                            onChange={handleChange}
                                            className="input block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="sm:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Weight (lbs)
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="number"
                                        name="weightLbs"
                                        required
                                        min="1"
                                        value={formData.weightLbs}
                                        onChange={handleChange}
                                        className="input block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Lifestyle */}
                    <div className="space-y-6">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white border-b pb-2 border-gray-200 dark:border-gray-700">
                            Lifestyle & Goals
                        </h2>
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">

                            <div className="sm:col-span-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Activity Level
                                </label>
                                <div className="mt-1">
                                    <select
                                        name="activityLevel"
                                        value={formData.activityLevel}
                                        onChange={handleChange}
                                        className="input block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    >
                                        <option value="lightly_active">Light Movement (Sedentary/Office job)</option>
                                        <option value="moderately_active">Active (Regular exercise)</option>
                                        <option value="very_active">Athlete (Intense daily exercise)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="sm:col-span-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Fitness Goal
                                </label>
                                <div className="mt-1">
                                    <select
                                        name="fitnessGoal"
                                        value={formData.fitnessGoal}
                                        onChange={handleChange}
                                        className="input block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    >
                                        <option value="muscle_gain">Muscle Gain</option>
                                        <option value="weight_loss">Weight Loss</option>
                                        <option value="maintenance">Maintenance</option>
                                    </select>
                                </div>
                            </div>

                            <div className="sm:col-span-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Cooking Time per Meal
                                </label>
                                <div className="mt-1">
                                    <select
                                        name="cookingTime"
                                        value={formData.cookingTime}
                                        onChange={handleChange}
                                        className="input block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    >
                                        <option value="<30 min">&lt; 30 min</option>
                                        <option value="<1 hr">&lt; 1 hr</option>
                                        <option value="n/a">N/A</option>
                                    </select>
                                </div>
                            </div>

                            <div className="sm:col-span-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Allergies
                                </label>
                                <div className="mt-1">
                                    <textarea
                                        name="allergies"
                                        rows={3}
                                        placeholder="Peanuts, Shellfish, Dairy, etc. (Leave empty if none)"
                                        value={formData.allergies}
                                        onChange={handleChange}
                                        className="input block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    />
                                </div>
                            </div>

                        </div>
                    </div>

                    <div className="pt-5">
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                            >
                                {loading ? "Saving..." : "Save Profile"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
