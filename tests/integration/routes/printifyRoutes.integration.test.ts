import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import express from "express";
import request from "supertest";

/**
 * Integration tests for the Printify router.
 *
 * These tests use a real Express app and the "wired" router module, while
 * stubbing dependencies at module boundaries:
 *  - Controller factory returns simple handlers that still honor express-validator
 *  - Auth middleware always passes
 *  - Concrete services the wired router constructs are replaced with no-op classes
 *  - Configuration and DB imports are stubbed
 *
 * Coverage:
 *  - GET /printify/:id/products (success + parameter wiring)
 *  - POST /printify/:id/shipping-options (validation paths + success)
 *  - POST /printify/submit-order (validation paths + success)
 *  - POST /printify/order-status (validation paths + success)
 */

// Controller factory mock: provides handlers that read validator results
vi.mock("../../../src/controllers/printifyController", () => {
    const { validationResult } =
        require("express-validator") as typeof import("express-validator");

    const handlers = {
        getProducts: vi.fn((req: any, res: any) => {
            const errors = validationResult(req);
            if (!errors.isEmpty())
                return res.status(400).json({ errors: errors.array() });
            return res.status(200).json([{ id: "p1" }]);
        }),

        getShippingOptions: vi.fn((req: any, res: any) => {
            const errors = validationResult(req);
            if (!errors.isEmpty())
                return res.status(400).json({ errors: errors.array() });
            return res.status(200).json([{ id: "s1" }]);
        }),

        submitOrder: vi.fn((req: any, res: any) => {
            const errors = validationResult(req);
            if (!errors.isEmpty())
                return res.status(400).json({ errors: errors.array() });
            return res.status(201).json({ ok: true });
        }),

        getOrderStatus: vi.fn((req: any, res: any) => {
            const errors = validationResult(req);
            if (!errors.isEmpty())
                return res.status(400).json({ errors: errors.array() });
            return res.status(200).json({ status: "in_production" });
        }),
    };

    // The wired router calls this when the module loads
    const createPrintifyController = vi.fn(() => handlers);

    // Expose a stable getter for assertions without relying on mock.results
    const __getHandlers = () => handlers;

    return { createPrintifyController, __getHandlers };
});

// Hoisted spy so we can assert calls without importing the symbol
const { authMw } = vi.hoisted(() => ({
    authMw: {
        verifyToken: vi.fn((_req: any, _res: any, next: any) => next()),
    },
}));

// Auth middleware: always allows the request through, exposing our hoisted spy
vi.mock("../../../src/middleware/authenticationMiddleware", () => ({
    verifyToken: authMw.verifyToken,
}));

/**
 * Service classes that the wired router constructs at import-time.
 * These are replaced with trivial versions so the router can be created
 * without touching external systems.
 */
vi.mock("../../../src/services/printifyService", () => {
    class PrintifyService {
        constructor(..._args: any[]) {}
    }
    return { PrintifyService };
});

vi.mock("../../../src/services/orderService", () => {
    class PgOrderService {
        constructor(..._args: any[]) {}
    }
    return { PgOrderService };
});

vi.mock("../../../src/services/emailService", () => {
    class NodeMailerEmailService {
        constructor(..._args: any[]) {}
    }
    return { NodeMailerEmailService };
});

// Configuration and DB imports consumed by the wired router
vi.mock("../../../src/config/storeEmails", () => ({ STORE_EMAILS: {} }));
vi.mock("../../../src/db/connection", () => ({ default: {} }));

// If the wired router reads env via a helper, provide a stable value
vi.mock("../../../src/utils/requireEnv", () => ({
    requireEnv: vi.fn(() => "test-key"),
}));

// Import the fully-wired router AFTER all module mocks
import router from "../../../src/routes/printifyRoutes.wired";
import * as ControllerModule from "../../../src/controllers/printifyController";
// Note: verifyToken export removed; middleware is mocked above via hoisted spy.

// Stable access to the mocked controller handlers
function handlers() {
    return (ControllerModule as any).__getHandlers() as {
        getProducts: Mock;
        getShippingOptions: Mock;
        submitOrder: Mock;
        getOrderStatus: Mock;
    };
}

// Minimal app hosting the router
function makeApp() {
    const app = express();
    app.use(express.json());
    app.use("/printify", router);
    return app;
}

