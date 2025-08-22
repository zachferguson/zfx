import express, { Request, Response } from "express";
import {
    getOrderStatus,
    getProducts,
    getShippingOptions,
    submitOrder,
} from "../controllers/printifyController";

const router = express.Router();

router.get("/:id/products", getProducts);
router.post("/:id/shipping-options", async (req: Request, res: Response) => {
    await getShippingOptions(req, res);
});
router.post("/submit-order", (req: Request, res: Response) => {
    submitOrder(req, res);
});
router.post("/order-status", (req: Request, res: Response) => {
    getOrderStatus(req, res);
});

export default router;
