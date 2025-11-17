const { supabase } = require('../config/supabase');
const dotenv = require('dotenv');

dotenv.config();

const postCart = async (user_id, item_id) => {
    try {
    // Vérifier si l'utilisateur a déjà un cart
    const { data: cart } = await supabase
        .from('cart')
        .select('id')
        .eq('user_id', user_id)
        .single();
    
    // Si pas de cart, en créer un
    if (!cart) {
        const { data: newCart } = await supabase
            .from('cart')
            .insert({ user_id })
            .single();
    }

    // Vérifier si l'article existe
    const { data: item_exists } = await supabase
        .from('products')
        .select('id')
        .eq('id', item_id)
        .single();

    if (!item_exists) {
        throw new Error('Product non trouvé');
    }

    // Vérifier si l'article est déjà dans le cart
    const { data: item_in_cart } = await supabase
        .from('items_cart')
        .select('id, quantity')
        .eq('cart_id', cart.id)
        .eq('product_id', item_id)
        .single();

    if (item_in_cart) {
        const newQuantity = item_in_cart.quantity + 1;
        await supabase
            .from('items_cart')
            .update({ quantity: newQuantity })
            .eq('id', item_in_cart.id);
        return { message: 'Quantité mise à jour', quantity: newQuantity };
    }

    // Ajouter l'article au cart
    await supabase
        .from('items_cart')
        .insert({ cart_id: cart.id, product_id: item_id, quantity: 1 });

    return { message: 'Product ajouté au cart', product_id: item_id, quantity: 1 };

    } catch (error) {
        console.error('Erreur lors de l\'ajout au cart:', error);
        throw new Error('Erreur interne du serveur');
    }
}

const getCart = async (user_id) => {
    try {
        console.log('Récupération du cart pour l\'utilisateur:', user_id);
        const { data: cart } = await supabase
            .from('cart')
            .select(`
                id,
                items:items_cart(
                    id,
                    quantity,
                    product:products(
                        id,
                        name,
                        price,
                        image_url
                    )
                )
            `)
            .eq('user_id', user_id)
            .single();

        if (!cart) {
            throw new Error('Cart non trouvé');
        }

        return cart;
    } catch (error) {
        console.error('Erreur lors de la récupération du cart:', error);
        throw new Error('Erreur interne du serveur');
    }
}

const updateCart = async (user_id, item_id, quantity) => {
    try {
        // Vérifier si l'utilisateur a un cart
        const { data: cart } = await supabase
            .from('cart')
            .select('id')
            .eq('user_id', user_id)
            .single();

        if (!cart) {
            throw new Error('Cart non trouvé');
        }

        // Vérifier si l'article est dans le cart
        const { data: item_in_cart } = await supabase
            .from('items_cart')
            .select('id, quantity')
            .eq('cart_id', cart.id)
            .eq('product_id', item_id)
            .single();
        
        if (!item_in_cart) {
            throw new Error('Product non trouvé dans le cart');
        }

        if (quantity <= 0) {
            // Supprimer l'article du cart si la quantité est 0 ou moins
            await supabase
                .from('items_cart')
                .delete()
                .eq('id', item_in_cart.id);
            return { message: 'Product supprimé du cart' };
        }

        // Mettre à jour la quantité
        await supabase
            .from('items_cart')
            .update({ quantity: quantity })
            .eq('id', item_in_cart.id);

        return { message: 'Quantité mise à jour', quantity: quantity };
    } catch (error) {
        console.error('Erreur lors de la mise à jour du cart:', error);
        throw new Error('Erreur interne du serveur');
    }
}

const deleteCartItem = async (item_id, user_id) => {
    try {
        // Vérifier si l'utilisateur a un cart
        const { data: cart } = await supabase
            .from('cart')
            .select('id')
            .eq('user_id', user_id)
            .single();
        
        if (!cart) {
            throw new Error('Cart non trouvé');
        }

        // Verrifier si l'article est dans le cart
        const { data: item_in_cart } = await supabase
            .from('items_cart')
            .select('id')
            .eq('cart_id', cart.id)
            .eq('product_id', item_id)
            .single();

        if (!item_in_cart) {
            throw new Error('Product non trouvé dans le cart');
        }

        // Supprimer l'article du cart
        await supabase
            .from('items_cart')
            .delete()
            .eq('id', item_in_cart.id);
        return { message: 'Product supprimé du cart' };
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'article du cart:', error);
        throw new Error('Erreur interne du serveur');
    }
}

const deleteCartByUser = async (user_id) => {
    try {
        // Vérifier si l'utilisateur a un cart
        const { data: cart } = await supabase
            .from('cart')
            .select('id')
            .eq('user_id', user_id)
            .single();

        if (!cart) {
            throw new Error('Cart non trouvé');
        }

        // Supprimer tous les articles du cart
        await supabase
            .from('items_cart')
            .delete()
            .eq('cart_id', cart.id);
        return { message: 'Tous les articles du cart ont été supprimés' };
    } catch (error) {
        console.error('Erreur lors de la suppression des articles du cart:', error);
        throw new Error('Erreur interne du serveur');
    }
}

module.exports = {
    postCart,
    getCart,
    updateCart,
    deleteCartItem,
    deleteCartByUser
};
