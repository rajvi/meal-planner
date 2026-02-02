-- Run in Supabase SQL Editor

-- 1. Profiles: Basic physical data
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  username TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  sex TEXT,
  age INTEGER,
  height_cm FLOAT,
  weight_kg FLOAT,
  activity_level TEXT CHECK (activity_level IN ('inactive', 'low_active', 'active', 'very_active')),
  fitness_goal TEXT CHECK (fitness_goal IN ('weight_loss', 'maintenance', 'muscle_gain'))
);

-- 2. Daily Targets: Calculated nutritional goals
-- This stores the "Calculator" results
CREATE TABLE daily_targets (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  calories_kcal INTEGER,
  protein_g INTEGER,
  fat_g INTEGER,
  carbs_g INTEGER,
  iron_mg FLOAT,
  vitamin_b12_mcg FLOAT,
  calcium_mg FLOAT,
  -- Add other micronutrients as needed
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Meal Plans: Linking recipes to a 7-day schedule
CREATE TABLE meal_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'am_snack', 'lunch', 'pm_snack', 'dinner', 'dessert', 'snack')),
  recipe_id_external INTEGER, -- The ID from Spoonacular
  recipe_title TEXT,
  calories INTEGER,
  protein_g INTEGER,
  image_url TEXT,
  ready_in_minutes INTEGER,
  servings INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (should already be enabled, but good to ensure)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to insert their OWN profile
-- This matches the 'auth.uid() = id' check
CREATE POLICY "Users can insert their own profile" 
ON profiles 
FOR INSERT 
WITH CHECK ( auth.uid() = id );

-- Policy: Allow users to update their OWN profile
CREATE POLICY "Users can update their own profile" 
ON profiles 
FOR UPDATE 
USING ( auth.uid() = id );

-- Policy: Allow users to select (read) their OWN profile
CREATE POLICY "Users can view their own profile" 
ON profiles 
FOR SELECT 
USING ( auth.uid() = id );

-- Enable RLS for daily_targets
ALTER TABLE daily_targets ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their OWN daily targets (matches user_id)
CREATE POLICY "Users can insert their own daily targets"
ON daily_targets FOR INSERT
WITH CHECK ( auth.uid() = user_id );

-- Allow users to update their OWN daily targets
CREATE POLICY "Users can update their own daily targets"
ON daily_targets FOR UPDATE
USING ( auth.uid() = user_id );

-- Enable RLS for meal_plans
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own meal plans
CREATE POLICY "Users can view their own meal plans"
ON meal_plans FOR SELECT
USING ( auth.uid() = user_id );

-- Allow users to insert their own meal plans (if needing frontend creation)
CREATE POLICY "Users can insert their own meal plans"
ON meal_plans FOR INSERT
WITH CHECK ( auth.uid() = user_id );

-- Allow users to update their own meal plans
CREATE POLICY "Users can update their own meal plans"
ON meal_plans FOR UPDATE
USING ( auth.uid() = user_id );

-- Allow users to delete their own meal plans
CREATE POLICY "Users can delete their own meal plans"
ON meal_plans FOR DELETE
USING ( auth.uid() = user_id );



-- Optional: If you need to verify it worked, you can't really "verify" RLS easily without trying to insert again from the app.