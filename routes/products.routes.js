/**
 * Routes de gestion des produits
 *
 * CRUD et opérations sur les produits
 * - Liste des produits avec filtres
 * - Recherche de produits
 * - Détails d'un produit
 * - Création/Modification/Suppression (VENDEUR/ADMIN)
 * - Gestion du quantity
 */

const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticate, authorize, optionalAuth } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// GET /api/products - Liste tous les produits avec filtres
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        search,
        category_id,
        vendor_id,
        min_price,
        max_price,
        sort_by = 'created_at',
        order = 'desc'
    } = req.query;

    // Construction de la requête de base
    let query = supabase
        .from('products')
        .select(`
            id,
            name,
            description,
            price,
            quantity,
            image_url,
            is_active,
            created_at,
            categorie:categories(id, name),
            seller:sellers(id, name, user:users(first_name, last_name))
        `, { count: 'exact' });

    // Filtrer les produits actifs uniquement (sauf pour ADMIN)
    if (!req.user || req.user.role?.name !== 'ADMIN') {
        query = query.eq('is_active', true);
    }

    // Recherche par nom ou description
    if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Filtre par catégorie
    if (category_id) {
        query = query.eq('categorie_id', category_id);
    }

    // Filtre par vendeur
    if (vendor_id) {
        query = query.eq('vendeur_id', vendor_id);
    }

    // Filtre par prix minimum
    if (min_price) {
        query = query.gte('prix', parseFloat(min_price));
    }

    // Filtre par prix maximum
    if (max_price) {
        query = query.lte('prix', parseFloat(max_price));
    }

    // Tri
    const validSortFields = ['price', 'created_at', 'name', 'quantity'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortOrder = order === 'asc' ? true : false;
    query = query.order(sortField, { ascending: sortOrder });

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: products, error, count } = await query;

    if (error) throw error;

    // Calculer la note moyenne pour chaque produit
    const productsWithRatings = await Promise.all(products.map(async (product) => {
        const { data: comments } = await supabase
            .from('comments')
            .select('rate')
            .eq('product_id', product.id)
            .eq('is_approved', true);

        const averageRating = comments && comments.length > 0
            ? comments.reduce((sum, c) => sum + c.rate, 0) / comments.length
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

// GET /api/products/search - Recherche avancée de produits
router.get('/search', asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
        return res.status(400).json({ error: 'Recherche trop courte (minimum 2 caractères)' });
    }

    const searchTerm = q.trim();

    // Recherche full-text sur nom et description
    const { data: products, error } = await supabase
        .from('produits')
        .select(`
            id,
            name,
            description,
            price,
            quantity,
            image_url,
            category:categories(id, name),
            seller:sellers(name)
        `)
        .eq('is_active', true)
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .limit(20);

    if (error) throw error;

    res.status(200).json({
        results: products || [],
        total: products ? products.length : 0
    });
}));

// GET /api/products/:id - Détails d'un produit spécifique
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Récupérer le produit avec toutes les relations
    const { data: product, error } = await supabase
        .from('products')
        .select(`
            id,
            name,
            description,
            price,
            quantity,
            image_url,
            is_active,
            created_at,
            category:categories(id, name, description),
            seller:sellers(
                id,
                name,
                description,
                user:users(last_name, first_name)
            )
        `)
        .eq('id', id)
        .single();

        console.log(product);
        

    if (error || !product) {
        return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Calculer la note moyenne
    const { data: comments } = await supabase
        .from('comments')
        .select('rate')
        .eq('product_id', id)
        .eq('is_approved', true);

    const averageRating = comments && comments.length > 0
        ? comments.reduce((sum, c) => sum + c.rate, 0) / comments.length
        : 0;

    res.status(200).json({
        product: {
            ...product,
            average_rating: Math.round(averageRating * 10) / 10,
            total_comments: comments ? comments.length : 0
        }
    });
}));

