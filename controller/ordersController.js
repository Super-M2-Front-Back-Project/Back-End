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

        // Récupérer le cart de l'utilisateur
        const { data: cart } = await supabase
            .from('cart')
            .select('id')
            .eq('user_id', user_id)
            .single();

        if (!cart) {
            throw new Error('Cart non trouvé pour cet utilisateur');
        }

        // Récupérer les articles du cart
        const { data: items } = await supabase
            .from('items_cart')
            .select('product_id, quantity')
            .eq('cart_id', cart.id);

        if (!items || items.length === 0) {
            throw new Error('Le cart est vide');
        }

        // Calculer le total de la commande
        let total = 0;
        for (const item of items) {
            const { data: product } = await supabase
                .from('products')
                .select('price')
                .eq('id', item.product_id)
                .single();

            if (product) {
                total += product.price * item.quantity;
            }
        }

        // Créer la commande
        const { data: newOrder} = await supabase
            .from('orders')
            .insert({ user_id: user_id, total: total })
            .select()
            .single();

        if (!newOrder) {
            throw new Error('Erreur lors de la création de la commande');
        }

        //ajouter les articles à la commande
        for (const item of items) {
            await supabase
                .from('items_order')
                .insert({ order_id: newOrder.id, product_id: item.product_id, quantity: item.quantity });
        }

        // Vider le cart
        await supabase
            .from('items_cart')
            .delete()
            .eq('cart_id', cart.id);

        return { message: 'Commande passée avec succès', order_id: newOrder.id };
    } catch (error) {
        console.error('Erreur dans postOrder:', error);
        throw error;
    }
};

const getOrder = async () => {
    try {
        const { data: orders } = await supabase
            .from('orders')
            .select('*');
        return orders;
    } catch (error) {
        console.error('Erreur dans getOrder:', error);
        throw error;
    }
};

const getOrderById = async (order_id) => {
    if (!order_id) {
        throw new Error('ID de commande invalide');
    }

    try {
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                id,
                user_id,
                total,
                status,
                items_order (
                    id,
                    product_id,
                    quantity,
                    products (
                        *
                    )
                )
            `)
            .eq('id', order_id)
            .single();

        if (error) {
            throw error;
        }

        if (!order) {
            throw new Error('Commande non trouvée');
        }

        return order;
    } catch (error) {
        console.error('Erreur dans getOrderById:', error);
        throw error;
    }
};


const updateOrderStatus = async (order_id, status) => {
    try {
        const { data: updatedOrder } = await supabase
            .from('orders')
            .update({ status: status })
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
            .from('orders')
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
            .from('orders')
            .select('id, user_id, total, status')
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
