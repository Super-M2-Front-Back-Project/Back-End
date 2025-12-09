-- =====================================================================
-- Script SQL pour créer des utilisateurs de test
-- =====================================================================
--
-- INSTRUCTIONS :
-- 1. D'abord, créez les comptes via l'API POST /api/auth/register
-- 2. Ensuite, exécutez ce script pour modifier les rôles et créer les profils vendeurs
--
-- Alternativement, créez les comptes manuellement dans Supabase Dashboard :
-- https://app.supabase.com/project/_/auth/users > Add User
-- Puis exécutez ce script pour compléter les profils
-- =====================================================================

-- ========================================
-- VENDEUR TEST
-- ========================================
-- Étape 1 : Mettre à jour le rôle en VENDEUR
UPDATE users
SET role_id = (SELECT id FROM roles WHERE nom = 'VENDEUR')
WHERE email = 'vendeur.test@example.com';

-- Étape 2 : Créer le profil vendeur
INSERT INTO vendeurs (user_id, nom_boutique, description, is_verified)
SELECT
  id,
  'Boutique Test',
  'Boutique de test pour développement et tests Postman. Vend des produits variés.',
  true  -- IMPORTANT : is_verified = true pour que le vendeur puisse s'authentifier
FROM users
WHERE email = 'vendeur.test@example.com'
ON CONFLICT (user_id) DO NOTHING;  -- Évite les doublons

-- ========================================
-- ADMIN TEST
-- ========================================
UPDATE users
SET role_id = (SELECT id FROM roles WHERE nom = 'ADMIN')
WHERE email = 'admin.test@example.com';

-- ========================================
-- Vérification : Afficher tous les utilisateurs de test
-- ========================================
SELECT
  u.id,
  u.email,
  u.nom,
  u.prenom,
  r.nom as role,
  v.nom_boutique,
  v.is_verified as vendeur_verifie,
  u.created_at
FROM users u
JOIN roles r ON u.role_id = r.id
LEFT JOIN vendeurs v ON v.user_id = u.id
WHERE u.email IN (
  'client.test@example.com',
  'vendeur.test@example.com',
  'admin.test@example.com'
)
ORDER BY r.nom;

-- ========================================
-- NOTES IMPORTANTES
-- ========================================
-- CLIENT : Déjà créé avec le rôle CLIENT par défaut lors du register
-- VENDEUR : Rôle modifié + profil vendeur créé avec is_verified = true
-- ADMIN : Rôle modifié en ADMIN
--
-- Pour tester l'authentification :
-- 1. POST /api/auth/login avec email + password
-- 2. Copier le access_token de la réponse
-- 3. Utiliser le token dans l'en-tête : Authorization: Bearer {token}
--
-- Mot de passe recommandé pour tous les comptes : Test1234!
