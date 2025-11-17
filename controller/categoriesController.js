const { supabase } = require('../config/supabase');
const dotenv = require('dotenv');

dotenv.config();

const categoriesGetController = async (sort_by = 'created_at', order = 'desc') => {
    try {
        const { data: categories, error } = await supabase
            .from('categories')
            .select('id, name, description, created_at')
            .order(sort_by, { ascending: order === 'asc' });

        if (error) throw error;

        const categoriesWithStats = await Promise.all(categories.map(async (category) => {
            const { count } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('category_id', category.id)
                .eq('is_active', true);
            return { ...category, total_products: count || 0 };
        }));

        return categoriesWithStats;
    } catch (error) {
        console.error('Error fetching categories:', error);
        throw error;
    }
};

const categoriesGetByIdController = async (id) => {
    try {
        const { data: category, error } = await supabase
            .from('categories')
            .select('id, name, description, created_at')
            .eq('id', id)
            .single();

        if (error) throw error;

        const { count: totalProducts } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', id)
            .eq('is_active', true);

        const { data: sellers } = await supabase
            .from('products')
            .select('seller_id')
            .eq('category_id', id)
            .eq('is_active', true);

        const uniqueVendors = sellers ? new Set(sellers.map(p => p.seller_id)).size : 0;

        return { ...category, total_products: totalProducts || 0, total_vendors: uniqueVendors };
    } catch (error) {
        console.error('Error fetching category by ID:', error);
        throw error;
    }
};

const categoriesPostController = async (name, description) => {
    try {
        if (!name || name.trim().length === 0) throw new Error('Category name cannot be empty');
        const sanitizedName = name.trim();

        const { data: existing, error: existingError } = await supabase
            .from('categories')
            .select('id')
            .eq('name', sanitizedName)
            .single();

        if (existingError && existingError.code !== 'PGRST116') throw existingError;
        if (existing) throw new Error('A category with this name already exists');

        const { data: category, error } = await supabase
            .from('categories')
            .insert({ name: sanitizedName, description: description?.trim() || null })
            .select()
            .single();

        if (error) throw error;
        return category;
    } catch (error) {
        console.error('Error creating category:', error);
        throw error;
    }
};

const categoriesPutController = async (id, name, description) => {
    try {
        const { data: existing, error: existingError } = await supabase
            .from('categories')
            .select('id')
            .eq('id', id)
            .single();

        if (existingError || !existing) throw new Error('Category not found');

        const updates = {};

        if (name !== undefined) {
            const sanitizedName = name.trim();
            if (!sanitizedName) throw new Error('Category name cannot be empty');

            const { data: duplicate, error: dupError } = await supabase
                .from('categories')
                .select('id')
                .eq('name', sanitizedName)
                .neq('id', id)
                .single();

            if (dupError && dupError.code !== 'PGRST116') throw dupError;
            if (duplicate) throw new Error('A category with this name already exists');

            updates.name = sanitizedName;
        }

        if (description !== undefined) updates.description = description?.trim() || null;

        const { data: category, error: updateError } = await supabase
            .from('categories')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;
        return category;
    } catch (error) {
        console.error('Error updating category:', error);
        throw error;
    }
};

const categoriesDeleteController = async (id) => {
    try {
        const { data: existing, error: existingError } = await supabase
            .from('categories')
            .select('id')
            .eq('id', id)
            .single();

        if (existingError || !existing) throw new Error('Category not found');

        const { count, error: countError } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', id);

        if (countError) throw countError;
        if (count > 0) throw new Error(`Cannot delete category; ${count} product(s) are linked`);

        const { error: deleteError } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;
        return { message: 'Category deleted successfully' };
    } catch (error) {
        console.error('Error deleting category:', error);
        throw error;
    }
};

const categoriesGetProductsController = async (id, page = 1, limit = 20, sort_by = 'created_at', order = 'desc') => {
    try {
        const { data: category, error } = await supabase
            .from('categories')
            .select('id')
            .eq('id', id)
            .single();

        if (error || !category) throw new Error('Category not found');

        const validSortFields = ['price', 'created_at', 'name', 'stock'];
        const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { data: products, count, error: productsError } = await supabase
            .from('products')
            .select(`
                id,
                name,
                description,
                price,
                stock,
                image_url,
                created_at,
                seller:sellers(id, name)
            `, { count: 'exact' })
            .eq('category_id', id)
            .eq('is_active', true)
            .order(sortField, { ascending: order === 'asc' })
            .range(offset, offset + parseInt(limit) - 1);

        if (productsError) throw productsError;

        const productsWithRatings = await Promise.all(products.map(async (product) => {
            const { data: comments } = await supabase
                .from('comments')
                .select('rate')
                .eq('product_id', product.id)
                .eq('is_approved', true);

            const averageRating = comments && comments.length > 0
                ? comments.reduce((sum, c) => sum + c.rate, 0) / comments.length
                : 0;

            return { ...product, average_rating: Math.round(averageRating * 10) / 10, total_comments: comments?.length || 0 };
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
        console.error('Error fetching products for category:', error);
        throw error;
    }
};

module.exports = {
    categoriesGetController,
    categoriesGetByIdController,
    categoriesPostController,
    categoriesPutController,
    categoriesDeleteController,
    categoriesGetProductsController
};
