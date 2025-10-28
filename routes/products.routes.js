/**
 * Routes de gestion des produits
 *
 * CRUD et opérations sur les produits
 * - Liste des produits avec filtres
 * - Recherche de produits
 * - Détails d'un produit
 * - Création/Modification/Suppression (VENDEUR/ADMIN)
 * - Gestion du stock
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
        .from('produits')
        .select(`
            id,
            nom,
            description,
            prix,
            stock,
            image_url,
            is_active,
            created_at,
            categorie:categories(id, nom),
            vendeur:vendeurs(id, nom_boutique, user:users(nom, prenom))
        `, { count: 'exact' });

    // Filtrer les produits actifs uniquement (sauf pour ADMIN)
    if (!req.user || req.user.role?.nom !== 'ADMIN') {
        query = query.eq('is_active', true);
    }

    // Recherche par nom ou description
    if (search) {
        query = query.or(`nom.ilike.%${search}%,description.ilike.%${search}%`);
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
    const validSortFields = ['prix', 'created_at', 'nom', 'stock'];
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
            nom,
            description,
            prix,
            stock,
            image_url,
            categorie:categories(id, nom),
            vendeur:vendeurs(nom_boutique)
        `)
        .eq('is_active', true)
        .or(`nom.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
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
        .from('produits')
        .select(`
            id,
            nom,
            description,
            prix,
            stock,
            image_url,
            is_active,
            created_at,
            categorie:categories(id, nom, description),
            vendeur:vendeurs(
                id,
                nom_boutique,
                description,
                user:users(nom, prenom)
            )
        `)
        .eq('id', id)
        .single();

    if (error || !product) {
        return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Calculer la note moyenne
    const { data: comments } = await supabase
        .from('commentaires')
        .select('note')
        .eq('produit_id', id)
        .eq('is_approved', true);

    const averageRating = comments && comments.length > 0
        ? comments.reduce((sum, c) => sum + c.note, 0) / comments.length
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
    const { nom, description, prix, categorie_id, stock = 0, image_url } = req.body;

    // Validation des champs obligatoires
    if (!nom || !prix || !categorie_id) {
        return res.status(400).json({
            error: 'Champs obligatoires manquants',
            required: ['nom', 'prix', 'categorie_id']
        });
    }

    // Validation du prix
    if (parseFloat(prix) < 0) {
        return res.status(400).json({ error: 'Le prix ne peut pas être négatif' });
    }

    // Validation du stock
    if (parseInt(stock) < 0) {
        return res.status(400).json({ error: 'Le stock ne peut pas être négatif' });
    }

    // Récupérer le vendeur_id de l'utilisateur connecté
    const { data: vendeur } = await supabase
        .from('vendeurs')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

    if (!vendeur) {
        return res.status(403).json({ error: 'Profil vendeur non trouvé' });
    }

    // Vérifier que la catégorie existe
    const { data: categorie } = await supabase
        .from('categories')
        .select('id')
        .eq('id', categorie_id)
        .single();

    if (!categorie) {
        return res.status(400).json({ error: 'Catégorie invalide' });
    }

    // Créer le produit
    const { data: product, error } = await supabase
        .from('produits')
        .insert({
            nom: nom.trim(),
            description: description?.trim(),
            prix: parseFloat(prix),
            categorie_id,
            vendeur_id: vendeur.id,
            stock: parseInt(stock),
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
    const { nom, description, prix, stock, image_url, categorie_id } = req.body;

    // Récupérer le produit
    const { data: product } = await supabase
        .from('produits')
        .select('vendeur_id')
        .eq('id', id)
        .single();

    if (!product) {
        return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Vérifier les permissions (vendeur propriétaire ou ADMIN)
    if (req.user.role.nom !== 'ADMIN') {
        const { data: vendeur } = await supabase
            .from('vendeurs')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        if (!vendeur || vendeur.id !== product.vendeur_id) {
            return res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres produits' });
        }
    }

    // Construire l'objet de mise à jour
    const updates = {};
    if (nom !== undefined) updates.nom = nom.trim();
    if (description !== undefined) updates.description = description?.trim();
    if (prix !== undefined) {
        if (parseFloat(prix) < 0) {
            return res.status(400).json({ error: 'Le prix ne peut pas être négatif' });
        }
        updates.prix = parseFloat(prix);
    }
    if (stock !== undefined) {
        if (parseInt(stock) < 0) {
            return res.status(400).json({ error: 'Le stock ne peut pas être négatif' });
        }
        updates.stock = parseInt(stock);
    }
    if (image_url !== undefined) updates.image_url = image_url?.trim();
    if (categorie_id !== undefined) updates.categorie_id = categorie_id;

    // Mettre à jour le produit
    const { data: updatedProduct, error } = await supabase
        .from('produits')
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
        .from('produits')
        .select('vendeur_id, is_active')
        .eq('id', id)
        .single();

    if (!product) {
        return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Vérifier les permissions
    if (req.user.role.nom !== 'ADMIN') {
        const { data: vendeur } = await supabase
            .from('vendeurs')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        if (!vendeur || vendeur.id !== product.vendeur_id) {
            return res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres produits' });
        }
    }

    // Inverser is_active
    const { data: updatedProduct, error } = await supabase
        .from('produits')
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

// PATCH /api/products/:id/stock - Mettre à jour le stock d'un produit
router.patch('/:id/stock', authenticate, authorize('VENDEUR', 'ADMIN'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { stock, operation = 'set' } = req.body;

    if (stock === undefined) {
        return res.status(400).json({ error: 'Valeur de stock requise' });
    }

    const stockValue = parseInt(stock);
    if (isNaN(stockValue)) {
        return res.status(400).json({ error: 'Valeur de stock invalide' });
    }

    // Récupérer le produit
    const { data: product } = await supabase
        .from('produits')
        .select('vendeur_id, stock')
        .eq('id', id)
        .single();

    if (!product) {
        return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Vérifier les permissions
    if (req.user.role.nom !== 'ADMIN') {
        const { data: vendeur } = await supabase
            .from('vendeurs')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        if (!vendeur || vendeur.id !== product.vendeur_id) {
            return res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres produits' });
        }
    }

    // Calculer le nouveau stock selon l'opération
    let newStock;
    switch (operation) {
        case 'set':
            newStock = stockValue;
            break;
        case 'add':
            newStock = product.stock + stockValue;
            break;
        case 'subtract':
            newStock = product.stock - stockValue;
            break;
        default:
            return res.status(400).json({ error: 'Opération invalide (set, add, subtract)' });
    }

    // Validation du stock final
    if (newStock < 0) {
        return res.status(400).json({ error: 'Le stock ne peut pas être négatif' });
    }

    // Mettre à jour le stock
    const { data: updatedProduct, error } = await supabase
        .from('produits')
        .update({ stock: newStock })
        .eq('id', id)
        .select('stock')
        .single();

    if (error) throw error;

    res.status(200).json({
        message: 'Stock mis à jour',
        stock: updatedProduct.stock
    });
}));

// DELETE /api/products/:id - Supprimer un produit (soft delete)
router.delete('/:id', authenticate, authorize('VENDEUR', 'ADMIN'), asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Récupérer le produit
    const { data: product } = await supabase
        .from('produits')
        .select('vendeur_id')
        .eq('id', id)
        .single();

    if (!product) {
        return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Vérifier les permissions
    if (req.user.role.nom !== 'ADMIN') {
        const { data: vendeur } = await supabase
            .from('vendeurs')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        if (!vendeur || vendeur.id !== product.vendeur_id) {
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
        .from('produits')
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
            note,
            commentaire,
            created_at,
            user:users(nom, prenom)
        `, { count: 'exact' })
        .eq('produit_id', id)
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
        .from('produits')
        .select('categorie_id, prix, vendeur_id')
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
            nom,
            prix,
            image_url,
            categorie:categories(nom),
            vendeur:vendeurs(nom_boutique)
        `)
        .eq('categorie_id', product.categorie_id)
        .eq('is_active', true)
        .neq('id', id)
        .gte('prix', priceMin)
        .lte('prix', priceMax)
        .limit(8);

    res.status(200).json({
        related_products: relatedProducts || []
    });
}));

module.exports = router;
