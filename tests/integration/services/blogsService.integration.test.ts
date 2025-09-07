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

type BlogsSvc = typeof import("../../../src/services/blogsService");

// Only run real DB smoke tests if a connection string is present
const REAL_DB = !!(
    process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length
);

// --- PG-MEM SUITE (always) -----------------------------------------------------
describe("blogsService with pg-mem (no real DB)", () => {
    let handles: any;
    let getAllBlogs: BlogsSvc["getAllBlogs"];
    let getBlogById: BlogsSvc["getBlogById"];
    let createBlog: BlogsSvc["createBlog"];
    let deleteBlogById: BlogsSvc["deleteBlogById"];

    beforeAll(async () => {
        vi.resetModules();

        // Build pg-mem and create schemas (no seed here; seed per test)
        const pgmem = await import("../../utils/pgmem");
        handles = await pgmem.setupPgMemAll({ seed: false });

        // Mock the *resolved absolute id* of src/db/connection
        const connAbsPath = path.resolve(
            __dirname,
            "../../../src/db/connection"
        );
        vi.doMock(connAbsPath, () => ({ default: handles.db }));

        // Import SUT after mocking so it uses pg-mem
        const svc = await import("../../../src/services/blogsService");
        getAllBlogs = svc.getAllBlogs;
        getBlogById = svc.getBlogById;
        createBlog = svc.createBlog;
        deleteBlogById = svc.deleteBlogById;
    });

    async function resetTables() {
        await handles.db.none(
            `TRUNCATE TABLE zachtothegym.blogs RESTART IDENTITY CASCADE;`
        );
    }

    beforeEach(async () => {
        await resetTables();
        await handles.db.none(`
      INSERT INTO zachtothegym.blogs (title, content, categories, created_at)
      VALUES
        ('Old', 'B-old', '{tech}', now() - interval '1 day'),
        ('New', 'B-new', '{life}', now());
    `);
    });

    afterAll(() => {
        handles?.stop?.();
    });

    // Should return all blogs ordered by most recent first
    it("getAllBlogs returns rows ordered by created_at DESC", async () => {
        const rows = await getAllBlogs();
        expect(rows.length).toBe(2);
        expect(rows[0].title).toBe("New");
        expect(rows[1].title).toBe("Old");
    });

    // Should fetch a blog by ID, or return null if not found
    it("getBlogById returns the row or null", async () => {
        const all = await getAllBlogs();
        const id = all[0].id;
        const found = await getBlogById(id);
        expect(found?.id).toBe(id);

        const missing = await getBlogById(9999);
        expect(missing).toBeNull();
    });

    // Should insert a new blog and return the created row
    it("createBlog inserts and returns the created row", async () => {
        const created = await createBlog("T", "C", ["cat1", "cat2"]);
        expect(created.id).toBeGreaterThan(0);
        expect(created.title).toBe("T");
        expect(Array.isArray(created.categories)).toBe(true);

        const roundTrip = await getBlogById(created.id);
        expect(roundTrip?.title).toBe("T");
    });

    // Should delete a blog by ID and return the deleted row
    it("deleteBlogById removes the row and returns it", async () => {
        const before = await getAllBlogs();
        expect(before.length).toBe(2);
        const id = before[0].id;

        const deleted = await deleteBlogById(id);
        expect(deleted?.id).toBe(id);

        const after = await getAllBlogs();
        expect(after.find((b) => b.id === id)).toBeUndefined();

        const refetch = await getBlogById(id);
        expect(refetch).toBeNull();
    });

    // Should return null when trying to delete a non-existent blog
    it("deleteBlogById returns null for a missing row", async () => {
        const deleted = await deleteBlogById(999999);
        expect(deleted).toBeNull();
    });
});

// --- REAL DB SMOKE SUITE (only if DATABASE_URL is set) -------------------------
describe.runIf(REAL_DB)("blogsService (real DB with rollback)", () => {
    let getAllBlogs: BlogsSvc["getAllBlogs"];
    let getBlogById: BlogsSvc["getBlogById"];
    let createBlog: BlogsSvc["createBlog"];
    let deleteBlogById: BlogsSvc["deleteBlogById"];
    let realDb: any;

    const ROLLBACK = new Error("__ROLLBACK__");

    beforeAll(async () => {
        vi.resetModules(); // ensure no mocks from pg-mem leak here
        realDb = (await import("../../../src/db/connection")).default;

        const svc = await import("../../../src/services/blogsService");
        getAllBlogs = svc.getAllBlogs;
        getBlogById = svc.getBlogById;
        createBlog = svc.createBlog;
        deleteBlogById = svc.deleteBlogById;
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

    // Should create and fetch a blog inside a transaction, then roll back
    it("create + fetch inside a tx then roll back (no side-effects)", async () => {
        const uniqueTitle = `[blog-${Date.now()}]`;

        await withTxRollback(async (t) => {
            const created = await createBlog(uniqueTitle, "C", ["x"], t);
            expect(created.id).toBeGreaterThan(0);

            const found = await getBlogById(created.id, t);
            expect(found?.title).toBe(uniqueTitle);

            const allInside = await getAllBlogs(t);
            expect(allInside.find((b) => b.id === created.id)).toBeTruthy();
        });

        // After rollback, it should not exist
        const allOutside = await getAllBlogs();
        expect(allOutside.find((b) => b.title === uniqueTitle)).toBeUndefined();
    });

    // Should delete a blog inside a transaction and roll back
    it("delete inside tx rolls back cleanly", async () => {
        await withTxRollback(async (t) => {
            const created = await createBlog("[del-test]", "C", ["x"], t);
            const deleted = await deleteBlogById(created.id, t);
            expect(deleted?.id).toBe(created.id);

            const refetch = await getBlogById(created.id, t);
            expect(refetch).toBeNull();
        });
        // after rollback, no lasting side-effects
    });
});
