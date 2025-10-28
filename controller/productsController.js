const { supabase } = require('../config/supabase');
const dotenv = require('dotenv');

dotenv.config();

const productsGetController = async (page, limit, search, categorie_id, vendor_id, min_price, max_price, sort_by, order) => {
    try {
        // Construction de la requête de base
        let query = supabase
            .from('produits')
            .select(`
                id,
                nom,
                description,
                prix,
                stock,
                image_url,
                is_active,
                created_at,
                categorie:categories(id, nom),
                vendeur:vendeurs(id, nom_boutique, user:users(nom, prenom))
            `, { count: 'exact' });

        // Filtrer les produits actifs uniquement (sauf pour ADMIN)
        if (!req.user || req.user.role?.nom !== 'ADMIN') {
            query = query.eq('is_active', true);
        }

        // Recherche par nom ou description
        if (search) {
            query = query.or(`nom.ilike.%${search}%,description.ilike.%${search}%`);
        }

        // Filtre par catégorie
        if (category_id) {
            query = query.eq('categorie_id', category_id);
        }

        // Filtre par vendeur
        if (vendor_id) {
            query = query.eq('vendeur_id', vendor_id);
        }

        // Filtre par prix minimum
        if (min_price) {
            query = query.gte('prix', parseFloat(min_price));
        }

        // Filtre par prix maximum
        if (max_price) {
            query = query.lte('prix', parseFloat(max_price));
        }

        // Tri
        const validSortFields = ['prix', 'created_at', 'nom', 'stock'];
        const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
        const sortOrder = order === 'asc' ? true : false;
        query = query.order(sortField, { ascending: sortOrder });

        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data: products, error, count } = await query;

        if (error) throw error;

        // Calculer la note moyenne pour chaque produit
        const productsWithRatings = await Promise.all(products.map(async (product) => {
            const { data: comments } = await supabase
                .from('commentaires')
                .select('note')
                .eq('produit_id', product.id)
                .eq('is_approved', true);

            const averageRating = comments && comments.length > 0
                ? comments.reduce((sum, c) => sum + c.note, 0) / comments.length
                : 0;

            return {
                ...product,
                average_rating: Math.round(averageRating * 10) / 10,
                total_comments: comments ? comments.length : 0
            };
        }));

        return {
            products: productsWithRatings,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count || 0,
                pages: Math.ceil((count || 0) / parseInt(limit))
            }
        };
    } catch (error) {
        console.error('Erreur lors de la récupération des produits:', error);
        throw error;
    }
};

const productsSearchController = async (searchTerm) => {
    try {
        const { data: products, error } = await supabase
            .from('produits')
            .select(`
                id,
                nom,
                description,
                prix,
                stock,
                image_url,
                is_active,
                created_at,
                categorie:categories(id, nom),
                vendeur:vendeurs(id, nom_boutique, user:users(nom, prenom))
            `)
            .ilike('nom', `%${searchTerm}%`)
            .or(`description.ilike.%${searchTerm}%`)
            .limit(20);

        if (error) throw error;

        return {
            products: products || [],
            total: products ? products.length : 0
        };
    } catch (error) {
        console.error('Erreur lors de la recherche de produits:', error);
        throw error;
    }
};

const productsGetByIdController = async (id) => {
    try {
        // Récupérer le produit avec toutes les relations
        const { data: product, error } = await supabase
            .from('produits')
            .select(`
                id,
                nom,
                description,
                prix,
                stock,
                image_url,
                is_active,
                created_at,
                categorie:categories(id, nom, description),
                vendeur:vendeurs(
                    id,
                    nom_boutique,
                    description,
                    user:users(nom, prenom)
                )
            `)
            .eq('id', id)
            .single();

        if (error || !product) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        // Calculer la note moyenne
        const { data: comments } = await supabase
            .from('commentaires')
            .select('note')
            .eq('produit_id', id)
            .eq('is_approved', true);

        const averageRating = comments && comments.length > 0
            ? comments.reduce((sum, c) => sum + c.note, 0) / comments.length
            : 0;

        return {
            ...product,
            average_rating: Math.round(averageRating * 10) / 10,
            total_comments: comments ? comments.length : 0
        };
    } catch (error) {
        console.error('Erreur lors de la récupération du produit:', error);
        throw error;
    }
};

const productsPostController = async (nom, description, prix, stock, image_url, categorie_id, vendeur_id) => {
    try {
        // Vérifier que la catégorie existe
        const { data: categorie } = await supabase
            .from('categories')
            .select('id')
            .eq('id', categorie_id)
            .single();

        if (!categorie) {
            return res.status(400).json({ error: 'Catégorie invalide' });
        }

        // Créer le produit
        const { data: product, error } = await supabase
            .from('produits')
            .insert({
                nom: nom.trim(),
                description: description?.trim(),
                prix: parseFloat(prix),
                categorie_id,
                vendeur_id,
                stock: parseInt(stock),
                image_url: image_url?.trim(),
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;

        return product;
    } catch (error) {
        console.error('Erreur lors de la création du produit:', error);
        throw error;
    }
};

module.exports = {
    productsGetController,
    productsSearchController,
    productsGetByIdController,
    productsPostController
};