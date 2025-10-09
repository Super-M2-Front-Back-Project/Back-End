const { supabase } = require('../config/supabase');

const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'Token manquant' });

        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return res.status(401).json({ error: 'Token invalide' });

        const { data: userData, error: dbError } = await supabase
            .from('users')
            .select('id, email, nom, prenom, adresse, role:roles(id, nom)')
            .eq('id', user.id)
            .single();

        if (dbError || !userData) return res.status(404).json({ error: 'Utilisateur non trouvé' });

        if (userData.role?.nom === 'VENDEUR') {
            const { data: vendeur } = await supabase
                .from('vendeurs')
                .select('is_verified')
                .eq('user_id', userData.id)
                .single();

            if (!vendeur?.is_verified) {
                return res.status(403).json({ error: 'Compte vendeur non vérifié' });
            }
        }

        req.user = userData;
        next();
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

const authorize = (...allowedRoles) => (req, res, next) => {
    if (!req.user?.role?.nom) {
        return res.status(403).json({ error: 'Rôle manquant' });
    }

    if (!allowedRoles.includes(req.user.role.nom)) {
        return res.status(403).json({
            error: 'Accès refusé',
            required: allowedRoles,
            current: req.user.role.nom
        });
    }

    next();
};

const optionalAuth = async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return next();

    try {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) return next();

        const { data: userData } = await supabase
            .from('users')
            .select('id, email, nom, prenom, role:roles(id, nom)')
            .eq('id', user.id)
            .single();

        req.user = userData || null;
    } catch {
        req.user = null;
    }

    next();
};

const checkOwnership = (path) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié' });
    if (req.user.role?.nom === 'ADMIN') return next();

    const resourceId = path.split('.').reduce((obj, key) => obj?.[key], req);
    if (req.user.id !== resourceId) {
        return res.status(403).json({ error: 'Accès refusé' });
    }

    next();
};

module.exports = { authenticate, authorize, optionalAuth, checkOwnership };
