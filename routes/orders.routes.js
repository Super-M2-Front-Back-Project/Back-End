const express = require('express');
const router = express.Router();
const { postOrder, getOrder, getOrderById, updateOrderStatus, deleteOrder, getOrderByUser } = require('../controller/ordersController');

router.post('/post', async (req, res) => {
    const { user_id } = req.body;

    try {
        const result = await postOrder(user_id);
        res.status(201).json(result);
    } catch (error) {
        console.error('Erreur lors de la création de la commande:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

router.get('/get', async (req, res) => {
    try {
        const orders = await getOrder();
        res.json(orders);
    } catch (error) {
        console.error('Erreur lors de la récupération des commandes:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

router.get('/get/order_id', async (req, res) => {
    try {
        const { order_id } = req.body;

        if (!order_id) {
            return res.status(400).json({ error: 'un ID de commande est requis' });
        }

        const order = await getOrderById(order_id);
        res.json(order);
    } catch (error) {
        console.error('Erreur lors de la récupération de la commande:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

router.get('/get/user_id', async (req, res) => {
    try {
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: 'un ID d\'utilisateur est requis' });
        }

        const orders = await getOrderByUser(user_id);
        res.json(orders);
    } catch (error) {
        console.error('Erreur lors de la récupération des commandes de l\'utilisateur:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

router.put('/update/:order_id', async (req, res) => {
    try {
        const { order_id } = req.params;
        const { statut } = req.body;

        if (!order_id || !statut) {
            return res.status(400).json({ error: 'un ID de commande et un statut sont requis' });
        }

        const result = await updateOrderStatus(order_id, statut);
        res.json(result);
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la commande:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

router.delete('/delete/order_id/:order_id', async (req, res) => {
    try {
        const { order_id } = req.params;
        if (!order_id) {
            return res.status(400).json({ error: 'un ID de commande est requis' });
        }
        const result = await deleteOrder(order_id);
        res.json(result);
    } catch (error) {
        console.error('Erreur lors de la suppression de la commande:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

module.exports = router;
