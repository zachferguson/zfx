// tests/unit/controllers/paymentController.unit.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPaymentController } from "../../../src/controllers/paymentController";
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

// Local mock for Stripe createPaymentIntent
const mockedCreatePaymentIntent = vi.fn(
    (storeId: string, amount: number, currency: string) =>
        Promise.resolve(`mock_${storeId}_${amount}_${currency}`)
);

const mockedValidationResult = vi.mocked(
    validationResult as unknown as ReturnType<typeof vi.fn>
);
// already typed above
const mockedCreatePaymentIntentTyped = mockedCreatePaymentIntent;

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
        let handleCreatePaymentIntent: ReturnType<
            typeof createPaymentController
        >["handleCreatePaymentIntent"];

        beforeEach(() => {
            vi.clearAllMocks();
            req = {
                body: { storeId: "store-1", amount: 1000, currency: "usd" },
            };
            res = makeRes();
            handleCreatePaymentIntent = createPaymentController({
                // not used in this controller path
                getStripeClient: (() => undefined) as any,
                createPaymentIntent:
                    mockedCreatePaymentIntent as unknown as any,
            }).handleCreatePaymentIntent;
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
            expect(mockedCreatePaymentIntentTyped).not.toHaveBeenCalled();
        });

        it("returns 200 and clientSecret on success", async () => {
            mockedValidationResult.mockReturnValue({
                isEmpty: () => true,
                array: () => [],
            } as any);
            mockedCreatePaymentIntentTyped.mockResolvedValue("secret_abc");

            await handleCreatePaymentIntent(req, res);

            expect(mockedCreatePaymentIntentTyped).toHaveBeenCalledTimes(1);
            expect(mockedCreatePaymentIntentTyped).toHaveBeenCalledWith(
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
            mockedCreatePaymentIntentTyped.mockRejectedValue(
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
