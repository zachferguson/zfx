// tests/utils/pgmem.ts
import { newDb, IMemoryDb, DataType } from "pg-mem";
import type { IMain, IDatabase } from "pg-promise";
import pgPromise from "pg-promise";
import { vi } from "vitest";

/** Handles you get back from setup */
export interface PgMemHandles {
    mem: IMemoryDb;
    pgp: IMain;
    db: IDatabase<unknown>;
    /** Undo the mock and close pg-promise pools */
    stop: () => void;
}

/** Register a few common functions/types that code sometimes relies on */
function primeDb(mem: IMemoryDb) {
    // pg-mem doesn't ship with NOW() by default
    mem.public.registerFunction({
        name: "now",
        returns: DataType.timestamp, // ✅ not "timestamptz"
        implementation: () => new Date(),
    });

    // If you ever use uuid_generate_v4(), uncomment:
    // mem.public.registerFunction({
    //   name: "uuid_generate_v4",
    //   returns: DataType.text,
    //   implementation: () =>
    //     "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    //       const r = (Math.random() * 16) | 0;
    //       const v = c === "x" ? r : (r & 0x3) | 0x8;
    //       return v.toString(16);
    //     }),
    // });
}

/** Create all schemas/tables used by your services */
export async function createAllSchemas(db: IDatabase<unknown>) {
    await createAuthSchema(db);
    await createZtgArticlesSchema(db);
    await createZtgBlogsSchema(db);
    await createZtgDailyMetricsSchema(db);
    await createOrdersSchema(db);
}

/** Optional: seed a few rows that some tests expect */
export async function seedAll(db: IDatabase<unknown>) {
    // Articles
    await db.none(`
    INSERT INTO zachtothegym.articles (title, summary, content, categories)
    VALUES 
      ('Hello World', 'First', 'Content', ARRAY['intro']::text[]),
      ('Second', 'Sum', 'Body', ARRAY['misc']::text[]);
  `);

    // Blogs
    await db.none(`
    INSERT INTO zachtothegym.blogs (title, content, categories)
    VALUES 
      ('Blog 1', 'B1', ARRAY['life']::text[]),
      ('Blog 2', 'B2', ARRAY['tech']::text[]);
  `);

    // Daily metrics (updated to match full schema)
    await db.none(`
    INSERT INTO zachtothegym.daily_metrics (
      date, weight, bmi, body_fat, fat_free_weight, subcutaneous_fat, visceral_fat,
      body_water, skeletal_muscle, muscle_mass, bone_mass, protein, bmr, metabolic_age,
      total_steps, walking_steps, running_steps, exercise_minutes,
      calories_burned_walking, calories_burned_running, calories_burned_exercise, total_calories_burned,
      calories_consumed, protein_grams, fats_grams, carbs_grams
    )
    VALUES (
      DATE '2025-09-01',
      180.5, 24.1, 18.2, 147.0, 16.0, 7.0, 60.0, 42.0, 75.0, 8.0, 16.0, 1650.0, 30.0,
      10000, 9000, 1000, 60,
      300.0, 200.0, 250.0, 750.0,
      2200.0, 120.0, 70.0, 250.0
    );
  `);

    // Users
    await db.none(`
    INSERT INTO authentication.users (username, password_hash, email, site, role)
    VALUES ('seeduser', 'hash', 'seed@example.com', 'default', 'user');
  `);

    // Orders
    await db.none(`
    INSERT INTO orders.printifyorders (
      order_number, store_id, email, total_price, currency, shipping_method, shipping_cost, printify_order_id
    ) VALUES (
      'ord-1', 'store-1', 'a@b.com', 1000, 'USD', 'STANDARD', 100, NULL
    );
  `);
}

/** Create only Authentication schema/tables */
export async function createAuthSchema(db: IDatabase<unknown>) {
    await db.none(`
    CREATE SCHEMA IF NOT EXISTS authentication;

    CREATE TABLE IF NOT EXISTS authentication.users (
      id              SERIAL PRIMARY KEY,
      username        TEXT NOT NULL,
      password_hash   TEXT NOT NULL,
      email           TEXT NOT NULL,
      site            TEXT NOT NULL,
      role            TEXT NOT NULL DEFAULT 'user',
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT uniq_username_site UNIQUE (username, site),
      CONSTRAINT uniq_email_site    UNIQUE (email, site)
    );
  `);
}

