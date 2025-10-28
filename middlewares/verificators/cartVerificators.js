const { body, param } = require("express-validator");

const validateGetCart = [
    body("user_id")
        .notEmpty()
        .withMessage("un utilisateur est requis")
        .isUUID()
        .withMessage("l'ID utilisateur doit être un UUID valide"),
];

const validatePostCart = [
    body("user_id")
        .notEmpty()
        .withMessage("un utilisateur est requis")
        .isUUID()
        .withMessage("l'ID utilisateur doit être un UUID valide"),

    body("item_id")
        .notEmpty()
        .withMessage("un produit est requis")
        .isUUID()
        .withMessage("l'ID produit doit être un UUID valide"),
];

const validateUpdateCart = [
    param("user_id")
        .notEmpty()
        .withMessage("un utilisateur est requis")
        .isUUID()
        .withMessage("l'ID utilisateur doit être un UUID valide"),

    body("item_id")
        .notEmpty()
        .withMessage("un produit est requis")
        .isUUID()
        .withMessage("l'ID produit doit être un UUID valide"),
    
    body("quantity")
        .notEmpty()
        .withMessage("une quantité est requise")
        .isInt({ min: 1 })
        .withMessage("la quantité doit être un entier supérieur ou égal à 1"),
];

const validateDeleteCart = [
    body("user_id")
        .notEmpty()
        .withMessage("un utilisateur est requis")
        .isUUID()
        .withMessage("l'ID utilisateur doit être un UUID valide"),
];


module.exports = {
    validateGetCart,
    validatePostCart,
    validateUpdateCart,
    validateDeleteCart,
};