/**
 * Routes de gestion des vendeurs
 *
 * Gestion des profils vendeurs et leurs opérations
 * - Liste des vendeurs
 * - Profil vendeur
 * - Vérification vendeur (ADMIN)
 * - Statistiques vendeur
 */

const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// GET /api/sellers - Liste tous les vendeurs
router.get('/', asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        verified,
        sort_by = 'created_at',
        order = 'desc'
    } = req.query;

    // Construction de la requête
    let query = supabase
        .from('vendeurs')
        .select(`
            id,
            nom_boutique,
            description,
            siret,
            is_verified,
            created_at,
            user:users(id, nom, prenom, email)
        `, { count: 'exact' });

    // Filtre par statut de vérification
    if (verified !== undefined) {
        query = query.eq('is_verified', verified === 'true');
    }

    // Tri et pagination
    query = query.order(sort_by, { ascending: order === 'asc' });
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: sellers, error, count } = await query;

    if (error) throw error;

    // Ajouter statistiques pour chaque vendeur
    const sellersWithStats = await Promise.all(sellers.map(async (seller) => {
        const { count: productCount } = await supabase
            .from('produits')
            .select('*', { count: 'exact', head: true })
            .eq('vendeur_id', seller.id)
            .eq('is_active', true);

        return {
            ...seller,
            total_products: productCount || 0
        };
    }));

    res.status(200).json({
        sellers: sellersWithStats,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0,
            pages: Math.ceil((count || 0) / parseInt(limit))
        }
    });
}));

// GET /api/sellers/:id - Détails d'un vendeur spécifique
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Récupérer le vendeur avec infos user
    const { data: seller, error } = await supabase
        .from('vendeurs')
        .select(`
            id,
            nom_boutique,
            description,
            siret,
            is_verified,
            created_at,
            user:users(id, nom, prenom)
        `)
        .eq('id', id)
        .single();

    if (error || !seller) {
        return res.status(404).json({ error: 'Vendeur non trouvé' });
    }

    // Statistiques publiques
    const { count: totalProducts } = await supabase
        .from('produits')
        .select('*', { count: 'exact', head: true })
        .eq('vendeur_id', id)
        .eq('is_active', true);

    // Calculer note moyenne des produits du vendeur
    const { data: products } = await supabase
        .from('produits')
        .select('id')
        .eq('vendeur_id', id)
        .eq('is_active', true);

    let totalRating = 0;
    let totalComments = 0;

    if (products && products.length > 0) {
        for (const product of products) {
            const { data: comments } = await supabase
                .from('commentaires')
                .select('note')
                .eq('produit_id', product.id)
                .eq('is_approved', true);

            if (comments && comments.length > 0) {
                totalRating += comments.reduce((sum, c) => sum + c.note, 0);
                totalComments += comments.length;
            }
        }
    }

    const averageRating = totalComments > 0 ? totalRating / totalComments : 0;

    res.status(200).json({
        seller: {
            ...seller,
            total_products: totalProducts || 0,
            average_rating: Math.round(averageRating * 10) / 10,
            total_reviews: totalComments
        }
    });
}));

// POST /api/sellers - Créer un profil vendeur (nécessite rôle VENDEUR)
router.post('/', authenticate, authorize('VENDEUR', 'ADMIN'), asyncHandler(async (req, res) => {
    const { nom_boutique, description, siret } = req.body;

    // Validation
    if (!nom_boutique || !siret) {
        return res.status(400).json({
            error: 'Champs obligatoires manquants',
            required: ['nom_boutique', 'siret']
        });
    }

    // Validation format SIRET (14 chiffres)
    if (!/^\d{14}$/.test(siret)) {
        return res.status(400).json({ error: 'Format SIRET invalide (14 chiffres requis)' });
    }

    // Vérifier que le SIRET n'existe pas déjà
    const { data: existingSiret } = await supabase
        .from('vendeurs')
        .select('id')
        .eq('siret', siret)
        .single();

    if (existingSiret) {
        return res.status(409).json({ error: 'Ce SIRET est déjà enregistré' });
    }

    // Vérifier que l'utilisateur n'a pas déjà un profil vendeur
    const { data: existingVendeur } = await supabase
        .from('vendeurs')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

    if (existingVendeur) {
        return res.status(409).json({ error: 'Vous avez déjà un profil vendeur' });
    }

    // Créer le profil vendeur
    const { data: seller, error } = await supabase
        .from('vendeurs')
        .insert({
            user_id: req.user.id,
            nom_boutique: nom_boutique.trim(),
            description: description?.trim() || null,
            siret,
            is_verified: false
        })
        .select()
        .single();

    if (error) throw error;

    res.status(201).json({
        message: 'Profil vendeur créé, en attente de vérification',
        seller
    });
}));

// PUT /api/sellers/:id - Mise à jour du profil vendeur
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nom_boutique, description } = req.body;

    // Récupérer le vendeur
    const { data: seller } = await supabase
        .from('vendeurs')
        .select('user_id')
        .eq('id', id)
        .single();

    if (!seller) {
        return res.status(404).json({ error: 'Vendeur non trouvé' });
    }

    // Vérifier les permissions (vendeur propriétaire ou ADMIN)
    if (req.user.role.nom !== 'ADMIN' && seller.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Vous ne pouvez modifier que votre propre profil' });
    }

    // Construire l'objet de mise à jour
    const updates = {};
    if (nom_boutique !== undefined) {
        if (nom_boutique.trim().length === 0) {
            return res.status(400).json({ error: 'Le nom de la boutique ne peut pas être vide' });
        }
        updates.nom_boutique = nom_boutique.trim();
    }
    if (description !== undefined) {
        updates.description = description?.trim() || null;
    }

    // Mettre à jour le profil
    const { data: updatedSeller, error } = await supabase
        .from('vendeurs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    res.status(200).json({
        message: 'Profil vendeur mis à jour',
        seller: updatedSeller
    });
}));

