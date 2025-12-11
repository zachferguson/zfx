import { createPaymentRouter } from "./paymentRoutes";
import { createPaymentController } from "../controllers/paymentController";
import { StripeService } from "../services/stripeService";

// Resolve env secrets by store (extend as needed)
const service = new StripeService((storeId) => {
    switch (storeId) {
        case "developerhorizon":
            return process.env.STRIPE_SECRET_DEVELOPERHORIZON;
        default:
            return undefined;
    }
});

const controller = createPaymentController(service);
/** Fully wired payment router (ready for `app.use`). */
const router = createPaymentRouter(controller);
export default router;
