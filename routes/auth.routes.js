const express = require('express');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Regex de validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

// Helper: récupérer les données utilisateur complètes
const getUserWithRole = async (userId) => {
    const { data, error } = await supabase
        .from('users')
        .select('id, email, nom, prenom, adresse, role:roles(id, nom)')
        .eq('id', userId)
        .single();

    if (error) throw error;
    if (!data) throw new Error('Utilisateur non trouvé');
    return data;
};

router.post('/register', asyncHandler(async (req, res) => {
    const {
        email,
        password,
        nom,
        prenom,
        date_naissance,
        rue,
        code_postal,
        ville,
        telephone,
        // Anciens champs pour rétrocompatibilité
        adresse
    } = req.body;

    // Validation des champs obligatoires
    if (!email || !password || !nom || !prenom || !date_naissance || !rue || !code_postal || !ville) {
        return res.status(400).json({
            error: 'Champs obligatoires manquants',
            required: ['email', 'password', 'nom', 'prenom', 'date_naissance', 'rue', 'code_postal', 'ville']
        });
    }

    // Sanitization
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedNom = nom.trim();
    const sanitizedPrenom = prenom.trim();
    const sanitizedRue = rue?.trim();
    const sanitizedCodePostal = code_postal?.trim();
    const sanitizedVille = ville?.trim();

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
    if (!dateRegex.test(date_naissance)) {
        return res.status(400).json({
            error: 'Format de date invalide (attendu: YYYY-MM-DD)'
        });
    }

    // Vérifier que l'utilisateur a au moins 13 ans
    const birthDate = new Date(date_naissance);
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

    // Récupérer le rôle CLIENT
    const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('nom', 'CLIENT')
        .single();

    if (roleError || !role) {
        throw new Error('Rôle CLIENT non trouvé - base de données non initialisée');
    }

    // Créer le compte auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Échec de création du compte');

    // Insérer dans la table users
    try {
        const { error: userError } = await supabase.from('users').insert({
            id: authData.user.id,
            email: sanitizedEmail,
            nom: sanitizedNom,
            prenom: sanitizedPrenom,
            date_naissance,
            rue: sanitizedRue,
            code_postal: sanitizedCodePostal,
            ville: sanitizedVille,
            telephone: telephone?.trim() || null,
            // Ancienne colonne pour rétrocompatibilité (peut être supprimée après migration complète)
            adresse: adresse?.trim() || `${sanitizedRue}, ${sanitizedCodePostal} ${sanitizedVille}`,
            role_id: role.id
        });

        if (userError) throw userError;

    } catch (error) {
        // Rollback: supprimer le compte auth si l'insertion users échoue
        if (supabaseAdmin) {
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        }
        throw error;
    }

    res.status(201).json({
        message: 'Inscription réussie',
        user: {
            email: sanitizedEmail,
            nom: sanitizedNom,
            prenom: sanitizedPrenom,
            ville: sanitizedVille
        }
    });
}));

router.post('/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const sanitizedEmail = email.trim().toLowerCase();

    // Authentification
    const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password
    });

    if (error) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Récupérer les données utilisateur
    const user = await getUserWithRole(data.user.id);

    res.json({
        token: data.session.access_token,
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
