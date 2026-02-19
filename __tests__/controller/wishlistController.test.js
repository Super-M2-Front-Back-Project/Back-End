/**
 * Unit tests for wishlistController
 * Tests wishlist operations with mocked Supabase
 */

const { getWishlist, postWishlist, deleteWishlistItem } = require('../../controller/wishlistController');

// Mock Supabase
jest.mock('../../config/supabase', () => ({
    supabase: {
        from: jest.fn()
    }
}));

const { supabase } = require('../../config/supabase');

describe('wishlistController - getWishlist', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should retrieve user wishlist successfully', async () => {
        const mockWishlist = [
            {
                id: 'wishlist-1',
                added_at: '2025-12-01T10:00:00Z',
                product: {
                    id: 'product-1',
                    name: 'Product 1',
                    price: 29.99,
                    image_url: '/image1.jpg'
                }
            },
            {
                id: 'wishlist-2',
                added_at: '2025-12-02T10:00:00Z',
                product: {
                    id: 'product-2',
                    name: 'Product 2',
                    price: 49.99,
                    image_url: '/image2.jpg'
                }
            }
        ];

        supabase.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
                data: mockWishlist,
                error: null
            })
        });

        const result = await getWishlist('user-123');

        expect(result).toEqual(mockWishlist);
        expect(supabase.from).toHaveBeenCalledWith('wishlist');
    });

    test('should return empty array for empty wishlist', async () => {
        supabase.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
                data: [],
                error: null
            })
        });

        const result = await getWishlist('user-123');

        expect(result).toEqual([]);
    });

    test('should return null on database failure', async () => {
        supabase.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
            })
        });

        const result = await getWishlist('user-123');
        expect(result).toBeNull();
    });
});

describe('wishlistController - postWishlist', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should add product to wishlist successfully', async () => {
        // Mock checking if item exists (not exists)
        const mockSelectChain = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
                data: null,
                error: null
            })
        };

        // Mock insert operation
        const mockInsertChain = {
            insert: jest.fn().mockReturnThis(),
            single: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue({
                data: {
                    id: 'wishlist-1',
                    user_id: 'user-123',
                    product_id: 'product-1'
                },
                error: null
            })
        };

        supabase.from
            .mockReturnValueOnce(mockSelectChain)
            .mockReturnValueOnce(mockInsertChain);

        const result = await postWishlist('user-123', 'product-1');

        expect(result).toEqual({
            id: 'wishlist-1',
            user_id: 'user-123',
            product_id: 'product-1'
        });
    });

    test('should throw error if product already in wishlist', async () => {
        supabase.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
                data: { id: 'wishlist-1' },
                error: null
            })
        });

        await expect(postWishlist('user-123', 'product-1')).rejects.toThrow('Produit déjà dans la wishlist');
    });

    test('should return null on insert failure', async () => {
        // Mock checking if item exists (not exists)
        const mockSelectChain = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
                data: null,
                error: null
            })
        };

        // Mock insert operation failure
        const mockInsertChain = {
            insert: jest.fn().mockReturnThis(),
            single: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Insert failed' }
            })
        };

        supabase.from
            .mockReturnValueOnce(mockSelectChain)
            .mockReturnValueOnce(mockInsertChain);

        const result = await postWishlist('user-123', 'product-1');
        expect(result).toBeNull();
    });
});

describe('wishlistController - deleteWishlistItem', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should delete wishlist item successfully', async () => {
        const mockDeletedItem = {
            id: 'wishlist-1',
            user_id: 'user-123',
            product_id: 'product-1'
        };

        supabase.from.mockReturnValue({
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue({
                data: mockDeletedItem,
                error: null
            })
        });

        const result = await deleteWishlistItem('product-1', 'user-123');

        expect(result).toEqual(mockDeletedItem);
        expect(supabase.from).toHaveBeenCalledWith('wishlist');
    });

    test('should return null on delete failure', async () => {
        supabase.from.mockReturnValue({
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Delete failed' }
            })
        });

        const result = await deleteWishlistItem('product-1', 'user-123');
        expect(result).toBeNull();
    });
});
