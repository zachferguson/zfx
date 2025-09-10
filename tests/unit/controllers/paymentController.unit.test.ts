// tests/unit/controllers/paymentController.unit.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as stripeService from "../../../src/services/stripeService";
import { handleCreatePaymentIntent } from "../../../src/controllers/paymentController";
import { validationResult } from "express-validator";
import { PAYMENT_ERRORS } from "../../../src/config/paymentErrors";

/**
 * @file Unit tests for paymentController.handleCreatePaymentIntent.
 *
 * These tests validate controller behavior independent of routing:
 * - Validation results are simulated via a mocked `validationResult`.
 * - The Stripe service (`createPaymentIntent`) is mocked.
 *
 * Scenarios covered:
 * - 400 with mapped messages when validation fails (service not called)
 * - 200 with clientSecret when service succeeds (called with storeId/amount/currency)
 * - 500 with PAYMENT_FAILED when service throws
 */

vi.mock("express-validator", () => ({
    validationResult: vi.fn(),
}));

vi.mock("../../../src/services/stripeService", () => ({
    createPaymentIntent: vi.fn(),
}));

const mockedValidationResult = vi.mocked(
    validationResult as unknown as ReturnType<typeof vi.fn>
);
const mockedCreatePaymentIntent = vi.mocked(
    stripeService.createPaymentIntent as unknown as ReturnType<typeof vi.fn>
);

// simple res factory
function makeRes() {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
}

describe("paymentController (unit)", () => {
    describe("handleCreatePaymentIntent", () => {
        let req: any;
        let res: any;

        beforeEach(() => {
            vi.clearAllMocks();
            req = {
                body: { storeId: "store-1", amount: 1000, currency: "usd" },
            };
            res = makeRes();
        });

        it("returns 400 with validation errors (no service call)", async () => {
            mockedValidationResult.mockReturnValue({
                isEmpty: () => false,
                array: () => [
                    { msg: PAYMENT_ERRORS.MISSING_FIELDS },
                    { msg: PAYMENT_ERRORS.INVALID_AMOUNT },
                ],
            } as any);

            await handleCreatePaymentIntent(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                errors: [
                    PAYMENT_ERRORS.MISSING_FIELDS,
                    PAYMENT_ERRORS.INVALID_AMOUNT,
                ],
            });
            expect(mockedCreatePaymentIntent).not.toHaveBeenCalled();
        });

        it("returns 200 and clientSecret on success", async () => {
            mockedValidationResult.mockReturnValue({
                isEmpty: () => true,
                array: () => [],
            } as any);
            mockedCreatePaymentIntent.mockResolvedValue("secret_abc");

            await handleCreatePaymentIntent(req, res);

            expect(mockedCreatePaymentIntent).toHaveBeenCalledTimes(1);
            expect(mockedCreatePaymentIntent).toHaveBeenCalledWith(
                "store-1",
                1000,
                "usd"
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                clientSecret: "secret_abc",
            });
        });

        it("returns 500 when service throws", async () => {
            mockedValidationResult.mockReturnValue({
                isEmpty: () => true,
                array: () => [],
            } as any);
            mockedCreatePaymentIntent.mockRejectedValue(
                new Error("stripe down")
            );

            await handleCreatePaymentIntent(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: PAYMENT_ERRORS.PAYMENT_FAILED,
            });
        });
    });
});
