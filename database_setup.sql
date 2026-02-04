-- Run in Supabase SQL Editor

-- 1. Profiles: Basic physical data
CREATE TABLE IF NOT EXISTS profiles (
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
CREATE TABLE IF NOT EXISTS daily_targets (
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
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'am_snack', 'lunch', 'pm_snack', 'dinner', 'dessert', 'snack')),
  recipe_id_external INTEGER, -- The ID from Spoonacular
  recipe_title TEXT,
  calories INTEGER,
  protein_g INTEGER,
  fat_g INTEGER,
  carbs_g INTEGER,
  preparation_minutes INTEGER,
  cooking_minutes INTEGER,
  ingredients JSONB,
  instructions TEXT,
  summary TEXT,
  image_url TEXT,
  ready_in_minutes INTEGER,
  servings INTEGER,
  is_eaten BOOLEAN DEFAULT FALSE,
  iron_mg FLOAT DEFAULT 0,
  calcium_mg FLOAT DEFAULT 0,
  vitamin_b12_mcg FLOAT DEFAULT 0,
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

-- Allow users to view, insert, update, and delete their own meal plans
CREATE POLICY "Users can manage own meal plans" ON meal_plans
  FOR ALL USING (auth.uid() = user_id);

-- Optional: If you need to verify it worked, you can't really "verify" RLS easily without trying to insert again from the app.


-- Progress Tracker
-- 4. Daily Logs: Stores actual intake for each day
CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  log_date DATE DEFAULT CURRENT_DATE,
  calories_consumed INTEGER DEFAULT 0,
  protein_consumed_g INTEGER DEFAULT 0,
  fat_consumed_g INTEGER DEFAULT 0,
  carbs_consumed_g INTEGER DEFAULT 0,
  iron_consumed_mg FLOAT DEFAULT 0,
  calcium_consumed_mg FLOAT DEFAULT 0,
  b12_consumed_mcg FLOAT DEFAULT 0,
  -- Ensure one log entry per user per day
  UNIQUE(user_id, log_date)
);

-- 5. Progress View: A "Virtual Table" for your Dashboard
-- This joins targets and logs so your frontend gets "Goal vs Actual" in one request.
CREATE VIEW daily_progress_summary with (security_invoker=on) AS
SELECT 
    p.id as user_id,
    p.username,
    l.log_date,
    
    -- Calories
    t.calories_kcal as target_calories,
    l.calories_consumed,
    
    -- Protein
    t.protein_g as target_protein,
    l.protein_consumed_g,

    -- Iron (Crucial for Vegans)
    t.iron_mg as target_iron,
    l.iron_consumed_mg,
    CASE 
        WHEN t.iron_mg > 0 THEN ROUND((l.iron_consumed_mg::float / t.iron_mg::float) * 100)
        ELSE 0 
    END as iron_progress_percent,

    -- Calcium
    t.calcium_mg as target_calcium,
    l.calcium_consumed_mg,
    CASE 
        WHEN t.calcium_mg > 0 THEN ROUND((l.calcium_consumed_mg::float / t.calcium_mg::float) * 100)
        ELSE 0 
    END as calcium_progress_percent,

    -- Vitamin B12
    t.vitamin_b12_mcg as target_b12,
    l.b12_consumed_mcg,
    CASE 
        WHEN t.vitamin_b12_mcg > 0 THEN ROUND((l.b12_consumed_mcg::float / t.vitamin_b12_mcg::float) * 100)
        ELSE 0 
    END as b12_progress_percent

FROM profiles p
JOIN daily_targets t ON p.id = t.user_id
LEFT JOIN daily_logs l ON p.id = l.user_id AND l.log_date = CURRENT_DATE;

-- Enable RLS on all tables
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

-- Policies for DAILY_LOGS (The tracking data)
-- SELECT: Users view their own progress
CREATE POLICY "Users can view own logs" ON daily_logs
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT: Users can create new logs for themselves
CREATE POLICY "Users can insert own logs" ON daily_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can modify their intake for the day
CREATE POLICY "Users can update own logs" ON daily_logs
  FOR UPDATE USING (auth.uid() = user_id);
