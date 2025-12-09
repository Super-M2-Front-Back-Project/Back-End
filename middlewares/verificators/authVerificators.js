const {body} = require("express-validator");

const validateRegister = [
    body("email")
        .notEmpty()
        .withMessage("L'email est requis")
        .isEmail()
        .withMessage("Le format de l'email est invalide")
        .normalizeEmail(),
    body("password")
        .notEmpty()
        .withMessage("Le mot de passe est requis")
        .isLength({ min: 6 })
        .withMessage("Le mot de passe doit contenir au moins 6 caractères"),
    body("last_name")
        .notEmpty()
        .withMessage("Le nom de famille est requis")
        .isString()
        .withMessage("Le nom de famille doit être une chaîne de caractères"),
    body("first_name")
        .notEmpty()
        .withMessage("Le prénom est requis")
        .isString()
        .withMessage("Le prénom doit être une chaîne de caractères"),
    body("birthdate")
        .notEmpty()
        .withMessage("La date de naissance est requise")
        .isISO8601()
        .withMessage("Le format de la date de naissance est invalide (attendu: YYYY-MM-DD)")
        .custom((value) => {
            const birthDate = new Date(value);
            const today = new Date();

            // Calculer la date correspondant à l'âge minimum de 13 ans
            const minDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());

            if (birthDate > minDate) {
                throw new Error("Vous devez avoir au moins 13 ans pour créer un compte");
            }

            return true;
        }),
    body("street")
        .notEmpty()
        .withMessage("La rue est requise")
        .isString()
        .withMessage("La rue doit être une chaîne de caractères"),
    body("postal_code")
        .notEmpty()
        .withMessage("Le code postal est requis")
        .isString()
        .withMessage("Le code postal doit être une chaîne de caractères")
        .isLength({ min: 5, max: 5 })
        .withMessage("Le code postal doit contenir exactement 5 caractères"),
    body("city")
        .notEmpty()
        .withMessage("La ville est requise")
        .isString()
        .withMessage("La ville doit être une chaîne de caractères"),
    body("phone")
        .optional()
        .isString()
        .withMessage("Le téléphone doit être une chaîne de caractères"),
];

const validateLogin = [
    body("email")
        .notEmpty()
        .withMessage("L'email est requis")
        .isEmail()
        .withMessage("Le format de l'email est invalide")
        .normalizeEmail(),
    body("password")
        .notEmpty()
        .withMessage("Le mot de passe est requis"),
];

const validateForgotPassword = [
    body("email")
        .notEmpty()
        .withMessage("L'email est requis")
        .isEmail()
        .withMessage("Le format de l'email est invalide")
        .normalizeEmail(),
];

const validateResetPassword = [
    body("password")
        .notEmpty()
        .withMessage("Le mot de passe est requis")
        .isLength({ min: 6 })
        .withMessage("Le mot de passe doit contenir au moins 6 caractères"),
];



module.exports = {
    validateRegister,
    validateLogin,
    validateForgotPassword,
    validateResetPassword
};