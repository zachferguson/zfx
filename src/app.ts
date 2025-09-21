import express from "express";
import cors from "cors";

import zachtothegymRoutes from "./routes/zachtothegymRoutes.wired";
import printifyRoutes from "./routes/printifyRoutes.wired";
import authenticationRoutes from "./routes/authenticationRoutes.wired";
import paymentRoutes from "./routes/paymentRoutes.wired";

const app = express();

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

export default app;
