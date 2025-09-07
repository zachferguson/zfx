// tests/integration/services/metricsService.integration.test.ts
import {
    describe,
    it,
    expect,
    beforeAll,
    beforeEach,
    afterAll,
    vi,
} from "vitest";
import path from "node:path";

import type { DailyMetrics } from "../../../src/types/dailyMetrics";
type MetricsSvc = typeof import("../../../src/services/metricsService");

const REAL_DB = !!(
    process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length
);

/** Build a full DailyMetrics object with sensible defaults, override as needed */
function buildMetrics(
    date: string,
    overrides: Partial<DailyMetrics> = {}
): DailyMetrics {
    const base: DailyMetrics = {
        date,
        weight: 180,
        bmi: 24,
        body_fat: 18,
        fat_free_weight: 147,
        subcutaneous_fat: 16,
        visceral_fat: 7,
        body_water: 60,
        skeletal_muscle: 42,
        muscle_mass: 75,
        bone_mass: 8,
        protein: 16,
        bmr: 1650,
        metabolic_age: 30,
        total_steps: 8000,
        walking_steps: 7000,
        running_steps: 1000,
        exercise_minutes: 45,
        calories_burned_walking: 250,
        calories_burned_running: 150,
        calories_burned_exercise: 200,
        total_calories_burned: 600,
        calories_consumed: 2200,
        protein_grams: 120,
        fats_grams: 70,
        carbs_grams: 250,
        ...overrides,
    };
    return base;
}

// helper to normalize whatever we get back (Date or string) to 'YYYY-MM-DD'
const asYMD = (v: unknown) =>
    v instanceof Date ? v.toISOString().slice(0, 10) : String(v);

// --- PG-MEM SUITE (always) -----------------------------------------------------
describe("metricsService with pg-mem (no real DB)", () => {
    let handles: any;
    let saveDailyMetrics: MetricsSvc["saveDailyMetrics"];
    let getMetricsInRange: MetricsSvc["getMetricsInRange"];
    let deleteMetricsByDate: MetricsSvc["deleteMetricsByDate"];
    let deleteMetricsInRange: MetricsSvc["deleteMetricsInRange"];

    beforeAll(async () => {
        vi.resetModules();

        const pgmem = await import("../../utils/pgmem");
        handles = await pgmem.setupPgMemAll({ seed: false });

        // Mock the resolved absolute id of src/db/connection
        const connAbsPath = path.resolve(
            __dirname,
            "../../../src/db/connection"
        );
        vi.doMock(connAbsPath, () => ({ default: handles.db }));

        // Import service after mocking so it uses pg-mem
        const svc = await import("../../../src/services/metricsService");
        saveDailyMetrics = svc.saveDailyMetrics;
        getMetricsInRange = svc.getMetricsInRange;
        deleteMetricsByDate = svc.deleteMetricsByDate;
        deleteMetricsInRange = svc.deleteMetricsInRange;
    });

    async function resetTable() {
        await handles.db.none(
            `TRUNCATE TABLE zachtothegym.daily_metrics RESTART IDENTITY CASCADE;`
        );
    }

    beforeEach(async () => {
        await resetTable();
    });

    afterAll(() => {
        handles?.stop?.();
    });

    it("inserts a new day, then updates it via upsert", async () => {
        const d = "2025-01-01";
        await saveDailyMetrics(buildMetrics(d));

        let rows = await getMetricsInRange(d, d);
        expect(rows.length).toBe(1);
        expect(Number(rows[0].weight)).toBe(180);

        // Upsert update (change weight)
        await saveDailyMetrics(buildMetrics(d, { weight: 182 }));
        rows = await getMetricsInRange(d, d);
        expect(rows.length).toBe(1);
        expect(Number(rows[0].weight)).toBe(182);
    });

    it("range query returns multiple days sorted ASC", async () => {
        await saveDailyMetrics(
            buildMetrics("2025-02-01", { total_steps: 5000 })
        );
        await saveDailyMetrics(
            buildMetrics("2025-02-02", { total_steps: 9000 })
        );

        const rows2 = await getMetricsInRange("2025-02-01", "2025-02-02");
        expect(rows2.length).toBe(2);
        expect(asYMD(rows2[0].date)).toBe("2025-02-01");
        expect(asYMD(rows2[1].date)).toBe("2025-02-02");
    });

    it("range with no data returns empty array", async () => {
        const rows = await getMetricsInRange("2030-01-01", "2030-01-02");
        expect(rows.length).toBe(0);
    });

    it("deleteMetricsByDate removes the row and returns it", async () => {
        const d1 = "2025-03-01";
        const d2 = "2025-03-02";
        await saveDailyMetrics(buildMetrics(d1));
        await saveDailyMetrics(buildMetrics(d2));

        const deleted = await deleteMetricsByDate(d1);
        expect(asYMD(deleted?.date)).toBe(d1);

        const remain = await getMetricsInRange(d1, d2);
        expect(remain.map((r) => asYMD(r.date))).toEqual([d2]);
    });

    it("deleteMetricsInRange removes rows in inclusive range and returns count", async () => {
        const d1 = "2025-04-01";
        const d2 = "2025-04-02";
        const d3 = "2025-04-03";
        await saveDailyMetrics(buildMetrics(d1));
        await saveDailyMetrics(buildMetrics(d2));
        await saveDailyMetrics(buildMetrics(d3));

        const count = await deleteMetricsInRange(d1, d2);
        expect(count).toBe(2);

        const remain2 = await getMetricsInRange(d1, d3);
        expect(remain2.map((r) => asYMD(r.date))).toEqual([d3]);
    });
});

