const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post('/register', asyncHandler(async (req, res) => {
    const { email, password, nom, prenom, adresse, telephone } = req.body;

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) throw authError;

    const { data: role } = await supabase.from('roles').select('id').eq('nom', 'CLIENT').single();

    const { error: userError } = await supabase.from('users').insert({
        id: authData.user.id,
        email,
        nom,
        prenom,
        adresse,
        telephone,
        role_id: role.id
    });
    if (userError) throw userError;

    res.status(201).json({ message: 'Inscription réussie' });
}));

router.post('/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: user } = await supabase
        .from('users')
        .select('id, email, nom, prenom, role:roles(id, nom)')
        .eq('id', data.user.id)
        .single();

    res.json({ token: data.session.access_token, user });
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
    await supabase.auth.resetPasswordForEmail(email);
    res.json({ message: 'Email de réinitialisation envoyé' });
}));

router.post('/reset-password', asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    res.json({ message: 'Mot de passe réinitialisé' });
}));

module.exports = router;
