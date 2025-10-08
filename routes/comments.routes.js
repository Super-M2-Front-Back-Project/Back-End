/**
 * Routes de gestion des commentaires
 *
 * CRUD et modération des commentaires produits
 * - Liste des commentaires
 * - Créer un commentaire
 * - Modifier/Supprimer son commentaire
 * - Modération (ADMIN)
 */

const express = require('express');
const router = express.Router();

// GET /api/comments - Liste des commentaires (avec filtres)
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            produit_id,
            user_id,
            is_approved,
            min_rating,
            max_rating
        } = req.query;

        // TODO: Récupérer role depuis le token
        // TODO: Si CLIENT : uniquement commentaires approuvés
        // TODO: Si ADMIN : tous les commentaires
        // TODO: Filtres par produit, utilisateur, note, statut
        // TODO: Pagination

        res.status(200).json({
            comments: [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: 0,
                pages: 0
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/comments/:id - Détails d'un commentaire spécifique
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // TODO: Récupérer le commentaire
        // TODO: Inclure infos utilisateur et produit

        res.status(200).json({
            comment: {
                id,
                produit_id: 'product_uuid',
                user_id: 'user_uuid',
                note: 5,
                commentaire: 'Excellent produit !',
                is_approved: true,
                created_at: new Date()
            }
        });
    } catch (error) {
        res.status(404).json({ error: 'Commentaire non trouvé' });
    }
});

// POST /api/comments - Créer un nouveau commentaire
router.post('/', async (req, res) => {
    try {
        const { produit_id, note, commentaire } = req.body;

        // TODO: Récupérer user_id depuis le token
        // TODO: Validation des données
        // TODO: Vérifier que note est entre 1 et 5
        // TODO: Vérifier que le produit existe
        // TODO: Optionnel : vérifier que l'utilisateur a acheté le produit
        // TODO: Créer le commentaire avec is_approved = false
        // TODO: Notifier ADMIN pour modération

        res.status(201).json({
            message: 'Commentaire créé, en attente de modération',
            comment: { id: 'new_comment_id' }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// PUT /api/comments/:id - Modifier son propre commentaire
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { note, commentaire } = req.body;

        // TODO: Vérifier que l'utilisateur est l'auteur du commentaire
        // TODO: Validation des données
        // TODO: Vérifier note entre 1 et 5
        // TODO: Mettre à jour le commentaire
        // TODO: Remettre is_approved = false si modifié

        res.status(200).json({
            message: 'Commentaire mis à jour, en attente de modération',
            comment: { id }
        });
    } catch (error) {
        res.status(403).json({ error: 'Action non autorisée' });
    }
});

// DELETE /api/comments/:id - Supprimer un commentaire
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // TODO: Vérifier permissions (auteur du commentaire ou ADMIN)
        // TODO: Supprimer le commentaire

        res.status(200).json({ message: 'Commentaire supprimé avec succès' });
    } catch (error) {
        res.status(403).json({ error: 'Action non autorisée' });
    }
});

// PATCH /api/comments/:id/approve - Approuver un commentaire (ADMIN)
router.patch('/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;

        // TODO: Vérifier que l'utilisateur est ADMIN
        // TODO: Mettre is_approved = true
        // TODO: Notifier l'auteur du commentaire

        res.status(200).json({
            message: 'Commentaire approuvé',
            comment: { id, is_approved: true }
        });
    } catch (error) {
        res.status(403).json({ error: 'Action non autorisée' });
    }
});

// PATCH /api/comments/:id/reject - Rejeter un commentaire (ADMIN)
router.patch('/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { raison } = req.body;

        // TODO: Vérifier que l'utilisateur est ADMIN
        // TODO: Supprimer ou marquer comme rejeté
        // TODO: Notifier l'auteur avec la raison du rejet

        res.status(200).json({ message: 'Commentaire rejeté' });
    } catch (error) {
        res.status(403).json({ error: 'Action non autorisée' });
    }
});

// GET /api/comments/pending - Commentaires en attente de modération (ADMIN)
router.get('/pending', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        // TODO: Vérifier que l'utilisateur est ADMIN
        // TODO: Récupérer tous les commentaires avec is_approved = false
        // TODO: Inclure infos produit et utilisateur
        // TODO: Pagination

        res.status(200).json({
            pending_comments: [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: 0
            }
        });
    } catch (error) {
        res.status(403).json({ error: 'Action non autorisée' });
    }
});

// GET /api/comments/stats - Statistiques des commentaires
router.get('/stats', async (req, res) => {
    try {
        const { produit_id } = req.query;

        // TODO: Si produit_id fourni : stats pour ce produit
        // TODO: Sinon : stats globales (ADMIN uniquement)
        // TODO: Calculer :
        //   - Note moyenne
        //   - Distribution des notes (1-5)
        //   - Nombre total de commentaires
        //   - Commentaires en attente

        res.status(200).json({
            stats: {
                average_rating: 0,
                total_comments: 0,
                pending_comments: 0,
                ratings_distribution: {
                    5: 0,
                    4: 0,
                    3: 0,
                    2: 0,
                    1: 0
                }
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/comments/:id/report - Signaler un commentaire inapproprié
router.post('/:id/report', async (req, res) => {
    try {
        const { id } = req.params;
        const { raison } = req.body;

        // TODO: Enregistrer le signalement
        // TODO: Notifier les ADMIN
        // TODO: Optionnel : masquer automatiquement après X signalements

        res.status(200).json({ message: 'Commentaire signalé, merci' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
