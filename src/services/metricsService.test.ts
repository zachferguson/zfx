import { describe, it, expect, beforeEach, vi, Mock } from "vitest";

// 1) Mock the db connection (default export)
vi.mock("../db/connection", () => {
    return {
        default: {
            any: vi.fn(),
            none: vi.fn(),
        },
    };
});

// 2) Import mocked db and the service under test
import db from "../db/connection";
import { saveDailyMetrics, getMetricsInRange } from "./metricsService";

// Helper for TS when accessing mock.* APIs
const asMock = <T extends Function>(fn: unknown) => fn as unknown as Mock;

// Sample metrics payload
const sampleMetrics = {
    date: "2025-09-01",
    weight: 180.2,
    bmi: 24.1,
    body_fat: 16.5,
    fat_free_weight: 150.3,
    subcutaneous_fat: 13.2,
    visceral_fat: 7,
    body_water: 58.3,
    skeletal_muscle: 45.8,
    muscle_mass: 75.2,
    bone_mass: 8.1,
    protein: 18.7,
    bmr: 1700,
    metabolic_age: 28,
    total_steps: 12000,
    walking_steps: 9000,
    running_steps: 3000,
    exercise_minutes: 45,
    calories_burned_walking: 250,
    calories_burned_running: 400,
    calories_burned_exercise: 300,
    total_calories_burned: 950,
    calories_consumed: 2200,
    protein_grams: 160,
    fats_grams: 70,
    carbs_grams: 230,
};

describe("metricsService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("saveDailyMetrics -> upsert with 26 placeholders in correct order", async () => {
        asMock(db.none).mockResolvedValue(undefined);

        await saveDailyMetrics(sampleMetrics);

        expect(db.none).toHaveBeenCalledTimes(1);

        const [sql, params] = asMock(db.none).mock.calls[0];

        // SQL shape checks (not brittle)
        const norm = sql.replace(/\s+/g, " ").trim();
        expect(sql).toContain("INSERT INTO zachtothegym.daily_metrics");
        expect(norm).toContain("( date, weight, bmi, body_fat");
        expect(sql).toContain("VALUES (");
        // placeholders $1..$26
        for (let i = 1; i <= 26; i++) {
            expect(sql).toContain(`$${i}`);
        }
        expect(sql).toContain("ON CONFLICT (date) DO UPDATE");
        expect(sql).toContain("weight = EXCLUDED.weight");
        expect(sql).toContain("carbs_grams = EXCLUDED.carbs_grams");

        // Params order check
        expect(params).toEqual([
            sampleMetrics.date,
            sampleMetrics.weight,
            sampleMetrics.bmi,
            sampleMetrics.body_fat,
            sampleMetrics.fat_free_weight,
            sampleMetrics.subcutaneous_fat,
            sampleMetrics.visceral_fat,
            sampleMetrics.body_water,
            sampleMetrics.skeletal_muscle,
            sampleMetrics.muscle_mass,
            sampleMetrics.bone_mass,
            sampleMetrics.protein,
            sampleMetrics.bmr,
            sampleMetrics.metabolic_age,
            sampleMetrics.total_steps,
            sampleMetrics.walking_steps,
            sampleMetrics.running_steps,
            sampleMetrics.exercise_minutes,
            sampleMetrics.calories_burned_walking,
            sampleMetrics.calories_burned_running,
            sampleMetrics.calories_burned_exercise,
            sampleMetrics.total_calories_burned,
            sampleMetrics.calories_consumed,
            sampleMetrics.protein_grams,
            sampleMetrics.fats_grams,
            sampleMetrics.carbs_grams,
        ]);
    });

    it("saveDailyMetrics -> bubbles db errors", async () => {
        asMock(db.none).mockRejectedValue(new Error("upsert-fail"));
        await expect(saveDailyMetrics(sampleMetrics)).rejects.toThrow(
            "upsert-fail"
        );
    });

    it("getMetricsInRange -> queries BETWEEN and returns rows", async () => {
        asMock(db.any).mockResolvedValue([
            { date: "2025-08-31" },
            { date: "2025-09-01" },
        ]);

        const rows = await getMetricsInRange("2025-08-01", "2025-09-01");

        expect(db.any).toHaveBeenCalledTimes(1);
        const [sql, params] = asMock(db.any).mock.calls[0];

        expect(sql).toContain("SELECT * FROM zachtothegym.daily_metrics");
        expect(sql).toContain("WHERE date BETWEEN $1 AND $2");
        expect(sql).toContain("ORDER BY date ASC");
        expect(params).toEqual(["2025-08-01", "2025-09-01"]);

        expect(rows).toEqual([{ date: "2025-08-31" }, { date: "2025-09-01" }]);
    });

    it("getMetricsInRange -> bubbles db errors", async () => {
        asMock(db.any).mockRejectedValue(new Error("range-fail"));
        await expect(
            getMetricsInRange("2025-01-01", "2025-01-31")
        ).rejects.toThrow("range-fail");
    });
});
