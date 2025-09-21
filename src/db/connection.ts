import pgPromise, { IDatabase, IMain } from "pg-promise";
import dotenv from "dotenv";

// Allow .env usage locally/dev; harmless if not present in CI.
dotenv.config();

// Create pg-promise main instance once; actual DB connection is deferred.
const pgp: IMain = pgPromise({});

let dbInstance: IDatabase<unknown> | null = null;

function initDb(): IDatabase<unknown> {
    if (dbInstance) return dbInstance;

    const {
        DATABASE_HOST,
        DATABASE_PORT,
        DATABASE_NAME,
        DATABASE_USER,
        DATABASE_PASSWORD,
    } = process.env;

    if (
        !DATABASE_HOST ||
        !DATABASE_NAME ||
        !DATABASE_USER ||
        !DATABASE_PASSWORD
    ) {
        // Defer throwing until the first actual DB usage to avoid import-time failures in tests/CI.
        throw new Error("Missing required database environment variables.");
    }

    dbInstance = pgp({
        host: DATABASE_HOST,
        port: parseInt(DATABASE_PORT || "5432", 10),
        database: DATABASE_NAME,
        user: DATABASE_USER,
        password: DATABASE_PASSWORD,
    });

    return dbInstance;
}

// Export a lazy proxy that looks like a pg-promise IDatabase. Accessing any
// property/method will initialize the real connection on-demand.
const handler: ProxyHandler<IDatabase<unknown>> = {
    get(_target, prop) {
        const real = initDb();
        const value = (real as unknown as Record<PropertyKey, unknown>)[
            prop as PropertyKey
        ];
        if (typeof value === "function") {
            const fn = value as (...args: unknown[]) => unknown;
            return (...args: unknown[]) => fn.apply(real, args);
        }
        return value;
    },
};

const dbProxy: IDatabase<unknown> = new Proxy(
    {} as IDatabase<unknown>,
    handler
);

export default dbProxy;
