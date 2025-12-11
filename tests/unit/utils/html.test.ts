import { describe, it, expect } from "vitest";
import { escapeHtml } from "../../../src/utils/html";

describe("escapeHtml (unit)", () => {
    it("escapes all special HTML characters", () => {
        expect(escapeHtml("<div>& ' \" </div>")).toBe(
            "&lt;div&gt;&amp; &#39; &quot; &lt;/div&gt;"
        );
    });
    it("returns the same string if no special chars", () => {
        expect(escapeHtml("hello world")).toBe("hello world");
    });
    it("escapes only the correct characters", () => {
        expect(escapeHtml("a&b<c>d'e\"f")).toBe(
            "a&amp;b&lt;c&gt;d&#39;e&quot;f"
        );
    });
    it("handles empty string", () => {
        expect(escapeHtml("")).toBe("");
    });
});
