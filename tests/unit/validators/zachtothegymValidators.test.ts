import { describe, it, expect } from "vitest";
import { validationResult } from "express-validator";
import {
    validateGetSingleBlogById,
    validateCreateNewBlog,
    validateGetSingleArticleById,
    validateCreateNewArticle,
    validateAddDailyMetrics,
    validateGetDailyMetrics,
} from "../../../src/validators/zachtothegymValidators";
import { ZACHTOTHEGYM_ERRORS } from "../../../src/config/zachtothegymErrors";
import { Request } from "express";

/**
 * @file Unit tests for zachtothegymValidators.
 *
 * These tests verify each validator chain by executing it against mocked Express request objects and
 * asserting the resulting validationResult along with expected error messages from ZACHTOTHEGYM_ERRORS.
 *
 * Scenarios covered:
 * - validateGetSingleBlogById: accepts positive integer id; rejects missing/invalid id (INVALID_BLOG_ID)
 * - validateCreateNewBlog: accepts title+content; rejects missing fields (MISSING_BLOG_FIELDS)
 * - validateGetSingleArticleById: accepts positive integer id; rejects missing/invalid id (INVALID_ARTICLE_ID)
 * - validateCreateNewArticle: accepts title/summary/content/categories; rejects missing fields (MISSING_ARTICLE_FIELDS)
 * - validateAddDailyMetrics: accepts date; rejects missing date (MISSING_METRICS_DATE)
 * - validateGetDailyMetrics: accepts start/end range; rejects missing/empty range (MISSING_METRICS_RANGE)
 */

describe("zachtothegymValidators (unit)", () => {
    /**
     * Helper to create a mock Express Request with optional params, body, and query.
     */
    function mockReq({
        params = {},
        body = {},
        query = {},
    }: { params?: any; body?: any; query?: any } = {}): Request {
        return { params, body, query } as Request;
    }

    /**
     * Helper to run a validator chain on a mock request and return the validationResult.
     */
    async function runValidation(chain: Array<any>, req: Request) {
        for (const validator of chain) {
            await validator.run(req);
        }
        return validationResult(req);
    }

    describe("validateGetSingleBlogById", () => {
        it("accepts valid id", async () => {
            const req = mockReq({ params: { id: "1" } });
            const result = await runValidation(validateGetSingleBlogById, req);
            expect(result.isEmpty()).toBe(true);
        });
        it("rejects missing or invalid id", async () => {
            const req = mockReq({ params: { id: "0" } });
            const result = await runValidation(validateGetSingleBlogById, req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array()[0].msg).toBe(
                ZACHTOTHEGYM_ERRORS.INVALID_BLOG_ID
            );
        });
    });

    describe("validateCreateNewBlog", () => {
        it("accepts valid body", async () => {
            const req = mockReq({ body: { title: "t", content: "c" } });
            const result = await runValidation(validateCreateNewBlog, req);
            expect(result.isEmpty()).toBe(true);
        });
        it("rejects missing fields", async () => {
            const req = mockReq({ body: { title: "" } });
            const result = await runValidation(validateCreateNewBlog, req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array()[0].msg).toBe(
                ZACHTOTHEGYM_ERRORS.MISSING_BLOG_FIELDS
            );
        });
    });

    describe("validateGetSingleArticleById", () => {
        it("accepts valid id", async () => {
            const req = mockReq({ params: { id: "2" } });
            const result = await runValidation(
                validateGetSingleArticleById,
                req
            );
            expect(result.isEmpty()).toBe(true);
        });
        it("rejects missing or invalid id", async () => {
            const req = mockReq({ params: { id: "-1" } });
            const result = await runValidation(
                validateGetSingleArticleById,
                req
            );
            expect(result.isEmpty()).toBe(false);
            expect(result.array()[0].msg).toBe(
                ZACHTOTHEGYM_ERRORS.INVALID_ARTICLE_ID
            );
        });
    });

    describe("validateCreateNewArticle", () => {
        it("accepts valid body", async () => {
            const req = mockReq({
                body: {
                    title: "t",
                    summary: "s",
                    content: "c",
                    categories: ["cat"],
                },
            });
            const result = await runValidation(validateCreateNewArticle, req);
            expect(result.isEmpty()).toBe(true);
        });
        it("rejects missing fields", async () => {
            const req = mockReq({
                body: { title: "", summary: "", content: "", categories: [] },
            });
            const result = await runValidation(validateCreateNewArticle, req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array()[0].msg).toBe(
                ZACHTOTHEGYM_ERRORS.MISSING_ARTICLE_FIELDS
            );
        });
    });

    describe("validateAddDailyMetrics", () => {
        it("accepts valid date", async () => {
            const req = mockReq({ body: { date: "2025-09-07" } });
            const result = await runValidation(validateAddDailyMetrics, req);
            expect(result.isEmpty()).toBe(true);
        });
        it("rejects missing date", async () => {
            const req = mockReq({ body: { date: "" } });
            const result = await runValidation(validateAddDailyMetrics, req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array()[0].msg).toBe(
                ZACHTOTHEGYM_ERRORS.MISSING_METRICS_DATE
            );
        });
    });

    describe("validateGetDailyMetrics", () => {
        it("accepts valid range", async () => {
            const req = mockReq({
                query: { start: "2025-09-01", end: "2025-09-07" },
            });
            const result = await runValidation(validateGetDailyMetrics, req);
            expect(result.isEmpty()).toBe(true);
        });
        it("rejects missing start or end", async () => {
            const req = mockReq({ query: { start: "", end: "" } });
            const result = await runValidation(validateGetDailyMetrics, req);
            expect(result.isEmpty()).toBe(false);
            expect(result.array()[0].msg).toBe(
                ZACHTOTHEGYM_ERRORS.MISSING_METRICS_RANGE
            );
        });
    });
});