// --- REAL DB SMOKE SUITE (only if DATABASE_URL is set) -------------------------
describe.runIf(REAL_DB)("metricsService (real DB with rollback)", () => {
    let saveDailyMetrics: MetricsSvc["saveDailyMetrics"];
    let getMetricsInRange: MetricsSvc["getMetricsInRange"];
    let deleteMetricsByDate: MetricsSvc["deleteMetricsByDate"];
    let deleteMetricsInRange: MetricsSvc["deleteMetricsInRange"];
    let realDb: any;

    const ROLLBACK = new Error("__ROLLBACK__");

    beforeAll(async () => {
        vi.resetModules(); // ensure pg-mem mocks don't leak
        realDb = (await import("../../../src/db/connection")).default;
        const svc = await import("../../../src/services/metricsService");
        saveDailyMetrics = svc.saveDailyMetrics;
        getMetricsInRange = svc.getMetricsInRange;
        deleteMetricsByDate = svc.deleteMetricsByDate;
        deleteMetricsInRange = svc.deleteMetricsInRange;
    });

    // helper to run inside a tx and roll back at the end
    async function withTxRollback(fn: (t: any) => Promise<void>) {
        await realDb
            .tx(async (t: any) => {
                await fn(t);
                throw ROLLBACK; // force rollback
            })
            .catch((e: unknown) => {
                if (e !== ROLLBACK) throw e;
            });
    }

    it("save + fetch inside a tx then roll back (no side-effects)", async () => {
        const d = new Date().toISOString().slice(0, 10); // YYYY-MM-DD today

        await withTxRollback(async (t) => {
            await saveDailyMetrics(buildMetrics(d, { weight: 199 }), t);
            const inside = await getMetricsInRange(d, d, t);
            expect(inside.length).toBe(1);
            expect(Number(inside[0].weight)).toBe(199);
        });

        // After rollback, there should be no row for that date
        const outside = await getMetricsInRange(d, d);
        expect(outside.length).toBe(0);
    });

    it("upsert update inside a tx also rolls back", async () => {
        const d = "2099-12-31"; // unlikely to exist

        await withTxRollback(async (t) => {
            await saveDailyMetrics(buildMetrics(d, { weight: 170 }), t);
            await saveDailyMetrics(buildMetrics(d, { weight: 171 }), t);

            const inside = await getMetricsInRange(d, d, t);
            expect(inside.length).toBe(1);
            expect(Number(inside[0].weight)).toBe(171);
        });

        const outside = await getMetricsInRange(d, d);
        expect(outside.length).toBe(0);
    });

    // NEW: deletion tests (real DB with rollback)
    it("delete-by-date inside a tx rolls back", async () => {
        const d = "2099-11-11";

        await withTxRollback(async (t) => {
            await saveDailyMetrics(buildMetrics(d, { weight: 180 }), t);
            const deleted = await deleteMetricsByDate(d, t);
            expect(deleted?.date).toBe(d);
            const after = await getMetricsInRange(d, d, t);
            expect(after.length).toBe(0);
        });

        // nothing persisted
        const outside = await getMetricsInRange(d, d);
        expect(outside.length).toBe(0);
    });

    it("delete-in-range inside a tx rolls back", async () => {
        const d1 = "2099-10-01";
        const d2 = "2099-10-02";
        const d3 = "2099-10-03";

        await withTxRollback(async (t) => {
            await saveDailyMetrics(buildMetrics(d1), t);
            await saveDailyMetrics(buildMetrics(d2), t);
            await saveDailyMetrics(buildMetrics(d3), t);

            const count = await deleteMetricsInRange(d1, d2, t);
            expect(count).toBe(2);

            const remain = await getMetricsInRange(d1, d3, t);
            expect(remain.map((r: DailyMetrics) => r.date)).toEqual([d3]);
        });

        // nothing persisted
        const outside = await getMetricsInRange(d1, d3);
        expect(outside.find((r) => r.date === d1)).toBeUndefined();
        expect(outside.find((r) => r.date === d2)).toBeUndefined();
        expect(outside.find((r) => r.date === d3)).toBeUndefined();
    });
});
