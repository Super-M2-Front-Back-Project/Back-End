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
const { 
    clientsGetController, 
    clientsGetByIdController,
    clientsPutController,
    clientsPatchController,
    clientsDeleteController,
    clientsGetCommandsController,
    clientsGetCommentsController
} = require('../controller/clientsController');

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

    const result = await clientsGetController(role, search, page, limit, sort_by, order);

    res.status(200).json(result);
}));

// GET /api/clients/:id - Détails d'un utilisateur spécifique
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Vérifier les permissions (ADMIN ou utilisateur lui-même)
    if (req.user.role.name !== 'ADMIN' && req.user.id !== id) {
        return res.status(403).json({ error: 'Accès refusé' });
    }

    const client = await clientsGetByIdController(id);

    res.status(200).json({
        client
    });
}));

// PUT /api/clients/:id - Mise à jour des informations d'un utilisateur
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { lastname, firstname, email, phone, street, postal_code, city, birthdate } = req.body;

    // Vérifier les permissions (utilisateur lui-même ou ADMIN)
    if (req.user.role.name !== 'ADMIN' && req.user.id !== id) {
        return res.status(403).json({ error: 'Accès refusé' });
    }

    const client = await clientsPutController(id, lastname, firstname, email, phone, street, postal_code, city, birthdate);
    res.status(200).json({
        message: 'Profil mis à jour avec succès',
        client
    });
}));

// PATCH /api/clients/:id/change-role - Modifier le rôle d'un utilisateur (ADMIN)
router.patch('/:id/change-role', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role_name } = req.body;

    if (!role_name) {
        return res.status(400).json({ error: 'Nom du rôle requis (CLIENT, VENDEUR, ADMIN)' });
    }

    const client = await clientsPatchController(id, role_name);
    res.status(200).json({
        message: 'Rôle mis à jour avec succès',
        client
    });
}));

// DELETE /api/clients/:id - Supprimer un compte utilisateur
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Vérifier les permissions (utilisateur lui-même ou ADMIN)
    if (req.user.role.name !== 'ADMIN' && req.user.id !== id) {
        return res.status(403).json({ error: 'Accès refusé' });
    }

    const client = await clientsDeleteController(id);

    res.status(200).json({ message: 'Compte supprimé avec succès' });
}));

// GET /api/clients/:id/orders - Récupérer les commandes d'un utilisateur
router.get('/:id/orders', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 20, status } = req.query;

    // Vérifier les permissions (utilisateur lui-même ou ADMIN)
    if (req.user.role.name !== 'ADMIN' && req.user.id !== id) {
        return res.status(403).json({ error: 'Accès refusé' });
    }

    const result = await clientsGetCommandsController(id, page, limit, status);

    res.status(200).json(result);
}));

// GET /api/clients/:id/comments - Récupérer les commentaires d'un utilisateur
router.get('/:id/comments', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Les utilisateurs peuvent voir leurs propres commentaires (approuvés ou non)
    // Les ADMIN voient tous les commentaires de tous les utilisateurs
    // Les autres ne peuvent voir que les commentaires approuvés

    const result = await clientsGetCommentsController(req.user, id, page, limit);

    res.status(200).json(result);
}));

module.exports = router;
