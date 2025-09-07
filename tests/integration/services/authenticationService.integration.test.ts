import { describe, it, expect } from "vitest";
import {
    registerUser,
    authenticateUser,
} from "../../../src/services/authenticationService";

// Only run integration tests if the DB connection string is present
if (!process.env.DATABASE_URL) {
    describe.skip("authenticationService integration", () => {
        it("skipped because DATABASE_URL is not set", () => {
            expect(true).toBe(true);
        });
    });
} else {
    describe("authenticationService integration", () => {
        it("registerUser runs without throwing (integration smoke test)", async () => {
            await expect(
                registerUser("user", "pw", "email@test.com", "site")
            ).resolves.not.toThrow();
        });

        it("authenticateUser runs without throwing (integration smoke test)", async () => {
            await expect(
                authenticateUser("user", "pw", "site")
            ).resolves.not.toThrow();
        });
    });
}
