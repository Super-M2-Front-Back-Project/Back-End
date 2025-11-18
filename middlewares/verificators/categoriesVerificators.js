const { body, param } = require("express-validator");

const validateGetCategory = [
    body("sort_by")
        .optional()
        .isIn(["name", "created_at", "updated_at"])
        .withMessage("Le champ sort_by doit être l'un des suivants : name, created_at, updated_at"),
    body("order")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("Le champ order doit être 'asc' ou 'desc'"),
];

module.exports = {
    validateGetCategory,
};