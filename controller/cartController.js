const { supabase } = require('../config/supabase');
const dotenv = require('dotenv');

dotenv.config();

const postCart = async (user_id, item_id) => {
    try {
    // Vérifier si l'utilisateur a déjà un panier
    const { data: panier } = await supabase
        .from('panier')
        .select('id')
        .eq('user_id', user_id)
        .single();
    
    // Si pas de panier, en créer un
    if (!panier) {
        const { data: newPanier } = await supabase
            .from('panier')
            .insert({ user_id })
            .single();
    }

    // Vérifier si l'article existe
    const { data: item_exists } = await supabase
        .from('produits')
        .select('id')
        .eq('id', item_id)
        .single();

    if (!item_exists) {
        throw new Error('Produit non trouvé');
    }

    // Vérifier si l'article est déjà dans le panier
    const { data: item_in_cart } = await supabase
        .from('items_panier')
        .select('id, quantite')
        .eq('panier_id', panier.id)
        .eq('produit_id', item_id)
        .single();

    if (item_in_cart) {
        const newQuantity = item_in_cart.quantite + 1;
        await supabase
            .from('items_panier')
            .update({ quantite: newQuantity })
            .eq('id', item_in_cart.id);
        return { message: 'Quantité mise à jour', quantite: newQuantity };
    }

    // Ajouter l'article au panier
    await supabase
        .from('items_panier')
        .insert({ panier_id: panier.id, produit_id: item_id, quantite: 1 });

    return { message: 'Produit ajouté au panier', produit_id: item_id, quantite: 1 };

    } catch (error) {
        console.error('Erreur lors de l\'ajout au panier:', error);
        throw new Error('Erreur interne du serveur');
    }
}

const getCart = async (user_id) => {
    try {
        console.log('Récupération du panier pour l\'utilisateur:', user_id);
        const { data: panier } = await supabase
            .from('panier')
            .select(`
                id,
                items:items_panier(
                    id,
                    quantite,
                    produit:produits(
                        id,
                        nom,
                        prix,
                        image_url
                    )
                )
            `)
            .eq('user_id', user_id)
            .single();

        if (!panier) {
            throw new Error('Panier non trouvé');
        }

        return panier;
    } catch (error) {
        console.error('Erreur lors de la récupération du panier:', error);
        throw new Error('Erreur interne du serveur');
    }
}

const updateCart = async (user_id, item_id, quantity) => {
    try {
        // Vérifier si l'utilisateur a un panier
        const { data: panier } = await supabase
            .from('panier')
            .select('id')
            .eq('user_id', user_id)
            .single();

        if (!panier) {
            throw new Error('Panier non trouvé');
        }

        // Vérifier si l'article est dans le panier
        const { data: item_in_cart } = await supabase
            .from('items_panier')
            .select('id, quantite')
            .eq('panier_id', panier.id)
            .eq('produit_id', item_id)
            .single();
        
        if (!item_in_cart) {
            throw new Error('Produit non trouvé dans le panier');
        }

        if (quantity <= 0) {
            // Supprimer l'article du panier si la quantité est 0 ou moins
            await supabase
                .from('items_panier')
                .delete()
                .eq('id', item_in_cart.id);
            return { message: 'Produit supprimé du panier' };
        }

        // Mettre à jour la quantité
        await supabase
            .from('items_panier')
            .update({ quantite: quantity })
            .eq('id', item_in_cart.id);

        return { message: 'Quantité mise à jour', quantite: quantity };
    } catch (error) {
        console.error('Erreur lors de la mise à jour du panier:', error);
        throw new Error('Erreur interne du serveur');
    }
}

const deleteCartItem = async (item_id, user_id) => {
    try {
        // Vérifier si l'utilisateur a un panier
        const { data: panier } = await supabase
            .from('panier')
            .select('id')
            .eq('user_id', user_id)
            .single();
        
        if (!panier) {
            throw new Error('Panier non trouvé');
        }

        // Verrifier si l'article est dans le panier
        const { data: item_in_cart } = await supabase
            .from('items_panier')
            .select('id')
            .eq('panier_id', panier.id)
            .eq('produit_id', item_id)
            .single();

        if (!item_in_cart) {
            throw new Error('Produit non trouvé dans le panier');
        }

        // Supprimer l'article du panier
        await supabase
            .from('items_panier')
            .delete()
            .eq('id', item_in_cart.id);
        return { message: 'Produit supprimé du panier' };
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'article du panier:', error);
        throw new Error('Erreur interne du serveur');
    }
}

const deleteCartByUser = async (user_id) => {
    try {
        // Vérifier si l'utilisateur a un panier
        const { data: panier } = await supabase
            .from('panier')
            .select('id')
            .eq('user_id', user_id)
            .single();

        if (!panier) {
            throw new Error('Panier non trouvé');
        }

        // Supprimer tous les articles du panier
        await supabase
            .from('items_panier')
            .delete()
            .eq('panier_id', panier.id);
        return { message: 'Tous les articles du panier ont été supprimés' };
    } catch (error) {
        console.error('Erreur lors de la suppression des articles du panier:', error);
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
