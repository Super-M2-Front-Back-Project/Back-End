const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');
const { getWishlist, postWishlist, deleteWishlistItem } = require('../controller/wishlistController');

const router = express.Router();

router.get('/get', asyncHandler(async (req, res) => {
    try {
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: 'un utilisateur est requis' });
        }

        const wishlist = await getWishlist(user_id);
        res.json(wishlist);
    } catch (error) {
        console.error('Erreur lors de la récupération de la wishlist:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
}));

router.post('/post', asyncHandler(async (req, res) => {
    try {
        const { user_id, item_id } = req.body;

        if (!user_id || !item_id) {
            return res.status(400).json({ error: 'un utilisateur et un produit sont requis' });
        }

        const result = await postWishlist(user_id, item_id);
        res.status(201).json("Ajout du produit à la wishlist réussi", result);

    } catch (error) {
        console.error('Erreur lors de l\'ajout à la wishlist:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
}));

router.delete('/delete', asyncHandler(async (req, res) => {
    const { item_id, user_id } = req.body;

    if (!item_id) {
        return res.status(400).json({ error: 'un produit est requis' });
    }

    const result = await deleteWishlistItem(item_id, user_id);
    res.status(200).json("Suppression du produit de la wishlist réussi", result);
}));


module.exports = router;
