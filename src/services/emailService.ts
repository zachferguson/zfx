// services/emailService.ts

import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { STORE_EMAILS } from "../config/storeEmails";
import { escapeHtml } from "../utils/html";

dotenv.config();

type OrderEmailItem = {
    title: string;
    variant_label: string;
    quantity: number;
    // price per item charged to the customer
    price: number;
};

type OrderEmailAddress = {
    first_name: string;
    last_name: string;
    phone?: string;
    country: string;
    region: string;
    city: string;
    address1: string;
    address2?: string;
    zip: string;
};

export type OrderEmailSummary = {
    address: OrderEmailAddress;
    items: OrderEmailItem[];
    shippingMethod: number; // you can map this to a human label if you want
    totalPrice: number;
    currency: string; // e.g. "USD"
};

/**
 * Formats a number as currency using the specified currency code.
 * @param {number} amount - The amount in cents.
 * @param {string} currency - The currency code (e.g., 'USD').
 * @returns {string} The formatted currency string.
 */
const formatMoney = (amount: number, currency: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
        amount / 100 // assuming cents
    );

// Optional: translate your numeric shipping method to a label

/**
 * Maps a shipping method ID to a human-readable label.
 * @param {number} id - The shipping method ID.
 * @returns {string} The label for the shipping method.
 */
const shippingMethodLabel = (id: number) => {
    // Stub: customize to your Printify mapping if you have one
    const map: Record<number, string> = {
        1: "Standard",
        2: "Express",
    };
    return map[id] || `Method #${id}`;
};

/**
 * Sends an order confirmation email to the customer for a given store and order.
 * @param {string} storeId - The store identifier.
 * @param {string} toEmail - The recipient's email address.
 * @param {string} orderId - The order identifier.
 * @param {OrderEmailSummary} summary - The summary of the order.
 * @returns {Promise<{ success: boolean; error?: string; messageId?: string }>} The result of the email send attempt.
 */
export const sendOrderConfirmation = async (
    storeId: string,
    toEmail: string,
    orderId: string,
    summary: OrderEmailSummary
): Promise<{ success: boolean; error?: string; messageId?: string }> => {
    const emailConfig = STORE_EMAILS[storeId];

    if (!emailConfig || !emailConfig.user || !emailConfig.pass) {
        console.error(`No email configuration found for store: ${storeId}`);
        return { success: false, error: "Email configuration missing." };
    }

    const transporter = nodemailer.createTransport({
        host: "mail." + emailConfig.user.split("@")[1],
        port: 465,
        secure: true,
        auth: {
            user: emailConfig.user,
            pass: emailConfig.pass,
        },
    });

    // Build safe tracking URL (?orderId=...&email=...)
    const url = new URL("/order-status", emailConfig.frontendUrl);
    url.search = new URLSearchParams({
        orderId: orderId,
        email: toEmail,
    }).toString();

    // Build address block
    const a = summary.address;
    const addressHtml = `
    ${escapeHtml(a.first_name)} ${escapeHtml(a.last_name)}<br/>
    ${escapeHtml(a.address1)}${
        a.address2 ? `<br/>${escapeHtml(a.address2)}` : ""
    }<br/>
    ${escapeHtml(a.city)}, ${escapeHtml(a.region)} ${escapeHtml(a.zip)}<br/>
    ${escapeHtml(a.country)}${a.phone ? `<br/>${escapeHtml(a.phone)}` : ""}
  `;

    // Items table
    const itemsRowsHtml = summary.items
        .map((it) => {
            const lineTotal = it.price * it.quantity;
            return `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(
              it.title
          )}</td>
          <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(
              it.variant_label
          )}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">${
              it.quantity
          }</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatMoney(
              it.price,
              summary.currency
          )}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatMoney(
              lineTotal,
              summary.currency
          )}</td>
        </tr>
      `;
        })
        .join("");

    const itemsTableHtml = `
    <table style="border-collapse:collapse;width:100%;margin-top:8px;">
      <thead>
        <tr>
          <th style="padding:8px;border:1px solid #ddd;text-align:left;">Item</th>
          <th style="padding:8px;border:1px solid #ddd;text-align:left;">Variant</th>
          <th style="padding:8px;border:1px solid #ddd;text-align:center;">Qty</th>
          <th style="padding:8px;border:1px solid #ddd;text-align:right;">Price</th>
          <th style="padding:8px;border:1px solid #ddd;text-align:right;">Line Total</th>
        </tr>
      </thead>
      <tbody>${itemsRowsHtml}</tbody>
    </table>
  `;

    const shippingLabel = shippingMethodLabel(summary.shippingMethod);
    const totalFormatted = formatMoney(summary.totalPrice, summary.currency);

    const textItems = summary.items
        .map(
            (it) =>
                `- ${it.title} (${it.variant_label}) x${
                    it.quantity
                } @ ${formatMoney(it.price, summary.currency)} = ${formatMoney(
                    it.price * it.quantity,
                    summary.currency
                )}`
        )
        .join("\n");

    const textAddress = [
        `${a.first_name} ${a.last_name}`,
        a.address1,
        a.address2,
        `${a.city}, ${a.region} ${a.zip}`,
        a.country,
        a.phone ? a.phone : undefined,
    ]
        .filter(Boolean)
        .join("\n");

    const mailOptions = {
        from: `"${emailConfig.storeName} Orders" <${emailConfig.user}>`,
        to: toEmail,
        subject: `${emailConfig.storeName} Order Confirmation - ${orderId}`,
        text: `Thank you for your order!

Your order ID is ${orderId}.

Track your order: ${url.toString()}

Shipping To:
${textAddress}

Items:
${textItems}

Shipping Method: ${shippingLabel}
Order Total: ${totalFormatted}
`,
        html: `
      <h2>Thank you for your order!</h2>
      <p>Your order ID is <strong>${escapeHtml(orderId)}</strong>.</p>

      <p><a href="${url.toString()}">Click here</a> to view and track your order.</p>

      <h3 style="margin-bottom:4px;">Shipping To</h3>
      <p style="margin-top:0;">${addressHtml}</p>

      <h3 style="margin-bottom:4px;">Items</h3>
      ${itemsTableHtml}

      <p style="margin-top:12px;">
        <strong>Shipping Method:</strong> ${escapeHtml(shippingLabel)}<br/>
        <strong>Order Total:</strong> ${totalFormatted}
      </p>

      <p style="font-size:12px;color:#666;margin-top:16px">
        If the button doesn't work, copy &amp; paste this URL into your browser:<br/>
        <span style="word-break:break-all">${escapeHtml(url.toString())}</span>
      </p>
    `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error: unknown) {
        console.error("Error sending email:", error);
        let errorMessage = "An unknown error occurred.";
        if (error instanceof Error) errorMessage = error.message;
        else if (typeof error === "string") errorMessage = error;
        return { success: false, error: errorMessage };
    }
};
