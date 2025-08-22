export const STORE_EMAILS: Record<
    string,
    { storeName: string; user: string; pass: string; frontendUrl: string }
> = {
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
