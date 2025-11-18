const express = require('express');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');
const { registerUser, loginUser } = require('../controller/authController');
const validate = require('../middlewares/verificators/validate');
const { validateRegister, validateLogin, validateForgotPassword, validateResetPassword } = require('../middlewares/verificators/authVerificators');

const router = express.Router();

router.post('/register', validateRegister, validate, asyncHandler(async (req, res) => {
    const {
        email,
        password,
        last_name,
        first_name,
        birthdate,
        street,
        postal_code,
        city,
        phone,
    } = req.body;

    await registerUser(
        email,
        password,
        last_name,
        first_name,
        birthdate,
        street,
        postal_code,
        city,
        phone
    );

    res.status(201).json({
        message: 'Inscription réussie',
        user: {
            email,
            last_name,
            first_name,
            address: `${street}, ${postal_code} ${city}`,
            phone,
            birthdate
        }
    });
}));

router.post('/login', validateLogin, validate, asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const { token, user } = await loginUser(email, password);

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

router.post('/forgot-password', validateForgotPassword, validate, asyncHandler(async (req, res) => {
    const { email } = req.body;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password`
    });

    if (error) throw error;

    // Toujours retourner success pour éviter l'énumération d'emails
    res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé' });
}));

router.post('/reset-password', validateResetPassword, validate, asyncHandler(async (req, res) => {
    const { password } = req.body;

    // Le token est dans les headers (géré par Supabase automatiquement)
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
        return res.status(400).json({ error: 'Token invalide ou expiré' });
    }

    res.json({ message: 'Mot de passe réinitialisé avec succès' });
}));

module.exports = router;
