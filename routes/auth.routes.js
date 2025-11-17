const express = require('express');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');
const { registerUser, loginUser } = require('../controller/authController');

const router = express.Router();

// Regex de validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

router.post('/register', asyncHandler(async (req, res) => {
    const {
        email,
        password,
        last_name,
        first_name,
        birth_date,
        street,
        postal_code,
        city,
        phone,
    } = req.body;

    // Validation des champs obligatoires
    if (!email || !password || !last_name || !first_name || !birth_date || !street || !postal_code || !city) {
        return res.status(400).json({
            error: 'Champs obligatoires manquants',
            required: ['email', 'password', 'last_name', 'first_name', 'birth_date', 'street', 'postal_code', 'city']
        });
    }

    // Sanitization
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedLast_name = last_name.trim();
    const sanitizedFirst_name = first_name.trim();
    const sanitizedStreet = street?.trim();
    const sanitizedCodePostal = postal_code?.trim();
    const sanitizedCity = city?.trim();

    // Validation format email
    if (!EMAIL_REGEX.test(sanitizedEmail)) {
        return res.status(400).json({ error: 'Format email invalide' });
    }

    // Validation mot de passe
    if (password.length < PASSWORD_MIN_LENGTH) {
        return res.status(400).json({
            error: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`
        });
    }

    // Validation date de naissance (format YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birth_date)) {
        return res.status(400).json({
            error: 'Format de date invalide (attendu: YYYY-MM-DD)'
        });
    }

    // Vérifier que l'utilisateur a au moins 13 ans
    const birthDate = new Date(birth_date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (age < 13 || (age === 13 && monthDiff < 0)) {
        return res.status(400).json({
            error: 'Vous devez avoir au moins 13 ans pour créer un compte'
        });
    }

    // Validation code postal (5 chiffres pour France)
    if (!/^\d{5}$/.test(sanitizedCodePostal)) {
        return res.status(400).json({
            error: 'Code postal invalide (5 chiffres attendus)'
        });
    }

    await registerUser(
        sanitizedEmail,
        password,
        sanitizedLast_name,
        sanitizedFirst_name,
        birth_date,
        sanitizedStreet,
        sanitizedCodePostal,
        sanitizedCity,
        phone
    );

    res.status(201).json({
        message: 'Inscription réussie',
        user: {
            email: sanitizedEmail,
            last_name: sanitizedLast_name,
            first_name: sanitizedFirst_name,
            city: sanitizedCity
        }
    });
}));

router.post('/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const sanitizedEmail = email.trim().toLowerCase();

    const { token, user } = await loginUser(sanitizedEmail, password);

    res.json({
        token,
        user
    });
}));

router.post('/logout', authenticate, asyncHandler(async (req, res) => {
    await supabase.auth.signOut();
    res.json({ message: 'Déconnexion réussie' });
}));

router.get('/me', authenticate, (req, res) => {
    res.json({ user: req.user });
});

router.post('/forgot-password', asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email requis' });
    }

    const sanitizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(sanitizedEmail)) {
        return res.status(400).json({ error: 'Format email invalide' });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password`
    });

    if (error) throw error;

    // Toujours retourner success pour éviter l'énumération d'emails
    res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé' });
}));

router.post('/reset-password', asyncHandler(async (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'Nouveau mot de passe requis' });
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
        return res.status(400).json({
            error: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`
        });
    }

    // Le token est dans les headers (géré par Supabase automatiquement)
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
        return res.status(400).json({ error: 'Token invalide ou expiré' });
    }

    res.json({ message: 'Mot de passe réinitialisé avec succès' });
}));

module.exports = router;
