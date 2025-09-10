import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import type { Transporter } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

import {
    sendOrderConfirmation,
    type OrderEmailSummary,
    type EmailDeps,
} from "../../../src/services/emailService";
import { STORE_EMAILS } from "../../../src/config/storeEmails";

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

describe("emailService (unit)", () => {
    const mockSendMail = vi.fn();
    const fakeTransport: Transporter<SMTPTransport.SentMessageInfo> = {
        sendMail:
            mockSendMail as unknown as Transporter<SMTPTransport.SentMessageInfo>["sendMail"],
    } as unknown as Transporter<SMTPTransport.SentMessageInfo>;
    const mockCreateTransport: NonNullable<EmailDeps["createTransport"]> =
        vi.fn((_opts: SMTPTransport.Options) => fakeTransport);
    const summary: OrderEmailSummary = {
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

    describe("sendOrderConfirmation", () => {
        describe("when store email configuration is missing", () => {
            it("returns error if email config is missing", async () => {
                const result = await sendOrderConfirmation(
                    "badStore",
                    "test@example.com",
                    "ORDER1",
                    summary,
                    { createTransport: mockCreateTransport }
                );
                expect(result.success).toBe(false);
                expect(result.error).toMatch(
                    /Email configuration missing|No email configuration found/i
                );
                expect(mockCreateTransport).not.toHaveBeenCalled();
                expect(mockSendMail).not.toHaveBeenCalled();
            });
        });

        describe("when store email configuration is valid", () => {
            beforeEach(() => {
                STORE_EMAILS["testStore"] = {
                    user: "test@domain.com",
                    pass: "pass",
                    storeName: "Test Store",
                    frontendUrl: "https://frontend.com",
                };
            });
            it("sends email and returns success", async () => {
                mockSendMail.mockResolvedValue({ messageId: "abc123" });
                const result = await sendOrderConfirmation(
                    "testStore",
                    "to@domain.com",
                    "ORDER2",
                    summary,
                    { createTransport: mockCreateTransport }
                );
                expect(mockCreateTransport).toHaveBeenCalled();
                expect(mockSendMail).toHaveBeenCalled();
                expect(result.success).toBe(true);
                expect(result.messageId).toBe("abc123");
            });
            it("returns error if sendMail throws", async () => {
                mockSendMail.mockRejectedValue(new Error("fail to send"));
                const result = await sendOrderConfirmation(
                    "testStore",
                    "to@domain.com",
                    "ORDER3",
                    summary,
                    { createTransport: mockCreateTransport }
                );
                expect(result.success).toBe(false);
                expect(result.error).toMatch(/fail to send/i);
            });
        });
    });
});
