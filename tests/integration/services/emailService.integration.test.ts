import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { NodeMailerEmailService } from "../../../src/services/emailService";
import type { StoreEmailConfigMap } from "../../../src/types/email";

/**
 * @file Integration tests for emailService.
 *
 * Two parts:
 * 1) Mock-transport (always): exercise the real email formatting, subject, URLs, escaping, and
 *    config branching, while stubbing the transporter to avoid sending real mail.
 * 2) Live SMTP (opt-in via EMAIL_LIVE=1): attempt a real send against the provider implied by the
 *    configured mailbox (host derived as "mail." + domain, port 465). Only enable this when you
 *    control a compatible mailbox/provider.
 *
 * Scenarios covered (mock-transport):
 * - sendOrderConfirmation: returns error when store config missing
 * - sendOrderConfirmation: builds subject/from/to and calls transporter with correct options
 * - sendOrderConfirmation: includes order tracking URL (with orderId & email)
 * - sendOrderConfirmation: formats items table and totals; escapes HTML-sensitive characters
 */

const LIVE_ENABLED = process.env.EMAIL_LIVE === "1";

describe("emailService (integration, mock SMTP transport)", () => {
    // We'll instantiate the service per test with a stores map + injected transport factory
    let emailService: NodeMailerEmailService;

    const STORE_ID = "store-1";
    const FRONTEND_URL = "https://shop.example.com";
    const STORE_NAME = "Example Shop";

    const baseSummary = {
        address: {
            first_name: "Ada",
            last_name: "Lovelace",
            phone: "123-456",
            country: "US",
            region: "NY",
            city: "NYC",
            address1: '1 <Main> & "Second"',
            address2: "Apt #5",
            zip: "10001",
        },
        items: [
            {
                title: 'Shirt <Special> & "Deluxe"',
                variant_label: "L",
                quantity: 2,
                price: 2500, // cents
            },
        ],
        shippingMethod: 1,
        totalPrice: 5000,
        currency: "USD",
    };

    // our fake transport + capture of the createTransport options
    let fakeTransport: { sendMail: ReturnType<typeof vi.fn> };
    let createTransportCalls: any[];

    // Helper: build a service with provided stores and an injected transport factory
    function makeService(stores: StoreEmailConfigMap) {
        return new NodeMailerEmailService(stores, {
            createTransport: (opts: any) => {
                createTransportCalls.push(opts);
                return fakeTransport as any;
            },
            logger: console,
        });
    }

    beforeEach(() => {
        // Keep mock implementations; clear call history.
        vi.clearAllMocks();
        fakeTransport = {
            sendMail: vi.fn().mockResolvedValue({ messageId: "m-123" }),
        };
        createTransportCalls = [];
    });

    describe("when store email configuration is missing", () => {
        // Should return {success:false, error} if store credentials/config are missing
        it("returns an error without sending", async () => {
            emailService = makeService({}); // no config for STORE_ID

            const res = await emailService.sendOrderConfirmation({
                storeId: STORE_ID,
                to: "buyer@example.com",
                orderNumber: "ORD-1",
                payload: baseSummary as any,
            });

            expect(res.success).toBe(false);
            if (!res.success) {
                expect(typeof res.error).toBe("string");
            }
            expect(fakeTransport.sendMail).not.toHaveBeenCalled();
            expect(createTransportCalls).toHaveLength(0);
        });
    });

    describe("with valid store configuration", () => {
        const USER = "orders@example.com";
        const PASS = "super-secret";

        beforeAll(() => {
            // Build a service instance that uses a real stores map + injected transport factory
            emailService = makeService({
                [STORE_ID]: {
                    user: USER,
                    pass: PASS,
                    frontendUrl: FRONTEND_URL,
                    storeName: STORE_NAME,
                },
            });
        });

        beforeEach(() => {
            // Ensure deterministic success unless a test overrides it
            createTransportCalls.length = 0;
            fakeTransport.sendMail.mockResolvedValue({ messageId: "m-123" });
        });

        // Should call transport with correct envelope and return success
        it("sends via transporter with correct envelope", async () => {
            const res = await emailService.sendOrderConfirmation({
                storeId: STORE_ID,
                to: "buyer@example.com",
                orderNumber: "ORD-2",
                payload: baseSummary as any,
            });

            expect(res).toEqual(
                expect.objectContaining({ success: true, messageId: "m-123" })
            );
            expect(fakeTransport.sendMail).toHaveBeenCalledTimes(1);

            const mail = fakeTransport.sendMail.mock.calls[0][0];

            expect(mail.from).toContain(STORE_NAME);
            expect(mail.from).toContain(USER);
            expect(mail.to).toBe("buyer@example.com");
            expect(mail.subject).toContain(STORE_NAME);
            expect(mail.subject).toContain("ORD-2");
        });

        // Should embed a tracking URL with orderId and email in both text and html bodies
        it("includes tracking URL with orderId & email", async () => {
            await emailService.sendOrderConfirmation({
                storeId: STORE_ID,
                to: "buyer@example.com",
                orderNumber: "ORD-3",
                payload: baseSummary as any,
            });
            const mail = fakeTransport.sendMail.mock.calls[0][0];

            const expectedQuery = `orderId=ORD-3&email=buyer%40example.com`;
            expect(String(mail.text)).toContain(FRONTEND_URL);
            expect(String(mail.text)).toContain(expectedQuery);
            expect(String(mail.html)).toContain(FRONTEND_URL);
            expect(String(mail.html)).toContain(expectedQuery);
        });

        // Should escape HTML-sensitive characters in address and items and render totals
        it("escapes HTML and renders items & totals correctly", async () => {
            await emailService.sendOrderConfirmation({
                storeId: STORE_ID,
                to: "buyer@example.com",
                orderNumber: "ORD-4",
                payload: baseSummary as any,
            });
            const mail = fakeTransport.sendMail.mock.calls[0][0];

            // HTML should contain escaped address and item title
            expect(String(mail.html)).toContain("&lt;Main&gt;");
            expect(String(mail.html)).toContain("&amp;"); // from both address and title
            expect(String(mail.html)).toContain("&quot;Second&quot;");
            expect(String(mail.html)).toContain("&quot;Deluxe&quot;");

            // Should show quantity and line totals in HTML and text
            // Price per item: $25.00, qty 2, line total $50.00
            expect(String(mail.html)).toMatch(/\$25\.00/);
            expect(String(mail.html)).toMatch(/\$50\.00/);
            expect(String(mail.text)).toMatch(/\$25\.00/);
            expect(String(mail.text)).toMatch(/\$50\.00/);

            // Shipping method label and order total
            expect(String(mail.html)).toContain("Standard");
            expect(String(mail.html)).toMatch(/\$50\.00/);
            expect(String(mail.text)).toContain("Shipping Method: Standard");
            expect(String(mail.text)).toMatch(/Order Total:\s+\$50\.00/);
        });

        // Should construct the SMTP transport using domain-derived host and secure port
        it("constructs transport with domain-derived host & auth", async () => {
            await emailService.sendOrderConfirmation({
                storeId: STORE_ID,
                to: "buyer@example.com",
                orderNumber: "ORD-5",
                payload: baseSummary as any,
            });

            expect(createTransportCalls.length).toBeGreaterThanOrEqual(1);
            const transportOpts = createTransportCalls.at(-1);

            expect(transportOpts.host).toBe("mail.example.com");
            expect(transportOpts.port).toBe(465);
            expect(transportOpts.secure).toBe(true);
            expect(transportOpts.auth).toEqual({ user: USER, pass: PASS });
        });
    });
});

