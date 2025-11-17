const { supabase } = require('../config/supabase');
const dotenv = require('dotenv');

dotenv.config();

const clientsGetController = async (role, search, page, limit, sort_by, order) => {
    try {
        // Construction de la requête
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

        // Filtre par rôle
        if (role) {
            const { data: roleData } = await supabase
                .from('roles')
                .select('id')
                .eq('name', role.toUpperCase())
                .single();

            if (roleData) {
                query = query.eq('role_id', roleData.id);
            }
        }

        // Recherche par nom, prénom ou email
        if (search) {
            query = query.or(`last_name.ilike.%${search}%,first_name.ilike.%${search}%,email.ilike.%${search}%`);
        }

        // Tri et pagination
        query = query.order(sort_by, { ascending: order === 'asc' });
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data: users, error, count } = await query;

        if (error) throw error;

        return {
            clients: users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / parseInt(limit))
            }
        };
    } catch (error) {
        console.error('Erreur lors de la récupération des clients :', error);
        throw error;
    }
};

const clientsGetByIdController = async (id) => {
    try {
        // Récupérer l'utilisateur
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

        if (error || !user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Si l'utilisateur est VENDEUR, inclure le profil vendeur
        if (user.role.name === 'VENDEUR') {
            const { data: vendeur } = await supabase
                .from('sellers')
                .select('id, name, description, siret, is_verified')
                .eq('user_id', id)
                .single();

            user.vendeur = vendeur || null;
        }

        return user;
    } catch (error) {
        console.error('Erreur lors de la récupération du client par ID :', error);
        throw error;
    }
};

const clientsPutController = async (id, last_name, first_name, email, phone, street, postal_code, city, birthdate) => {
    try {
         // Vérifier que l'utilisateur existe
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('id', id)
            .single();

        if (!existingUser) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Construire l'objet de mise à jour
        const updates = {};

        if (last_name !== undefined) {
            if (last_name.trim().length === 0) {
                return res.status(400).json({ error: 'Le name ne peut pas être vide' });
            }
            updates.last_name = last_name.trim();
        }

        if (first_name !== undefined) {
            if (first_name.trim().length === 0) {
                return res.status(400).json({ error: 'Le prénom ne peut pas être vide' });
            }
            updates.first_name = first_name.trim();
        }

        if (email !== undefined) {
            const sanitizedEmail = email.trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
                return res.status(400).json({ error: 'Format email invalide' });
            }

            // Vérifier unicité de l'email
            const { data: duplicate } = await supabase
                .from('users')
                .select('id')
                .eq('email', sanitizedEmail)
                .neq('id', id)
                .single();

            if (duplicate) {
                return res.status(409).json({ error: 'Cet email est déjà utilisé' });
            }
            
            updates.email = sanitizedEmail;
        }

        if (phone !== undefined) updates.phone = phone?.trim() || null;
        if (street !== undefined) updates.street = street?.trim();
        if (postal_code !== undefined) {
            if (postal_code && !/^\d{5}$/.test(postal_code)) {
                return res.status(400).json({ error: 'Code postal invalide (5 chiffres)' });
            }
            updates.postal_code = postal_code?.trim();
        }
        if (city !== undefined) updates.city = city?.trim();
        if (birthdate !== undefined) updates.birthdate = birthdate;

        // Mettre à jour l'utilisateur
        const { data: updatedUser, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return updatedUser;
    } catch (error) {
        console.error('Erreur lors de la mise à jour du client :', error);
        throw error;
    }
};

const clientsPatchController = async (id, name) => {
    try {
        // Récupérer l'utilisateur
        const { data: user, error } = await supabase
            .from('users')
            .select('id, role:roles(id, name)')
            .eq('id', id)
            .single();

        if (error || !user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Vérifier que le rôle est valide
        const { data: role } = await supabase
            .from('roles')
            .select('id, name')
            .eq('name', name.toUpperCase())
            .single();

        if (!role) {
            return res.status(400).json({ error: 'Rôle invalide' });
        }

        // Mettre à jour le rôle de l'utilisateur
        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({ role_id: role.id })
            .eq('id', id)
            .select('id, email, last_name, first_name, role:roles(id, name)')
            .single();

        if (updateError) throw updateError;

        return updatedUser;
    } catch (error) {
        console.error('Erreur lors de la mise à jour du rôle du client :', error);
        throw error;
    }
};

const clientsDeleteController = async (id) => {
    try {
        // Vérifier que l'utilisateur existe
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('id', id)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Vérifier les commandes en cours
        const { data: pendingOrders } = await supabase
            .from('commandes')
            .select('id')
            .eq('user_id', id)
            .in('statut', ['EN_ATTENTE', 'EN_PREPARATION', 'EXPEDIE']);

        if (pendingOrders && pendingOrders.length > 0) {
            return res.status(400).json({
                error: 'Impossible de supprimer ce compte car il a des commandes en cours',
                pending_orders: pendingOrders.length
            });
        }

        // Supprimer l'utilisateur de Supabase Auth (cascade supprimera aussi de la table users)
        if (supabaseAdmin) {
            const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
            if (authError) throw authError;
        } else {
            // Fallback: supprimer juste de la table users
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', id);

            if (error) throw error;
        }
    } catch (error) {
        console.error('Erreur lors de la suppression du client :', error);
        throw error;
    }
};

const clientsGetCommandsController = async (id, page, limit, status) => {
    try {
        // Construction de la requête
        let query = supabase
            .from('commandes')
            .select(`
                id,
                date_commande,
                statut,
                total,
                adresse_livraison,
                created_at
            `, { count: 'exact' })
            .eq('user_id', id);

        // Filtre par statut
        if (status) {
            query = query.eq('statut', status);
        }

        query = query.order('date_commande', { ascending: false });

        const offset = (parseInt(page) - 1) * parseInt(limit);
        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data: orders, error, count } = await query;

        if (error) throw error;

        return {
            orders: orders || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count || 0,
                pages: Math.ceil((count || 0) / parseInt(limit))
            }
        };
    } catch (error) {
        console.error('Erreur lors de la récupération des commandes du client :', error);
        throw error;
    }
};

const clientsGetCommentsController = async (id, page, limit) => {
    try {
        let query = supabase
            .from('commentaires')
            .select(`
                id,
                note,
                commentaire,
                is_approved,
                created_at,
                produit:produits(id, name, image_url)
            `, { count: 'exact' })
            .eq('user_id', id);

        // Si ce n'est pas l'utilisateur lui-même ni un ADMIN, filtrer seulement les approuvés
        if (req.user.id !== id && req.user.role.name !== 'ADMIN') {
            query = query.eq('is_approved', true);
        }

        query = query.order('created_at', { ascending: false });

        const offset = (parseInt(page) - 1) * parseInt(limit);
        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data: comments, error, count } = await query;

        if (error) throw error;

        return {
            comments: comments || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count || 0,
                pages: Math.ceil((count || 0) / parseInt(limit))
            }
        };
    } catch (error) {
        console.error('Erreur lors de la récupération des commentaires du client :', error);
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