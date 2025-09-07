import db from "../db/connection";
import { DailyMetrics } from "../types/dailyMetrics";

/**
 * Saves or updates daily metrics for a given date. Performs an upsert operation.
 * @param {DailyMetrics} metrics - The daily metrics to save.
 * @returns {Promise<void>} Resolves when the operation is complete.
 */
export const saveDailyMetrics = async (
    metrics: DailyMetrics
): Promise<void> => {
    const query = `
        INSERT INTO zachtothegym.daily_metrics (
            date, weight, bmi, body_fat, fat_free_weight, subcutaneous_fat, visceral_fat,
            body_water, skeletal_muscle, muscle_mass, bone_mass, protein, bmr, metabolic_age,
            total_steps, walking_steps, running_steps, exercise_minutes,
            calories_burned_walking, calories_burned_running, calories_burned_exercise, total_calories_burned,
            calories_consumed, protein_grams, fats_grams, carbs_grams
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
            $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
        )
        ON CONFLICT (date) DO UPDATE 
        SET weight = EXCLUDED.weight,
            bmi = EXCLUDED.bmi,
            body_fat = EXCLUDED.body_fat,
            fat_free_weight = EXCLUDED.fat_free_weight,
            subcutaneous_fat = EXCLUDED.subcutaneous_fat,
            visceral_fat = EXCLUDED.visceral_fat,
            body_water = EXCLUDED.body_water,
            skeletal_muscle = EXCLUDED.skeletal_muscle,
            muscle_mass = EXCLUDED.muscle_mass,
            bone_mass = EXCLUDED.bone_mass,
            protein = EXCLUDED.protein,
            bmr = EXCLUDED.bmr,
            metabolic_age = EXCLUDED.metabolic_age,
            total_steps = EXCLUDED.total_steps,
            walking_steps = EXCLUDED.walking_steps,
            running_steps = EXCLUDED.running_steps,
            exercise_minutes = EXCLUDED.exercise_minutes,
            calories_burned_walking = EXCLUDED.calories_burned_walking,
            calories_burned_running = EXCLUDED.calories_burned_running,
            calories_burned_exercise = EXCLUDED.calories_burned_exercise,
            total_calories_burned = EXCLUDED.total_calories_burned,
            calories_consumed = EXCLUDED.calories_consumed,
            protein_grams = EXCLUDED.protein_grams,
            fats_grams = EXCLUDED.fats_grams,
            carbs_grams = EXCLUDED.carbs_grams;
    `;

    await db.none(query, [
        metrics.date,
        metrics.weight,
        metrics.bmi,
        metrics.body_fat,
        metrics.fat_free_weight,
        metrics.subcutaneous_fat,
        metrics.visceral_fat,
        metrics.body_water,
        metrics.skeletal_muscle,
        metrics.muscle_mass,
        metrics.bone_mass,
        metrics.protein,
        metrics.bmr,
        metrics.metabolic_age,
        metrics.total_steps,
        metrics.walking_steps,
        metrics.running_steps,
        metrics.exercise_minutes,
        metrics.calories_burned_walking,
        metrics.calories_burned_running,
        metrics.calories_burned_exercise,
        metrics.total_calories_burned,
        metrics.calories_consumed,
        metrics.protein_grams,
        metrics.fats_grams,
        metrics.carbs_grams,
    ]);
};

/**
 * Retrieves daily metrics within a specified date range (inclusive).
 * @param {string} startDate - The start date (YYYY-MM-DD).
 * @param {string} endDate - The end date (YYYY-MM-DD).
 * @returns {Promise<DailyMetrics[]>} The metrics for the given range.
 */
export const getMetricsInRange = async (
    startDate: string,
    endDate: string
): Promise<DailyMetrics[]> => {
    const query = `
        SELECT * FROM zachtothegym.daily_metrics
        WHERE date BETWEEN $1 AND $2
        ORDER BY date ASC;
    `;
    return db.any(query, [startDate, endDate]);
};
