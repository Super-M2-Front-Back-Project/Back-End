const { supabase } = require('../config/supabase');
const dotenv = require('dotenv');

dotenv.config();

const getWishlist = async (user_id) => {
    try {
        const { data: wishlist } = await supabase
            .from('wishlist')
            .select('*')
            .eq('user_id', user_id);

        return wishlist;
    } catch (error) {
        console.error('Erreur dans getWishlist:', error);
        throw error;
    }
};

const postWishlist = async (user_id, item_id) => {
    try {
        const { data: item_exists } = await supabase
            .from('produits')
            .select('id')
            .eq('produit_id', item_id)
            .eq('user_id', user_id)
            .single();

        if (item_exists) {
            throw new Error('Produit déjà dans la wishlist');
        }

        const { data: newWishlistItem } = await supabase
            .from('wishlist')
            .insert({ user_id, produit_id: item_id })
            .single()
            .select();

        return newWishlistItem;
    } catch (error) {
        console.error('Erreur dans postWishlist:', error);
        throw error;
    }
};

const deleteWishlistItem = async (item_id, user_id) => {
    try {
        const { data: deletedItem } = await supabase
            .from('wishlist')
            .delete()
            .eq('produit_id', item_id)
            .eq('user_id', user_id)
            .single()
            .select();

        return deletedItem;

    } catch (error) {
        console.error('Erreur dans deleteWishlistItem:', error);
        throw error;
    }
};

module.exports = {
    getWishlist,
    postWishlist,
    deleteWishlistItem
};
