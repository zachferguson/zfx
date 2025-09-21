import { createAuthenticationRouter } from "./authenticationRoutes";
import { createAuthenticationController } from "../controllers/authenticationController";
import { AuthenticationService } from "../services/authenticationService";
import { createAuthMiddleware } from "../middleware/authenticationMiddleware";
import db from "../db/connection";

function requireEnv(key: string): string {
    const v = process.env[key];
    if (!v) {
        // In tests, provide sensible defaults so importing app doesn't crash
        if (process.env.NODE_ENV === "test") {
            if (key === "JWT_SECRET") return "test-secret";
            if (key === "BCRYPT_SALT_ROUNDS") return "10";
        }
        throw new Error(`${key} is missing`);
    }
    return v;
}

const jwtSecret = requireEnv("JWT_SECRET");
const rounds = parseInt(requireEnv("BCRYPT_SALT_ROUNDS"), 10);

const authService = new AuthenticationService(db, jwtSecret, rounds);
const controller = createAuthenticationController(authService);
const mw = createAuthMiddleware(jwtSecret);
const router = createAuthenticationRouter(controller, mw);
export default router;
