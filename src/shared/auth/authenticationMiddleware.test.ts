import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { authenticateToken } from "./authenticationMiddleware";

// Helper to create mock req/res/next
function getMockReqRes(token?: string) {
    const req = {
        headers: token ? { authorization: `Bearer ${token}` } : {},
    } as Partial<Request>;
    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn();
    return { req, res, next };
}

describe("authenticateToken middleware", () => {
    const userPayload = { id: 1, username: "testuser" };
    const SECRET_KEY = process.env.JWT_SECRET || "default_secret";
    let token: string;

    beforeEach(() => {
        vi.clearAllMocks();
        token = jwt.sign(userPayload, SECRET_KEY);
    });

    it("calls next and attaches user if token is valid", () => {
        const { req, res, next } = getMockReqRes(token);
        authenticateToken(req as any, res, next);
        expect(next).toHaveBeenCalled();
        expect((req as any).user).toEqual(expect.objectContaining(userPayload));
    });

    it("returns 401 if token is missing", () => {
        const { req, res, next } = getMockReqRes();
        authenticateToken(req as any, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            message: "Access token is missing.",
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("returns 403 if token is invalid", () => {
        const { req, res, next } = getMockReqRes("badtoken");
        authenticateToken(req as any, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            message: "Invalid or expired token.",
        });
        expect(next).not.toHaveBeenCalled();
    });
});
