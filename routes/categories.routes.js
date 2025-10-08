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
const router = express.Router();

// GET /api/categories - Liste toutes les catégories
router.get('/', async (req, res) => {
    try {
        // TODO: Récupérer toutes les catégories
        // TODO: Inclure le nombre de produits actifs par catégorie
        // TODO: Option de tri

        res.status(200).json({
            categories: []
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/categories/:id - Détails d'une catégorie spécifique
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // TODO: Récupérer la catégorie
        // TODO: Inclure statistiques (nombre de produits, vendeurs)

        res.status(200).json({
            category: {
                id,
                nom: 'Électronique',
                description: 'Description de la catégorie',
                total_products: 150,
                total_vendors: 25
            }
        });
    } catch (error) {
        res.status(404).json({ error: 'Catégorie non trouvée' });
    }
});

// POST /api/categories - Créer une nouvelle catégorie (ADMIN)
router.post('/', async (req, res) => {
    try {
        const { nom, description } = req.body;

        // TODO: Vérifier que l'utilisateur est ADMIN
        // TODO: Validation des données
        // TODO: Vérifier que le nom n'existe pas déjà
        // TODO: Créer la catégorie

        res.status(201).json({
            message: 'Catégorie créée avec succès',
            category: { id: 'new_category_id', nom, description }
        });
    } catch (error) {
        res.status(403).json({ error: 'Action non autorisée' });
    }
});

// PUT /api/categories/:id - Mettre à jour une catégorie (ADMIN)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nom, description } = req.body;

        // TODO: Vérifier que l'utilisateur est ADMIN
        // TODO: Validation des données
        // TODO: Vérifier unicité du nom si modifié
        // TODO: Mettre à jour la catégorie

        res.status(200).json({
            message: 'Catégorie mise à jour',
            category: { id, nom, description }
        });
    } catch (error) {
        res.status(403).json({ error: 'Action non autorisée' });
    }
});

// DELETE /api/categories/:id - Supprimer une catégorie (ADMIN)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // TODO: Vérifier que l'utilisateur est ADMIN
        // TODO: Vérifier qu'il n'y a pas de produits liés
        // TODO: Ou réassigner les produits à une catégorie par défaut
        // TODO: Supprimer la catégorie

        res.status(200).json({ message: 'Catégorie supprimée avec succès' });
    } catch (error) {
        res.status(403).json({ error: 'Action non autorisée' });
    }
});

// GET /api/categories/:id/products - Récupérer les produits d'une catégorie
router.get('/:id/products', async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 20, sort_by, order } = req.query;

        // TODO: Récupérer les produits actifs de la catégorie
        // TODO: Pagination
        // TODO: Options de tri (prix, popularité, note)

        res.status(200).json({
            products: [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: 0,
                pages: 0
            }
        });
    } catch (error) {
        res.status(404).json({ error: 'Catégorie non trouvée' });
    }
});

module.exports = router;