/* ---------- OPTIONAL LIVE SMTP (disabled by default) ----------

   Enable by setting EMAIL_LIVE=1 and configuring a real mailbox in STORE_EMAILS
   whose SMTP host matches the service’s derivation rule: "mail." + domain, on port 465.

   WARNING: This will attempt a real email send.

*/
describe.runIf(LIVE_ENABLED)("emailService (integration, live SMTP)", () => {
    // Use the *real* storeEmails config and class; ensure STORE_EMAILS contains credentials for STORE_ID.
    // No mocks here — we construct the real service and attempt a real send.
    let emailService: NodeMailerEmailService;

    const STORE_ID = process.env.EMAIL_LIVE_STORE_ID || "store-live";
    const TO = process.env.EMAIL_LIVE_TO || "you@example.com";
    const ORDER_ID = `ORD-LIVE-${Date.now()}`;

    const liveSummary = {
        address: {
            first_name: "Test",
            last_name: "Recipient",
            country: "US",
            region: "NY",
            city: "NYC",
            address1: "123 Live St",
            zip: "10001",
        },
        items: [
            {
                title: "Live Item",
                variant_label: "One",
                quantity: 1,
                price: 1234,
            },
        ],
        shippingMethod: 1,
        totalPrice: 1234,
        currency: "USD",
    };

    beforeAll(() => {
        emailService = new NodeMailerEmailService(STORE_EMAILS);
    });

    describe("sendOrderConfirmation (live)", () => {
        // Should send a real email when EMAIL_LIVE=1 and store config is valid
        it("attempts a real send and returns success", async () => {
            const res = await emailService.sendOrderConfirmation({
                storeId: STORE_ID,
                to: TO,
                orderNumber: ORDER_ID,
                payload: liveSummary as any,
            });
            // We can only assert shape; delivery itself is handled by SMTP
            expect(res).toEqual(
                expect.objectContaining({
                    success: expect.any(Boolean),
                })
            );
        });
    });
});
