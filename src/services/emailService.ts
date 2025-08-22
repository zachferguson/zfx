import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { STORE_EMAILS } from "../config/storeEmails";

dotenv.config();

export const sendOrderConfirmation = async (
    storeId: string,
    toEmail: string,
    orderId: string,
    orderDetails: string
) => {
    const emailConfig = STORE_EMAILS[storeId];

    if (!emailConfig || !emailConfig.user || !emailConfig.pass) {
        console.error(`❌ No email configuration found for store: ${storeId}`);
        return { success: false, error: "Email configuration missing." };
    }

    const transporter = nodemailer.createTransport({
        host: "mail." + emailConfig.user.split("@")[1], // domain
        port: 465, // Use 587 for TLS if needed
        secure: true, // True for SSL, false for TLS
        auth: {
            user: emailConfig.user,
            pass: emailConfig.pass,
        },
    });

    const mailOptions = {
        from: `"${emailConfig.storeName} Orders" <${emailConfig.user}>`,
        to: toEmail,
        subject: `${emailConfig.storeName} Order Confirmation - ${orderId}`,
        text: `Thank you for your order! Your order ID is ${orderId}.\n\nOrder Details:\n${orderDetails}`,
        html: `<h2>Thank you for your order!</h2>
           <p>Your order ID is <strong>${orderId}</strong>.</p>
           <p><a href="${emailConfig.frontendUrl}/order-status?orderId=${orderId}&email=${toEmail}">Click here</a> to view and track your order.</p>`,
    };
    // html: `<h2>Thank you for your order!</h2>
    // <p>Your order ID is <strong>${orderId}</strong>.</p>
    // <p><a href="${emailConfig.frontendUrl}/order-status?orderId=${orderId}&email=${toEmail}">Click here</a> to track your order.</p>
    // <p>Order Details:</p>
    // <pre>${orderDetails}</pre>`,  - TODO - add this back in with order item mapping

    try {
        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error: unknown) {
        console.error("❌ Error sending email:", error);

        let errorMessage = "An unknown error occurred.";

        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === "string") {
            errorMessage = error;
        }

        return { success: false, error: errorMessage };
    }
};
