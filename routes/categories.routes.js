/**
 * Routes de gestion des catégories
 *
 * CRUD des catégories de produits
 * - Liste des catégories
 * - Détails d'une catégorie
 * - Création/Modification/Suppression (ADMIN)
 * - Produits par catégorie
 */

const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// GET /api/categories - Liste toutes les catégories
router.get('/', asyncHandler(async (req, res) => {
    const { sort_by = 'nom', order = 'asc' } = req.query;

    // Récupérer toutes les catégories
    const { data: categories, error } = await supabase
        .from('categories')
        .select('id, nom, description, created_at')
        .order(sort_by, { ascending: order === 'asc' });

    if (error) throw error;

    // Ajouter le nombre de produits actifs par catégorie
    const categoriesWithStats = await Promise.all(categories.map(async (category) => {
        const { count } = await supabase
            .from('produits')
            .select('*', { count: 'exact', head: true })
            .eq('categorie_id', category.id)
            .eq('is_active', true);

        return {
            ...category,
            total_products: count || 0
        };
    }));

    res.status(200).json({
        categories: categoriesWithStats
    });
}));

// GET /api/categories/:id - Détails d'une catégorie spécifique
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Récupérer la catégorie
    const { data: category, error } = await supabase
        .from('categories')
        .select('id, nom, description, created_at')
        .eq('id', id)
        .single();

    if (error || !category) {
        return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    // Compter les produits actifs
    const { count: totalProducts } = await supabase
        .from('produits')
        .select('*', { count: 'exact', head: true })
        .eq('categorie_id', id)
        .eq('is_active', true);

    // Compter le nombre de vendeurs différents
    const { data: vendeurs } = await supabase
        .from('produits')
        .select('vendeur_id')
        .eq('categorie_id', id)
        .eq('is_active', true);

    const uniqueVendors = vendeurs ? new Set(vendeurs.map(p => p.vendeur_id)).size : 0;

    res.status(200).json({
        category: {
            ...category,
            total_products: totalProducts || 0,
            total_vendors: uniqueVendors
        }
    });
}));

// POST /api/categories - Créer une nouvelle catégorie (ADMIN)
router.post('/', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
    const { nom, description } = req.body;

    // Validation
    if (!nom || nom.trim().length === 0) {
        return res.status(400).json({ error: 'Le nom de la catégorie est requis' });
    }

    const sanitizedNom = nom.trim();

    // Vérifier que le nom n'existe pas déjà
    const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('nom', sanitizedNom)
        .single();

    if (existing) {
        return res.status(409).json({ error: 'Une catégorie avec ce nom existe déjà' });
    }

    // Créer la catégorie
    const { data: category, error } = await supabase
        .from('categories')
        .insert({
            nom: sanitizedNom,
            description: description?.trim() || null
        })
        .select()
        .single();

    if (error) throw error;

    res.status(201).json({
        message: 'Catégorie créée avec succès',
        category
    });
}));

// PUT /api/categories/:id - Mettre à jour une catégorie (ADMIN)
router.put('/:id', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nom, description } = req.body;

    // Vérifier que la catégorie existe
    const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('id', id)
        .single();

    if (!existing) {
        return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    // Construire l'objet de mise à jour
    const updates = {};

    if (nom !== undefined) {
        const sanitizedNom = nom.trim();
        if (sanitizedNom.length === 0) {
            return res.status(400).json({ error: 'Le nom ne peut pas être vide' });
        }

        // Vérifier l'unicité du nom si modifié
        const { data: duplicate } = await supabase
            .from('categories')
            .select('id')
            .eq('nom', sanitizedNom)
            .neq('id', id)
            .single();

        if (duplicate) {
            return res.status(409).json({ error: 'Une catégorie avec ce nom existe déjà' });
        }

        updates.nom = sanitizedNom;
    }

    if (description !== undefined) {
        updates.description = description?.trim() || null;
    }

    // Mettre à jour la catégorie
    const { data: category, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    res.status(200).json({
        message: 'Catégorie mise à jour',
        category
    });
}));

// DELETE /api/categories/:id - Supprimer une catégorie (ADMIN)
router.delete('/:id', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Vérifier que la catégorie existe
    const { data: category } = await supabase
        .from('categories')
        .select('id')
        .eq('id', id)
        .single();

    if (!category) {
        return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    // Vérifier qu'il n'y a pas de produits liés
    const { count } = await supabase
        .from('produits')
        .select('*', { count: 'exact', head: true })
        .eq('categorie_id', id);

    if (count > 0) {
        return res.status(400).json({
            error: `Impossible de supprimer cette catégorie car ${count} produit(s) y sont liés`,
            products_count: count
        });
    }

    // Supprimer la catégorie
    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

    if (error) throw error;

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

    // Vérifier que la catégorie existe
    const { data: category } = await supabase
        .from('categories')
        .select('id')
        .eq('id', id)
        .single();

    if (!category) {
        return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    // Récupérer les produits de la catégorie
    const validSortFields = ['prix', 'created_at', 'nom', 'stock'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { data: products, error, count } = await supabase
        .from('produits')
        .select(`
            id,
            nom,
            description,
            prix,
            stock,
            image_url,
            created_at,
            vendeur:vendeurs(id, nom_boutique)
        `, { count: 'exact' })
        .eq('categorie_id', id)
        .eq('is_active', true)
        .order(sortField, { ascending: order === 'asc' })
        .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    // Calculer la note moyenne pour chaque produit
    const productsWithRatings = await Promise.all(products.map(async (product) => {
        const { data: comments } = await supabase
            .from('commentaires')
            .select('note')
            .eq('produit_id', product.id)
            .eq('is_approved', true);

        const averageRating = comments && comments.length > 0
            ? comments.reduce((sum, c) => sum + c.note, 0) / comments.length
            : 0;

        return {
            ...product,
            average_rating: Math.round(averageRating * 10) / 10,
            total_comments: comments ? comments.length : 0
        };
    }));

    res.status(200).json({
        products: productsWithRatings,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0,
            pages: Math.ceil((count || 0) / parseInt(limit))
        }
    });
}));

module.exports = router;
