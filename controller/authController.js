const { supabase } = require('../config/supabase');
const dotenv = require('dotenv');

dotenv.config();

const registerUser = async (email, password, last_name, first_name, birthdate, street, postal_code, city, phone) => {
    try {
        // Récupérer le rôle CLIENT
        const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'CLIENT')
        .single();

        if (roleError || !role) {
            throw new Error('Rôle CLIENT non trouvé - base de données non initialisée');
        }

        // Créer le compte auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Échec de création du compte');

        const { error: userError } = await supabase.from('users').insert({
            id: authData.user.id,
            email: email,
            last_name: last_name,
            first_name: first_name,
            birthdate,
            street: street,
            postal_code: postal_code,
            city: city,
            phone: phone?.trim() || null,
            address: `${street}, ${postal_code}, ${city}`,
            role_id: role.id
        });

        if (userError) throw userError;
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement de l\'utilisateur:', error);
        throw error;
    }
};

const loginUser = async (email, password) => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        const { data: user, error: errorUser } = await supabase
            .from('users')
            .select('id, email, last_name, first_name, address, role:roles(id, name)')
            .eq('id', data.user.id)
            .single();

        if (errorUser) throw errorUser;
        if (!user) throw new Error('Utilisateur non trouvé');
        return {
            token: data.session.access_token,
            user
        };
    } catch (error) {
        console.error('Erreur lors de la connexion de l\'utilisateur:', error);
        throw error;
    }
}

module.exports = {
    registerUser,
    loginUser
};