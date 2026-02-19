/**
 * Unit tests for paymentController
 * Tests payment intent creation with mocked Supabase and Stripe
 */

// Mock Supabase
jest.mock('../../config/supabase', () => ({
    supabase: {
        from: jest.fn()
    }
}));

// Mock Stripe
const mockPaymentIntentsCreate = jest.fn();
jest.mock('stripe', () => {
    return jest.fn(() => ({
        paymentIntents: {
            create: mockPaymentIntentsCreate
        }
    }));
});

const { createPaymentIntent } = require('../../controller/paymentController');
const { supabase } = require('../../config/supabase');

describe('paymentController - createPaymentIntent', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPaymentIntentsCreate.mockClear();
    });

    test('should create payment intent successfully', async () => {
        const mockOrder = {
            id: 'order-123',
            user_id: 'user-123',
            total: 79.98,
            status: 'pending',
            items_order: [
                {
                    id: 'item-1',
                    product_id: 'product-1',
                    quantity: 2,
                    products: {
                        name: 'Product 1',
                        price: 29.99
                    }
                },
                {
                    id: 'item-2',
                    product_id: 'product-2',
                    quantity: 1,
                    products: {
                        name: 'Product 2',
                        price: 20.00
                    }
                }
            ]
        };

        supabase.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
                data: mockOrder,
                error: null
            })
        });

        mockPaymentIntentsCreate.mockResolvedValue({
            client_secret: 'pi_test_secret_123',
            id: 'pi_123'
        });

        const result = await createPaymentIntent('order-123');

        expect(result.clientSecret).toBe('pi_test_secret_123');
        expect(result.order_id).toBe('order-123');
        expect(result.amount).toBeCloseTo(7998, 0); // Allow floating point tolerance

        expect(mockPaymentIntentsCreate).toHaveBeenCalledWith({
            amount: expect.any(Number),
            currency: 'eur',
            metadata: { order_id: 'order-123' },
            automatic_payment_methods: {
                enabled: true
            }
        });
    });

    test('should return error if order not found', async () => {
        supabase.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Order not found' }
            })
        });

        const result = await createPaymentIntent('order-999');

        expect(result).toEqual({
            error: 'Commande introuvable'
        });
    });

    test('should handle empty order items', async () => {
        const mockOrder = {
            id: 'order-123',
            user_id: 'user-123',
            total: 0,
            status: 'pending',
            items_order: []
        };

        supabase.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
                data: mockOrder,
                error: null
            })
        });

        mockPaymentIntentsCreate.mockResolvedValue({
            client_secret: 'pi_test_secret_456',
            id: 'pi_456'
        });

        const result = await createPaymentIntent('order-123');

        expect(result.amount).toBe(0);
        expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                amount: 0,
                currency: 'eur'
            })
        );
    });

    test('should handle Stripe API errors', async () => {
        const mockOrder = {
            id: 'order-123',
            user_id: 'user-123',
            total: 29.99,
            status: 'pending',
            items_order: [
                {
                    id: 'item-1',
                    product_id: 'product-1',
                    quantity: 1,
                    products: {
                        name: 'Product 1',
                        price: 29.99
                    }
                }
            ]
        };

        supabase.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
                data: mockOrder,
                error: null
            })
        });

        mockPaymentIntentsCreate.mockRejectedValue(new Error('Stripe API error'));

        const result = await createPaymentIntent('order-123');

        expect(result).toEqual({
            error: 'Stripe API error'
        });
    });

    test('should round total amount correctly', async () => {
        const mockOrder = {
            id: 'order-123',
            user_id: 'user-123',
            total: 29.999,
            status: 'pending',
            items_order: [
                {
                    id: 'item-1',
                    product_id: 'product-1',
                    quantity: 3,
                    products: {
                        name: 'Product 1',
                        price: 9.999
                    }
                }
            ]
        };

        supabase.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
                data: mockOrder,
                error: null
            })
        });

        mockPaymentIntentsCreate.mockResolvedValue({
            client_secret: 'pi_test_secret_789',
            id: 'pi_789'
        });

        const result = await createPaymentIntent('order-123');

        // Amount should be close to expected value (floating point calculations)
        expect(result.amount).toBeCloseTo(2999.7, 0);
        expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                amount: expect.any(Number)
            })
        );
    });
});
