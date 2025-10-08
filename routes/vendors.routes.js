/**
 * Routes de gestion des vendeurs
 *
 * Gestion des profils vendeurs et leurs opérations
 * - Liste des vendeurs
 * - Profil vendeur
 * - Vérification vendeur (ADMIN)
 * - Statistiques vendeur
 * - Gestion commission
 */

const express = require('express');
const router = express.Router();

// GET /api/vendors - Liste tous les vendeurs
router.get('/', async (req, res) => {
    try {
        // TODO: Filtres : verified, active, etc.
        // TODO: Pagination
        // TODO: Récupérer la liste des vendeurs avec infos user

        res.status(200).json({
            vendors: [],
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

// GET /api/vendors/:id - Détails d'un vendeur spécifique
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // TODO: Récupérer les informations du vendeur
        // TODO: Inclure infos user, statistiques publiques

        res.status(200).json({
            vendor: {
                id,
                user_id: 'user_uuid',
                nom_boutique: 'Ma Boutique',
                description: 'Description de la boutique',
                siret: '12345678901234',
                commission_pourcent: 15.5,
                is_verified: true,
                created_at: new Date()
            }
        });
    } catch (error) {
        res.status(404).json({ error: 'Vendeur non trouvé' });
    }
});

// POST /api/vendors - Créer un profil vendeur (nécessite rôle VENDEUR)
router.post('/', async (req, res) => {
    try {
        const { user_id, nom_boutique, description, siret } = req.body;

        // TODO: Vérifier que l'utilisateur a le rôle VENDEUR
        // TODO: Valider les données (SIRET unique, format valide)
        // TODO: Créer l'enregistrement vendeur
        // TODO: is_verified = false par défaut

        res.status(201).json({
            message: 'Profil vendeur créé, en attente de vérification',
            vendor: { id: 'new_vendor_id' }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// PUT /api/vendors/:id - Mise à jour du profil vendeur
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nom_boutique, description } = req.body;

        // TODO: Vérifier que l'utilisateur est le vendeur ou ADMIN
        // TODO: Validation des données
        // TODO: Mettre à jour le profil

        res.status(200).json({
            message: 'Profil vendeur mis à jour',
            vendor: { id, nom_boutique, description }
        });
    } catch (error) {
        res.status(403).json({ error: 'Action non autorisée' });
    }
});

// PATCH /api/vendors/:id/verify - Vérifier un vendeur (ADMIN uniquement)
router.patch('/:id/verify', async (req, res) => {
    try {
        const { id } = req.params;

        // TODO: Vérifier que l'utilisateur est ADMIN
        // TODO: Mettre is_verified = true
        // TODO: Notifier le vendeur par email

        res.status(200).json({
            message: 'Vendeur vérifié avec succès',
            vendor: { id, is_verified: true }
        });
    } catch (error) {
        res.status(403).json({ error: 'Action non autorisée' });
    }
});

// PATCH /api/vendors/:id/commission - Modifier la commission d'un vendeur (ADMIN)
router.patch('/:id/commission', async (req, res) => {
    try {
        const { id } = req.params;
        const { commission_pourcent } = req.body;

        // TODO: Vérifier que l'utilisateur est ADMIN
        // TODO: Valider que commission_pourcent est entre 0 et 100
        // TODO: Mettre à jour la commission

        res.status(200).json({
            message: 'Commission mise à jour',
            vendor: { id, commission_pourcent }
        });
    } catch (error) {
        res.status(403).json({ error: 'Action non autorisée' });
    }
});

// GET /api/vendors/:id/products - Récupérer les produits d'un vendeur
router.get('/:id/products', async (req, res) => {
    try {
        const { id } = req.params;

        // TODO: Récupérer tous les produits du vendeur
        // TODO: Filtres : actifs, catégorie, prix, etc.
        // TODO: Pagination

        res.status(200).json({
            products: [],
            pagination: {
                page: 1,
                limit: 10,
                total: 0
            }
        });
    } catch (error) {
        res.status(404).json({ error: 'Vendeur non trouvé' });
    }
});

// GET /api/vendors/:id/orders - Récupérer les commandes contenant les produits d'un vendeur
router.get('/:id/orders', async (req, res) => {
    try {
        const { id } = req.params;

        // TODO: Vérifier que l'utilisateur est le vendeur ou ADMIN
        // TODO: Récupérer les commandes avec items du vendeur
        // TODO: Calculer commissions
        // TODO: Filtres par statut, date

        res.status(200).json({
            orders: [],
            stats: {
                total_orders: 0,
                total_revenue: 0,
                total_commission: 0
            }
        });
    } catch (error) {
        res.status(403).json({ error: 'Action non autorisée' });
    }
});

// GET /api/vendors/:id/stats - Statistiques du vendeur
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;

        // TODO: Vérifier que l'utilisateur est le vendeur ou ADMIN
        // TODO: Calculer statistiques :
        //   - Nombre de produits actifs
        //   - Nombre de ventes
        //   - Chiffre d'affaires
        //   - Commissions totales
        //   - Note moyenne des produits
        //   - Évolution mensuelle

        res.status(200).json({
            stats: {
                total_products: 0,
                active_products: 0,
                total_sales: 0,
                total_revenue: 0,
                total_commission: 0,
                average_rating: 0,
                monthly_evolution: []
            }
        });
    } catch (error) {
        res.status(403).json({ error: 'Action non autorisée' });
    }
});

// DELETE /api/vendors/:id - Supprimer un profil vendeur (ADMIN)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // TODO: Vérifier que l'utilisateur est ADMIN
        // TODO: Désactiver tous les produits du vendeur
        // TODO: Supprimer ou désactiver le profil vendeur
        // TODO: Gérer les commandes en cours

        res.status(200).json({ message: 'Profil vendeur supprimé' });
    } catch (error) {
        res.status(403).json({ error: 'Action non autorisée' });
    }
});

module.exports = router;
