import createPrintifyRouter from "./printifyRoutes";
import { createPrintifyController } from "../controllers/printifyController";
import { PrintifyService } from "../services/printifyService"; // <- use the correct class name
import { PgOrderService } from "../services/orderService";
import { NodeMailerEmailService } from "../services/emailService";
import db from "../db/connection";
import { STORE_EMAILS } from "../config/storeEmails";

/**
 * Reads a required environment variable or throws at startup.
 *
 * @param {string} key - Environment variable name.
 * @returns {string} The non-empty environment value.
 * @throws {Error} If the variable is missing.
 */
function requireEnv(key: string): string {
    const v = process.env[key];
    if (!v) throw new Error(`${key} is missing`);
    return v;
}

// --- Composition root: build concrete services and controller ---
const printify = new PrintifyService(requireEnv("PRINTIFY_API_KEY"));
const orders = new PgOrderService(db);
const mailer = new NodeMailerEmailService(STORE_EMAILS);

const controller = createPrintifyController(printify, orders, mailer);

// Export a fully wired router for app.ts
const router = createPrintifyRouter(controller);
export default router;
