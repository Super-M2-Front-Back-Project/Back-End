# Guide de Configuration : Middleware d'Authentification

## 📦 Installation des dépendances

```bash
npm install @supabase/supabase-js dotenv
```

## 🔧 Configuration

### 1. Créer le fichier `.env`

Copiez `.env.example` en `.env` et remplissez avec vos vraies valeurs Supabase :

```bash
cp .env.example .env
```

**Comment obtenir vos clés Supabase ?**

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. Allez dans `Settings` → `API`
4. Copiez :
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Gardez secret!)

### 2. Charger les variables d'environnement

Dans votre `index.js`, ajoutez en tout premier :

```javascript
require('dotenv').config();

const express = require('express');
// ... reste du code
```

### 3. Structure des fichiers créés

```
Back-End/
├── config/
│   └── supabase.js          # Configuration clients Supabase
├── middlewares/
│   └── auth.middleware.js   # Middlewares d'authentification
├── .env.example             # Template de configuration
├── .env                     # Vos vraies clés (gitignored)
└── index.js                 # Entry point
```

---

## 🎯 Utilisation des Middlewares

### Middleware `authenticate`

Vérifie que l'utilisateur est connecté. Récupère ses infos et les attache à `req.user`.

```javascript
const { authenticate } = require('../middlewares/auth.middleware');

// Route protégée - nécessite d'être connecté
router.get('/profile', authenticate, async (req, res) => {
    // req.user est disponible
    res.json({
        user: req.user // { id, email, nom, prenom, role: { id, nom } }
    });
});
```

### Middleware `authorize`

Vérifie que l'utilisateur a le bon rôle. **À utiliser APRÈS `authenticate`**.

```javascript
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Route accessible uniquement aux ADMIN
router.delete('/users/:id', authenticate, authorize('ADMIN'), async (req, res) => {
    // Seulement les ADMIN arrivent ici
});

// Route accessible aux VENDEUR et ADMIN
router.post('/products', authenticate, authorize('VENDEUR', 'ADMIN'), async (req, res) => {
    // Les VENDEUR et ADMIN peuvent créer des produits
});

// Route accessible uniquement aux CLIENT
router.post('/cart/items', authenticate, authorize('CLIENT'), async (req, res) => {
    // Seulement les CLIENT peuvent ajouter au panier
});
```

### Middleware `optionalAuth`

Authentification optionnelle - ne bloque pas si non connecté.

```javascript
const { optionalAuth } = require('../middlewares/auth.middleware');

// Route qui affiche plus d'infos si connecté
router.get('/products/:id', optionalAuth, async (req, res) => {
    const product = await getProduct(req.params.id);

    // Si l'utilisateur est connecté
    if (req.user) {
        // Ajouter infos personnalisées (favoris, dans le panier, etc.)
        product.is_in_cart = await checkIfInCart(req.user.id, product.id);
    }

    res.json({ product });
});
```

### Middleware `checkOwnership`

Vérifie que l'utilisateur modifie ses propres données (ou est ADMIN).

```javascript
const { authenticate, checkOwnership } = require('../middlewares/auth.middleware');

// L'utilisateur peut seulement modifier son propre profil
router.put('/users/:id', authenticate, checkOwnership('params.id'), async (req, res) => {
    // req.params.id doit être égal à req.user.id (sauf si ADMIN)
});
```

---

## 📝 Exemples Complets par Route

### Routes Auth (`auth.routes.js`)

```javascript
const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middlewares/auth.middleware');
const router = express.Router();

// POST /api/auth/register - Pas de middleware (route publique)
router.post('/register', async (req, res) => {
    const { email, password, nom, prenom } = req.body;

    // 1. Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
    });

    if (authError) {
        return res.status(400).json({ error: authError.message });
    }

    // 2. Créer l'enregistrement dans la table users
    const { data: user, error: dbError } = await supabase
        .from('users')
        .insert({
            id: authData.user.id,
            email,
            nom,
            prenom,
            role_id: 'uuid-du-role-client' // À récupérer depuis la table roles
        })
        .select()
        .single();

    if (dbError) {
        return res.status(500).json({ error: dbError.message });
    }

    // 3. Créer le panier
    await supabase.from('panier').insert({ user_id: user.id });

    res.status(201).json({
        message: 'Inscription réussie',
        user: { id: user.id, email: user.email }
    });
});

// POST /api/auth/login - Pas de middleware
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    // Récupérer le rôle
    const { data: user } = await supabase
        .from('users')
        .select('*, role:roles(id, nom)')
        .eq('id', data.user.id)
        .single();

    res.json({
        token: data.session.access_token,
        user: {
            id: user.id,
            email: user.email,
            nom: user.nom,
            prenom: user.prenom,
            role: user.role
        }
    });
});

// GET /api/auth/me - Avec authenticate
router.get('/me', authenticate, async (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;
```

### Routes Produits (`products.routes.js`)

