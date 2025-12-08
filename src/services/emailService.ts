import nodemailer, { Transporter, TransportOptions } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { escapeHtml } from "../utils/html";
import {
    OrderConfirmationPayload,
    EmailSendResult,
    StoreEmailConfigMap,
    StoreEmailConfig,
} from "../types/email";

/**
 * Interface for sending transactional emails.
 */
export interface IEmailService {
    /**
     * Sends an order confirmation email.
     *
     * @param {Object} input - The send parameters.
     * @param {string} input.storeId - The store identifier (used to pick config).
     * @param {string} input.to - Recipient email address.
     * @param {string} input.orderNumber - The external order identifier.
     * @param {OrderConfirmationPayload} input.payload - Order summary details for the email body.
     * @returns {Promise<EmailSendResult>} Success flag and optional provider message ID or error message.
     */
    sendOrderConfirmation(input: {
        storeId: string;
        to: string;
        orderNumber: string;
        payload: OrderConfirmationPayload;
    }): Promise<EmailSendResult>;
}

/**
 * Factory for creating a Nodemailer transporter.
 *
 * Use `{ jsonTransport: true }` in tests to avoid network calls.
 */
// Return a transporter whose sendMail resolves to unknown to avoid implicit any
// and force safe narrowing when reading provider-specific fields like messageId.
export type TransportFactory = (opts: TransportOptions) => Transporter<unknown>;

/**
 * Optional dependency overrides for testing and environment control.
 */
export type EmailDeps = {
    /**
     * Custom transport factory (defaults to `nodemailer.createTransport`).
     */
    createTransport?: TransportFactory;
    /**
     * Transport options override. Provide `jsonTransport: true` for tests,
     * or a full SMTP options object for production/staging.
     */
    transportOptions?: TransportOptions;
    /**
     * Logger used for errors and diagnostics (defaults to `console`).
     */
    logger?: Pick<Console, "error" | "log">;
};

/**
 * Safely extract a messageId string from a provider-specific sendMail response.
 * @param info
 * @returns {string | undefined} The messageId if present and valid, otherwise undefined.
 */
const getMessageId = (info: unknown): string | undefined => {
    if (info && typeof info === "object" && "messageId" in info) {
        const maybeId = (info as { messageId?: unknown }).messageId;
        return typeof maybeId === "string" ? maybeId : undefined;
    }
    return undefined;
};

/**
 * Formats a number of cents as a localized currency string.
 *
 * @param {number} amountCents - The amount in cents.
 * @param {string} currency - ISO currency code (e.g., "USD").
 * @param {string} [locale="en-US"] - BCP 47 locale for formatting (e.g., "en-US").
 * @returns {string} The formatted currency string (e.g., "$10.00").
 */
export const formatMoney = (
    amountCents: number,
    currency: string,
    locale = "en-US"
) =>
    new Intl.NumberFormat(locale, { style: "currency", currency }).format(
        amountCents / 100
    );

/**
 * Maps a shipping method to a human-readable label.
 *
 * If a string is provided, it is returned as-is. If a number is provided,
 * a default mapping is used with a reasonable fallback.
 *
 * @param {number | string} idOrLabel - Numeric method ID or pre-labeled string.
 * @returns {string} Human-friendly label for the shipping method.
 */
export const shippingMethodLabel = (idOrLabel: number | string) => {
    if (typeof idOrLabel === "string") return idOrLabel;
    const map: Record<number, string> = { 1: "Standard", 2: "Express" };
    return map[idOrLabel] ?? `Method #${idOrLabel}`;
};

/**
 * Builds the email envelope (from/to/subject) and both text + HTML bodies
 * for a given order confirmation. This function is **pure** (no I/O).
 *
 * @param {Object} params - Parameters for composing the email.
 * @param {StoreEmailConfig} params.storeConfig - Store-specific email configuration.
 * @param {string} params.toEmail - Recipient email address.
 * @param {string} params.orderId - External order identifier to display and track.
 * @param {OrderConfirmationPayload} params.payload - Order summary used to render the email.
 * @returns {{ ok: true, mail: { from: string, to: string, subject: string, text: string, html: string } } | { ok: false, error: string }}
 *          On success, returns a complete message object ready for `transporter.sendMail`.
 *          On failure, returns an error explaining the missing or invalid configuration.
 */
