/**
 * Unit tests for productHelpers utility functions
 * Pure functions - no mocks needed
 */

const {
    buildPaginationMeta,
    validateProductData,
    sanitizeProductData,
    prepareProductForInsert
} = require('../../utils/productHelpers');

describe('productHelpers - buildPaginationMeta', () => {
    test('should calculate pagination correctly', () => {
        const result = buildPaginationMeta(1, 20, 100);

        expect(result).toEqual({
            page: 1,
            limit: 20,
            total: 100,
            pages: 5
        });
    });

    test('should handle partial pages', () => {
        const result = buildPaginationMeta(2, 20, 45);

        expect(result).toEqual({
            page: 2,
            limit: 20,
            total: 45,
            pages: 3
        });
    });

    test('should handle zero total', () => {
        const result = buildPaginationMeta(1, 20, 0);

        expect(result).toEqual({
            page: 1,
            limit: 20,
            total: 0,
            pages: 0
        });
    });
});

describe('productHelpers - validateProductData', () => {
    test('should return errors for missing required fields on create', () => {
        const errors = validateProductData({}, false);

        expect(errors).toContain('name is required');
        expect(errors).toContain('price is required');
        expect(errors).toContain('category_id is required');
        expect(errors.length).toBe(3);
    });

    test('should not require fields on update', () => {
        const errors = validateProductData({}, true);

        expect(errors.length).toBe(0);
    });

    test('should reject negative price', () => {
        const errors = validateProductData({ price: -10 }, false);

        expect(errors).toContain('price cannot be negative');
    });

    test('should reject negative quantity', () => {
        const errors = validateProductData({ quantity: -5 }, false);

        expect(errors).toContain('quantity cannot be negative');
    });

    test('should pass valid product data', () => {
        const errors = validateProductData({
            name: 'Test Product',
            price: 29.99,
            category_id: 1,
            quantity: 10
        }, false);

        expect(errors.length).toBe(0);
    });
});

describe('productHelpers - sanitizeProductData', () => {
    test('should trim name and description', () => {
        const result = sanitizeProductData({
            name: '  Test Product  ',
            description: '  Description  '
        });

        expect(result.name).toBe('Test Product');
        expect(result.description).toBe('Description');
    });

    test('should parse price as float', () => {
        const result = sanitizeProductData({ price: '29.99' });

        expect(result.price).toBe(29.99);
        expect(typeof result.price).toBe('number');
    });

    test('should parse quantity as integer', () => {
        const result = sanitizeProductData({ quantity: '10' });

        expect(result.quantity).toBe(10);
        expect(typeof result.quantity).toBe('number');
    });

    test('should handle undefined description and image_url', () => {
        const result = sanitizeProductData({
            name: 'Product',
            description: undefined,
            image_url: undefined
        });

        expect(result.description).toBeUndefined();
        expect(result.image_url).toBeUndefined();
    });

    test('should only include provided fields', () => {
        const result = sanitizeProductData({ name: 'Test' });

        expect(result).toEqual({ name: 'Test' });
        expect(result.price).toBeUndefined();
    });
});

describe('productHelpers - prepareProductForInsert', () => {
    test('should prepare complete product data', () => {
        const result = prepareProductForInsert({
            name: '  Product  ',
            description: '  Description  ',
            price: '29.99',
            category_id: 1,
            quantity: '10',
            image_url: '  /image.jpg  '
        }, 'seller-123');

        expect(result).toEqual({
            name: 'Product',
            description: 'Description',
            price: 29.99,
            category_id: 1,
            seller_id: 'seller-123',
            quantity: 10,
            image_url: '/image.jpg',
            is_active: true
        });
    });

    test('should default quantity to 0', () => {
        const result = prepareProductForInsert({
            name: 'Product',
            price: '19.99',
            category_id: 1
        }, 'seller-456');

        expect(result.quantity).toBe(0);
    });

    test('should handle undefined description and image_url', () => {
        const result = prepareProductForInsert({
            name: 'Product',
            price: '19.99',
            category_id: 1,
            description: undefined,
            image_url: undefined
        }, 'seller-789');

        expect(result.description).toBeUndefined();
        expect(result.image_url).toBeUndefined();
    });

    test('should always set is_active to true', () => {
        const result = prepareProductForInsert({
            name: 'Product',
            price: '19.99',
            category_id: 1
        }, 'seller-999');

        expect(result.is_active).toBe(true);
    });
});
