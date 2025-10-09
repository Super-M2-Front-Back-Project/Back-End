/**
 * Routes de gestion des utilisateurs
 *
 * CRUD et gestion des utilisateurs
 * - Liste des utilisateurs (ADMIN)
 * - Détails d'un utilisateur
 * - Mise à jour profil
 * - Désactivation/Activation compte
 * - Suppression compte
 */

const express = require('express');
const router = express.Router();

// GET /api/clients - Liste tous les utilisateurs (ADMIN uniquement)
router.get('/', async (req, res) => {
    try {
        // TODO: Vérifier que l'utilisateur est ADMIN
        // TODO: Pagination, filtres, recherche
        // TODO: Récupérer la liste des utilisateurs avec leur rôle

        res.status(200).json({
            clients: [],
            pagination: {
                page: 1,
                limit: 10,
                total: 0
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/clients/:id - Détails d'un utilisateur spécifique
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // TODO: Vérifier les permissions (ADMIN ou utilisateur lui-même)
        // TODO: Récupérer les informations de l'utilisateur
        // TODO: Inclure le rôle, profil vendeur si applicable

        res.status(200).json({
            client: {
                id,
                email: 'client@example.com',
                nom: 'Doe',
                prenom: 'John',
                role: { id: 1, nom: 'CLIENT' },
                is_active: true,
                created_at: new Date()
            }
        });
    } catch (error) {
        res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
});

// PUT /api/clients/:id - Mise à jour des informations d'un utilisateur
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nom, prenom, email } = req.body;

        // TODO: Vérifier les permissions (utilisateur lui-même ou ADMIN)
        // TODO: Validation des données
        // TODO: Vérifier unicité de l'email si modifié
        // TODO: Mettre à jour les informations

        res.status(200).json({
            message: 'Profil mis à jour avec succès',
            client: { id, nom, prenom, email }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// PATCH /api/clients/:id/toggle-status - Activer/Désactiver un compte utilisateur (ADMIN)
router.patch('/:id/toggle-status', async (req, res) => {
    try {
        const { id } = req.params;

        // TODO: Vérifier que l'utilisateur est ADMIN
        // TODO: Récupérer l'utilisateur
        // TODO: Inverser le statut is_active

        res.status(200).json({
            message: 'Statut du compte modifié',
            is_active: true
        });
    } catch (error) {
        res.status(403).json({ error: 'Action non autorisée' });
    }
});

// PATCH /api/clients/:id/change-role - Modifier le rôle d'un utilisateur (ADMIN)
router.patch('/:id/change-role', async (req, res) => {
    try {
        const { id } = req.params;
        const { role_id } = req.body;

        // TODO: Vérifier que l'utilisateur est ADMIN
        // TODO: Valider que le role_id existe
        // TODO: Si passage à VENDEUR, créer enregistrement dans vendeurs
        // TODO: Si retrait VENDEUR, désactiver produits du vendeur
        // TODO: Mettre à jour le rôle

        res.status(200).json({
            message: 'Rôle mis à jour avec succès',
            role: { id: role_id }
        });
    } catch (error) {
        res.status(403).json({ error: 'Action non autorisée' });
    }
});

// DELETE /api/clients/:id - Supprimer un compte utilisateur
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // TODO: Vérifier les permissions (utilisateur lui-même ou ADMIN)
        // TODO: Soft delete recommandé (is_active = false)
        // TODO: Ou supprimer définitivement selon politique
        // TODO: Gérer les dépendances (commandes, commentaires, etc.)

        res.status(200).json({ message: 'Compte supprimé avec succès' });
    } catch (error) {
        res.status(403).json({ error: 'Action non autorisée' });
    }
});

// GET /api/clients/:id/orders - Récupérer les commandes d'un utilisateur
router.get('/:id/orders', async (req, res) => {
    try {
        const { id } = req.params;

        // TODO: Vérifier les permissions (utilisateur lui-même ou ADMIN)
        // TODO: Récupérer la liste des commandes de l'utilisateur
        // TODO: Pagination

        res.status(200).json({
            orders: [],
            pagination: {
                page: 1,
                limit: 10,
                total: 0
            }
        });
    } catch (error) {
        res.status(403).json({ error: 'Action non autorisée' });
    }
});

// GET /api/clients/:id/comments - Récupérer les commentaires d'un utilisateur
router.get('/:id/comments', async (req, res) => {
    try {
        const { id } = req.params;

        // TODO: Récupérer la liste des commentaires de l'utilisateur
        // TODO: Filtrer selon permissions

        res.status(200).json({
            comments: [],
            pagination: {
                page: 1,
                limit: 10,
                total: 0
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
