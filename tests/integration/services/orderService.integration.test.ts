// tests/integration/services/orderService.integration.test.ts
import {
    describe,
    it,
    expect,
    beforeAll,
    beforeEach,
    afterAll,
    vi,
} from "vitest";
import path from "node:path";

import type { OrderService as OrderServiceType } from "../../../src/services/orderService";

const REAL_DB = !!(
    process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length
);

// --- PG-MEM SUITE (always) -----------------------------------------------------
describe("orderService with pg-mem (no real DB)", () => {
    let handles: any;
    let svc: OrderServiceType;

    beforeAll(async () => {
        vi.resetModules();

        // Build pg-mem and create schemas (no seed here; seed per test)
        const pgmem = await import("../../utils/pgmem");
        handles = await pgmem.setupPgMemAll({ seed: false });

        // Mock the *resolved absolute id* of src/db/connection
        const connAbsPath = path.resolve(
            __dirname,
            "../../../src/db/connection"
        );
        vi.doMock(connAbsPath, () => ({ default: handles.db }));

        // Import SUT after mocking so it uses pg-mem
        const mod = await import("../../../src/services/orderService");
        const OrderService = mod.OrderService;
        svc = new OrderService();

        // Ensure expected columns exist on pg-mem table (if pgmem.ts wasn't updated yet)
        const alters = [
            `ALTER TABLE orders.printifyorders ADD COLUMN IF NOT EXISTS shipping_address jsonb`,
            `ALTER TABLE orders.printifyorders ADD COLUMN IF NOT EXISTS items jsonb`,
            `ALTER TABLE orders.printifyorders ADD COLUMN IF NOT EXISTS stripe_payment_id text`,
            `ALTER TABLE orders.printifyorders ADD COLUMN IF NOT EXISTS payment_status text`,
            `ALTER TABLE orders.printifyorders ADD COLUMN IF NOT EXISTS order_status text`,
        ];
        for (const sql of alters) {
            try {
                // Some pg-mem versions may not support IF NOT EXISTS perfectly; ignore errors.
                // eslint-disable-next-line no-await-in-loop
                await handles.db.none(sql);
            } catch {
                /* no-op */
            }
        }
    });

    async function resetTable() {
        await handles.db.none(
            `TRUNCATE TABLE orders.printifyorders RESTART IDENTITY CASCADE;`
        );
    }

    beforeEach(async () => {
        await resetTable();
    });

    afterAll(() => {
        handles?.stop?.();
    });

    function buildOrder(overrides: Partial<any> = {}) {
        return {
            orderNumber: `ord-${Date.now()}`,
            storeId: "store-1",
            email: "buyer@example.com",
            totalPrice: 12345,
            currency: "USD",
            shippingMethod: 1,
            shippingCost: 599,
            shippingAddress: { line1: "123 Main", city: "Metropolis" },
            items: [{ sku: "sku1", qty: 1 }],
            stripePaymentId: "pi_123",
            paymentStatus: "paid",
            orderStatus: "created",
            ...overrides,
        };
    }

    it("saveOrder inserts a row and getOrderByCustomer fetches it", async () => {
        const order = buildOrder();
        const { id } = await svc.saveOrder(order);
        expect(Number(id)).toBeGreaterThan(0);

        const fetched = await svc.getOrderByCustomer(
            order.orderNumber,
            order.email
        );
        expect(fetched).toBeTruthy();
        expect(fetched!.store_id).toBe(order.storeId);
        expect(fetched!.printify_order_id).toBeNull();
    });

    it("updatePrintifyOrderId updates the row", async () => {
        const order = buildOrder();
        const { id } = await svc.saveOrder(order);
        expect(Number(id)).toBeGreaterThan(0);

        const updatedId = await svc.updatePrintifyOrderId(
            order.orderNumber,
            "po_789"
        );
        expect(Number(updatedId)).toBeGreaterThan(0);

        const fetched = await svc.getOrderByCustomer(
            order.orderNumber,
            order.email
        );
        expect(fetched?.printify_order_id).toBe("po_789");
    });
});

