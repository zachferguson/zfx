import db from "../db/connection";
import type { IDatabase, ITask } from "pg-promise";
import { DailyMetrics } from "../types/dailyMetrics";

// Any pg-promise connection-like object: the global db or a tx/task context.
type DbOrTx = IDatabase<unknown> | ITask<unknown>;
type TxOrDb = DbOrTx;
const useDb = (t?: DbOrTx) => t ?? db;

/**
 * Saves or updates daily metrics for a given date (UPSERT on PRIMARY KEY date).
 */
export const saveDailyMetrics = async (
    metrics: DailyMetrics,
    cx?: DbOrTx
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
    ON CONFLICT (date) DO UPDATE SET
      weight = EXCLUDED.weight,
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
      carbs_grams = EXCLUDED.carbs_grams
  `;

    await useDb(cx).none(query, [
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
 * Retrieves daily metrics within a specified (inclusive) date range.
 */
export const getMetricsInRange = async (
    startDate: string,
    endDate: string,
    cn: TxOrDb = db
): Promise<DailyMetrics[]> => {
    const query = `
    SELECT * FROM zachtothegym.daily_metrics
    WHERE date >= $1::date AND date <= $2::date
    ORDER BY date ASC
  `;
    return cn.any(query, [startDate, endDate]);
};

/**
 * Hard-deletes the metrics row for a specific date.
 * Returns the deleted row, or null if nothing matched.
 */
export const deleteMetricsByDate = async (
    date: string,
    cn: TxOrDb = db
): Promise<DailyMetrics | null> => {
    const query = `
    DELETE FROM zachtothegym.daily_metrics
    WHERE date = $1::date
    RETURNING *
  `;
    return cn.oneOrNone(query, [date]);
};

/**
 * Hard-deletes all metrics within an inclusive date range.
 * Returns the number of rows deleted.
 */
export const deleteMetricsInRange = async (
    startDate: string,
    endDate: string,
    cn: TxOrDb = db
): Promise<number> => {
    const result = await cn.result(
        `
      DELETE FROM zachtothegym.daily_metrics
      WHERE date >= $1::date AND date <= $2::date
    `,
        [startDate, endDate]
    );
    return result.rowCount;
};
