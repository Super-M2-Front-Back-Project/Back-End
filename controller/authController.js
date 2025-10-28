const { supabase } = require('../config/supabase');
const dotenv = require('dotenv');

dotenv.config();

const registerUser = async (email, password, nom, prenom, date_naissance, rue, code_postal, ville, telephone, adresse) => {
    try {
        // Récupérer le rôle CLIENT
        const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('nom', 'CLIENT')
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
            nom: nom,
            prenom: prenom,
            date_naissance,
            rue: rue,
            code_postal: code_postal,
            ville: ville,
            telephone: telephone?.trim() || null,
            // Ancienne colonne pour rétrocompatibilité (peut être supprimée après migration complète)
            adresse: adresse?.trim() || `${rue}, ${code_postal} ${ville}`,
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
            .select('id, email, nom, prenom, adresse, role:roles(id, nom)')
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