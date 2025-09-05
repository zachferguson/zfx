export interface CreatePaymentIntentRequest {
    storeId: string;
    amount: number;
    currency: string;
}
