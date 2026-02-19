const { supabase } = require('../config/supabase');

/**
 * Product Service - Core database operations
 * Pure business logic without validation or HTTP concerns
 */

const buildProductQuery = (filters, userRole) => {
    const {
        page = 1,
        limit = 20,
        search,
        category_id,
        vendor_id,
        min_price,
        max_price,
        sort_by = 'created_at',
        order = 'desc'
    } = filters;

    let query = supabase
        .from('products')
        .select(`
            id, name, description, price, quantity, image_url, is_active, created_at,
            categorie:categories(id, name),
            seller:sellers(id, name, user:users(first_name, last_name))
        `, { count: 'exact' });

    // Filters
    if (!userRole || userRole !== 'ADMIN') query = query.eq('is_active', true);
    if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    if (category_id) query = query.eq('categorie_id', category_id);
    if (vendor_id) query = query.eq('vendeur_id', vendor_id);
    if (min_price) query = query.gte('price', parseFloat(min_price));
    if (max_price) query = query.lte('price', parseFloat(max_price));

    // Sorting
    const validSortFields = ['price', 'created_at', 'name', 'quantity'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    query = query.order(sortField, { ascending: order === 'asc' });

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    return { query, page: parseInt(page), limit: parseInt(limit) };
};

const getProducts = async (filters, userRole = null) => {
    const { query, page, limit } = buildProductQuery(filters, userRole);
    const { data: products, error, count } = await query;
    if (error) throw error;

    return {
        products: products || [],
        count,
        page,
        limit
    };
};

const searchProducts = async (searchQuery) => {
    const { data, error } = await supabase
        .from('products')
        .select(`
            id, name, description, price, quantity, image_url,
            category:categories(id, name),
            seller:sellers(name)
        `)
        .eq('is_active', true)
        .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .limit(20);

    if (error) throw error;
    return data || [];
};

const getProductById = async (id) => {
    const { data, error } = await supabase
        .from('products')
        .select(`
            id, name, description, price, quantity, image_url, is_active, created_at,
            category:categories(id, name, description),
            seller:sellers(id, name, description, user:users(last_name, first_name))
        `)
        .eq('id', id)
        .single();

    if (error || !data) throw new Error('Produit non trouvé');
    return data;
};

const getSellerByUserId = async (userId) => {
    const { data, error } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', userId)
        .single();

    if (error || !data) throw new Error('Profil vendeur non trouvé');
    return data;
};

const categoryExists = async (categoryId) => {
    const { data } = await supabase
        .from('categories')
        .select('id')
        .eq('id', categoryId)
        .single();

    return !!data;
};

const createProduct = async (productData) => {
    const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();

    if (error) throw error;
    return data;
};

const updateProduct = async (id, updates) => {
    const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

const toggleProductActive = async (id) => {
    const { data: product } = await supabase
        .from('products')
        .select('is_active')
        .eq('id', id)
        .single();

    if (!product) throw new Error('Produit non trouvé');

    const { data, error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', id)
        .select('is_active')
        .single();

    if (error) throw error;
    return data.is_active;
};

const updateProductStock = async (id, quantity, operation = 'set') => {
    const { data: product } = await supabase
        .from('products')
        .select('quantity')
        .eq('id', id)
        .single();

    if (!product) throw new Error('Produit non trouvé');

    let newStock;
    switch (operation) {
        case 'set': newStock = quantity; break;
        case 'add': newStock = product.quantity + quantity; break;
        case 'subtract': newStock = product.quantity - quantity; break;
        default: throw new Error('Opération invalide (set, add, subtract)');
    }

    if (newStock < 0) throw new Error('Le quantity ne peut pas être négatif');

    const { data, error } = await supabase
        .from('products')
        .update({ quantity: newStock })
        .eq('id', id)
        .select('quantity')
        .single();

    if (error) throw error;
    return data.quantity;
};

const deleteProduct = async (id) => {
    const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id);

    if (error) throw error;
    return { message: 'Produit supprimé (désactivé)' };
};

const getRelatedProducts = async (productId) => {
    const { data: product } = await supabase
        .from('products')
        .select('category_id, price')
        .eq('id', productId)
        .single();

    if (!product) throw new Error('Produit non trouvé');

    const priceMin = product.price * 0.7;
    const priceMax = product.price * 1.3;

    const { data, error } = await supabase
        .from('products')
        .select(`
            id, name, price, image_url,
            category:categories(name),
            seller:sellers(name)
        `)
        .eq('category_id', product.category_id)
        .eq('is_active', true)
        .neq('id', productId)
        .gte('price', priceMin)
        .lte('price', priceMax)
        .limit(8);

    if (error) throw error;
    return data || [];
};

const checkProductOwnership = async (productId, userId, userRole) => {
    const { data: product } = await supabase
        .from('products')
        .select('seller_id')
        .eq('id', productId)
        .single();

    if (!product) throw new Error('Produit non trouvé');

    if (userRole === 'ADMIN') return true;

    const seller = await getSellerByUserId(userId);
    if (seller.id !== product.seller_id) {
        throw new Error('Vous ne pouvez modifier que vos propres produits');
    }

    return true;
};

module.exports = {
    getProducts,
    searchProducts,
    getProductById,
    getSellerByUserId,
    categoryExists,
    createProduct,
    updateProduct,
    toggleProductActive,
    updateProductStock,
    deleteProduct,
    getRelatedProducts,
    checkProductOwnership
};
