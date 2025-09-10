// src/services/emailService.ts
import nodemailer, { Transporter } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import dotenv from "dotenv";
import { STORE_EMAILS } from "../config/storeEmails";
import { escapeHtml } from "../utils/html";

dotenv.config();

export type OrderEmailItem = {
    title: string;
    variant_label: string;
    quantity: number;
    // price per item charged to the customer (in cents)
    price: number;
};

export type OrderEmailAddress = {
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
    totalPrice: number; // in cents
    currency: string; // e.g. "USD"
};

export type TransportFactory = (
    opts: SMTPTransport.Options
) => Transporter<SMTPTransport.SentMessageInfo>;

export interface EmailDeps {
    createTransport?: TransportFactory;
    // Allow either SMTP options or jsonTransport for test runs
    transportOptions?: SMTPTransport.Options | { jsonTransport: true };
    logger?: Pick<Console, "error" | "log">;
}

/**
 * Formats a number as currency using the specified currency code.
 * The input is assumed to be in **cents**.
 *
 * @param {number} amount - The amount in cents.
 * @param {string} currency - The currency code (e.g., 'USD').
 * @returns {string} The formatted currency string.
 */
export const formatMoney = (amount: number, currency: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
        amount / 100 // assuming cents
    );

/**
 * Maps a shipping method ID to a human-readable label.
 *
 * @param {number} id - The numeric shipping method ID (e.g., from Printify).
 * @returns {string} The human-friendly label for the shipping method.
 */
export const shippingMethodLabel = (id: number) => {
    // Stub: customize to your Printify mapping if you have one
    const map: Record<number, string> = {
        1: "Standard",
        2: "Express",
    };
    return map[id] || `Method #${id}`;
};

/**
 * Builds the email envelope (from/to/subject) and both text + HTML bodies
 * for a given order confirmation. This function is **pure** (no I/O).
 *
 * @param {string} storeId - The store identifier used to look up config.
 * @param {string} toEmail - The recipient's email address.
 * @param {string} orderId - The order identifier to display and track.
 * @param {OrderEmailSummary} summary - The summary of the order.
 * @returns {{
 *   ok: true,
 *   mail: {
 *     from: string,
 *     to: string,
 *     subject: string,
 *     text: string,
 *     html: string
 *   }
 * } | {
 *   ok: false,
 *   error: string
 * }} Object indicating success and the composed mail, or an error if config is missing.
 */
export function composeOrderConfirmationEmail(
    storeId: string,
    toEmail: string,
    orderId: string,
    summary: OrderEmailSummary
):
    | {
          ok: true;
          mail: {
              from: string;
              to: string;
              subject: string;
              text: string;
              html: string;
          };
      }
    | { ok: false; error: string } {
    const emailConfig = STORE_EMAILS[storeId];
    if (!emailConfig) {
        return {
            ok: false,
            error: `No email configuration found for store: ${storeId}`,
        };
    }
    if (!emailConfig.user) {
        return {
            ok: false,
            error: `Email configuration missing "user" for store: ${storeId}`,
        };
    }

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

    const mail = {
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

    return { ok: true, mail };
}

/**
 * Sends an order confirmation email to the customer for a given store and order.
 * This is the **I/O boundary**: it composes the message and then sends via nodemailer.
 *
 * Testability hooks:
 *  - Inject a custom transporter via `deps.createTransport` or `deps.transportOptions`.
 *  - Inject a test logger via `deps.logger`.
 *
 * @param {string} storeId - The store identifier.
 * @param {string} toEmail - The recipient's email address.
 * @param {string} orderId - The order identifier.
 * @param {OrderEmailSummary} summary - The summary of the order.
 * @param {EmailDeps} [deps] - Optional dependencies for testability and environment overrides.
 * @returns {Promise<{ success: boolean; error?: string; messageId?: string }>} The result of the email send attempt.
 */
export const sendOrderConfirmation = async (
    storeId: string,
    toEmail: string,
    orderId: string,
    summary: OrderEmailSummary,
    deps: EmailDeps = {}
): Promise<{ success: boolean; error?: string; messageId?: string }> => {
    const logger = deps.logger ?? console;

    // Compose (pure)
    const composed = composeOrderConfirmationEmail(
        storeId,
        toEmail,
        orderId,
        summary
    );
    if (!("ok" in composed) || !composed.ok) {
        logger.error(composed.error);
        return { success: false, error: composed.error };
    }

    // Transport selection
    const emailConfig = STORE_EMAILS[storeId];
    const defaultTransportOpts: SMTPTransport.Options =
        (deps.transportOptions as SMTPTransport.Options) ?? {
            host: "mail." + emailConfig.user.split("@")[1],
            port: 465,
            secure: true,
            auth: {
                user: emailConfig.user,
                pass: emailConfig.pass,
            },
        };

    const createTransport = deps.createTransport ?? nodemailer.createTransport;
    const transporter = createTransport(
        (deps.transportOptions ?? defaultTransportOpts) as SMTPTransport.Options
    );

    try {
        const transporter = createTransport(defaultTransportOpts);
        const info = await transporter.sendMail(composed.mail);
        return { success: true, messageId: info.messageId };
    } catch (error: unknown) {
        logger.error("Error sending email:", error);
        let errorMessage = "An unknown error occurred.";
        if (error instanceof Error) errorMessage = error.message;
        else if (typeof error === "string") errorMessage = error;
        return { success: false, error: errorMessage };
    }
};
