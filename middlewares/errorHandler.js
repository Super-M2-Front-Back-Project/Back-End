const errorHandler = (err, req, res, next) => {
    console.error(err);

    if (err.code === '23505') return res.status(409).json({ error: 'Ressource déjà existante' });
    if (err.code === '23503') return res.status(400).json({ error: 'Référence invalide' });
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });

    res.status(err.status || 500).json({
        error: err.message || 'Erreur serveur',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;
