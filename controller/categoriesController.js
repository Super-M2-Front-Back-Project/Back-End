const { supabase } = require('../config/supabase');
const dotenv = require('dotenv');

dotenv.config();

const categoriesGetController = async (sort_by, order) => {
    try {
        // Récupérer toutes les catégories
        const { data: categories, error } = await supabase
            .from('categories')
            .select('id, nom, description, created_at')
            .order(sort_by, { ascending: order === 'asc' });
        
        if (error) {
            throw error;
        }

        // Ajouter le nombre de produits actifs par catégorie
        const categoriesWithStats = await Promise.all(categories.map(async (category) => {
            const { count } = await supabase
                .from('produits')
                .select('*', { count: 'exact', head: true })
                .eq('categorie_id', category.id)
                .eq('is_active', true);
            return {
                ...category,
                total_products: count || 0
            };
        }));

        return categoriesWithStats;
    } catch (error) {
        console.error('Erreur lors de la récupération des catégories:', error);
        throw error;
    }
};

const categoriesGetByIdController = async (id) => {
    try {
        const { data: category, error } = await supabase
            .from('categories')
            .select('id, nom, description, created_at')
            .eq('id', id)
            .single();

        if (error) throw error;

        // Ajouter le nombre de produits actifs
        const { count: totalProducts } = await supabase
            .from('produits')
            .select('*', { count: 'exact', head: true })
            .eq('categorie_id', id)
            .eq('is_active', true);

        // Compter le nombre de vendeurs différents
        const { data: vendeurs } = await supabase
            .from('produits')
            .select('vendeur_id')
            .eq('categorie_id', id)
            .eq('is_active', true);

        const uniqueVendors = vendeurs ? new Set(vendeurs.map(p => p.vendeur_id)).size : 0;

        return {
            ...category,
            total_products: totalProducts || 0,
            total_vendors: uniqueVendors
        };
    } catch (error) {
        console.error('Erreur lors de la récupération de la catégorie:', error);
        throw error;
    }
};

const categoriesPostController = async (nom, description) => {
    try {
        const { data: existing } = await supabase
            .from('categories')
            .select('id')
            .eq('nom', nom)
            .single();

        if (existing) {
            return res.status(409).json({ error: 'Une catégorie avec ce nom existe déjà' });
        }

        const { data: category, error } = await supabase
            .from('categories')
            .insert({
                nom: sanitizedNom,
                description: description?.trim() || null
            })
            .select()
            .single();

        if (error) throw error;

        return category;
    } catch (error) {
        console.error('Erreur lors de la création de la catégorie:', error);
        throw error;
    }
};

const categoriesPutController = async (id, nom, description) => {
    try {
        // Vérifier que la catégorie existe
        const { data: existing } = await supabase
            .from('categories')
            .select('id')
            .eq('id', id)
            .single();

        if (!existing) {
            return res.status(404).json({ error: 'Catégorie non trouvée' });
        }

        // Construire l'objet de mise à jour
        const updates = {};

        if (nom !== undefined) {
            const sanitizedNom = nom.trim();
            if (sanitizedNom.length === 0) {
                return res.status(400).json({ error: 'Le nom ne peut pas être vide' });
            }

            // Vérifier l'unicité du nom si modifié
            const { data: duplicate } = await supabase
                .from('categories')
                .select('id')
                .eq('nom', sanitizedNom)
                .neq('id', id)
                .single();

            if (duplicate) {
                return res.status(409).json({ error: 'Une catégorie avec ce nom existe déjà' });
            }

            updates.nom = sanitizedNom;
        }

        if (description !== undefined) {
            updates.description = description?.trim() || null;
        }

        // Mettre à jour la catégorie
        const { data: category, error } = await supabase
            .from('categories')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return category;
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la catégorie:', error);
        throw error;
    }
};

const categoriesDeleteController = async (id) => {
    try {
        // Vérifier que la catégorie existe
        const { data: existing } = await supabase
            .from('categories')
            .select('id')
            .eq('id', id)
            .single();

        if (!existing) {
            return res.status(404).json({ error: 'Catégorie non trouvée' });
        }

        // Vérifier qu'il n'y a pas de produits liés
        const { count } = await supabase
            .from('produits')
            .select('*', { count: 'exact', head: true })
            .eq('categorie_id', id);

        if (count > 0) {
            return res.status(400).json({
                error: `Impossible de supprimer cette catégorie car ${count} produit(s) y sont liés`,
                products_count: count
            });
        }

        // Supprimer la catégorie
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return { message: 'Catégorie supprimée avec succès' };
    } catch (error) {
        console.error('Erreur lors de la suppression de la catégorie:', error);
        throw error;
    }
};

const categoriesGetProductsController = async (id, page = 1, limit = 20, sort_by = 'created_at', order = 'desc') => {
    try {
        // Vérifier que la catégorie existe
        const { data: category } = await supabase
            .from('categories')
            .select('id')
            .eq('id', id)
            .single();

        if (!category) {
            return res.status(404).json({ error: 'Catégorie non trouvée' });
        }

        // Récupérer les produits de la catégorie
        const validSortFields = ['prix', 'created_at', 'nom', 'stock'];
        const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { data: products, error, count } = await supabase
            .from('produits')
            .select(`
                id,
                nom,
                description,
                prix,
                stock,
                image_url,
                created_at,
                vendeur:vendeurs(id, nom_boutique)
            `, { count: 'exact' })
            .eq('categorie_id', id)
            .eq('is_active', true)
            .order(sortField, { ascending: order === 'asc' })
            .range(offset, offset + parseInt(limit) - 1);

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
        console.error('Erreur lors de la récupération des produits de la catégorie:', error);
        throw error;
    }
};

module.exports = {
    categoriesGetController,
    categoriesGetByIdController,
    categoriesPostController,
    categoriesPutController,
    categoriesDeleteController
};
