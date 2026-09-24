// Provider boundary: real adapters must request and verify payment server-side.
// Amounts in this application are integer TOMAN; gateway adapters must convert explicitly.
export interface PaymentProvider {
    kind: string;
    verify(input: {
        orderId: string;
        amount: number;
        outcome: 'success' | 'cancel';
    }): Promise<{
        status: 'mock_paid' | 'cancelled';
        reference: string;
    }>;
}
export class MockPayment implements PaymentProvider {
    constructor(public kind: string) { }
    async verify(input: {
        orderId: string;
        amount: number;
        outcome: 'success' | 'cancel';
    }) { return { status: input.outcome === 'success' ? 'mock_paid' as const : 'cancelled' as const, reference: 'MOCK-' + crypto.randomUUID() }; }
}
export function paymentProvider(kind: string) { if (!['online', 'snapp'].includes(kind))
    throw Error('Invalid payment method'); return new MockPayment(kind); }
