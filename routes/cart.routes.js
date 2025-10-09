const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', authenticate, asyncHandler(async (req, res) => {
    const { data: items } = await supabase
        .from('items_panier')
        .select('id, quantite, added_at, produit:produits(id, nom, prix, image_url)')
        .eq('user_id', req.user.id);

    const total = items.reduce((sum, item) => sum + (item.produit.prix * item.quantite), 0);

    res.json({ items, total, total_items: items.length });
}));

router.post('/items', authenticate, asyncHandler(async (req, res) => {
    const { produit_id, quantite = 1 } = req.body;

    const { data: item, error } = await supabase
        .from('items_panier')
        .insert({ user_id: req.user.id, produit_id, quantite })
        .select()
        .single();

    if (error) throw error;
    res.status(201).json({ item });
}));

router.put('/items/:item_id', authenticate, asyncHandler(async (req, res) => {
    const { quantite } = req.body;

    const { error } = await supabase
        .from('items_panier')
        .update({ quantite })
        .eq('id', req.params.item_id)
        .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Quantité mise à jour' });
}));

router.delete('/items/:item_id', authenticate, asyncHandler(async (req, res) => {
    const { error } = await supabase
        .from('items_panier')
        .delete()
        .eq('id', req.params.item_id)
        .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Produit retiré' });
}));

router.delete('/', authenticate, asyncHandler(async (req, res) => {
    await supabase.from('items_panier').delete().eq('user_id', req.user.id);
    res.json({ message: 'Panier vidé' });
}));

module.exports = router;
