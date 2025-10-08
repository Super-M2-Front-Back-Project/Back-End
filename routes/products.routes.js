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
const router = express.Router();

// GET /api/products - Liste tous les produits avec filtres
router.get('/', async (req, res) => {
    try {
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

        // TODO: Filtrer les produits actifs uniquement (pour clients)
        // TODO: Recherche par nom/description
        // TODO: Filtres par catégorie, vendeur, prix
        // TODO: Tri (prix, date, popularité, note)
        // TODO: Pagination
        // TODO: Inclure catégorie, vendeur, note moyenne

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
        res.status(500).json({ error: error.message });
    }
});

// GET /api/products/search - Recherche avancée de produits
router.get('/search', async (req, res) => {
    try {
        const { q, filters } = req.query;

        // TODO: Recherche full-text sur nom et description
        // TODO: Filtres avancés
        // TODO: Suggestions de recherche
        // TODO: Historique de recherche

        res.status(200).json({
            results: [],
            suggestions: [],
            total: 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/products/:id - Détails d'un produit spécifique
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // TODO: Récupérer le produit avec toutes les relations
        // TODO: Inclure catégorie, vendeur, commentaires
        // TODO: Calculer note moyenne
        // TODO: Produits similaires

        res.status(200).json({
            product: {
                id,
                nom: 'Nom du produit',
                description: 'Description détaillée',
                prix: 29.99,
                stock: 100,
                image_url: 'url',
                is_active: true,
                categorie: { id: 1, nom: 'Électronique' },
                vendeur: { id: 1, nom_boutique: 'Ma Boutique' },
                average_rating: 4.5,
                total_comments: 25,
                created_at: new Date()
            }
        });
    } catch (error) {
        res.status(404).json({ error: 'Produit non trouvé' });
    }
});

// POST /api/products - Créer un nouveau produit (VENDEUR/ADMIN)
router.post('/', async (req, res) => {
    try {
        const {
            nom,
            description,
            prix,
            categorie_id,
            stock,
            image_url
        } = req.body;

        // TODO: Vérifier que l'utilisateur est VENDEUR ou ADMIN
        // TODO: Récupérer vendeur_id depuis l'utilisateur connecté
        // TODO: Validation des données
        // TODO: Upload image vers Supabase Storage si nécessaire
        // TODO: Créer le produit

        res.status(201).json({
            message: 'Produit créé avec succès',
            product: { id: 'new_product_id' }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// PUT /api/products/:id - Mettre à jour un produit
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nom, description, prix, stock, image_url } = req.body;

        // TODO: Vérifier que l'utilisateur est le vendeur du produit ou ADMIN
        // TODO: Validation des données
        // TODO: Upload nouvelle image si nécessaire
        // TODO: Mettre à jour le produit

        res.status(200).json({
            message: 'Produit mis à jour',
            product: { id }
        });
    } catch (error) {
        res.status(403).json({ error: 'Action non autorisée' });
    }
});

// PATCH /api/products/:id/toggle-status - Activer/Désactiver un produit
router.patch('/:id/toggle-status', async (req, res) => {
    try {
        const { id } = req.params;

        // TODO: Vérifier que l'utilisateur est le vendeur ou ADMIN
        // TODO: Inverser is_active

        res.status(200).json({
            message: 'Statut du produit modifié',
            is_active: true
        });
    } catch (error) {
        res.status(403).json({ error: 'Action non autorisée' });
    }
});

// PATCH /api/products/:id/stock - Mettre à jour le stock d'un produit
router.patch('/:id/stock', async (req, res) => {
    try {
        const { id } = req.params;
        const { stock, operation = 'set' } = req.body; // set, add, subtract

        // TODO: Vérifier que l'utilisateur est le vendeur ou ADMIN
        // TODO: Validation (stock >= 0)
        // TODO: Opérations : set (définir), add (ajouter), subtract (retirer)
        // TODO: Mettre à jour le stock

        res.status(200).json({
            message: 'Stock mis à jour',
            stock: stock
        });
    } catch (error) {
        res.status(403).json({ error: 'Action non autorisée' });
    }
});

// DELETE /api/products/:id - Supprimer un produit
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // TODO: Vérifier que l'utilisateur est le vendeur ou ADMIN
        // TODO: Vérifier qu'il n'y a pas de commandes en cours
        // TODO: Soft delete recommandé (is_active = false)
        // TODO: Ou suppression définitive si pas de dépendances

        res.status(200).json({ message: 'Produit supprimé' });
    } catch (error) {
        res.status(403).json({ error: 'Action non autorisée' });
    }
});

// GET /api/products/:id/comments - Récupérer les commentaires d'un produit
router.get('/:id/comments', async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10, sort_by = 'created_at' } = req.query;

        // TODO: Récupérer les commentaires approuvés du produit
        // TODO: Inclure infos utilisateur (nom, rôle si vendeur)
        // TODO: Pagination et tri

        res.status(200).json({
            comments: [],
            stats: {
                average_rating: 0,
                total: 0,
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

// GET /api/products/:id/related - Produits similaires/recommandés
router.get('/:id/related', async (req, res) => {
    try {
        const { id } = req.params;

        // TODO: Trouver produits de la même catégorie
        // TODO: Même vendeur
        // TODO: Prix similaire
        // TODO: Limiter à 5-10 produits

        res.status(200).json({
            related_products: []
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
