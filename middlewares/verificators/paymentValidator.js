const { body } = require("express-validator");

const validatePostPayment = [
    body("order_id")
        .notEmpty()
        .withMessage("un ID de commande est requis")
        .isUUID()
        .withMessage("l'ID de commande doit être un UUID valide"),
];

module.exports = {
    validatePostPayment,
};