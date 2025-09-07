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
import type { ITask } from "pg-promise";
import type { Article } from "../../../src/types/articlesModel";

type ArticlesSvc = typeof import("../../../src/services/articlesService");

const REAL_DB = !!(
    process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length
);

// --- PG-MEM SUITE (always) -----------------------------------------------------
describe("articlesService with pg-mem (no real DB)", () => {
    let handles: any;
    let getAllArticles: ArticlesSvc["getAllArticles"];
    let getArticleById: ArticlesSvc["getArticleById"];
    let createArticle: ArticlesSvc["createArticle"];
    let deleteArticleById: ArticlesSvc["deleteArticleById"];

    beforeAll(async () => {
        vi.resetModules();

        // Build pg-mem and create schemas (no seed here; we seed per test)
        const pgmem = await import("../../utils/pgmem");
        handles = await pgmem.setupPgMemAll({ seed: false });

        // Mock the *resolved absolute id* of src/db/connection
        const connAbsPath = path.resolve(
            __dirname,
            "../../../src/db/connection"
        );
        vi.doMock(connAbsPath, () => ({ default: handles.db }));

        // Import the SUT *after* mocking so it picks up our db
        const svc = await import("../../../src/services/articlesService");
        getAllArticles = svc.getAllArticles;
        getArticleById = svc.getArticleById;
        createArticle = svc.createArticle;
        deleteArticleById = svc.deleteArticleById;
    });

    async function resetTables() {
        await handles.db.none(
            `TRUNCATE TABLE zachtothegym.articles RESTART IDENTITY CASCADE;`
        );
    }

    beforeEach(async () => {
        await resetTables();
        await handles.db.none(`
      INSERT INTO zachtothegym.articles (title, summary, content, categories, created_at)
      VALUES
        ('Old', 'S-old', 'C-old', '{tech}', now() - interval '1 day'),
        ('New', 'S-new', 'C-new', '{life}', now());
    `);
    });

    afterAll(() => {
        handles?.stop?.();
    });

    // Should return all articles ordered by most recent first
    it("getAllArticles returns rows ordered by created_at DESC", async () => {
        const rows = await getAllArticles();
        expect(rows.length).toBe(2);
        expect(rows[0].title).toBe("New");
        expect(rows[1].title).toBe("Old");
    });

    // Should fetch an article by ID, or return null if not found
    it("getArticleById returns the row or null", async () => {
        const all = await getAllArticles();
        const id = all[0].id;
        const found = await getArticleById(id);
        expect(found?.id).toBe(id);

        const missing = await getArticleById(9999);
        expect(missing).toBeNull();
    });

    // Should insert a new article and return the created row
    it("createArticle inserts and returns the created row", async () => {
        const created = await createArticle("T", "S", "C", ["cat1", "cat2"]);
        expect(created.id).toBeGreaterThan(0);
        expect(created.title).toBe("T");
        expect(Array.isArray(created.categories)).toBe(true);

        const roundTrip = await getArticleById(created.id);
        expect(roundTrip?.title).toBe("T");
    });

    // Should delete an article by ID and return the deleted row
    it("deleteArticleById removes the row and returns it", async () => {
        const before = await getAllArticles();
        expect(before.length).toBe(2);
        const id = before[0].id;

        const deleted = await deleteArticleById(id);
        expect(deleted?.id).toBe(id);

        const after = await getAllArticles();
        expect(after.find((a: Article) => a.id === id)).toBeUndefined();

        const refetch = await getArticleById(id);
        expect(refetch).toBeNull();
    });

    // Should return null when trying to delete a non-existent article
    it("deleteArticleById returns null for a missing row", async () => {
        const deleted = await deleteArticleById(999999);
        expect(deleted).toBeNull();
    });
});

// --- REAL DB SUITE (only if DATABASE_URL is set) -------------------------------
// sentinel error to trigger rollback without failing the test
const ROLLBACK = new Error("__ROLLBACK__");

// helper: run code inside a tx and roll back at the end
async function withTxRollback(fn: (t: ITask<unknown>) => Promise<void>) {
    const { default: db } = await import("../../../src/db/connection");
    await db
        .tx(async (t) => {
            await fn(t); // run test logic using the tx context
            throw ROLLBACK; // force rollback
        })
        .catch((e: unknown) => {
            if (e !== ROLLBACK) throw e; // only swallow our sentinel
        });
}

describe.runIf(REAL_DB)("articlesService (real DB with rollback)", () => {
    let getAllArticles: ArticlesSvc["getAllArticles"];
    let getArticleById: ArticlesSvc["getArticleById"];
    let createArticle: ArticlesSvc["createArticle"];
    let deleteArticleById: ArticlesSvc["deleteArticleById"];

    beforeAll(async () => {
        vi.resetModules(); // ensure pg-mem mock doesn't leak here
        const svc = await import("../../../src/services/articlesService");
        getAllArticles = svc.getAllArticles;
        getArticleById = svc.getArticleById;
        createArticle = svc.createArticle;
        deleteArticleById = svc.deleteArticleById;
    });

    // Should create and fetch an article inside a transaction, then roll back
    it("create + fetch happen inside a tx and roll back", async () => {
        const uniqueTitle = `[test-${Date.now()}]`;

        await withTxRollback(async (t) => {
            const created = await createArticle(
                uniqueTitle,
                "S",
                "C",
                ["cat"],
                t
            );
            expect(created.id).toBeGreaterThan(0);

            const found = await getArticleById(created.id, t);
            expect(found?.title).toBe(uniqueTitle);

            const allInside = await getAllArticles(t);
            expect(
                allInside.find((a: Article) => a.id === created.id)
            ).toBeTruthy();
            // rollback will remove it after the callback
        });

        // After rollback, the article isn't in the real DB
        const allOutside = await getAllArticles();
        expect(
            allOutside.find((a: Article) => a.title === uniqueTitle)
        ).toBeUndefined();
    });

    // Should delete an article inside a transaction and roll back
    it("delete inside tx rolls back too", async () => {
        await withTxRollback(async (t) => {
            const created = await createArticle(
                "[del-test]",
                "S",
                "C",
                ["x"],
                t
            );
            const deleted = await deleteArticleById(created.id, t);
            expect(deleted?.id).toBe(created.id);

            const refetch = await getArticleById(created.id, t);
            expect(refetch).toBeNull();
        });
        // Nothing persisted because of rollback.
    });
});
