/**
 * Routeur centralisé pour toutes les routes API
 *
 * Ce fichier regroupe et exporte toutes les routes de l'application
 * organisées par domaine fonctionnel.
 *
 * Note: Ne pas confondre avec index.js qui est l'ENTRY POINT du serveur.
 * Ce fichier définit les ENDPOINTS de l'API.
 */

const express = require('express');
const router = express.Router();

// Import des routes par domaine
const authRoutes = require('./auth.routes');
const clientsRoutes = require('./clients.routes');
const sellersRoutes = require('./sellers.routes');
const productsRoutes = require('./products.routes');
const categoriesRoutes = require('./categories.routes');
const cartRoutes = require('./cart.routes');
const ordersRoutes = require('./orders.routes');
const commentsRoutes = require('./comments.routes');
const wishlistRoutes = require('./wishlist.route');

// Montage des routes avec leurs préfixes
router.use('/auth', authRoutes);
router.use('/clients', clientsRoutes);
router.use('/sellers', sellersRoutes);
router.use('/products', productsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', ordersRoutes);
router.use('/comments', commentsRoutes);
router.use('/wishlist', wishlistRoutes);

// Route de santé / health check
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date(),
        service: 'Ultrathink API'
    });
});

module.exports = router;
