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

type AuthSvc = typeof import("../../../src/services/authenticationService");

const REAL_DB = !!(
    process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length
);

// --- PG-MEM SUITE (always) -----------------------------------------------------
describe("authenticationService with pg-mem (no real DB)", () => {
    let handles: any;
    let registerUser: AuthSvc["registerUser"];
    let authenticateUser: AuthSvc["authenticateUser"];

    // keep env around to restore later
    const oldJwt = process.env.JWT_SECRET;
    const oldRounds = process.env.BCRYPT_SALT_ROUNDS;

    beforeAll(async () => {
        vi.resetModules();

        // Speed up hashing + ensure JWT can be signed in tests
        process.env.BCRYPT_SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS || "4";
        process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

        // Build pg-mem and create schemas (no seed; we seed per-test)
        const pgmem = await import("../../utils/pgmem");
        handles = await pgmem.setupPgMemAll({ seed: false });

        // Mock the exact db module id your service imports
        const connAbsPath = path.resolve(
            __dirname,
            "../../../src/db/connection"
        );
        vi.doMock(connAbsPath, () => ({ default: handles.db }));

        // Import SUT after mocking so it uses pg-mem
        const svc = await import("../../../src/services/authenticationService");
        registerUser = svc.registerUser;
        authenticateUser = svc.authenticateUser;
    });

    async function resetTables() {
        await handles.db.none(
            `TRUNCATE TABLE authentication.users RESTART IDENTITY CASCADE;`
        );
    }

    beforeEach(async () => {
        await resetTables();
    });

    afterAll(() => {
        // restore env + unmock/close
        if (oldJwt === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = oldJwt;

        if (oldRounds === undefined) delete process.env.BCRYPT_SALT_ROUNDS;
        else process.env.BCRYPT_SALT_ROUNDS = oldRounds;

        handles?.stop?.();
    });

    it("registerUser inserts a user (no password returned)", async () => {
        const u = await registerUser("alice", "pw", "alice@test.com", "siteA");
        expect(u).toMatchObject({
            username: "alice",
            email: "alice@test.com",
            site: "siteA",
        });
        // ensure password hash is not leaked
        // @ts-ignore
        expect(u.password_hash).toBeUndefined();
    });

    it("authenticateUser returns token + user with correct credentials", async () => {
        await registerUser("bob", "secret", "bob@test.com", "siteA");
        const res = await authenticateUser("bob", "secret", "siteA");
        expect(res).toBeTruthy();
        expect(res!.token).toBeTruthy();
        expect(res!.user.username).toBe("bob");
    });

    it("authenticateUser returns null for wrong password", async () => {
        await registerUser("carol", "right", "carol@test.com", "siteA");
        const res = await authenticateUser("carol", "wrong", "siteA");
        expect(res).toBeNull();
    });
});

// --- REAL DB SMOKE SUITE (only if DATABASE_URL is set) -------------------------
describe.runIf(REAL_DB)("authenticationService (real DB with rollback)", () => {
    let registerUser: AuthSvc["registerUser"];
    let authenticateUser: AuthSvc["authenticateUser"];
    let realDb: any;

    const ROLLBACK = new Error("__ROLLBACK__");
    const oldJwt = process.env.JWT_SECRET;
    const oldRounds = process.env.BCRYPT_SALT_ROUNDS;

    beforeAll(async () => {
        vi.resetModules(); // ensure no mocks from pg-mem leak here
        process.env.BCRYPT_SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS || "8";
        process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

        // Import real connection + SUT
        realDb = (await import("../../../src/db/connection")).default;
        const svc = await import("../../../src/services/authenticationService");
        registerUser = svc.registerUser;
        authenticateUser = svc.authenticateUser;
    });

    afterAll(() => {
        if (oldJwt === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = oldJwt;

        if (oldRounds === undefined) delete process.env.BCRYPT_SALT_ROUNDS;
        else process.env.BCRYPT_SALT_ROUNDS = oldRounds;
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

    it("register + authenticate inside a tx, then rolls back (no side-effects)", async () => {
        const username = `user_${Date.now()}`;
        const email = `${username}@test.com`;
        const site = "siteA";
        const password = "pw123";

        await withTxRollback(async (t) => {
            const u = await registerUser(username, password, email, site, t);
            expect(u.username).toBe(username);

            const auth = await authenticateUser(username, password, site, t);
            expect(auth).toBeTruthy();
            expect(auth!.user.username).toBe(username);
            expect(auth!.token).toBeTruthy();
        });

        // After rollback, auth should fail (row not persisted)
        const after = await authenticateUser(username, password, site);
        expect(after).toBeNull();
    });
});
