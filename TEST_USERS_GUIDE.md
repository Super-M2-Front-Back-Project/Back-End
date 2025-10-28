# Guide de Test - Authentification et Utilisateurs de Test

## Routes par Niveau d'Authentification

### 🟢 Routes PUBLIQUES (pas d'authentification requise)

- `POST /api/auth/register` - Créer un compte
- `POST /api/auth/login` - Se connecter
- `GET /api/products` - Liste des produits (avec filtres)
- `GET /api/products/search` - Recherche de produits
- `GET /api/products/:id` - Détails d'un produit
- `GET /api/products/:id/comments` - Commentaires d'un produit
- `GET /api/products/:id/related` - Produits similaires
- `GET /api/categories` - Liste des catégories

⚠️ **PROBLÈME DE SÉCURITÉ IDENTIFIÉ :**
- `ALL /api/cart/*` - PAS d'auth actuellement (devrait être authentifié !)
- `ALL /api/orders/*` - PAS d'auth actuellement (devrait être authentifié !)

### 🔵 Routes AUTHENTIFIÉES (nécessitent un JWT token)

- `POST /api/auth/logout` - Se déconnecter
- `GET /api/auth/me` - Info utilisateur connecté
- `POST /api/comments` - Créer un commentaire
- `PUT /api/comments/:id` - Modifier son commentaire
- `DELETE /api/comments/:id` - Supprimer son commentaire
- `GET /api/clients/:id` - Infos d'un client (soi-même ou ADMIN)
- `PUT /api/clients/:id` - Modifier son profil
- `DELETE /api/clients/:id` - Supprimer son compte
- `GET /api/clients/:id/orders` - Ses commandes
- `GET /api/clients/:id/comments` - Ses commentaires

### 🟡 Routes VENDEUR ou ADMIN

- `POST /api/products` - Créer un produit
- `PUT /api/products/:id` - Modifier un produit (son propre produit)
- `PATCH /api/products/:id/toggle-status` - Activer/désactiver un produit
- `PATCH /api/products/:id/stock` - Gérer le stock
- `DELETE /api/products/:id` - Supprimer un produit

### 🔴 Routes ADMIN UNIQUEMENT

- `GET /api/clients` - Liste de tous les clients
- `PATCH /api/clients/:id/change-role` - Changer le rôle d'un user
- `POST /api/categories` - Créer une catégorie
- `PUT /api/categories/:id` - Modifier une catégorie
- `DELETE /api/categories/:id` - Supprimer une catégorie
- `GET /api/comments/pending` - Commentaires en attente de modération

---

## Créer des Utilisateurs de Test

Utilisez ces requêtes Postman pour créer des utilisateurs de test :

#### 1. Créer un CLIENT
```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "client.test@example.com",
  "password": "Test1234!",
  "nom": "Dupont",
  "prenom": "Jean",
  "date_naissance": "1995-05-15",
  "rue": "123 Rue de la Paix",
  "code_postal": "75001",
  "ville": "Paris",
  "telephone": "0601020304"
}
```

#### 2. Créer un VENDEUR (nécessite 2 étapes)

**Étape A : Créer le compte**
```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "vendeur.test@example.com",
  "password": "Test1234!",
  "nom": "Martin",
  "prenom": "Sophie",
  "date_naissance": "1988-08-20",
  "rue": "456 Avenue du Commerce",
  "code_postal": "69001",
  "ville": "Lyon",
  "telephone": "0612345678"
}
```

**Étape B : Exécuter ce SQL dans Supabase SQL Editor**
```sql
-- 1. Changer le rôle en VENDEUR
UPDATE users
SET role_id = (SELECT id FROM roles WHERE nom = 'VENDEUR')
WHERE email = 'vendeur.test@example.com';

-- 2. Créer le profil vendeur
INSERT INTO vendeurs (user_id, nom_boutique, description, is_verified)
SELECT
  id,
  'Boutique Test',
  'Boutique de test pour Postman',
  true  -- IMPORTANT : is_verified = true pour pouvoir s'authentifier
FROM users
WHERE email = 'vendeur.test@example.com';
```

#### 3. Créer un ADMIN

**Étape A : Créer le compte**
```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "admin.test@example.com",
  "password": "Admin1234!",
  "nom": "Administrateur",
  "prenom": "Super",
  "date_naissance": "1985-01-01",
  "rue": "789 Boulevard Admin",
  "code_postal": "13001",
  "ville": "Marseille",
  "telephone": "0698765432"
}
```

**Étape B : Exécuter ce SQL dans Supabase SQL Editor**
```sql
-- Changer le rôle en ADMIN
UPDATE users
SET role_id = (SELECT id FROM roles WHERE nom = 'ADMIN')
WHERE email = 'admin.test@example.com';
```

---

## Utiliser l'Authentification dans Postman

### 1. Se connecter

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "client.test@example.com",
  "password": "Test1234!"
}
```

**Réponse :**
```json
{
  "message": "Connexion réussie",
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "...",
    "expires_in": 3600,
    "token_type": "bearer"
  },
  "user": {
    "id": "uuid-here",
    "email": "client.test@example.com",
    "role": {
      "id": 1,
      "nom": "CLIENT"
    }
  }
}
```

### 2. Copier le `access_token` et l'utiliser dans les requêtes protégées

**Dans Postman :**
- Onglet **Authorization**
- Type : **Bearer Token**
- Token : Coller le `access_token`

**Ou dans l'en-tête :**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Tester une route protégée

```http
GET http://localhost:3000/api/auth/me
Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
```

---

## Collection Postman Recommandée

Créez une **Collection Postman** avec ces 3 environnements :

### Environment : CLIENT_TEST
- `base_url` : `http://localhost:3000`
- `email` : `client.test@example.com`
- `password` : `Test1234!`
- `access_token` : (vide au départ, sera rempli après login)

### Environment : VENDEUR_TEST
- `base_url` : `http://localhost:3000`
- `email` : `vendeur.test@example.com`
- `password` : `Test1234!`
- `access_token` : (vide au départ)

### Environment : ADMIN_TEST
- `base_url` : `http://localhost:3000`
- `email` : `admin.test@example.com`
- `password` : `Admin1234!`
- `access_token` : (vide au départ)

**Dans la requête de login**, ajoutez ce script dans **Tests** pour sauvegarder le token automatiquement :

```javascript
pm.test("Login successful", function () {
    pm.response.to.have.status(200);
    var jsonData = pm.response.json();
    pm.environment.set("access_token", jsonData.session.access_token);
});
```

Ensuite, dans toutes vos requêtes protégées, utilisez :
```
Authorization: Bearer {{access_token}}
```

---

## Résumé

1. ✅ Créez les utilisateurs via l'API (POST /api/auth/register)
2. ✅ Exécutez le script SQL `scripts/create-test-users.sql` pour les rôles VENDEUR et ADMIN
3. ✅ Configurez 3 environnements Postman (CLIENT, VENDEUR, ADMIN)
4. ✅ Faites un login pour chaque utilisateur pour récupérer le token
5. ✅ Utilisez le token dans l'en-tête `Authorization: Bearer {token}`
6. ✅ Testez toutes les routes selon les permissions

**Mot de passe de tous les comptes de test :** `Test1234!`
