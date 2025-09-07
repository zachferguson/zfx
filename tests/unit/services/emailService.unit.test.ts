import { describe, it, expect, vi, afterEach } from "vitest";
import {
    sendOrderConfirmation,
    OrderEmailSummary,
} from "../../../src/services/emailService";
import { STORE_EMAILS } from "../../../src/config/storeEmails";
import nodemailer from "nodemailer";

describe("sendOrderConfirmation", () => {
    const mockSendMail = vi.fn();
    const mockCreateTransport = vi
        .spyOn(nodemailer, "createTransport")
        .mockReturnValue({
            sendMail: mockSendMail,
        } as any);

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

    it("returns error if email config is missing", async () => {
        const result = await sendOrderConfirmation(
            "badStore",
            "test@example.com",
            "ORDER1",
            summary
        );
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/Email configuration missing/);
    });

    it("sends email and returns success", async () => {
        STORE_EMAILS["testStore"] = {
            user: "test@domain.com",
            pass: "pass",
            storeName: "Test Store",
            frontendUrl: "https://frontend.com",
        };
        mockSendMail.mockResolvedValue({ messageId: "abc123" });
        const result = await sendOrderConfirmation(
            "testStore",
            "to@domain.com",
            "ORDER2",
            summary
        );
        expect(mockCreateTransport).toHaveBeenCalled();
        expect(mockSendMail).toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.messageId).toBe("abc123");
    });

    it("returns error if sendMail throws", async () => {
        STORE_EMAILS["failStore"] = {
            user: "fail@domain.com",
            pass: "pass",
            storeName: "Fail Store",
            frontendUrl: "https://frontend.com",
        };
        mockSendMail.mockRejectedValue(new Error("fail to send"));
        const result = await sendOrderConfirmation(
            "failStore",
            "to@domain.com",
            "ORDER3",
            summary
        );
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/fail to send/);
    });
});