```javascript
const { authenticate, authorize, optionalAuth } = require('../middlewares/auth.middleware');

// GET /api/products - Route publique (optionalAuth pour infos perso si connecté)
router.get('/', optionalAuth, async (req, res) => {
    // Récupérer tous les produits actifs
    const { data: products } = await supabase
        .from('produits')
        .select('*')
        .eq('is_active', true);

    res.json({ products });
});

// POST /api/products - VENDEUR ou ADMIN uniquement
router.post('/', authenticate, authorize('VENDEUR', 'ADMIN'), async (req, res) => {
    const { nom, description, prix, categorie_id, stock } = req.body;

    // Si VENDEUR, utiliser son vendeur_id
    let vendeur_id;
    if (req.user.role.nom === 'VENDEUR') {
        const { data: vendeur } = await supabase
            .from('vendeurs')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        vendeur_id = vendeur.id;
    } else {
        // Si ADMIN, peut spécifier le vendeur
        vendeur_id = req.body.vendeur_id;
    }

    const { data: product, error } = await supabase
        .from('produits')
        .insert({
            nom,
            description,
            prix,
            categorie_id,
            vendeur_id,
            stock,
            is_active: true
        })
        .select()
        .single();

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ product });
});

// PUT /api/products/:id - Le vendeur propriétaire ou ADMIN
router.put('/:id', authenticate, authorize('VENDEUR', 'ADMIN'), async (req, res) => {
    const { id } = req.params;

    // Vérifier que le produit appartient au vendeur (sauf si ADMIN)
    if (req.user.role.nom === 'VENDEUR') {
        const { data: product } = await supabase
            .from('produits')
            .select('vendeur_id, vendeur:vendeurs(user_id)')
            .eq('id', id)
            .single();

        if (product.vendeur.user_id !== req.user.id) {
            return res.status(403).json({
                error: 'Vous ne pouvez modifier que vos propres produits'
            });
        }
    }

    // Mettre à jour le produit
    const { data: updated, error } = await supabase
        .from('produits')
        .update(req.body)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.json({ product: updated });
});
```

### Routes Panier (`cart.routes.js`)

```javascript
const { authenticate } = require('../middlewares/auth.middleware');

// Toutes les routes panier nécessitent authentification

// GET /api/cart
router.get('/', authenticate, async (req, res) => {
    const { data: panier } = await supabase
        .from('panier')
        .select(`
            id,
            items:items_panier(
                id,
                quantite,
                produit:produits(id, nom, prix, image_url)
            )
        `)
        .eq('user_id', req.user.id)
        .single();

    // Calculer le total
    const total = panier.items.reduce((sum, item) => {
        return sum + (item.produit.prix * item.quantite);
    }, 0);

    res.json({
        cart: {
            ...panier,
            total,
            total_items: panier.items.length
        }
    });
});

// POST /api/cart/items
router.post('/items', authenticate, async (req, res) => {
    const { produit_id, quantite = 1 } = req.body;

    // Récupérer le panier
    const { data: panier } = await supabase
        .from('panier')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

    // Ajouter l'item
    const { data: item, error } = await supabase
        .from('items_panier')
        .insert({
            panier_id: panier.id,
            produit_id,
            quantite
        })
        .select()
        .single();

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ item });
});
```

---

## 🔒 Sécurité : Points Importants

### ❌ Ne JAMAIS faire

```javascript
// MAUVAIS - Faire confiance au client pour le rôle
router.post('/products', async (req, res) => {
    const { role } = req.body; // ❌ Le client peut envoyer n'importe quoi
    if (role === 'ADMIN') {
        // ...
    }
});

// MAUVAIS - Pas de vérification de propriété
router.put('/products/:id', authenticate, async (req, res) => {
    // ❌ N'importe quel utilisateur connecté peut modifier n'importe quel produit
    await updateProduct(req.params.id, req.body);
});
```

### ✅ TOUJOURS faire

```javascript
// BON - Le rôle vient de la DB via req.user
router.post('/products', authenticate, authorize('VENDEUR', 'ADMIN'), async (req, res) => {
    // ✅ Le rôle a été vérifié par le middleware
    const role = req.user.role.nom; // Vient de la DB
});

// BON - Vérification de propriété
router.put('/products/:id', authenticate, authorize('VENDEUR', 'ADMIN'), async (req, res) => {
    if (req.user.role.nom === 'VENDEUR') {
        // ✅ Vérifier que le produit appartient au vendeur
        const product = await getProduct(req.params.id);
        if (product.vendeur.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
    }
    // ADMIN peut tout modifier
});
```

---

## 🧪 Tester les Middlewares

### Avec Postman/Insomnia

1. **Login** :
   ```
   POST http://localhost:3000/api/auth/login
   Body: { "email": "test@example.com", "password": "password123" }
   ```

2. **Copier le token** de la réponse

3. **Requête protégée** :
   ```
   GET http://localhost:3000/api/auth/me
   Headers: Authorization: Bearer <le-token-copié>
   ```

### Avec cURL

```bash
# Login
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.token')

# Requête authentifiée
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🚀 Prochaines Étapes

1. ✅ Installer les dépendances : `npm install @supabase/supabase-js dotenv`
2. ✅ Créer le fichier `.env` avec vos clés Supabase
3. ✅ Charger dotenv dans `index.js`
4. ✅ Appliquer les middlewares aux routes
5. ⏭️ Tester l'authentification
6. ⏭️ Implémenter les routes avec la logique métier
7. ⏭️ Ajouter la validation des données (Joi/Zod)
8. ⏭️ Gérer les erreurs de manière centralisée
9. ⏭️ Ajouter le rate limiting
10. ⏭️ Configurer les RLS policies dans Supabase
