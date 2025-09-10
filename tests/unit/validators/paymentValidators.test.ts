import { describe, it, expect } from "vitest";
import { validationResult } from "express-validator";
import { validateCreatePaymentIntent } from "../../../src/validators/paymentValidators";
import { PAYMENT_ERRORS } from "../../../src/config/paymentErrors";
import { Request } from "express";

/**
 * @file Unit tests for paymentValidators.
 *
 * These tests execute the payment validator chain against mocked Express request objects and assert
 * the resulting validationResult plus expected error messages from PAYMENT_ERRORS.
 *
 * Scenarios covered:
 * - validateCreatePaymentIntent: accepts valid storeId/amount/currency; rejects missing fields (MISSING_FIELDS)
 *   and invalid amount (INVALID_AMOUNT)
 */
function mockReq({
    params = {},
    body = {},
    query = {},
}: { params?: any; body?: any; query?: any } = {}): Request {
    return { params, body, query } as Request;
}
async function runValidation(chain: Array<any>, req: Request) {
    for (const validator of chain) {
        await validator.run(req);
    }
    return validationResult(req);
}

describe("paymentValidators (unit)", () => {
    describe("validateCreatePaymentIntent", () => {
        it("accepts valid body", async () => {
            const req = mockReq({
                body: { storeId: "1", amount: 100, currency: "USD" },
            });
            const result = await runValidation(
                validateCreatePaymentIntent,
                req
            );
            expect(result.isEmpty()).toBe(true);
        });
        it("rejects missing fields", async () => {
            const req = mockReq({
                body: { storeId: "", amount: "", currency: "" },
            });
            const result = await runValidation(
                validateCreatePaymentIntent,
                req
            );
            expect(result.isEmpty()).toBe(false);
            expect(result.array()[0].msg).toBe(PAYMENT_ERRORS.MISSING_FIELDS);
        });
        it("rejects invalid amount", async () => {
            const req = mockReq({
                body: { storeId: "1", amount: -5, currency: "USD" },
            });
            const result = await runValidation(
                validateCreatePaymentIntent,
                req
            );
            expect(result.isEmpty()).toBe(false);
            expect(
                result
                    .array()
                    .some((e) => e.msg === PAYMENT_ERRORS.INVALID_AMOUNT)
            ).toBe(true);
        });
    });
});
