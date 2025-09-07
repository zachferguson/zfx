import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import db from "../../../src/db/connection";
import {
    saveDailyMetrics,
    getMetricsInRange,
    deleteMetricsByDate,
    deleteMetricsInRange,
} from "../../../src/services/metricsService";

vi.mock("../../../src/db/connection", () => {
    return {
        default: {
            any: vi.fn(),
            none: vi.fn(),
            oneOrNone: vi.fn(),
            result: vi.fn(),
        },
    };
});

const asMock = <T extends Function>(fn: unknown) => fn as unknown as Mock;

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

    // Should upsert daily metrics with all 26 placeholders in correct order
    it("saveDailyMetrics -> upsert with 26 placeholders in correct order", async () => {
        asMock(db.none).mockResolvedValue(undefined);
        await saveDailyMetrics(sampleMetrics);
        expect(db.none).toHaveBeenCalledTimes(1);
        const [sql, params] = asMock(db.none).mock.calls[0];
        const norm = sql.replace(/\s+/g, " ").trim();
        expect(sql).toContain("INSERT INTO zachtothegym.daily_metrics");
        expect(norm).toContain("( date, weight, bmi, body_fat");
        expect(sql).toContain("VALUES (");
        for (let i = 1; i <= 26; i++) {
            expect(sql).toContain(`$${i}`);
        }
        expect(sql).toContain("ON CONFLICT (date) DO UPDATE");
        expect(sql).toContain("weight = EXCLUDED.weight");
        expect(sql).toContain("carbs_grams = EXCLUDED.carbs_grams");
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

    // Should propagate errors thrown by db.none
    it("saveDailyMetrics -> bubbles db errors", async () => {
        asMock(db.none).mockRejectedValue(new Error("upsert-fail"));
        await expect(saveDailyMetrics(sampleMetrics)).rejects.toThrow(
            "upsert-fail"
        );
    });

    // Should query a date range and return all matching rows
    it("getMetricsInRange -> queries date-range and returns rows", async () => {
        asMock(db.any).mockResolvedValue([
            { date: "2025-08-31" },
            { date: "2025-09-01" },
        ]);

        const rows = await getMetricsInRange("2025-08-01", "2025-09-01");

        expect(db.any).toHaveBeenCalledTimes(1);
        const [sql, params] = asMock(db.any).mock.calls[0];

        const norm = (s: string) => s.replace(/\s+/g, " ").trim();

        expect(norm(sql)).toContain("SELECT * FROM zachtothegym.daily_metrics");
        expect(norm(sql)).toContain(
            "WHERE date >= $1::date AND date <= $2::date"
        );
        expect(norm(sql)).toContain("ORDER BY date ASC");
        expect(params).toEqual(["2025-08-01", "2025-09-01"]);
        expect(rows).toEqual([{ date: "2025-08-31" }, { date: "2025-09-01" }]);
    });

    // Should propagate errors thrown by db.any
    it("getMetricsInRange -> bubbles db errors", async () => {
        asMock(db.any).mockRejectedValue(new Error("range-fail"));
        await expect(
            getMetricsInRange("2025-01-01", "2025-01-31")
        ).rejects.toThrow("range-fail");
    });
    // Should delete metrics by date and return the deleted row if found
    it("deleteMetricsByDate -> deletes and returns the row if found", async () => {
        asMock(db.oneOrNone).mockResolvedValue({
            date: "2025-09-01",
            weight: 180,
        });
        const row = await deleteMetricsByDate("2025-09-01");
        expect(db.oneOrNone).toHaveBeenCalledWith(
            expect.stringContaining("DELETE FROM zachtothegym.daily_metrics"),
            ["2025-09-01"]
        );
        expect(row).toEqual(expect.objectContaining({ date: "2025-09-01" }));
    });

    // Should return null when trying to delete metrics for a non-existent date
    it("deleteMetricsByDate -> returns null if not found", async () => {
        asMock(db.oneOrNone).mockResolvedValue(null);
        const row = await deleteMetricsByDate("2099-01-01");
        expect(row).toBeNull();
    });

    // Should propagate errors thrown by db.oneOrNone
    it("deleteMetricsByDate -> propagates db errors", async () => {
        asMock(db.oneOrNone).mockRejectedValue(new Error("fail-delete-date"));
        await expect(deleteMetricsByDate("2025-09-01")).rejects.toThrow(
            "fail-delete-date"
        );
    });

    // Should delete metrics in a date range and return the number of rows deleted
    it("deleteMetricsInRange -> returns rowCount from db.result", async () => {
        asMock(db.result).mockResolvedValue({ rowCount: 3 });
        const count = await deleteMetricsInRange("2025-09-01", "2025-09-03");
        expect(db.result).toHaveBeenCalledWith(
            expect.stringContaining("DELETE FROM zachtothegym.daily_metrics"),
            ["2025-09-01", "2025-09-03"]
        );
        expect(count).toBe(3);
    });

    // Should propagate errors thrown by db.result
    it("deleteMetricsInRange -> propagates db errors", async () => {
        asMock(db.result).mockRejectedValue(new Error("fail-delete-range"));
        await expect(
            deleteMetricsInRange("2025-09-01", "2025-09-03")
        ).rejects.toThrow("fail-delete-range");
    });
});
