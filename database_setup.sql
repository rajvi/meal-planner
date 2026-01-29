-- Run in Supabase SQL Editor
-- 1. Profiles: Basic physical data
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  username TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  height_cm FLOAT,
  weight_kg FLOAT,
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active')),
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
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  recipe_id_external INTEGER, -- The ID from Spoonacular
  recipe_title TEXT,
  calories INTEGER,
  protein_g INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (should already be enabled, but good to ensure)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow users to insert their OWN profile
-- This matches the 'auth.uid() = id' check
CREATE POLICY "Users can insert their own profile" 
ON profiles 
FOR INSERT 
WITH CHECK ( auth.uid() = id );

-- Policy 2: Allow users to update their OWN profile
CREATE POLICY "Users can update their own profile" 
ON profiles 
FOR UPDATE 
USING ( auth.uid() = id );

-- Policy 3: Allow users to select (read) their OWN profile
CREATE POLICY "Users can view their own profile" 
ON profiles 
FOR SELECT 
USING ( auth.uid() = id );

-- Optional: If you need to verify it worked, you can't really "verify" RLS easily without trying to insert again from the app.
