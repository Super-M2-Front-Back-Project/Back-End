# Exemples de Requêtes Postman

## Configuration Préalable

### Variables d'environnement Postman
Créez un environnement avec :
```
base_url = http://localhost:3000
access_token = (sera rempli automatiquement après login)
```

---

## 1. Créer les Utilisateurs de Test

### 1.1 Créer un CLIENT
```http
POST {{base_url}}/api/auth/register
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

### 1.2 Créer un VENDEUR
```http
POST {{base_url}}/api/auth/register
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

**Puis exécutez le SQL** : `scripts/create-test-users.sql` (étape VENDEUR)

### 1.3 Créer un ADMIN
```http
POST {{base_url}}/api/auth/register
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

**Puis exécutez le SQL** : `scripts/create-test-users.sql` (étape ADMIN)

---

## 2. Authentification

### 2.1 Login
```http
POST {{base_url}}/api/auth/login
Content-Type: application/json

{
  "email": "client.test@example.com",
  "password": "Test1234!"
}
```

**Script à ajouter dans l'onglet "Tests" de Postman :**
```javascript
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.environment.set("access_token", jsonData.session.access_token);
    pm.environment.set("user_id", jsonData.user.id);
    console.log("Token saved:", jsonData.session.access_token);
}
```

### 2.2 Vérifier l'utilisateur connecté
```http
GET {{base_url}}/api/auth/me
Authorization: Bearer {{access_token}}
```

### 2.3 Logout
```http
POST {{base_url}}/api/auth/logout
Authorization: Bearer {{access_token}}
```

---

## 3. Catégories

### 3.1 Lister toutes les catégories (PUBLIC)
```http
GET {{base_url}}/api/categories
```

### 3.2 Créer une catégorie (ADMIN uniquement)
```http
POST {{base_url}}/api/categories
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "nom": "Électronique",
  "description": "Appareils et gadgets électroniques"
}
```

### 3.3 Modifier une catégorie (ADMIN uniquement)
```http
PUT {{base_url}}/api/categories/1
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "nom": "High-Tech",
  "description": "Produits high-tech et électronique"
}
```

---

## 4. Produits

### 4.1 Lister tous les produits (PUBLIC)
```http
GET {{base_url}}/api/products?page=1&limit=20&sort_by=created_at&order=desc
```

### 4.2 Rechercher des produits (PUBLIC)
```http
GET {{base_url}}/api/products/search?q=laptop
```

### 4.3 Filtrer les produits (PUBLIC)
```http
GET {{base_url}}/api/products?category_id=1&min_price=100&max_price=500
```

### 4.4 Détails d'un produit (PUBLIC)
```http
GET {{base_url}}/api/products/1
```

### 4.5 Créer un produit (VENDEUR/ADMIN)
```http
POST {{base_url}}/api/products
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "nom": "MacBook Pro 16",
  "description": "Ordinateur portable haute performance avec puce M3",
  "prix": 2499.99,
  "categorie_id": 1,
  "stock": 10,
  "image_url": "https://example.com/macbook.jpg"
}
```

### 4.6 Modifier un produit (VENDEUR/ADMIN)
```http
PUT {{base_url}}/api/products/1
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "nom": "MacBook Pro 16 - M3 Pro",
  "prix": 2399.99,
  "stock": 15
}
```

### 4.7 Mettre à jour le stock (VENDEUR/ADMIN)
```http
PATCH {{base_url}}/api/products/1/stock
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "stock": 5,
  "operation": "add"
}
```
**Operations possibles :** `set`, `add`, `subtract`

### 4.8 Activer/Désactiver un produit (VENDEUR/ADMIN)
```http
PATCH {{base_url}}/api/products/1/toggle-status
Authorization: Bearer {{access_token}}
```

### 4.9 Supprimer un produit (VENDEUR/ADMIN)
```http
DELETE {{base_url}}/api/products/1
Authorization: Bearer {{access_token}}
```

---

## 5. Panier (Cart)

⚠️ **ATTENTION** : Ces routes n'ont actuellement PAS de middleware d'authentification (problème de sécurité)

### 5.1 Voir son panier
```http
GET {{base_url}}/api/cart/get
Content-Type: application/json

{
  "user_id": "{{user_id}}"
}
```

### 5.2 Ajouter un produit au panier
```http
POST {{base_url}}/api/cart/post
Content-Type: application/json

{
  "user_id": "{{user_id}}",
  "item_id": 1
}
```

### 5.3 Modifier la quantité
```http
PUT {{base_url}}/api/cart/update/{{user_id}}
Content-Type: application/json

{
  "item_id": 1,
  "quantity": 3
}
```

### 5.4 Supprimer un article du panier
```http
DELETE {{base_url}}/api/cart/delete/item
Content-Type: application/json

{
  "user_id": "{{user_id}}",
  "item_id": 1
}
```

### 5.5 Vider le panier
```http
DELETE {{base_url}}/api/cart/delete/all
Content-Type: application/json

{
  "user_id": "{{user_id}}"
}
```

---

## 6. Commandes (Orders)

⚠️ **ATTENTION** : Ces routes n'ont actuellement PAS de middleware d'authentification (problème de sécurité)

### 6.1 Créer une commande (depuis le panier)
```http
POST {{base_url}}/api/orders/post
Content-Type: application/json