export const composeOrderConfirmationEmail = (params: {
    storeConfig: StoreEmailConfig;
    toEmail: string;
    orderId: string;
    payload: OrderConfirmationPayload;
}): EmailComposeSuccess | EmailComposeFailure => {
    const { storeConfig, toEmail, orderId, payload } = params;

    if (!storeConfig.user) {
        return { ok: false, error: `Email config missing "user"` };
    }

    // Build safe tracking URL (?orderId=...&email=...)
    const url = new URL("/order-status", storeConfig.frontendUrl);
    url.search = new URLSearchParams({ orderId, email: toEmail }).toString();

    // Build address block
    const address = payload.address;
    const addressHtml = `
    ${escapeHtml(address.first_name)} ${escapeHtml(address.last_name)}<br/>
    ${escapeHtml(address.address1)}${
        address.address2 ? `<br/>${escapeHtml(address.address2)}` : ""
    }<br/>
    ${escapeHtml(address.city)}, ${escapeHtml(address.region)} ${escapeHtml(
        address.zip
    )}<br/>
    ${escapeHtml(address.country)}${
        address.phone ? `<br/>${escapeHtml(address.phone)}` : ""
    }
  `;

    // Items table
    const itemsRowsHtml = payload.items
        .map((item) => {
            const lineTotal = item.price * item.quantity;
            return `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(
              item.title
          )}</td>
          <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(
              item.variant_label
          )}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">${
              item.quantity
          }</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatMoney(
              item.price,
              payload.currency,
              storeConfig.locale
          )}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatMoney(
              lineTotal,
              payload.currency,
              storeConfig.locale
          )}</td>
        </tr>`;
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
    </table>`;

    const shippingLabel = shippingMethodLabel(payload.shippingMethod);
    const totalFormatted = formatMoney(
        payload.totalPrice,
        payload.currency,
        storeConfig.locale
    );

    const textItems = payload.items
        .map(
            (item) =>
                `- ${item.title} (${item.variant_label}) x${
                    item.quantity
                } @ ${formatMoney(
                    item.price,
                    payload.currency,
                    storeConfig.locale
                )} = ${formatMoney(
                    item.price * item.quantity,
                    payload.currency,
                    storeConfig.locale
                )}`
        )
        .join("\n");

    const textAddress = [
        `${address.first_name} ${address.last_name}`,
        address.address1,
        address.address2,
        `${address.city}, ${address.region} ${address.zip}`,
        address.country,
        address.phone ? address.phone : undefined,
    ]
        .filter(Boolean)
        .join("\n");

    const mail = {
        from: `"${storeConfig.storeName} Orders" <${storeConfig.user}>`,
        to: toEmail,
        subject: `${storeConfig.storeName} Order Confirmation - ${orderId}`,
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
      </p>`,
    };

    return { ok: true, mail };
};

/**
 * Successful result of composing an order confirmation email.
 */
export type EmailComposeSuccess = {
    /** Indicates composition succeeded. */
    ok: true;
    /** Fully composed message compatible with Nodemailer `sendMail`. */
    mail: {
        /** Sender address (formatted). */
        from: string;
        /** Recipient address. */
        to: string;
        /** Email subject. */
        subject: string;
        /** Plain-text body. */
        text: string;
        /** HTML body. */
        html: string;
    };
};

/**
 * Failure result of composing an order confirmation email.
 */
export type EmailComposeFailure = {
    /** Indicates composition failed. */
    ok: false;
    /** Error explaining why composition failed. */
    error: string;
};

/**
 * Nodemailer-backed email service implementation.
 *
 * This class composes order confirmation emails using store configuration
 * and sends them via a configured Nodemailer transport.
 */
export class NodeMailerEmailService implements IEmailService {
    private readonly createTransport: TransportFactory;
    private readonly logger: Pick<Console, "error" | "log">;
    private readonly transportOptions?: TransportOptions | undefined;

    /**
     * Creates a new NodeMailerEmailService.
     *
     * @param {StoreEmailConfigMap} stores - Map of store IDs to email configuration.
     * @param {EmailDeps} [deps] - Optional dependencies for testing and environment overrides.
     */
    constructor(
        private readonly stores: StoreEmailConfigMap,
        deps: EmailDeps = {}
    ) {
        this.createTransport =
            deps.createTransport ?? nodemailer.createTransport;
        this.transportOptions = deps.transportOptions;
        this.logger = deps.logger ?? console;
    }

    /**
     * @inheritdoc
     */
    async sendOrderConfirmation(input: {
        storeId: string;
        to: string;
        orderNumber: string;
        payload: OrderConfirmationPayload;
    }): Promise<EmailSendResult> {
        const { storeId, to, orderNumber, payload } = input;

        const storeConfig = this.stores[storeId];
        if (!storeConfig) {
            return {
                success: false,
                error: `No email config for store: ${storeId}`,
            };
        }
        if (!storeConfig.user || !storeConfig.pass) {
            return {
                success: false,
                error: `Email credentials missing for store: ${storeId}`,
            };
        }

        const composed = composeOrderConfirmationEmail({
            storeConfig,
            toEmail: to,
            orderId: orderNumber,
            payload,
        });

        if (!composed.ok) {
            this.logger.error(composed.error);
            return { success: false, error: composed.error };
        }

        // Choose transport options (respect injected overrides for tests)
        const defaultTransportOptions: SMTPTransport.Options = {
            host: "mail." + storeConfig.user.split("@")[1],
            port: 465,
            secure: true,
            auth: { user: storeConfig.user, pass: storeConfig.pass },
        };

        const resolvedTransportOptions: TransportOptions =
            this.transportOptions ?? defaultTransportOptions;

        try {
            const transporter = this.createTransport(resolvedTransportOptions);
            const info: unknown = await transporter.sendMail(composed.mail);
            const messageId = getMessageId(info);
            return messageId ? { success: true, messageId } : { success: true };
        } catch (err: unknown) {
            this.logger.error("Error sending email:", err);
            const message =
                err instanceof Error
                    ? err.message
                    : typeof err === "string"
                      ? err
                      : "Unknown error";
            return { success: false, error: message };
        }
    }
}
