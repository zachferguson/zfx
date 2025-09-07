import { describe, it, expect, vi, beforeEach } from "vitest";
import * as stripeService from "../../../src/services/stripeService";
import { handleCreatePaymentIntent } from "../../../src/controllers/paymentController";
import { validationResult } from "express-validator";
import { PAYMENT_ERRORS } from "../../../src/config/paymentErrors";

vi.mock("express-validator", () => ({
    validationResult: vi.fn(),
}));

vi.mock("../../../src/services/stripeService", () => ({
    createPaymentIntent: vi.fn(),
}));

describe("paymentController (unit)", () => {
    let req: any, res: any, next: any;

    beforeEach(() => {
        req = { body: { storeId: "store-1", amount: 1000, currency: "usd" } };
        res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
        next = vi.fn();
        vi.clearAllMocks();
    });

    it("should return 400 if validation fails", async () => {
        (validationResult as any).mockReturnValue({
            isEmpty: () => false,
            array: () => [{ msg: PAYMENT_ERRORS.MISSING_FIELDS }],
        });
        await handleCreatePaymentIntent(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            errors: [PAYMENT_ERRORS.MISSING_FIELDS],
        });
    });

    it("should return 200 and clientSecret if successful", async () => {
        (validationResult as any).mockReturnValue({ isEmpty: () => true });
        (stripeService.createPaymentIntent as any).mockResolvedValue(
            "secret_abc"
        );
        await handleCreatePaymentIntent(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ clientSecret: "secret_abc" });
    });

    it("should return 500 and error if service throws", async () => {
        (validationResult as any).mockReturnValue({ isEmpty: () => true });
        (stripeService.createPaymentIntent as any).mockRejectedValue(
            new Error("fail")
        );
        await handleCreatePaymentIntent(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            error: PAYMENT_ERRORS.PAYMENT_FAILED,
        });
    });
});
