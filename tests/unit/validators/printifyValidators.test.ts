// @ts-nocheck
import { describe, it, expect } from "vitest";
import { validationResult } from "express-validator";
import {
    validateSubmitOrder,
    validateGetOrderStatus,
    validateGetProducts,
    validateGetShippingOptions,
} from "../../../src/validators/printifyValidators";
import { PRINTIFY_ERRORS } from "../../../src/config/printifyErrors";
import { Request } from "express";

/**
 * @file Unit tests for printifyValidators.
 *
 * These tests execute each validator chain against mocked Express request objects and assert the
 * resulting validationResult plus expected error messages from PRINTIFY_ERRORS.
 *
 * Scenarios covered:
 * - validateSubmitOrder: accepts valid order payload; rejects missing fields (MISSING_ORDER_FIELDS)
 * - validateGetOrderStatus: accepts orderId+email; rejects missing fields (MISSING_ORDER_STATUS_FIELDS)
 * - validateGetProducts: accepts store id param; rejects missing id (MISSING_STORE_ID)
 * - validateGetShippingOptions: accepts store id + address_to + line_items; rejects missing inputs
 *   (MISSING_STORE_ID, MISSING_SHIPPING_FIELDS)
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

describe("printifyValidators (unit)", () => {
    describe("validateSubmitOrder", () => {
        it("accepts valid body", async () => {
            const req = mockReq({
                body: { storeId: "1", order: {}, stripe_payment_id: "pid" },
            });
            const result = await runValidation(validateSubmitOrder, req);
            expect(result.isEmpty()).toBe(true);
        });
        it("rejects missing fields", async () => {
            const req = mockReq({
                body: { storeId: "", order: "", stripe_payment_id: "" },
            });
            const result = await runValidation(validateSubmitOrder, req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array()[0].msg).toBe(
                PRINTIFY_ERRORS.MISSING_ORDER_FIELDS
            );
        });
    });

    describe("validateGetOrderStatus", () => {
        it("accepts valid body", async () => {
            const req = mockReq({ body: { orderId: "oid", email: "e@e.com" } });
            const result = await runValidation(validateGetOrderStatus, req);
            expect(result.isEmpty()).toBe(true);
        });
        it("rejects missing fields", async () => {
            const req = mockReq({ body: { orderId: "", email: "" } });
            const result = await runValidation(validateGetOrderStatus, req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array()[0].msg).toBe(
                PRINTIFY_ERRORS.MISSING_ORDER_STATUS_FIELDS
            );
        });
    });

    describe("validateGetProducts", () => {
        it("accepts valid param", async () => {
            const req = mockReq({ params: { id: "123" } });
            const result = await runValidation(validateGetProducts, req);
            expect(result.isEmpty()).toBe(true);
        });
        it("rejects missing id", async () => {
            const req = mockReq({ params: { id: "" } });
            const result = await runValidation(validateGetProducts, req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array()[0].msg).toBe(
                PRINTIFY_ERRORS.MISSING_STORE_ID
            );
        });
    });

    describe("validateGetShippingOptions", () => {
        it("accepts valid input", async () => {
            const req = mockReq({
                params: { id: "1" },
                body: { address_to: {}, line_items: [{}] },
            });
            const result = await runValidation(validateGetShippingOptions, req);
            expect(result.isEmpty()).toBe(true);
        });
        it("rejects missing fields", async () => {
            const req = mockReq({
                params: { id: "" },
                body: { address_to: "", line_items: [] },
            });
            const result = await runValidation(validateGetShippingOptions, req);
            expect(result.isEmpty()).toBe(false);
            // Could be either missing store id or shipping fields, check both
            const msgs = result.array().map((e) => e.msg);
            expect(msgs).toContain(PRINTIFY_ERRORS.MISSING_STORE_ID);
            expect(msgs).toContain(PRINTIFY_ERRORS.MISSING_SHIPPING_FIELDS);
        });
    });
});
