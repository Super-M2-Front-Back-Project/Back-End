/**
 * Product Helpers - Reusable utility functions
 * Pure functions without side effects
 */

const buildPaginationMeta = (page, limit, total) => ({
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
});

const validateProductData = (data, isUpdate = false) => {
    const errors = [];

    if (!isUpdate) {
        if (!data.name) errors.push('name is required');
        if (!data.price) errors.push('price is required');
        if (!data.category_id) errors.push('category_id is required');
    }

    if (data.price !== undefined && parseFloat(data.price) < 0) {
        errors.push('price cannot be negative');
    }

    if (data.quantity !== undefined && parseInt(data.quantity) < 0) {
        errors.push('quantity cannot be negative');
    }

    return errors;
};

const sanitizeProductData = (data) => {
    const sanitized = {};

    if (data.name !== undefined) sanitized.name = data.name.trim();
    if (data.description !== undefined) sanitized.description = data.description?.trim();
    if (data.price !== undefined) sanitized.price = parseFloat(data.price);
    if (data.quantity !== undefined) sanitized.quantity = parseInt(data.quantity);
    if (data.image_url !== undefined) sanitized.image_url = data.image_url?.trim();
    if (data.category_id !== undefined) sanitized.category_id = data.category_id;

    return sanitized;
};

const prepareProductForInsert = (data, sellerId) => {
    return {
        name: data.name.trim(),
        description: data.description?.trim(),
        price: parseFloat(data.price),
        category_id: data.category_id,
        seller_id: sellerId,
        quantity: parseInt(data.quantity || 0),
        image_url: data.image_url?.trim(),
        is_active: true
    };
};

module.exports = {
    buildPaginationMeta,
    validateProductData,
    sanitizeProductData,
    prepareProductForInsert
};