// POST /api/products - Créer un nouveau produit (VENDEUR/ADMIN)
router.post('/', authenticate, authorize('VENDEUR', 'ADMIN'), asyncHandler(async (req, res) => {
    const { name, description, price, category_id, quantity = 0, image_url } = req.body;

    // Validation des champs obligatoires
    if (!name || !price || !category_id) {
        return res.status(400).json({
            error: 'Champs obligatoires manquants',
            required: ['name', 'price', 'category_id']
        });
    }

    // Validation du prix
    if (parseFloat(price) < 0) {
        return res.status(400).json({ error: 'Le prix ne peut pas être négatif' });
    }

    // Validation du quantity
    if (parseInt(quantity) < 0) {
        return res.status(400).json({ error: 'Le quantity ne peut pas être négatif' });
    }

    // Récupérer le vendeur_id de l'utilisateur connecté
    const { data: seller } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

    if (!seller) {
        return res.status(403).json({ error: 'Profil vendeur non trouvé' });
    }

    // Vérifier que la catégorie existe
    const { data: category } = await supabase
        .from('categories')
        .select('id')
        .eq('id', category_id)
        .single();

    if (!category) {
        return res.status(400).json({ error: 'Catégorie invalide' });
    }

    // Créer le produit
    const { data: product, error } = await supabase
        .from('products')
        .insert({
            name: name.trim(),
            description: description?.trim(),
            price: parseFloat(price),
            category_id,
            seller_id: seller.id,
            quantity: parseInt(quantity),
            image_url: image_url?.trim(),
            is_active: true
        })
        .select()
        .single();

    if (error) throw error;

    res.status(201).json({
        message: 'Produit créé avec succès',
        product
    });
}));

// PUT /api/products/:id - Mettre à jour un produit
router.put('/:id', authenticate, authorize('VENDEUR', 'ADMIN'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description, price, quantity, image_url, category_id } = req.body;

    // Récupérer le produit
    const { data: product } = await supabase
        .from('products')
        .select('seller_id')
        .eq('id', id)
        .single();

    if (!product) {
        return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Vérifier les permissions (vendeur propriétaire ou ADMIN)
    if (req.user.role.name !== 'ADMIN') {
        const { data: seller } = await supabase
            .from('sellers')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        if (!seller || seller.id !== product.seller_id) {
            return res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres produits' });
        }
    }

    // Construire l'objet de mise à jour
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim();
    if (price !== undefined) {
        if (parseFloat(price) < 0) {
            return res.status(400).json({ error: 'Le prix ne peut pas être négatif' });
        }
        updates.price = parseFloat(price);
    }
    if (quantity !== undefined) {
        if (parseInt(quantity) < 0) {
            return res.status(400).json({ error: 'Le quantity ne peut pas être négatif' });
        }
        updates.quantity = parseInt(quantity);
    }
    if (image_url !== undefined) updates.image_url = image_url?.trim();
    if (category_id !== undefined) updates.category_id = category_id;

    // Mettre à jour le produit
    const { data: updatedProduct, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    res.status(200).json({
        message: 'Produit mis à jour',
        product: updatedProduct
    });
}));

// PATCH /api/products/:id/toggle-status - Activer/Désactiver un produit
router.patch('/:id/toggle-status', authenticate, authorize('VENDEUR', 'ADMIN'), asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Récupérer le produit
    const { data: product } = await supabase
        .from('products')
        .select('seller_id, is_active')
        .eq('id', id)
        .single();

    if (!product) {
        return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Vérifier les permissions
    if (req.user.role.name !== 'ADMIN') {
        const { data: seller } = await supabase
            .from('sellers')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        if (!seller || seller.id !== product.seller_id) {
            return res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres produits' });
        }
    }

    // Inverser is_active
    const { data: updatedProduct, error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', id)
        .select('is_active')
        .single();

    if (error) throw error;

    res.status(200).json({
        message: 'Statut du produit modifié',
        is_active: updatedProduct.is_active
    });
}));

