/**
 * Routes de gestion des utilisateurs
 *
 * CRUD et gestion des utilisateurs
 * - Liste des utilisateurs (ADMIN)
 * - Détails d'un utilisateur
 * - Mise à jour profil
 * - Gestion des rôles
 * - Suppression compte
 */

const express = require('express');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticate, authorize, checkOwnership } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// GET /api/clients - Liste tous les utilisateurs (ADMIN uniquement)
router.get('/', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        role,
        search,
        sort_by = 'created_at',
        order = 'desc'
    } = req.query;

    // Construction de la requête
    let query = supabase
        .from('users')
        .select(`
            id,
            email,
            nom,
            prenom,
            telephone,
            rue,
            code_postal,
            ville,
            created_at,
            role:roles(id, nom)
        `, { count: 'exact' });

    // Filtre par rôle
    if (role) {
        const { data: roleData } = await supabase
            .from('roles')
            .select('id')
            .eq('nom', role.toUpperCase())
            .single();

        if (roleData) {
            query = query.eq('role_id', roleData.id);
        }
    }

    // Recherche par nom, prénom ou email
    if (search) {
        query = query.or(`nom.ilike.%${search}%,prenom.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Tri et pagination
    query = query.order(sort_by, { ascending: order === 'asc' });
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: users, error, count } = await query;

    if (error) throw error;

    res.status(200).json({
        clients: users || [],
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0,
            pages: Math.ceil((count || 0) / parseInt(limit))
        }
    });
}));

// GET /api/clients/:id - Détails d'un utilisateur spécifique
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Vérifier les permissions (ADMIN ou utilisateur lui-même)
    if (req.user.role.nom !== 'ADMIN' && req.user.id !== id) {
        return res.status(403).json({ error: 'Accès refusé' });
    }

    // Récupérer l'utilisateur
    const { data: user, error } = await supabase
        .from('users')
        .select(`
            id,
            email,
            nom,
            prenom,
            date_naissance,
            rue,
            code_postal,
            ville,
            telephone,
            created_at,
            role:roles(id, nom)
        `)
        .eq('id', id)
        .single();

    if (error || !user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Si l'utilisateur est VENDEUR, inclure le profil vendeur
    if (user.role.nom === 'VENDEUR') {
        const { data: vendeur } = await supabase
            .from('vendeurs')
            .select('id, nom_boutique, description, siret, is_verified')
            .eq('user_id', id)
            .single();

        user.vendeur = vendeur || null;
    }

    res.status(200).json({
        client: user
    });
}));

// PUT /api/clients/:id - Mise à jour des informations d'un utilisateur
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nom, prenom, email, telephone, rue, code_postal, ville, date_naissance } = req.body;

    // Vérifier les permissions (utilisateur lui-même ou ADMIN)
    if (req.user.role.nom !== 'ADMIN' && req.user.id !== id) {
        return res.status(403).json({ error: 'Accès refusé' });
    }

    // Vérifier que l'utilisateur existe
    const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', id)
        .single();

    if (!existingUser) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Construire l'objet de mise à jour
    const updates = {};

    if (nom !== undefined) {
        if (nom.trim().length === 0) {
            return res.status(400).json({ error: 'Le nom ne peut pas être vide' });
        }
        updates.nom = nom.trim();
    }

    if (prenom !== undefined) {
        if (prenom.trim().length === 0) {
            return res.status(400).json({ error: 'Le prénom ne peut pas être vide' });
        }
        updates.prenom = prenom.trim();
    }

    if (email !== undefined) {
        const sanitizedEmail = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
            return res.status(400).json({ error: 'Format email invalide' });
        }

        // Vérifier unicité de l'email
        const { data: duplicate } = await supabase
            .from('users')
            .select('id')
            .eq('email', sanitizedEmail)
            .neq('id', id)
            .single();

        if (duplicate) {
            return res.status(409).json({ error: 'Cet email est déjà utilisé' });
        }

        updates.email = sanitizedEmail;
    }

    if (telephone !== undefined) updates.telephone = telephone?.trim() || null;
    if (rue !== undefined) updates.rue = rue?.trim();
    if (code_postal !== undefined) {
        if (code_postal && !/^\d{5}$/.test(code_postal)) {
            return res.status(400).json({ error: 'Code postal invalide (5 chiffres)' });
        }
        updates.code_postal = code_postal?.trim();
    }
    if (ville !== undefined) updates.ville = ville?.trim();
    if (date_naissance !== undefined) updates.date_naissance = date_naissance;

    // Mettre à jour l'utilisateur
    const { data: updatedUser, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    res.status(200).json({
        message: 'Profil mis à jour avec succès',
        client: updatedUser
    });
}));

// PATCH /api/clients/:id/change-role - Modifier le rôle d'un utilisateur (ADMIN)
router.patch('/:id/change-role', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role_nom } = req.body;

    if (!role_nom) {
        return res.status(400).json({ error: 'Nom du rôle requis (CLIENT, VENDEUR, ADMIN)' });
    }

    // Vérifier que l'utilisateur existe
    const { data: user } = await supabase
        .from('users')
        .select('id, role:roles(nom)')
        .eq('id', id)
        .single();

    if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Récupérer le rôle cible
    const { data: targetRole } = await supabase
        .from('roles')
        .select('id, nom')
        .eq('nom', role_nom.toUpperCase())
        .single();

    if (!targetRole) {
        return res.status(400).json({ error: 'Rôle invalide' });
    }

    const currentRole = user.role.nom;
    const newRole = targetRole.nom;

    // Si passage à VENDEUR, créer le profil vendeur
    if (newRole === 'VENDEUR' && currentRole !== 'VENDEUR') {
        // Vérifier qu'il n'a pas déjà un profil vendeur
        const { data: existingVendeur } = await supabase
            .from('vendeurs')
            .select('id')
            .eq('user_id', id)
            .single();

        if (!existingVendeur) {
            return res.status(400).json({
                error: 'L\'utilisateur doit d\'abord créer son profil vendeur via /api/sellers'
            });
        }
    }

    // Si retrait du rôle VENDEUR, désactiver ses produits
    if (currentRole === 'VENDEUR' && newRole !== 'VENDEUR') {
        const { data: vendeur } = await supabase
            .from('vendeurs')
            .select('id')
            .eq('user_id', id)
            .single();

        if (vendeur) {
            await supabase
                .from('produits')
                .update({ is_active: false })
                .eq('vendeur_id', vendeur.id);
        }
    }

    // Mettre à jour le rôle
    const { data: updatedUser, error } = await supabase
        .from('users')
        .update({ role_id: targetRole.id })
        .eq('id', id)
        .select('id, email, nom, prenom, role:roles(id, nom)')
        .single();

    if (error) throw error;

    res.status(200).json({
        message: 'Rôle mis à jour avec succès',
        client: updatedUser
    });
}));

// DELETE /api/clients/:id - Supprimer un compte utilisateur
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Vérifier les permissions (utilisateur lui-même ou ADMIN)
    if (req.user.role.nom !== 'ADMIN' && req.user.id !== id) {
        return res.status(403).json({ error: 'Accès refusé' });
    }

    // Vérifier que l'utilisateur existe
    const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('id', id)
        .single();

    if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier les commandes en cours
    const { data: pendingOrders } = await supabase
        .from('commandes')
        .select('id')
        .eq('user_id', id)
        .in('statut', ['EN_ATTENTE', 'EN_PREPARATION', 'EXPEDIE']);

    if (pendingOrders && pendingOrders.length > 0) {
        return res.status(400).json({
            error: 'Impossible de supprimer ce compte car il a des commandes en cours',
            pending_orders: pendingOrders.length
        });
    }

    // Supprimer l'utilisateur de Supabase Auth (cascade supprimera aussi de la table users)
    if (supabaseAdmin) {
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (authError) throw authError;
    } else {
        // Fallback: supprimer juste de la table users
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    res.status(200).json({ message: 'Compte supprimé avec succès' });
}));

// GET /api/clients/:id/orders - Récupérer les commandes d'un utilisateur
router.get('/:id/orders', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 20, status } = req.query;

    // Vérifier les permissions (utilisateur lui-même ou ADMIN)
    if (req.user.role.nom !== 'ADMIN' && req.user.id !== id) {
        return res.status(403).json({ error: 'Accès refusé' });
    }

    // Construction de la requête
    let query = supabase
        .from('commandes')
        .select(`
            id,
            date_commande,
            statut,
            total,
            adresse_livraison,
            created_at
        `, { count: 'exact' })
        .eq('user_id', id);

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

// GET /api/clients/:id/comments - Récupérer les commentaires d'un utilisateur
router.get('/:id/comments', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Les utilisateurs peuvent voir leurs propres commentaires (approuvés ou non)
    // Les ADMIN voient tous les commentaires de tous les utilisateurs
    // Les autres ne peuvent voir que les commentaires approuvés

    let query = supabase
        .from('commentaires')
        .select(`
            id,
            note,
            commentaire,
            is_approved,
            created_at,
            produit:produits(id, nom, image_url)
        `, { count: 'exact' })
        .eq('user_id', id);

    // Si ce n'est pas l'utilisateur lui-même ni un ADMIN, filtrer seulement les approuvés
    if (req.user.id !== id && req.user.role.nom !== 'ADMIN') {
        query = query.eq('is_approved', true);
    }

    query = query.order('created_at', { ascending: false });

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: comments, error, count } = await query;

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

module.exports = router;
