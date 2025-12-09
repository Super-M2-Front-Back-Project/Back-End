const productService = require('../services/productService');
const {
    buildPaginationMeta,
    validateProductData,
    sanitizeProductData,
    prepareProductForInsert
} = require('../utils/productHelpers');

/**
 * Product Controller - Lightweight orchestration layer
 * Handles validation, coordination, and response formatting
 */

const getProductsController = async (filters, userRole = null) => {
    const { products, count, page, limit } = await productService.getProducts(filters, userRole);

    return {
        products,
        pagination: buildPaginationMeta(page, limit, count || 0)
    };
};

const searchProductsController = async (searchQuery) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
        throw new Error('Recherche trop courte (minimum 2 caractères)');
    }

    const results = await productService.searchProducts(searchQuery.trim());
    return { results, total: results.length };
};

const getProductByIdController = async (id) => {
    return await productService.getProductById(id);
};

const createProductController = async (productData, userId) => {
    const errors = validateProductData(productData);
    if (errors.length > 0) throw new Error(`Validation: ${errors.join(', ')}`);

    const seller = await productService.getSellerByUserId(userId);
    const categoryValid = await productService.categoryExists(productData.category_id);
    if (!categoryValid) throw new Error('Catégorie invalide');

    const insertData = prepareProductForInsert(productData, seller.id);
    return await productService.createProduct(insertData);
};

const updateProductController = async (id, updates, userId, userRole) => {
    await productService.checkProductOwnership(id, userId, userRole);

    const errors = validateProductData(updates, true);
    if (errors.length > 0) throw new Error(`Validation: ${errors.join(', ')}`);

    const sanitized = sanitizeProductData(updates);
    return await productService.updateProduct(id, sanitized);
};

const toggleProductStatusController = async (id, userId, userRole) => {
    await productService.checkProductOwnership(id, userId, userRole);
    return await productService.toggleProductActive(id);
};

const updateProductStockController = async (id, quantity, operation, userId, userRole) => {
    if (quantity === undefined) throw new Error('Valeur de quantity requise');

    const stockValue = parseInt(quantity);
    if (isNaN(stockValue)) throw new Error('Valeur de quantity invalide');

    await productService.checkProductOwnership(id, userId, userRole);
    return await productService.updateProductStock(id, stockValue, operation);
};

const deleteProductController = async (id, userId, userRole) => {
    await productService.checkProductOwnership(id, userId, userRole);
    return await productService.deleteProduct(id);
};

const getRelatedProductsController = async (productId) => {
    return await productService.getRelatedProducts(productId);
};

module.exports = {
    getProductsController,
    searchProductsController,
    getProductByIdController,
    createProductController,
    updateProductController,
    toggleProductStatusController,
    updateProductStockController,
    deleteProductController,
    getRelatedProductsController
};