describe("printifyRoutes (integration)", () => {
    let app: express.Express;

    beforeEach(() => {
        // Do not clear all mocks globally; the controller factory was invoked at import-time.
        // Clear only the handler spy state and middleware spy state between tests.
        const h = handlers();
        h.getProducts.mockClear();
        h.getShippingOptions.mockClear();
        h.submitOrder.mockClear();
        h.getOrderStatus.mockClear();
        authMw.verifyToken.mockClear();

        app = makeApp();
    });

    describe("GET /printify/:id/products", () => {
        it("returns 200 and passes the store id to the controller", async () => {
            const res = await request(app).get("/printify/store-123/products");

            const h = handlers();

            expect(res.status).toBe(200);
            expect(res.body).toEqual([{ id: "p1" }]);
            expect(h.getProducts).toHaveBeenCalledTimes(1);
            expect(authMw.verifyToken).not.toHaveBeenCalled();

            const call = h.getProducts.mock.calls[0] as any[];
            const reqArg = call[0];
            expect(reqArg.params.id).toBe("store-123");
        });
    });

    describe("POST /printify/:id/shipping-options", () => {
        it("returns 400 when the body is missing (validator enforces requirements)", async () => {
            const res = await request(app)
                .post("/printify/store-1/shipping-options")
                .send({});

            const h = handlers();

            expect(res.status).toBe(400);
            expect(res.body.errors).toBeDefined();
            expect(h.getShippingOptions).toHaveBeenCalledTimes(1);
            expect(authMw.verifyToken).not.toHaveBeenCalled();

            const call1 = h.getShippingOptions.mock.calls[0] as any[];
            const reqArg1 = call1 && call1[0];
            expect(reqArg1.params.id).toBe("store-1");
        });

        it("returns 400 when line_items is empty", async () => {
            const res = await request(app)
                .post("/printify/store-2/shipping-options")
                .send({
                    address_to: { city: "LA" },
                    line_items: [],
                });

            const h = handlers();

            expect(res.status).toBe(400);
            expect(res.body.errors).toBeDefined();
            expect(h.getShippingOptions).toHaveBeenCalledTimes(1);
            expect(authMw.verifyToken).not.toHaveBeenCalled();
        });

        it("returns 200 and calls the controller on a minimally valid payload", async () => {
            const res = await request(app)
                .post("/printify/store-3/shipping-options")
                .send({
                    address_to: { city: "LA" },
                    line_items: [{ product_id: 1, variant_id: 2, quantity: 1 }],
                });

            const h = handlers();

            expect(res.status).toBe(200);
            expect(res.body).toEqual([{ id: "s1" }]);
            expect(h.getShippingOptions).toHaveBeenCalledTimes(1);
            expect(authMw.verifyToken).not.toHaveBeenCalled();

            const call2 = h.getShippingOptions.mock.calls[0] as any[];
            const reqArg2 = call2 && call2[0];
            expect(reqArg2.params.id).toBe("store-3");
        });
    });

    describe("POST /printify/submit-order", () => {
        it("returns 201 and forwards the payload to the controller", async () => {
            const res = await request(app)
                .post("/printify/submit-order")
                .send({
                    storeId: "store-1",
                    order: {
                        customer: { email: "a@b.com", address: {} },
                        total_price: 100,
                        currency: "USD",
                        shipping_method: "std",
                        shipping_cost: 10,
                        line_items: [
                            {
                                metadata: {
                                    title: "T",
                                    variant_label: "V",
                                    price: 100,
                                },
                                quantity: 1,
                            },
                        ],
                    },
                    stripe_payment_id: "stripe-1",
                });

            const h = handlers();

            expect(res.status).toBe(201);
            expect(res.body).toEqual({ ok: true });
            expect(h.submitOrder).toHaveBeenCalledTimes(1);
            expect(authMw.verifyToken).not.toHaveBeenCalled();

            const subCall = h.submitOrder.mock.calls[0] as any[];
            const reqArg3 = subCall && subCall[0];
            expect(reqArg3.body.storeId).toBe("store-1");
            expect(reqArg3.body.stripe_payment_id).toBe("stripe-1");
        });

        it("returns 400 when payload is invalid (validator enforces requirements)", async () => {
            const res = await request(app)
                .post("/printify/submit-order")
                .send({});

            const h = handlers();

            expect(res.status).toBe(400);
            expect(res.body.errors).toBeDefined();
            expect(h.submitOrder).toHaveBeenCalledTimes(1);
            expect(authMw.verifyToken).not.toHaveBeenCalled();
        });
    });

    describe("POST /printify/order-status", () => {
        it("returns 200 and calls the controller with the provided body", async () => {
            const res = await request(app).post("/printify/order-status").send({
                orderId: "o1",
                email: "a@b.com",
            });

            const h = handlers();

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ status: "in_production" });
            expect(h.getOrderStatus).toHaveBeenCalledTimes(1);
            expect(authMw.verifyToken).not.toHaveBeenCalled();

            const stCall = h.getOrderStatus.mock.calls[0] as any[];
            const reqArg4 = stCall && stCall[0];
            expect(reqArg4.body.orderId).toBe("o1");
            expect(reqArg4.body.email).toBe("a@b.com");
        });

        it("returns 400 when required fields are missing (validator enforces requirements)", async () => {
            const res = await request(app)
                .post("/printify/order-status")
                .send({});

            const h = handlers();

            expect(res.status).toBe(400);
            expect(res.body.errors).toBeDefined();
            expect(h.getOrderStatus).toHaveBeenCalledTimes(1);
            expect(authMw.verifyToken).not.toHaveBeenCalled();
        });
    });
});
