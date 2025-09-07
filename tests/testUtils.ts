// testUtils.ts
// Helper for mocking global.crypto.randomUUID in tests
// TypeScript does not know about global.crypto, so we cast to any for mocking in tests.
import { vi } from "vitest";

export function mockGlobalCryptoRandomUUID(uuid = "uuid-1") {
    return vi.spyOn(global, "crypto" as any, "get").mockReturnValue({
        randomUUID: () => uuid,
    });
}
