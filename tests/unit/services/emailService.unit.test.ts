import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { NodeMailerEmailService } from "../../../src/services/emailService";
import type {
    StoreEmailConfigMap,
    OrderConfirmationPayload,
    EmailSendResult,
} from "../../../src/types/email";

/**
 * @file Unit tests for emailService.sendOrderConfirmation.
 *
 * Validates behavior using a mocked transport created via the `deps.createTransport`
 * injection point. These tests execute without network calls or real SMTP integration.
 *
 * Scenarios covered:
 * - Missing store configuration → `{ success: false, error }`
 * - Valid configuration → transport invoked and `{ success: true, messageId }`
 * - Transport failure → `{ success: false, error }`
 */

let createTransportCalls: any[] = [];
const fakeTransport = {
    sendMail: vi.fn(),
};

function makeService(stores: StoreEmailConfigMap) {
    createTransportCalls = [];
    fakeTransport.sendMail.mockReset();

    const svc = new NodeMailerEmailService(stores, {
        createTransport: (opts: any) => {
            createTransportCalls.push(opts);
            return fakeTransport as any;
        },
    });

    return svc;
}

// success type guard for EmailSendResult
type SuccessResult = Extract<EmailSendResult, { success: true }>;
function expectSuccess(res: EmailSendResult): asserts res is SuccessResult {
    expect(res.success).toBe(true);
}

// --- shared test data --------------------------------------------------------
const summary: OrderConfirmationPayload = {
    address: {
        first_name: "John",
        last_name: "Doe",
        country: "USA",
        region: "CA",
        city: "Los Angeles",
        address1: "123 Main St",
        zip: "90001",
    },
    items: [
        {
            title: "T-Shirt",
            variant_label: "Large",
            quantity: 2,
            price: 2500,
        },
    ],
    shippingMethod: 1,
    totalPrice: 5000,
    currency: "USD",
};

afterEach(() => {
    vi.clearAllMocks();
});

describe("emailService (unit)", () => {
    describe("sendOrderConfirmation", () => {
        describe("when store email configuration is missing", () => {
            it("returns error if email config is missing", async () => {
                const svc = makeService({}); // no config for the store

                const result = await svc.sendOrderConfirmation({
                    storeId: "badStore",
                    to: "test@example.com",
                    orderNumber: "ORDER1",
                    payload: summary,
                });

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(typeof result.error).toBe("string");
                }
                expect(createTransportCalls.length).toBe(0);
                expect(fakeTransport.sendMail).not.toHaveBeenCalled();
            });
        });

        describe("when store email configuration is valid", () => {
            let stores: StoreEmailConfigMap;

            beforeEach(() => {
                stores = {
                    testStore: {
                        user: "test@domain.com",
                        pass: "pass",
                        storeName: "Test Store",
                        frontendUrl: "https://frontend.com",
                    },
                };
            });

            it("sends email and returns success", async () => {
                const svc = makeService(stores);
                fakeTransport.sendMail.mockResolvedValue({
                    messageId: "abc123",
                });

                const result = await svc.sendOrderConfirmation({
                    storeId: "testStore",
                    to: "to@domain.com",
                    orderNumber: "ORDER2",
                    payload: summary,
                });

                expect(createTransportCalls.length).toBeGreaterThan(0);
                expect(fakeTransport.sendMail).toHaveBeenCalledTimes(1);

                expectSuccess(result);
                expect(result.messageId).toBe("abc123");
            });

            it("returns error if sendMail throws", async () => {
                const svc = makeService(stores);
                fakeTransport.sendMail.mockRejectedValue(
                    new Error("fail to send")
                );

                const result = await svc.sendOrderConfirmation({
                    storeId: "testStore",
                    to: "to@domain.com",
                    orderNumber: "ORDER3",
                    payload: summary,
                });

                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error).toMatch(/fail to send/i);
                }
                expect(createTransportCalls.length).toBeGreaterThan(0);
                expect(fakeTransport.sendMail).toHaveBeenCalledTimes(1);
            });
        });
    });
});
