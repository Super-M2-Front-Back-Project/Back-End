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
                nom,
                prenom,
                telephone,
                rue,
                code_postal,
                ville,
                created_at,
                role:roles(id, nom)
            `, { count: 'exact' });

        // Filtre par rôle
        if (role) {
            const { data: roleData } = await supabase
                .from('roles')
                .select('id')
                .eq('nom', role.toUpperCase())
                .single();

            if (roleData) {
                query = query.eq('role_id', roleData.id);
            }
        }

        // Recherche par nom, prénom ou email
        if (search) {
            query = query.or(`nom.ilike.%${search}%,prenom.ilike.%${search}%,email.ilike.%${search}%`);
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
                nom,
                prenom,
                date_naissance,
                rue,
                code_postal,
                ville,
                telephone,
                created_at,
                role:roles(id, nom)
            `)
            .eq('id', id)
            .single();

        if (error || !user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Si l'utilisateur est VENDEUR, inclure le profil vendeur
        if (user.role.nom === 'VENDEUR') {
            const { data: vendeur } = await supabase
                .from('vendeurs')
                .select('id, nom_boutique, description, siret, is_verified')
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

const clientsPutController = async (id, nom, prenom, email, telephone, rue, code_postal, ville, date_naissance) => {
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

        if (nom !== undefined) {
            if (nom.trim().length === 0) {
                return res.status(400).json({ error: 'Le nom ne peut pas être vide' });
            }
            updates.nom = nom.trim();
        }

        if (prenom !== undefined) {
            if (prenom.trim().length === 0) {
                return res.status(400).json({ error: 'Le prénom ne peut pas être vide' });
            }
            updates.prenom = prenom.trim();
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

        if (telephone !== undefined) updates.telephone = telephone?.trim() || null;
        if (rue !== undefined) updates.rue = rue?.trim();
        if (code_postal !== undefined) {
            if (code_postal && !/^\d{5}$/.test(code_postal)) {
                return res.status(400).json({ error: 'Code postal invalide (5 chiffres)' });
            }
            updates.code_postal = code_postal?.trim();
        }
        if (ville !== undefined) updates.ville = ville?.trim();
        if (date_naissance !== undefined) updates.date_naissance = date_naissance;

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

const clientsPatchController = async (id, role_nom) => {
    try {
        // Récupérer l'utilisateur
        const { data: user, error } = await supabase
            .from('users')
            .select('id, role:roles(id, nom)')
            .eq('id', id)
            .single();

        if (error || !user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Vérifier que le rôle est valide
        const { data: role } = await supabase
            .from('roles')
            .select('id, nom')
            .eq('nom', role_nom.toUpperCase())
            .single();

        if (!role) {
            return res.status(400).json({ error: 'Rôle invalide' });
        }

        // Mettre à jour le rôle de l'utilisateur
        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({ role_id: role.id })
            .eq('id', id)
            .select('id, email, nom, prenom, role:roles(id, nom)')
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
                produit:produits(id, nom, image_url)
            `, { count: 'exact' })
            .eq('user_id', id);

        // Si ce n'est pas l'utilisateur lui-même ni un ADMIN, filtrer seulement les approuvés
        if (req.user.id !== id && req.user.role.nom !== 'ADMIN') {
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