// PATCH /api/sellers/:id/verify - Vérifier un vendeur (ADMIN uniquement)
router.patch('/:id/verify', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Vérifier que le vendeur existe
    const { data: seller } = await supabase
        .from('vendeurs')
        .select('id, is_verified')
        .eq('id', id)
        .single();

    if (!seller) {
        return res.status(404).json({ error: 'Vendeur non trouvé' });
    }

    if (seller.is_verified) {
        return res.status(400).json({ error: 'Ce vendeur est déjà vérifié' });
    }

    // Mettre is_verified = true
    const { data: updatedSeller, error } = await supabase
        .from('vendeurs')
        .update({ is_verified: true })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    // TODO: Notifier le vendeur par email (Brevo integration)

    res.status(200).json({
        message: 'Vendeur vérifié avec succès',
        seller: updatedSeller
    });
}));

// GET /api/sellers/:id/products - Récupérer les produits d'un vendeur
router.get('/:id/products', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        page = 1,
        limit = 20,
        active,
        category_id,
        sort_by = 'created_at',
        order = 'desc'
    } = req.query;

    // Vérifier que le vendeur existe
    const { data: seller } = await supabase
        .from('vendeurs')
        .select('id')
        .eq('id', id)
        .single();

    if (!seller) {
        return res.status(404).json({ error: 'Vendeur non trouvé' });
    }

    // Construction de la requête
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
            categorie:categories(id, nom)
        `, { count: 'exact' })
        .eq('vendeur_id', id);

    // Filtre par statut actif
    if (active !== undefined) {
        query = query.eq('is_active', active === 'true');
    }

    // Filtre par catégorie
    if (category_id) {
        query = query.eq('categorie_id', category_id);
    }

    // Tri et pagination
    const validSortFields = ['prix', 'created_at', 'nom', 'stock'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    query = query.order(sortField, { ascending: order === 'asc' });

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: products, error, count } = await query;

    if (error) throw error;

    res.status(200).json({
        products: products || [],
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0,
            pages: Math.ceil((count || 0) / parseInt(limit))
        }
    });
}));

// GET /api/sellers/:id/orders - Récupérer les commandes contenant les produits d'un vendeur
router.get('/:id/orders', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    // Vérifier que le vendeur existe
    const { data: seller } = await supabase
        .from('vendeurs')
        .select('user_id')
        .eq('id', id)
        .single();

    if (!seller) {
        return res.status(404).json({ error: 'Vendeur non trouvé' });
    }

    // Vérifier les permissions (vendeur propriétaire ou ADMIN)
    if (req.user.role.nom !== 'ADMIN' && seller.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Accès refusé' });
    }

    // Récupérer les commandes contenant les produits du vendeur
    // Note: Cette requête nécessite de joindre items_commande avec produits
    const { data: orderItems } = await supabase
        .from('items_commande')
        .select(`
            commande_id,
            produit:produits!inner(vendeur_id)
        `)
        .eq('produit.vendeur_id', id);

    if (!orderItems || orderItems.length === 0) {
        return res.status(200).json({
            orders: [],
            pagination: { page: 1, limit: parseInt(limit), total: 0, pages: 0 }
        });
    }

    // Extraire les IDs de commandes uniques
    const orderIds = [...new Set(orderItems.map(item => item.commande_id))];

    // Récupérer les détails des commandes
    let query = supabase
        .from('commandes')
        .select(`
            id,
            date_commande,
            statut,
            total,
            adresse_livraison,
            user:users(nom, prenom, email)
        `, { count: 'exact' })
        .in('id', orderIds);

    // Filtre par statut
    if (status) {
        query = query.eq('statut', status);
    }

    query = query.order('date_commande', { ascending: false });

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: orders, error, count } = await query;

    if (error) throw error;

    res.status(200).json({
        orders: orders || [],
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0,
            pages: Math.ceil((count || 0) / parseInt(limit))
        }
    });
}));

// DELETE /api/sellers/:id - Supprimer un profil vendeur (ADMIN)
router.delete('/:id', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Vérifier que le vendeur existe
    const { data: seller } = await supabase
        .from('vendeurs')
        .select('id')
        .eq('id', id)
        .single();

    if (!seller) {
        return res.status(404).json({ error: 'Vendeur non trouvé' });
    }

    // Vérifier les commandes en cours
    const { data: orderItems } = await supabase
        .from('items_commande')
        .select(`
            commande:commandes!inner(statut),
            produit:produits!inner(vendeur_id)
        `)
        .eq('produit.vendeur_id', id)
        .in('commande.statut', ['EN_ATTENTE', 'EN_PREPARATION', 'EXPEDIE']);

    if (orderItems && orderItems.length > 0) {
        return res.status(400).json({
            error: 'Impossible de supprimer ce vendeur car il a des commandes en cours',
            pending_orders: orderItems.length
        });
    }

    // Désactiver tous les produits du vendeur
    await supabase
        .from('produits')
        .update({ is_active: false })
        .eq('vendeur_id', id);

    // Supprimer le profil vendeur
    const { error } = await supabase
        .from('vendeurs')
        .delete()
        .eq('id', id);

    if (error) throw error;

    res.status(200).json({ message: 'Profil vendeur supprimé avec succès' });
}));

module.exports = router;
