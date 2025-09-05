import { Router } from "express";
import { login, register } from "../controllers/authenticationController";
import { verifyToken } from "../middleware/authenticationMiddleware";

const router = Router();

// Public routes
router.post("/login", login);
router.post("/register", register);

// Protected route example
router.get("/profile", verifyToken, (req, res) => {
    res.json({ message: "Protected route accessed", user: (req as any).user });
});

export default router;