/** Create only Articles schema/tables */
export async function createZtgArticlesSchema(db: IDatabase<unknown>) {
    await db.none(`
    CREATE SCHEMA IF NOT EXISTS zachtothegym;

    CREATE TABLE IF NOT EXISTS zachtothegym.articles (
      id          SERIAL PRIMARY KEY,
      title       TEXT NOT NULL,
      summary     TEXT NOT NULL,
      content     TEXT NOT NULL,
      categories  TEXT[] NOT NULL DEFAULT '{}',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

/** Create only Blogs schema/tables */
export async function createZtgBlogsSchema(db: IDatabase<unknown>) {
    await db.none(`
    CREATE SCHEMA IF NOT EXISTS zachtothegym;
      
    CREATE TABLE IF NOT EXISTS zachtothegym.blogs (
      id          SERIAL PRIMARY KEY,
      title       TEXT NOT NULL,
      content     TEXT NOT NULL,
      categories  TEXT[] NOT NULL DEFAULT '{}',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

/** Create only Daily Metrics schema/tables */
export async function createZtgDailyMetricsSchema(db: IDatabase<unknown>) {
    await db.none(`
    CREATE SCHEMA IF NOT EXISTS zachtothegym;

    CREATE TABLE IF NOT EXISTS zachtothegym.daily_metrics (
      date                      DATE PRIMARY KEY,
      weight                    NUMERIC,
      bmi                       NUMERIC,
      body_fat                  NUMERIC,
      fat_free_weight           NUMERIC,
      subcutaneous_fat          NUMERIC,
      visceral_fat              NUMERIC,
      body_water                NUMERIC,
      skeletal_muscle           NUMERIC,
      muscle_mass               NUMERIC,
      bone_mass                 NUMERIC,
      protein                   NUMERIC,
      bmr                       NUMERIC,
      metabolic_age             NUMERIC,
      total_steps               INTEGER,
      walking_steps             INTEGER,
      running_steps             INTEGER,
      exercise_minutes          INTEGER,
      calories_burned_walking   NUMERIC,
      calories_burned_running   NUMERIC,
      calories_burned_exercise  NUMERIC,
      total_calories_burned     NUMERIC,
      calories_consumed         NUMERIC,
      protein_grams             NUMERIC,
      fats_grams                NUMERIC,
      carbs_grams               NUMERIC,
      created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

/** Create only Orders schema/tables */
export async function createOrdersSchema(db: IDatabase<unknown>) {
    await db.none(`
    CREATE SCHEMA IF NOT EXISTS orders;

    CREATE TABLE IF NOT EXISTS orders.printifyorders (
      id                 SERIAL PRIMARY KEY,
      order_number       TEXT NOT NULL,
      store_id           TEXT NOT NULL,
      email              TEXT NOT NULL,
      total_price        INTEGER NOT NULL,
      currency           TEXT NOT NULL,
      shipping_method    TEXT,
      shipping_cost      INTEGER,
      printify_order_id  TEXT,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT uniq_order_number UNIQUE (order_number)
    );
  `);
}

/** Build a pg-mem DB and give you pg-promise bound to it. */
export function makePgMem(): {
    mem: IMemoryDb;
    pgp: IMain;
    db: IDatabase<unknown>;
} {
    const mem = newDb({ autoCreateForeignKeyIndices: true });
    primeDb(mem);

    // Always use pg-mem's pg shim + normal pg-promise wiring (stable & explicit)
    const pgLike = mem.adapters.createPg(); // { Client, Pool }-compatible
    const pgp = pgPromise();

    // Tell pg-promise to use pg-mem's driver
    (pgp as unknown as { pg: any }).pg = pgLike;

    // Connect as a single, known user so creator == executor
    const db = pgp("postgres://postgres@localhost/mem");

    return { mem, pgp, db };
}

/**
 * All-in-one: create pg-mem, build all schemas, optionally seed,
 * and (optionally) mock your real connection module path.
 */
export async function setupPgMemAll(options?: {
    seed?: boolean;
    mockModuleId?: string;
}): Promise<PgMemHandles> {
    const { mem, pgp, db } = makePgMem();

    await createAllSchemas(db);

    if (options?.seed) await seedAll(db);

    if (options?.mockModuleId) {
        // Hot-swap the real DB module with our pg-mem db
        vi.doMock(options.mockModuleId, () => ({ default: db }));
    }

    return {
        mem,
        pgp,
        db,
        stop: () => {
            vi.resetModules();
            try {
                (pgp as any)?.end?.();
            } catch {
                /* no-op */
            }
        },
    };
}

/**
 * Convenience: set up pg-mem + mock, then dynamically import the target module
 * so it wires up against the mocked DB.
 */
export async function importWithMockedDb<T = unknown>(opts: {
    mockModuleId: string;
    importTarget: string;
    seed?: boolean;
}): Promise<{ handles: PgMemHandles; mod: T }> {
    const handles = await setupPgMemAll({
        seed: opts.seed,
        mockModuleId: opts.mockModuleId,
    });
    const mod = (await import(opts.importTarget)) as T;
    return { handles, mod };
}

/** Utility to truncate all known tables between tests if you want a clean slate */
export async function truncateAll(db: IDatabase<unknown>) {
    await db.none(`
    TRUNCATE TABLE 
      authentication.users,
      zachtothegym.articles,
      zachtothegym.blogs,
      zachtothegym.daily_metrics,
      orders.printifyorders
    RESTART IDENTITY CASCADE;
  `);
}