// PATCH /api/products/:id/quantity - Mettre à jour le quantity d'un produit
router.patch('/:id/quantity', authenticate, authorize('VENDEUR', 'ADMIN'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { quantity, operation = 'set' } = req.body;

    if (quantity === undefined) {
        return res.status(400).json({ error: 'Valeur de quantity requise' });
    }

    const stockValue = parseInt(quantity);
    if (isNaN(stockValue)) {
        return res.status(400).json({ error: 'Valeur de quantity invalide' });
    }

    // Récupérer le produit
    const { data: product } = await supabase
        .from('products')
        .select('seller_id, quantity')
        .eq('id', id)
        .single();

    if (!product) {
        return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Vérifier les permissions
    if (req.user.role.name !== 'ADMIN') {
        const { data: seller } = await supabase
            .from('sellers')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        if (!seller || seller.id !== product.seller_id) {
            return res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres produits' });
        }
    }

    // Calculer le nouveau quantity selon l'opération
    let newStock;
    switch (operation) {
        case 'set':
            newStock = stockValue;
            break;
        case 'add':
            newStock = product.quantity + stockValue;
            break;
        case 'subtract':
            newStock = product.quantity - stockValue;
            break;
        default:
            return res.status(400).json({ error: 'Opération invalide (set, add, subtract)' });
    }

    // Validation du quantity final
    if (newStock < 0) {
        return res.status(400).json({ error: 'Le quantity ne peut pas être négatif' });
    }

    // Mettre à jour le quantity
    const { data: updatedProduct, error } = await supabase
        .from('products')
        .update({ quantity: newStock })
        .eq('id', id)
        .select('quantity')
        .single();

    if (error) throw error;

    res.status(200).json({
        message: 'Quantity mis à jour',
        quantity: updatedProduct.quantity
    });
}));

// DELETE /api/products/:id - Supprimer un produit (soft delete)
router.delete('/:id', authenticate, authorize('VENDEUR', 'ADMIN'), asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Récupérer le produit
    const { data: product } = await supabase
        .from('products')
        .select('seller_id')
        .eq('id', id)
        .single();

    if (!product) {
        return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Vérifier les permissions
    if (req.user.role.name !== 'ADMIN') {
        const { data: seller } = await supabase
            .from('sellers')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        if (!seller || seller.id !== product.seller_id) {
            return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres produits' });
        }
    }

    // Soft delete (désactiver plutôt que supprimer)
    const { error } = await supabase
        .from('produits')
        .update({ is_active: false })
        .eq('id', id);

    if (error) throw error;

    res.status(200).json({ message: 'Produit supprimé (désactivé)' });
}));

// GET /api/products/:id/comments - Récupérer les commentaires d'un produit
router.get('/:id/comments', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 10, sort_by = 'created_at' } = req.query;

    // Vérifier que le produit existe
    const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('id', id)
        .single();

    if (!product) {
        return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Récupérer les commentaires approuvés
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { data: comments, error, count } = await supabase
        .from('commentaires')
        .select(`
            id,
            rate,
            comment,
            created_at,
            user:users(last_name, first_name)
        `, { count: 'exact' })
        .eq('product_id', id)
        .eq('is_approved', true)
        .order(sort_by, { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    res.status(200).json({
        comments: comments || [],
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0,
            pages: Math.ceil((count || 0) / parseInt(limit))
        }
    });
}));

// GET /api/products/:id/related - Produits similaires/recommandés
router.get('/:id/related', asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Récupérer le produit pour connaître sa catégorie et son prix
    const { data: product } = await supabase
        .from('products')
        .select('category_id, price, seller_id')
        .eq('id', id)
        .single();

    if (!product) {
        return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Trouver des produits similaires
    // 1. Même catégorie
    // 2. Prix similaire (±30%)
    // 3. Exclure le produit actuel
    const priceMin = product.prix * 0.7;
    const priceMax = product.prix * 1.3;

    const { data: relatedProducts } = await supabase
        .from('produits')
        .select(`
            id,
            name,
            price,
            image_url,
            category:categories(name),
            seller:sellers(name)
        `)
        .eq('category_id', product.category_id)
        .eq('is_active', true)
        .neq('id', id)
        .gte('price', priceMin)
        .lte('price', priceMax)
        .limit(8);

    res.status(200).json({
        related_products: relatedProducts || []
    });
}));

module.exports = router;
