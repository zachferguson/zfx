import { it, expect, vi } from "vitest";
import request from "supertest";

// Prevent env-dependent DB initialization by stubbing the connection before importing app
vi.mock("../../src/db/connection", () => ({ default: {} }));

// Also stub any wired routers that may resolve env at import-time
vi.mock("../../src/routes/printifyRoutes.wired", () => ({
    default: (_req: any, _res: any, next: any) => next?.(),
}));

import app from "../../src/app";

it("GET /health returns 200 with { ok: true }", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
});
