import { vi } from "vitest";

export function mockGlobalCryptoRandomUUID(uuid = "uuid-1") {
    return vi.spyOn(global, "crypto" as any, "get").mockReturnValue({
        randomUUID: () => uuid,
    });
}
