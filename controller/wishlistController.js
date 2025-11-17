const { supabase } = require('../config/supabase');
const dotenv = require('dotenv');

dotenv.config();

const getWishlist = async (user_id) => {
    try {
        const { data: wishlist } = await supabase
            .from('wishlist')
            .select(`
                id,
                added_at,
                product:products(
                    id,
                    name,
                    price,
                    image_url
                )
            `)
            .eq('user_id', user_id);

        return wishlist;
    } catch (error) {
        console.error('Erreur dans getWishlist:', error);
        throw new Error('wishlist introuvable', error);
    }
};

const postWishlist = async (user_id, item_id) => {
    try {
        const { data: item_exists } = await supabase
            .from('wishlist')
            .select('id')
            .eq('product_id', item_id)
            .eq('user_id', user_id)
            .single();

        if (item_exists) {
            throw new Error('Produit déjà dans la wishlist');
        }

        const { data: newWishlistItem } = await supabase
            .from('wishlist')
            .insert({ user_id, product_id: item_id })
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
            .eq('product_id', item_id)
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
