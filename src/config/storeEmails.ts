/**
 * Single store email configuration entry.
 */
export type StoreEmailEntry = {
    /** Human-readable store name. */
    storeName: string;
    /** SMTP user for sending emails. */
    user: string;
    /** SMTP password or token pulled from env. */
    pass: string;
    /** Frontend URL used for links in emails. */
    frontendUrl: string;
};

/**
 * Email configuration per store ID.
 *
 * Used by: `emailService`
 */
export const STORE_EMAILS: Record<string, StoreEmailEntry> = {
    20416540: {
        // Developer Horizon
        storeName: "Developer Horizon",
        user: "orders@developerhorizon.com",
        pass: process.env.DEVELOPERHORIZON_SMTP_PASS || "",
        frontendUrl: "https://developerhorizon.com",
    },
    // eaglenationapparel: {
    //     user: "orders@eaglenationapparel.com",
    //     pass: process.env.EAGLENATIONAPPAREL_SMTP_PASS || "",
    // },
};
