const { supabase } = require('../config/supabase');
const dotenv = require('dotenv');

dotenv.config();

const postOrder = async (user_id) => {
    try {
        // Vérifier si l'utilisateur existe
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('id', user_id)
            .single();
        
        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }   

        // Récupérer le panier de l'utilisateur
        const { data: panier } = await supabase
            .from('panier')
            .select('id')
            .eq('user_id', user_id)
            .single();

        if (!panier) {
            throw new Error('Panier non trouvé pour cet utilisateur');
        }

        // Récupérer les articles du panier
        const { data: items } = await supabase
            .from('items_panier')
            .select('produit_id, quantite')
            .eq('panier_id', panier.id);

        if (!items || items.length === 0) {
            throw new Error('Le panier est vide');
        }

        // Calculer le total de la commande
        let total = 0;
        for (const item of items) {
            const { data: produit } = await supabase
                .from('produits')
                .select('prix')
                .eq('id', item.produit_id)
                .single();

            if (produit) {
                total += produit.prix * item.quantite;
            }
        }

        // Créer la commande
        const { data: newOrder} = await supabase
            .from('commandes')
            .insert({ user_id: user_id, total: total })
            .select()
            .single();

        if (!newOrder) {
            throw new Error('Erreur lors de la création de la commande');
        }

        //ajouter les articles à la commande
        for (const item of items) {
            await supabase
                .from('items_commande')
                .insert({ commande_id: newOrder.id, produit_id: item.produit_id, quantite: item.quantite });
        }

        // Vider le panier
        await supabase
            .from('items_panier')
            .delete()
            .eq('panier_id', panier.id);

        return { message: 'Commande passée avec succès', order_id: newOrder.id };
    } catch (error) {
        console.error('Erreur dans postOrder:', error);
        throw error;
    }
};

const getOrder = async () => {
    try {
        const { data: orders } = await supabase
            .from('commandes')
            .select('*');
        return orders;
    } catch (error) {
        console.error('Erreur dans getOrder:', error);
        throw error;
    }
};

const getOrderById = async (order_id) => {
    try {
        const { data: order } = await supabase
            .from('commandes')
            .select('id, user_id, total, statut')
            .eq('id', order_id)
            .single();

        if (!order) {
            throw new Error('Commande non trouvée');
        }

        return order;
    } catch (error) {
        console.error('Erreur dans getOrderById:', error);
        throw error;
    }
};

const updateOrderStatus = async (order_id, statut) => {
    try {
        const { data: updatedOrder } = await supabase
            .from('commandes')
            .update({ statut: statut })
            .eq('id', order_id)
            .select()
            .single();

        if (!updatedOrder) {
            throw new Error('Erreur lors de la mise à jour de la commande');
        }

        return { message: 'Statut de la commande mis à jour avec succès', order: updatedOrder };
    } catch (error) {
        console.error('Erreur dans updateOrdersStatus:', error);
        throw error;
    }
};

const deleteOrder = async (order_id) => {
    try {
        const { data: deletedOrder } = await supabase
            .from('commandes')
            .delete()
            .eq('id', order_id)
            .select()
            .single();

        if (!deletedOrder) {
            throw new Error('Commande non trouvée pour la suppression');
        }
        return { message: 'Commande supprimée avec succès', order: deletedOrder };
    } catch (error) {
        console.error('Erreur dans deleteOrder:', error);
        throw error;
    }
};

const getOrderByUser = async (user_id) => {
    try {
        const { data: orders } = await supabase
            .from('commandes')
            .select('id, user_id, total, statut')
            .eq('user_id', user_id);
        return orders;
    } catch (error) {
        console.error('Erreur dans getOrderByUser:', error);
        throw error;
    }
};

module.exports = {
    postOrder,
    getOrder,
    getOrderById,
    updateOrderStatus,
    deleteOrder,
    getOrderByUser
};
