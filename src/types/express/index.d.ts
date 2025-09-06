import { UserWithoutPassword } from "../user";

// Extend Express Request to include user

declare module "express-serve-static-core" {
    interface Request {
        user?: UserWithoutPassword;
    }
}