{
  "user_id": "{{user_id}}"
}
```

### 6.2 Voir toutes les commandes (ADMIN)
```http
GET {{base_url}}/api/orders/get
```

### 6.3 Voir une commande spécifique
```http
GET {{base_url}}/api/orders/get/order_id
Content-Type: application/json

{
  "order_id": "uuid-de-la-commande"
}
```

### 6.4 Voir les commandes d'un utilisateur
```http
GET {{base_url}}/api/orders/get/user_id
Content-Type: application/json

{
  "user_id": "{{user_id}}"
}
```

### 6.5 Modifier le statut d'une commande
```http
PUT {{base_url}}/api/orders/update/uuid-de-la-commande
Content-Type: application/json

{
  "statut": "EN_COURS"
}
```
**Statuts possibles :** `EN_ATTENTE`, `EN_COURS`, `LIVREE`, `ANNULEE`

### 6.6 Supprimer une commande
```http
DELETE {{base_url}}/api/orders/delete/order_id/uuid-de-la-commande
```

---

## 7. Commentaires

### 7.1 Voir les commentaires d'un produit (PUBLIC)
```http
GET {{base_url}}/api/products/1/comments?page=1&limit=10
```

### 7.2 Créer un commentaire (CLIENT authentifié)
```http
POST {{base_url}}/api/comments
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "produit_id": 1,
  "note": 5,
  "commentaire": "Excellent produit, très satisfait de mon achat !"
}
```

### 7.3 Modifier son commentaire (Authentifié)
```http
PUT {{base_url}}/api/comments/uuid-du-commentaire
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "note": 4,
  "commentaire": "Très bon produit, quelques petits défauts mais globalement satisfait."
}
```

### 7.4 Supprimer son commentaire (Authentifié)
```http
DELETE {{base_url}}/api/comments/uuid-du-commentaire
Authorization: Bearer {{access_token}}
```

### 7.5 Voir les commentaires en attente (ADMIN)
```http
GET {{base_url}}/api/comments/pending
Authorization: Bearer {{access_token}}
```

---

## 8. Clients (Gestion des utilisateurs)

### 8.1 Voir tous les clients (ADMIN)
```http
GET {{base_url}}/api/clients
Authorization: Bearer {{access_token}}
```

### 8.2 Voir un client spécifique (Authentifié)
```http
GET {{base_url}}/api/clients/{{user_id}}
Authorization: Bearer {{access_token}}
```

### 8.3 Modifier son profil (Authentifié)
```http
PUT {{base_url}}/api/clients/{{user_id}}
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "nom": "Dupont",
  "prenom": "Jean-Claude",
  "telephone": "0612345678"
}
```

### 8.4 Changer le rôle d'un utilisateur (ADMIN)
```http
PATCH {{base_url}}/api/clients/{{user_id}}/change-role
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "role_nom": "VENDEUR"
}
```

### 8.5 Voir les commandes d'un client (Authentifié)
```http
GET {{base_url}}/api/clients/{{user_id}}/orders
Authorization: Bearer {{access_token}}
```

### 8.6 Supprimer un compte (Authentifié)
```http
DELETE {{base_url}}/api/clients/{{user_id}}
Authorization: Bearer {{access_token}}
```

---

## 9. Vendeurs (Sellers)

### 9.1 Lister tous les vendeurs (PUBLIC)
```http
GET {{base_url}}/api/sellers
```

### 9.2 Voir un vendeur spécifique (PUBLIC)
```http
GET {{base_url}}/api/sellers/1
```

### 9.3 Voir les produits d'un vendeur (PUBLIC)
```http
GET {{base_url}}/api/sellers/1/products
```

---

## Tests Recommandés par Rôle

### Scénario CLIENT
1. Register → Login
2. Lister les produits
3. Voir détails d'un produit
4. Ajouter au panier
5. Créer une commande
6. Laisser un commentaire
7. Modifier son profil

### Scénario VENDEUR
1. Login (après création du profil vendeur)
2. Créer une catégorie (devrait échouer - ADMIN uniquement)
3. Créer un produit (devrait réussir)
4. Modifier son produit
5. Gérer le stock
6. Voir ses produits

### Scénario ADMIN
1. Login
2. Créer une catégorie (devrait réussir)
3. Voir tous les clients
4. Changer le rôle d'un utilisateur
5. Modérer les commentaires
6. Modifier n'importe quel produit

---

## Résolution de Problèmes

### Erreur 401 Unauthorized
- Vérifiez que le token est bien présent : `Authorization: Bearer {{access_token}}`
- Vérifiez que le token n'est pas expiré (durée : 1h)
- Refaites un login pour obtenir un nouveau token

### Erreur 403 Forbidden
- Vous n'avez pas les permissions nécessaires pour cette route
- Vérifiez votre rôle : GET /api/auth/me
- Pour VENDEUR : vérifiez que `is_verified = true` dans la table vendeurs

### Erreur 404 Not Found
- Vérifiez que l'URL est correcte
- Vérifiez que l'ID de la ressource existe
- Exemple : `/api/products/999` si le produit 999 n'existe pas

### Le vendeur ne peut pas se connecter
```sql
-- Vérifiez que is_verified = true
SELECT v.*, u.email
FROM vendeurs v
JOIN users u ON v.user_id = u.id
WHERE u.email = 'vendeur.test@example.com';

-- Si is_verified = false, corrigez-le :
UPDATE vendeurs
SET is_verified = true
WHERE user_id = (SELECT id FROM users WHERE email = 'vendeur.test@example.com');
```
