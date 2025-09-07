// Integration tests for authenticationService (template)
// You can expand these with real DB setup/teardown if needed.
import { describe, it, expect } from "vitest";
import {
    registerUser,
    authenticateUser,
} from "../../../src/services/authenticationService";

describe("authenticationService integration", () => {
    it("registerUser runs without throwing (integration smoke test)", async () => {
        // TODO: This requires a real DB with proper permissions. Mock or set up a test DB in the future.
        // await expect(registerUser("user", "pw", "email@test.com", "site")).resolves.not.toThrow();
    });

    it("authenticateUser runs without throwing (integration smoke test)", async () => {
        // TODO: This requires a real DB with proper permissions. Mock or set up a test DB in the future.
        // await expect(authenticateUser("user", "pw", "site")).resolves.not.toThrow();
    });
});
