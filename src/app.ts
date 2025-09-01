import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import zachtothegymRoutes from "./routes/zachtothegymRoutes";
import printifyRoutes from "./routes/printifyRoutes";
import authenticationRoutes from "./routes/authenticationRoutes";
import paymentRoutes from "./routes/paymentRoutes";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

const allowedOrigins = [
    "https://www.developerhorizon.com",
    "https://developerhorizon.com",
    "https://zachtothegym.com",
    "https://zfxapi.com",
    "http://localhost:5173",
];

// middleware
app.use(
    cors({
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "DELETE"],
    })
);
app.use(express.json());

// routes
app.use("/auth", authenticationRoutes);
app.use("/zachtothegym", zachtothegymRoutes);
app.use("/printify", printifyRoutes);
app.use("/payments", paymentRoutes);
//app.use("/pawtomatics", require("./routes/pawtomaticsRoutes").default);
//app.use(
//    "/zachariahferguson",
//    require("./routes/zachariahfergusonRoutes").default
//);

// health endpoint to test
app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
});

// only listen when not running tests
if (process.env.NODE_ENV !== "test") {
    app.listen(port, () => {
        // eslint-disable-next-line no-console
        console.log(`Server is running on port ${port}`);
    });
}

export default app;
