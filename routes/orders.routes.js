/**
 * Routes de gestion des commandes
 *
 * Opérations sur les commandes
 * - Liste des commandes
 * - Détails d'une commande
 * - Création de commande
 * - Modification du statut
 * - Historique
 */

const express = require('express');
const router = express.Router();

// GET /api/orders - Liste des commandes
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, statut, date_debut, date_fin } = req.query;

        // TODO: Récupérer user_id et role depuis le token
        // TODO: Si CLIENT : ses propres commandes
        // TODO: Si VENDEUR : commandes contenant ses produits
        // TODO: Si ADMIN : toutes les commandes
        // TODO: Filtres par statut, dates
        // TODO: Pagination

        res.status(200).json({
            orders: [],
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

// GET /api/orders/:id - Détails d'une commande spécifique
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // TODO: Récupérer la commande avec tous les items
        // TODO: Vérifier les permissions :
        //   - CLIENT : uniquement ses commandes
        //   - VENDEUR : commandes contenant ses produits
        //   - ADMIN : toutes
        // TODO: Inclure détails produits, vendeurs

        res.status(200).json({
            order: {
                id,
                user_id: 'user_uuid',
                date_commande: new Date(),
                statut: 'EN_ATTENTE',
                total: 0,
                adresse_livraison: '123 Rue Example',
                items: [],
                created_at: new Date()
            }
        });
    } catch (error) {
        res.status(404).json({ error: 'Commande non trouvée' });
    }
});

// POST /api/orders - Créer une nouvelle commande
router.post('/', async (req, res) => {
    try {
        const { adresse_livraison } = req.body;

        // TODO: Récupérer user_id depuis le token
        // TODO: Récupérer le panier de l'utilisateur
        // TODO: Valider le panier (produits actifs, stock disponible)
        // TODO: Créer la commande
        // TODO: Copier les items du panier vers items_commande avec prix figé
        // TODO: Déduire les stocks
        // TODO: Vider le panier
        // TODO: Envoyer notifications (email, etc.)

        res.status(201).json({
            message: 'Commande créée avec succès',
            order: {
                id: 'new_order_id',
                total: 0,
                statut: 'EN_ATTENTE'
            }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// PATCH /api/orders/:id/status - Modifier le statut d'une commande
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { statut } = req.body;

        // TODO: Vérifier les permissions
        // TODO: Valider le statut (EN_ATTENTE, EN_PREPARATION, EXPEDIE, LIVRE, ANNULE)
        // TODO: Vérifier les transitions de statut autorisées
        // TODO: Mettre à jour le statut
        // TODO: Notifier l'utilisateur

        res.status(200).json({
            message: 'Statut de la commande mis à jour',
            order: { id, statut }
        });
    } catch (error) {
        res.status(403).json({ error: 'Action non autorisée' });
    }
});

// POST /api/orders/:id/cancel - Annuler une commande
router.post('/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;
        const { raison } = req.body;

        // TODO: Vérifier les permissions (client propriétaire ou ADMIN)
        // TODO: Vérifier que la commande peut être annulée (pas déjà expédiée)
        // TODO: Remettre le stock des produits
        // TODO: Mettre statut à ANNULE
        // TODO: Enregistrer la raison d'annulation
        // TODO: Notifier vendeurs et client

        res.status(200).json({
            message: 'Commande annulée avec succès',
            order: { id, statut: 'ANNULE' }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// GET /api/orders/:id/tracking - Suivi de la commande
router.get('/:id/tracking', async (req, res) => {
    try {
        const { id } = req.params;

        // TODO: Récupérer l'historique des changements de statut
        // TODO: Informations de livraison si disponibles

        res.status(200).json({
            order_id: id,
            current_status: 'EN_PREPARATION',
            tracking_history: [
                { statut: 'EN_ATTENTE', date: new Date() },
                { statut: 'EN_PREPARATION', date: new Date() }
            ]
        });
    } catch (error) {
        res.status(404).json({ error: 'Commande non trouvée' });
    }
});

// GET /api/orders/:id/invoice - Télécharger la facture
router.get('/:id/invoice', async (req, res) => {
    try {
        const { id } = req.params;

        // TODO: Vérifier permissions (client propriétaire, vendeur concerné, ou ADMIN)
        // TODO: Générer PDF de la facture
        // TODO: Inclure détails commande, items

        res.status(200).json({
            message: 'Facture générée',
            invoice_url: 'url_to_pdf'
        });
    } catch (error) {
        res.status(404).json({ error: 'Commande non trouvée' });
    }
});

module.exports = router;
