# Architecture des Routes - Ultrathink Backend

## Structure des fichiers

Les routes sont organisées par domaine fonctionnel pour faciliter la maintenance et la scalabilité :

```
routes/
├── index.js                 # Point d'entrée centralisé
├── auth.routes.js          # Authentification
├── users.routes.js         # Gestion utilisateurs
├── vendors.routes.js       # Gestion vendeurs
├── products.routes.js      # Gestion produits
├── categories.routes.js    # Gestion catégories
├── cart.routes.js          # Gestion panier
├── orders.routes.js        # Gestion commandes
└── comments.routes.js      # Gestion commentaires
```

## Utilisation

Dans votre fichier principal (index.js) :

```javascript
const express = require('express');
const app = express();
const apiRoutes = require('./routes');

// Middleware
app.use(express.json());

// Montage des routes avec préfixe /api
app.use('/api', apiRoutes);

// Démarrage du serveur
app.listen(3000, () => {
    console.log('Serveur démarré sur le port 3000');
});
```

## Routes disponibles

### 🔐 Authentification (`/api/auth`)
- `POST /register` - Inscription d'un nouvel utilisateur
- `POST /login` - Connexion
- `POST /logout` - Déconnexion
- `POST /refresh` - Rafraîchir le token
- `POST /forgot-password` - Demande de réinitialisation
- `POST /reset-password` - Réinitialisation du mot de passe
- `GET /me` - Informations utilisateur connecté

### 👥 Utilisateurs (`/api/users`)
- `GET /` - Liste des utilisateurs (ADMIN)
- `GET /:id` - Détails d'un utilisateur
- `PUT /:id` - Mise à jour du profil
- `PATCH /:id/toggle-status` - Activer/Désactiver (ADMIN)
- `PATCH /:id/change-role` - Modifier le rôle (ADMIN)
- `DELETE /:id` - Supprimer un compte
- `GET /:id/orders` - Commandes d'un utilisateur
- `GET /:id/comments` - Commentaires d'un utilisateur

### 🏪 Vendeurs (`/api/vendors`)
- `GET /` - Liste des vendeurs
- `GET /:id` - Détails d'un vendeur
- `POST /` - Créer un profil vendeur
- `PUT /:id` - Mise à jour du profil
- `PATCH /:id/verify` - Vérifier un vendeur (ADMIN)
- `PATCH /:id/commission` - Modifier la commission (ADMIN)
- `GET /:id/products` - Produits d'un vendeur
- `GET /:id/orders` - Commandes d'un vendeur
- `GET /:id/stats` - Statistiques vendeur
- `DELETE /:id` - Supprimer un vendeur (ADMIN)

### 📦 Produits (`/api/products`)
- `GET /` - Liste des produits (avec filtres)
- `GET /search` - Recherche avancée
- `GET /:id` - Détails d'un produit
- `POST /` - Créer un produit (VENDEUR/ADMIN)
- `PUT /:id` - Mettre à jour un produit
- `PATCH /:id/toggle-status` - Activer/Désactiver
- `PATCH /:id/stock` - Mettre à jour le stock
- `DELETE /:id` - Supprimer un produit
- `GET /:id/comments` - Commentaires d'un produit
- `GET /:id/related` - Produits similaires

### 🏷️ Catégories (`/api/categories`)
- `GET /` - Liste des catégories
- `GET /:id` - Détails d'une catégorie
- `POST /` - Créer une catégorie (ADMIN)
- `PUT /:id` - Mettre à jour une catégorie (ADMIN)
- `DELETE /:id` - Supprimer une catégorie (ADMIN)
- `GET /:id/products` - Produits d'une catégorie

### 🛒 Panier (`/api/cart`)
- `GET /` - Récupérer le panier
- `POST /items` - Ajouter un produit
- `PUT /items/:item_id` - Modifier la quantité
- `DELETE /items/:item_id` - Retirer un produit
- `DELETE /` - Vider le panier
- `GET /count` - Nombre d'items
- `POST /validate` - Valider le panier avant commande

### 📋 Commandes (`/api/orders`)
- `GET /` - Liste des commandes
- `GET /:id` - Détails d'une commande
- `POST /` - Créer une commande
- `PATCH /:id/status` - Modifier le statut
- `POST /:id/cancel` - Annuler une commande
- `GET /:id/tracking` - Suivi de la commande
- `GET /stats/summary` - Statistiques des commandes
- `GET /:id/invoice` - Télécharger la facture

### 💬 Commentaires (`/api/comments`)
- `GET /` - Liste des commentaires
- `GET /:id` - Détails d'un commentaire
- `POST /` - Créer un commentaire
- `PUT /:id` - Modifier son commentaire
- `DELETE /:id` - Supprimer un commentaire
- `PATCH /:id/approve` - Approuver (ADMIN)
- `PATCH /:id/reject` - Rejeter (ADMIN)
- `GET /pending` - Commentaires en attente (ADMIN)
- `GET /stats` - Statistiques des commentaires
- `POST /:id/report` - Signaler un commentaire

## Permissions par rôle

### 🔴 ADMIN
- Accès complet à toutes les routes
- Gestion des utilisateurs et vendeurs
- Modération des commentaires
- Gestion des catégories

### 🟡 VENDEUR
- Gestion de ses propres produits
- Consultation de ses commandes
- Statistiques de ses ventes
- Réponse aux commentaires

### 🟢 CLIENT
- Consultation des produits et catégories
- Gestion de son panier
- Passage de commandes
- Commentaires et notes sur produits
- Consultation de son historique

## Middleware recommandés

Pour implémenter les routes, créez les middlewares suivants :

### `auth.middleware.js`
```javascript
// Authentification JWT
const authenticate = (req, res, next) => {
    // TODO: Vérifier le token JWT
};

// Autorisation par rôle
const authorize = (...roles) => {
    return (req, res, next) => {
        // TODO: Vérifier le rôle de l'utilisateur
    };
};
```

### `validation.middleware.js`
```javascript
// Validation des données entrantes
const validate = (schema) => {
    return (req, res, next) => {
        // TODO: Valider avec Joi, Yup, ou Zod
    };
};
```

## Technologies suggérées

- **Framework** : Express.js
- **Base de données** : Supabase (PostgreSQL)
- **Authentification** : Supabase Auth + JWT
- **Validation** : Joi ou Zod
- **Upload fichiers** : Supabase Storage
- **Documentation API** : Swagger/OpenAPI

## Prochaines étapes

1. Implémenter les middlewares d'authentification et autorisation
2. Connecter les routes à Supabase
3. Ajouter la validation des données
4. Implémenter la gestion des erreurs
5. Ajouter les tests unitaires et d'intégration
6. Documenter l'API avec Swagger
7. Mettre en place le rate limiting
8. Configurer CORS
9. Ajouter les logs et monitoring
