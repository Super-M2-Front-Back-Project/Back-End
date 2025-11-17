const { supabase } = require('../config/supabase');
const dotenv = require('dotenv');

dotenv.config();

const clientsGetController = async (role, search, page = 1, limit = 20, sort_by = 'created_at', order = 'desc') => {
    try {
        let query = supabase
            .from('users')
            .select(`
                id,
                email,
                last_name,
                first_name,
                phone,
                street,
                postal_code,
                city,
                created_at,
                role:roles(id, name)
            `, { count: 'exact' });

        if (role) {
            const { data: roleData } = await supabase
                .from('roles')
                .select('id')
                .eq('name', role.toUpperCase())
                .single();
            if (roleData) query = query.eq('role_id', roleData.id);
        }

        if (search) {
            query = query.or(`last_name.ilike.%${search}%,first_name.ilike.%${search}%,email.ilike.%${search}%`);
        }

        query = query.order(sort_by, { ascending: order === 'asc' });
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data: users, error, count } = await query;
        if (error) throw error;

        return {
            clients: users || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count || 0,
                pages: Math.ceil((count || 0) / parseInt(limit))
            }
        };
    } catch (error) {
        console.error('Error fetching clients:', error);
        throw error;
    }
};

const clientsGetByIdController = async (id) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select(`
                id,
                email,
                last_name,
                first_name,
                birthdate,
                street,
                postal_code,
                city,
                phone,
                created_at,
                role:roles(id, name)
            `)
            .eq('id', id)
            .single();

        if (error || !user) throw new Error('User not found');

        if (user.role?.name === 'VENDEUR') {
            const { data: vendeur } = await supabase
                .from('sellers')
                .select('id, name, description, siret, is_verified')
                .eq('user_id', id)
                .single();
            user.vendeur = vendeur || null;
        }

        return user;
    } catch (error) {
        console.error('Error fetching client by ID:', error);
        throw error;
    }
};

const clientsPutController = async (id, fields) => {
    try {
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('id', id)
            .single();

        if (!existingUser) throw new Error('User not found');

        const updates = {};

        if (fields.last_name !== undefined) {
            const val = fields.last_name.trim();
            if (!val) throw new Error('Last name cannot be empty');
            updates.last_name = val;
        }

        if (fields.first_name !== undefined) {
            const val = fields.first_name.trim();
            if (!val) throw new Error('First name cannot be empty');
            updates.first_name = val;
        }

        if (fields.email !== undefined) {
            const email = fields.email.trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email format');

            const { data: duplicate } = await supabase
                .from('users')
                .select('id')
                .eq('email', email)
                .neq('id', id)
                .single();
            if (duplicate) throw new Error('Email already in use');

            updates.email = email;
        }

        if (fields.phone !== undefined) updates.phone = fields.phone?.trim() || null;
        if (fields.street !== undefined) updates.street = fields.street?.trim();
        if (fields.postal_code !== undefined) {
            if (fields.postal_code && !/^\d{5}$/.test(fields.postal_code)) throw new Error('Invalid postal code');
            updates.postal_code = fields.postal_code?.trim();
        }
        if (fields.city !== undefined) updates.city = fields.city?.trim();
        if (fields.birthdate !== undefined) updates.birthdate = fields.birthdate;

        const { data: updatedUser, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return updatedUser;
    } catch (error) {
        console.error('Error updating client:', error);
        throw error;
    }
};

const clientsPatchController = async (id, roleName) => {
    try {
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('id', id)
            .single();
        if (!user) throw new Error('User not found');

        const { data: role } = await supabase
            .from('roles')
            .select('id, name')
            .eq('name', roleName.toUpperCase())
            .single();

        if (!role) throw new Error('Invalid role');

        const { data: updatedUser, error } = await supabase
            .from('users')
            .update({ role_id: role.id })
            .eq('id', id)
            .select('id, email, last_name, first_name, role:roles(id, name)')
            .single();

        if (error) throw error;
        return updatedUser;
    } catch (error) {
        console.error('Error updating client role:', error);
        throw error;
    }
};

const clientsDeleteController = async (id) => {
    try {
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('id', id)
            .single();
        if (!user) throw new Error('User not found');

        const { data: pendingOrders } = await supabase
            .from('commandes')
            .select('id')
            .eq('user_id', id)
            .in('status', ['EN_ATTENTE', 'EN_PREPARATION', 'EXPEDIE']);

        if (pendingOrders?.length > 0) throw new Error('Cannot delete user with pending orders');

        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);
        if (error) throw error;

        return { message: 'User deleted successfully' };
    } catch (error) {
        console.error('Error deleting client:', error);
        throw error;
    }
};

const clientsGetCommandsController = async (id, page = 1, limit = 20, status) => {
    try {
        let query = supabase
            .from('commandes')
            .select('id, command_date, status, total, address, created_at', { count: 'exact' })
            .eq('user_id', id);

        if (status) query = query.eq('status', status);

        query = query.order('command_date', { ascending: false });

        const offset = (page - 1) * limit;
        query = query.range(offset, offset + limit - 1);

        const { data: orders, error, count } = await query;
        if (error) throw error;

        return {
            orders: orders || [],
            pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) }
        };
    } catch (error) {
        console.error('Error fetching client orders:', error);
        throw error;
    }
};

const clientsGetCommentsController = async (id, page = 1, limit = 20, currentUserRole = 'ADMIN', currentUserId) => {
    try {
        let query = supabase
            .from('commentaires')
            .select('id, rate, comment, is_approved, created_at, product:products(id, name, image_url)', { count: 'exact' })
            .eq('user_id', id);

        // Filtrer seulement les approuvés si ce n'est pas l'utilisateur lui-même ni un admin
        if (currentUserId !== id && currentUserRole !== 'ADMIN') {
            query = query.eq('is_approved', true);
        }

        query = query.order('created_at', { ascending: false });
        const offset = (page - 1) * limit;
        query = query.range(offset, offset + limit - 1);

        const { data: comments, error, count } = await query;
        if (error) throw error;

        return {
            comments: comments || [],
            pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) }
        };
    } catch (error) {
        console.error('Error fetching client comments:', error);
        throw error;
    }
};

module.exports = {
    clientsGetController,
    clientsGetByIdController,
    clientsPutController,
    clientsPatchController,
    clientsDeleteController,
    clientsGetCommandsController,
    clientsGetCommentsController
};
