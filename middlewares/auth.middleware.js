const { supabase } = require('../config/supabase');

const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'Token manquant' });

        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return res.status(401).json({ error: 'Token invalide' });

        const { data: userData, error: dbError } = await supabase
            .from('users')
            .select('id, email, last_name, first_name, address, role:roles(id, name)')
            .eq('id', user.id)
            .single();

        if (dbError || !userData) return res.status(404).json({ error: 'Utilisateur non trouvé' });

        if (userData.role?.name === 'VENDEUR') {
            const { data: seller } = await supabase
                .from('sellers')
                .select('is_verified')
                .eq('user_id', userData.id)
                .single();

            if (!seller?.is_verified) {
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
    if (!req.user?.role?.name) {
        return res.status(403).json({ error: 'Rôle manquant' });
    }

    if (!allowedRoles.includes(req.user.role.name)) {
        return res.status(403).json({
            error: 'Accès refusé',
            required: allowedRoles,
            current: req.user.role.name
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
            .select('id, email, last_name, first_name, role:roles(id, name)')
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
    if (req.user.role?.name === 'ADMIN') return next();

    const resourceId = path.split('.').reduce((obj, key) => obj?.[key], req);
    if (req.user.id !== resourceId) {
        return res.status(403).json({ error: 'Accès refusé' });
    }

    next();
};

module.exports = { authenticate, authorize, optionalAuth, checkOwnership };