// --- REAL DB SUITE (only if DATABASE_URL is set) -------------------------------
describe.runIf(REAL_DB)("orderService (real DB with rollback)", () => {
    let svc: OrderServiceType;
    let realDb: any;

    const ROLLBACK = new Error("__ROLLBACK__");
    let HAS_FULL_SCHEMA = true;

    beforeAll(async () => {
        vi.resetModules(); // ensure no pg-mem mocks leak
        realDb = (await import("../../../src/db/connection")).default;

        const mod = await import("../../../src/services/orderService");
        const OrderService = mod.OrderService;
        svc = new OrderService();

        // Detect if the real table has all columns the service writes
        const rows: Array<{ column_name: string }> = await realDb.any(
            `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'orders'
          AND table_name = 'printifyorders'
      `
        );
        const cols = new Set(rows.map((r) => r.column_name));
        const required = [
            "shipping_address",
            "items",
            "stripe_payment_id",
            "payment_status",
            "order_status",
        ];
        HAS_FULL_SCHEMA = required.every((c) => cols.has(c));
    });

    // helper: run code inside a tx and roll back at the end
    async function withTxRollback(fn: (t: any) => Promise<void>) {
        await realDb
            .tx(async (t: any) => {
                await fn(t);
                throw ROLLBACK; // force rollback
            })
            .catch((e: unknown) => {
                if (e !== ROLLBACK) throw e;
            });
    }

    const itIf = HAS_FULL_SCHEMA ? it : it.skip;

    itIf(
        "saveOrder + getOrderByCustomer inside a tx, then rolls back",
        async () => {
            const order = {
                orderNumber: `ord-${Date.now()}`,
                storeId: "store-1",
                email: "buyer@example.com",
                totalPrice: 1111,
                currency: "USD",
                shippingMethod: 1,
                shippingCost: 100,
                shippingAddress: { line1: "1 First St" },
                items: [{ sku: "sku", qty: 1 }],
                stripePaymentId: "pi_real",
                paymentStatus: "paid",
                orderStatus: "created",
            };

            await withTxRollback(async (t) => {
                const { id } = await svc.saveOrder(order, t);
                expect(Number(id)).toBeGreaterThan(0);

                const fetched = await svc.getOrderByCustomer(
                    order.orderNumber,
                    order.email,
                    t
                );
                expect(fetched?.store_id).toBe(order.storeId);
                expect(fetched?.printify_order_id).toBeNull();
            });

            // After rollback, row should not persist
            const outside = await svc.getOrderByCustomer(
                order.orderNumber,
                order.email
            );
            expect(outside).toBeNull();
        }
    );

    it("updatePrintifyOrderId updates a row inside a tx (rolls back)", async () => {
        const orderNumber = `ord-${Date.now()}`;
        const email = "buyer@example.com";

        await withTxRollback(async (t) => {
            // Ensure there is a row to update. If full schema exists, use the service insert;
            // otherwise insert a minimal row directly.
            if (HAS_FULL_SCHEMA) {
                await svc.saveOrder(
                    {
                        orderNumber,
                        storeId: "store-1",
                        email,
                        totalPrice: 2222,
                        currency: "USD",
                        shippingMethod: 1,
                        shippingCost: 200,
                        shippingAddress: {},
                        items: [],
                        stripePaymentId: "pi_x",
                        paymentStatus: "paid",
                        orderStatus: "created",
                    },
                    t
                );
            } else {
                await t.none(
                    `
            INSERT INTO orders.printifyorders (
              order_number, store_id, email, total_price, currency,
              shipping_method, shipping_cost
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
                    [orderNumber, "store-1", email, 2222, "USD", 1, 200]
                );
            }

            const updatedId = await svc.updatePrintifyOrderId(
                orderNumber,
                "po_real",
                t
            );
            expect(Number(updatedId)).toBeGreaterThan(0);

            const fetched = await svc.getOrderByCustomer(orderNumber, email, t);
            expect(fetched?.printify_order_id).toBe("po_real");
        });

        // After rollback, there should be no lasting side-effects
        const outside = await svc.getOrderByCustomer(orderNumber, email);
        expect(outside).toBeNull();
    });
});
