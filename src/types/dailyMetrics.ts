/**
 * Represents a single day's health/fitness metrics for a user.
 *
 * Used by: metricsService, metricsService.unit.test.ts, zachtothegymController, zachtothegymRoutes
 */
export type DailyMetrics = {
    /** ISO date string (YYYY-MM-DD). */
    date: string;
    /** Body weight in kilograms. */
    weight?: number;
    /** Body mass index. */
    bmi?: number;
    /** Body fat percentage. */
    body_fat?: number;
    /** Fat-free mass in kilograms. */
    fat_free_weight?: number;
    /** Subcutaneous fat percentage. */
    subcutaneous_fat?: number;
    /** Visceral fat percentage. */
    visceral_fat?: number;
    /** Body water percentage. */
    body_water?: number;
    /** Skeletal muscle percentage. */
    skeletal_muscle?: number;
    /** Muscle mass in kilograms. */
    muscle_mass?: number;
    /** Bone mass in kilograms. */
    bone_mass?: number;
    /** Protein percentage. */
    protein?: number;
    /** Basal metabolic rate (kcal/day). */
    bmr?: number;
    /** Metabolic age in years. */
    metabolic_age?: number;
    /** Total steps taken. */
    total_steps?: number;
    /** Walking steps. */
    walking_steps?: number;
    /** Running steps. */
    running_steps?: number;
    /** Total exercise minutes. */
    exercise_minutes?: number;
    /** Calories burned walking. */
    calories_burned_walking?: number;
    /** Calories burned running. */
    calories_burned_running?: number;
    /** Calories burned during exercise. */
    calories_burned_exercise?: number;
    /** Total calories burned. */
    total_calories_burned?: number;
    /** Calories consumed. */
    calories_consumed?: number;
    /** Protein intake in grams. */
    protein_grams?: number;
    /** Fat intake in grams. */
    fats_grams?: number;
    /** Carbohydrate intake in grams. */
    carbs_grams?: number;
};
