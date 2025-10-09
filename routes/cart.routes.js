const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');
const { postCart, getCart, updateCart, deleteCartItem, deleteCartByUser } = require('../controller/cartController');

const router = express.Router();

router.get('/get', asyncHandler(async (req, res) => {
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: 'un utilisateur est requis' });
    }

    const cart = await getCart(user_id);
    res.json(cart);
}));

router.post('/post', asyncHandler(async (req, res) => {
    try {
        const { user_id, item_id } = req.body;

        if (!user_id || !item_id) {
            return res.status(400).json({ error: 'un utilisateur et un produit sont requis' });
        }

        const result = await postCart(user_id, item_id);
        res.status(201).json(result);

    } catch (error) {
        console.error('Erreur lors de l\'ajout au panier:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }

    const result = await postCart(req, res);

    res.json(result);
}));

router.put('/update/:user_id', asyncHandler(async (req, res) => {
    const { user_id } = req.params;
    const { item_id, quantity } = req.body;

    if (!user_id || !item_id || !quantity) {
        return res.status(400).json({ error: 'un utilisateur, un produit et une quantité sont requis' });
    }

    const result = await updateCart(user_id, item_id, quantity);
    res.json(result);
}));

router.delete('/delete/item', asyncHandler(async (req, res) => {
    const { item_id, user_id } = req.body;

    if (!item_id) {
        return res.status(400).json({ error: 'un produit est requis' });
    }

    const result = await deleteCartItem(item_id, user_id);
    res.json(result);
}));

router.delete('/delete/all', asyncHandler(async (req, res) => {
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: 'un utilisateur est requis' });
    }

    const result = await deleteCartByUser(user_id);
    res.json(result);
}));


module.exports = router;
