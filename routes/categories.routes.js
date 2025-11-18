const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');
const { 
    categoriesGetController,
    categoriesGetByIdController,
    categoriesPostController,
    categoriesPutController,
    categoriesDeleteController,
    categoriesGetProductsController
} = require('../controller/categoriesController');
const validate = require('../middlewares/verificators/validate');
const { validateGetCategory } = require('../middlewares/verificators/categoriesVerificators');

const router = express.Router();

// GET /api/categories - Liste toutes les catégories
router.get('/', validateGetCategory, validate, asyncHandler(async (req, res) => {
    const { sort_by = 'name', order = 'asc' } = req.body;

    const categories = await categoriesGetController(sort_by, order);

    res.status(200).json({
        categories
    });
}));

// GET /api/categories/:id - Détails d'une catégorie spécifique
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await categoriesGetByIdController(id);

    res.status(200).json(result);
}));

// POST /api/categories - Créer une nouvelle catégorie (ADMIN)
router.post('/', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Le name de la catégorie est requis' });
    }

    const sanitizedName = name.trim();

    const category = await categoriesPostController(sanitizedName, description);

    res.status(201).json({
        message: 'Catégorie créée avec succès',
        category
    });
}));

// PUT /api/categories/:id - Mettre à jour une catégorie (ADMIN)
router.put('/:id', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;

    const category = await categoriesPutController(id, name, description);

    res.status(200).json({
        message: 'Catégorie mise à jour',
        category
    });
}));

// DELETE /api/categories/:id - Supprimer une catégorie (ADMIN)
router.delete('/:id', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
    const { id } = req.params;

    await categoriesDeleteController(id);

    res.status(200).json({ message: 'Catégorie supprimée avec succès' });
}));

// GET /api/categories/:id/products - Récupérer les produits d'une catégorie
router.get('/:id/products', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        page = 1,
        limit = 20,
        sort_by = 'created_at',
        order = 'desc'
    } = req.query;

    const result = await categoriesGetProductsController(id, page, limit, sort_by, order);

    res.status(200).json(result);
}));

module.exports = router;
