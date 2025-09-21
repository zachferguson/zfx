import createPrintifyRouter from "./printifyRoutes";
import { createPrintifyController } from "../controllers/printifyController";
import { PrintifyService } from "../services/printifyService"; // <- use the correct class name
import { PgOrderService } from "../services/orderService";
import { NodeMailerEmailService } from "../services/emailService";
import db from "../db/connection";
import { STORE_EMAILS } from "../config/storeEmails";
import requireEnv from "../utils/requireEnv";

// --- Composition root: build concrete services and controller ---
const printify = new PrintifyService(requireEnv("PRINTIFY_API_KEY"));
const orders = new PgOrderService(db);
const mailer = new NodeMailerEmailService(STORE_EMAILS);

const controller = createPrintifyController(printify, orders, mailer);

// Export a fully wired router for app.ts
const router = createPrintifyRouter(controller);
export default router;
