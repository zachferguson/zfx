import { describe, it, expect, vi } from "vitest";
import { register } from "../../../src/controllers/authenticationController";
import * as expressValidator from "express-validator";

vi.mock("express-validator", () => ({
    validationResult: () => ({
        isEmpty: () => false,
        array: () => [{ msg: "Validation error" }],
    }),
}));

describe("register (unit)", () => {
    it("should return 400 if validation fails", async () => {
        const req = { body: {}, get: vi.fn() } as any;
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
        vi.spyOn(expressValidator, "validationResult").mockReturnValue({
            isEmpty: () => false,
            array: () => [{ msg: "Validation error" }],
        } as any);
        await register(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ errors: ["Validation error"] });
    });
});
