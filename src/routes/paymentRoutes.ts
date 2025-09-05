import express, { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { handleCreatePaymentIntent } from "../controllers/paymentController";
import { CreatePaymentIntentRequest } from "../types/createPaymentIntentRequest";

const router = express.Router();

router.post(
    "/create-payment-intent",
    [
        body("storeId").notEmpty().withMessage("Missing storeId"),
        body("amount").notEmpty().withMessage("Missing amount"),
        body("currency").notEmpty().withMessage("Missing currency"),
    ],
    (
        req: Request<any, any, CreatePaymentIntentRequest>,
        res: Response,
        next: NextFunction
    ) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }
        next();
    },
    handleCreatePaymentIntent
);

export default router;
