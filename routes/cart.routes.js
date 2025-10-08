const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', authenticate, asyncHandler(async (req, res) => {
    const { data: panier } = await supabase
        .from('panier')
        .select('id, items:items_panier(id, quantite, produit:produits(id, nom, prix, image_url))')
        .eq('user_id', req.user.id)
        .single();

    const total = panier.items.reduce((sum, item) => sum + (item.produit.prix * item.quantite), 0);

    res.json({ ...panier, total, total_items: panier.items.length });
}));

router.post('/items', authenticate, asyncHandler(async (req, res) => {
    const { produit_id, quantite = 1 } = req.body;

    const { data: panier } = await supabase
        .from('panier')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

    const { data: item, error } = await supabase
        .from('items_panier')
        .insert({ panier_id: panier.id, produit_id, quantite })
        .select()
        .single();

    if (error) throw error;
    res.status(201).json({ item });
}));

router.put('/items/:item_id', authenticate, asyncHandler(async (req, res) => {
    const { item_id } = req.params;
    const { quantite } = req.body;

    const { error } = await supabase
        .from('items_panier')
        .update({ quantite })
        .eq('id', item_id);

    if (error) throw error;
    res.json({ message: 'Quantité mise à jour' });
}));

router.delete('/items/:item_id', authenticate, asyncHandler(async (req, res) => {
    const { error } = await supabase
        .from('items_panier')
        .delete()
        .eq('id', req.params.item_id);

    if (error) throw error;
    res.json({ message: 'Produit retiré' });
}));

router.delete('/', authenticate, asyncHandler(async (req, res) => {
    const { data: panier } = await supabase
        .from('panier')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

    await supabase.from('items_panier').delete().eq('panier_id', panier.id);
    res.json({ message: 'Panier vidé' });
}));

module.exports = router;
