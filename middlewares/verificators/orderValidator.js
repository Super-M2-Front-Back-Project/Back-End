const { body, param } = require("express-validator");

const validatePostOrder = [
    body("user_id")
        .notEmpty()
        .withMessage("un utilisateur est requis")
        .isUUID()
        .withMessage("l'ID utilisateur doit être un UUID valide"),
];

const validateGetOrderById = [
    body("order_id")
        .notEmpty()
        .withMessage("un ID de commande est requis")
        .isUUID()
        .withMessage("l'ID de commande doit être un UUID valide"),
];

const validateGetOrderByUser = [
    body("user_id")
        .notEmpty()
        .withMessage("un ID d'utilisateur est requis")
        .isUUID()
        .withMessage("l'ID d'utilisateur doit être un UUID valide"),
];

const validateUpdateOrderStatus = [
    param("order_id")
        .notEmpty()
        .withMessage("un ID de commande est requis")
        .isUUID()
        .withMessage("l'ID de commande doit être un UUID valide"),

    body("status")
        .notEmpty()
        .withMessage("un statut est requis")
        .isIn(["EN_ATTENTE", "EN_PREPARATION", "EXPEDIE", "LIVRE", "ANNULE"])
        .withMessage("le statut doit être l'un des suivants : EN_ATTENTE, EN_PREPARATION, EXPEDIE, LIVRE, ANNULE"),
];

const validateDeleteOrder = [
    body("order_id")
        .notEmpty()
        .withMessage("un ID de commande est requis")
        .isUUID()
        .withMessage("l'ID de commande doit être un UUID valide"),
];

module.exports = {
    validatePostOrder,
    validateGetOrderById,
    validateGetOrderByUser,
    validateUpdateOrderStatus,
    validateDeleteOrder
};