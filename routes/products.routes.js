/**
 * Routes de gestion des products
 *
 * CRUD et opérations sur les products
 * - Liste des products avec filtres (support slider de prix)
 * - Recherche de products
 * - Détails d'un produit
 * - Création/Modification/Suppression (VENDEUR/ADMIN)
 * - Gestion du quantity
 */

const express = require('express');
const { authenticate, authorize, optionalAuth } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');
const {
    getProductsController,
    searchProductsController,
    getProductByIdController,
    createProductController,
    updateProductController,
    toggleProductStatusController,
    updateProductStockController,
    deleteProductController,
    getRelatedProductsController
} = require('../controller/productController');

const router = express.Router();

// GET /api/products - Liste tous les products avec filtres (support slider de prix)
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
    const result = await getProductsController(req.query, req.user?.role?.name);
    res.status(200).json(result);
}));

// GET /api/products/search - Recherche avancée de products
router.get('/search', asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
        return res.status(400).json({ error: 'Recherche trop courte (minimum 2 caractères)' });
    }

    const result = await searchProductsController(q);
    res.status(200).json(result);
}));

// GET /api/products/:id - Détails d'un produit spécifique
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const product = await getProductByIdController(id);
    res.status(200).json({ product });
}));

// POST /api/products - Créer un nouveau produit (VENDEUR/ADMIN)
router.post('/', authenticate, authorize('VENDEUR', 'ADMIN'), asyncHandler(async (req, res) => {
    const product = await createProductController(req.body, req.user.id);
    res.status(201).json({
        message: 'Produit créé avec succès',
        product
    });
}));

// PUT /api/products/:id - Mettre à jour un produit
router.put('/:id', authenticate, authorize('VENDEUR', 'ADMIN'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updatedProduct = await updateProductController(id, req.body, req.user.id, req.user.role.name);
    res.status(200).json({
        message: 'Produit mis à jour',
        product: updatedProduct
    });
}));

// PATCH /api/products/:id/toggle-status - Activer/Désactiver un produit
router.patch('/:id/toggle-status', authenticate, authorize('VENDEUR', 'ADMIN'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const isActive = await toggleProductStatusController(id, req.user.id, req.user.role.name);
    res.status(200).json({
        message: 'Statut du produit modifié',
        is_active: isActive
    });
}));

// PATCH /api/products/:id/quantity - Mettre à jour le quantity d'un produit
router.patch('/:id/quantity', authenticate, authorize('VENDEUR', 'ADMIN'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { quantity, operation = 'set' } = req.body;

    if (quantity === undefined) {
        return res.status(400).json({ error: 'Valeur de quantity requise' });
    }

    const newQuantity = await updateProductStockController(id, quantity, operation, req.user.id, req.user.role.name);
    res.status(200).json({
        message: 'Quantity mis à jour',
        quantity: newQuantity
    });
}));

// DELETE /api/products/:id - Supprimer un produit (soft delete)
router.delete('/:id', authenticate, authorize('VENDEUR', 'ADMIN'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await deleteProductController(id, req.user.id, req.user.role.name);
    res.status(200).json(result);
}));

// GET /api/products/:id/related - Products similaires/recommandés
router.get('/:id/related', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const relatedProducts = await getRelatedProductsController(id);
    res.status(200).json({
        related_products: relatedProducts
    });
}));

module.exports = router;
