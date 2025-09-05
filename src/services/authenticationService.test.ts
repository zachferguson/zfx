import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest";

// --- Mocks ---
vi.mock("../db/connection", () => ({
    default: {
        one: vi.fn(),
        oneOrNone: vi.fn(),
    },
}));

vi.mock("bcryptjs", () => {
    const hash = vi.fn();
    const compare = vi.fn();
    return {
        default: { hash, compare },
        hash, // named export points to same spy
        compare, // named export points to same spy
    };
});

vi.mock("jsonwebtoken", () => {
    const sign = vi.fn();
    return {
        default: { sign },
        sign,
    };
});

// Import after mocks
import db from "../db/connection";
import * as Bcrypt from "bcryptjs";
import * as JWT from "jsonwebtoken";
const bcrypt = vi.mocked(Bcrypt as any);
const jwt = vi.mocked(JWT as any);
import { registerUser, authenticateUser } from "./authenticationService";

// tiny helper for TS to use mock.* safely
const asMock = <T extends Function>(fn: unknown) => fn as unknown as Mock;

describe("authenticationService", () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...OLD_ENV, JWT_SECRET: "test-secret" };
    });

    afterEach(() => {
        process.env = OLD_ENV;
    });

    // ---------------------------
    // registerUser
    // ---------------------------
    it("registerUser -> hashes password with configured rounds and inserts user", async () => {
        process.env.BCRYPT_SALT_ROUNDS = "12";

        // hash result
        asMock(bcrypt.hash).mockResolvedValue("hashed_pw");
        // db insert returns the created user without password
        asMock(db.one).mockResolvedValue({
            id: 1,
            username: "alice",
            email: "a@b.com",
            role: "user",
            site: "site-1",
        });

        const user = await registerUser("alice", "pw123", "a@b.com", "site-1");

        expect(bcrypt.hash).toHaveBeenCalledWith("pw123", 12);

        expect(db.one).toHaveBeenCalledTimes(1);
        const [sql, params] = asMock(db.one).mock.calls[0];

        // sanity check the SQL (not too brittle)
        expect(sql).toContain("INSERT INTO authentication.users");
        expect(sql).toContain("(username, password_hash, email, site)");
        expect(sql).toContain("RETURNING id, username, email, role, site");

        expect(params).toEqual(["alice", "hashed_pw", "a@b.com", "site-1"]);

        expect(user).toEqual({
            id: 1,
            username: "alice",
            email: "a@b.com",
            role: "user",
            site: "site-1",
        });
    });

    it("registerUser -> defaults salt rounds to 10 when env missing", async () => {
        delete process.env.BCRYPT_SALT_ROUNDS;
        asMock(bcrypt.hash).mockResolvedValue("hpw");
        asMock(db.one).mockResolvedValue({
            id: 2,
            username: "bob",
            email: "b@c.com",
            role: "admin",
            site: "site-2",
        });

        await registerUser("bob", "pw", "b@c.com", "site-2");

        expect(bcrypt.hash).toHaveBeenCalledWith("pw", 10);
    });

    it("registerUser -> throws friendly error on unique violation (23505)", async () => {
        asMock(bcrypt.hash).mockResolvedValue("hpw");
        asMock(db.one).mockRejectedValue({ code: "23505" });

        await expect(
            registerUser("dup", "pw", "dup@x.com", "site-1")
        ).rejects.toThrow("Username or email already exists for this site.");
    });

    it("registerUser -> rethrows other db errors", async () => {
        asMock(bcrypt.hash).mockResolvedValue("hpw");
        asMock(db.one).mockRejectedValue(new Error("db-down"));

        await expect(
            registerUser("c", "pw", "c@x.com", "site-1")
        ).rejects.toThrow("db-down");
    });

    // ---------------------------
    // authenticateUser
    // ---------------------------
    it("authenticateUser -> returns token and user when password matches", async () => {
        // db returns a full user (with password_hash)
        asMock(db.oneOrNone).mockResolvedValue({
            id: 10,
            username: "carol",
            email: "c@x.com",
            role: "user",
            site: "site-1",
            password_hash: "stored_hash",
        });

        asMock(bcrypt.compare).mockResolvedValue(true);
        asMock(jwt.sign).mockReturnValue("signed.jwt.token");

        const result = await authenticateUser("carol", "pw!", "site-1");
        expect(db.oneOrNone).toHaveBeenCalledTimes(1);

        const [sql, params] = asMock(db.oneOrNone).mock.calls[0];
        expect(sql).toContain("FROM authentication.users");
        expect(sql).toContain("WHERE username = $1 AND site = $2");
        expect(params).toEqual(["carol", "site-1"]);

        expect(bcrypt.compare).toHaveBeenCalledWith("pw!", "stored_hash");

        expect(jwt.sign).toHaveBeenCalledWith(
            {
                id: 10,
                username: "carol",
                role: "user",
                site: "site-1",
            },
            "test-secret",
            { expiresIn: "1d" }
        );

        expect(result).toEqual({
            token: "signed.jwt.token",
            user: {
                id: 10,
                username: "carol",
                email: "c@x.com",
                role: "user",
                site: "site-1",
            },
        });
    });

    it("authenticateUser -> returns null when user not found", async () => {
        asMock(db.oneOrNone).mockResolvedValue(null);

        const result = await authenticateUser("nobody", "pw", "site-1");
        expect(result).toBeNull();
        expect(bcrypt.compare).not.toHaveBeenCalled();
        expect(jwt.sign).not.toHaveBeenCalled();
    });

    it("authenticateUser -> returns null when password does not match", async () => {
        asMock(db.oneOrNone).mockResolvedValue({
            id: 11,
            username: "dan",
            email: "d@x.com",
            role: "user",
            site: "site-1",
            password_hash: "hash",
        });

        asMock(bcrypt.compare).mockResolvedValue(false);

        const result = await authenticateUser("dan", "wrong", "site-1");
        expect(result).toBeNull();
        expect(jwt.sign).not.toHaveBeenCalled();
    });
});
