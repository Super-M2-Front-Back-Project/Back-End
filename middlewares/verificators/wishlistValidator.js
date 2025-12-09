const { body } = require("express-validator");

const validateGetWishlist = [
    body("user_id")
        .notEmpty()
        .withMessage("un utilisateur est requis")
        .isUUID()
        .withMessage("l'ID utilisateur doit être un UUID valide"),
];

const validatePostWishlist = [
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

const validateDeleteWishlist = [
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

module.exports = {
    validateGetWishlist,
    validatePostWishlist,
    validateDeleteWishlist,
};