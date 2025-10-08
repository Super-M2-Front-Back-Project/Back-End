# Guide d'Authentification Multi-Rôles

## 🎯 Problématique

Comment gérer l'authentification quand un utilisateur peut avoir différents rôles (CLIENT, VENDEUR, ADMIN) ?

**Votre intuition avec les 2 boutons en front est correcte !** Voici pourquoi et comment l'implémenter.

## ✅ Approche Recommandée : Détection Automatique du Rôle

### Option 1 : Login Unique (RECOMMANDÉ)

**Principe** : Un seul formulaire de login, le rôle est détecté automatiquement côté backend.

#### Frontend
```javascript
// Un seul formulaire de login
const handleLogin = async (email, password) => {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    // La réponse contient l'utilisateur avec son rôle
    const { token, user } = data;

    // Redirection selon le rôle
    switch(user.role.nom) {
        case 'ADMIN':
            navigate('/admin/dashboard');
            break;
        case 'VENDEUR':
            navigate('/vendor/dashboard');
            break;
        case 'CLIENT':
            navigate('/shop');
            break;
    }
};
```

#### Backend (auth.routes.js)
```javascript
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // 1. Authentifier avec Supabase Auth
    const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    // 2. Récupérer les infos utilisateur + rôle depuis la DB
    const { data: user } = await supabase
        .from('users')
        .select(`
            id,
            email,
            nom,
            prenom,
            is_active,
            role:roles(id, nom)
        `)
        .eq('id', authData.user.id)
        .single();

    // 3. Vérifier que le compte est actif
    if (!user.is_active) {
        return res.status(403).json({ error: 'Compte désactivé' });
    }

    // 4. Si VENDEUR, vérifier qu'il est vérifié
    if (user.role.nom === 'VENDEUR') {
        const { data: vendor } = await supabase
            .from('vendeurs')
            .select('is_verified')
            .eq('user_id', user.id)
            .single();

        if (!vendor?.is_verified) {
            return res.status(403).json({
                error: 'Compte vendeur en attente de vérification'
            });
        }
    }

    // 5. Retourner le token + infos utilisateur
    res.json({
        token: authData.session.access_token,
        user: {
            id: user.id,
            email: user.email,
            nom: user.nom,
            prenom: user.prenom,
            role: user.role
        }
    });
});
```

**Avantages** :
- ✅ Simple et intuitif pour l'utilisateur
- ✅ Pas de risque d'erreur de sélection de rôle
- ✅ Un seul workflow à maintenir
- ✅ Sécurisé (le rôle vient de la DB, pas du front)

---

### Option 2 : Deux Boutons Frontend (Votre Idée)

**Principe** : Deux interfaces de login distinctes (CLIENT vs VENDEUR/ADMIN).

#### Pourquoi ça peut être intéressant ?

1. **UX différenciée** : Interface vendeur plus professionnelle
2. **Marketing** : Mettre en avant l'espace vendeur
3. **SEO** : Pages séparées (`/login` vs `/vendor/login`)

#### Comment l'implémenter ?

**Frontend avec deux pages** :

```jsx
// Page /login (pour clients)
<LoginForm type="client" />

// Page /vendor/login (pour vendeurs et admins)
<LoginForm type="vendor" />
```

**Le composant LoginForm** :
```javascript
const LoginForm = ({ type }) => {
    const handleSubmit = async (email, password) => {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                expected_role: type // 'client' ou 'vendor'
            })
        });

        const data = await response.json();

        // Redirection selon le type
        if (type === 'client') {
            navigate('/shop');
        } else {
            // Redirection selon le rôle exact (VENDEUR ou ADMIN)
            if (data.user.role.nom === 'ADMIN') {
                navigate('/admin/dashboard');
            } else {
                navigate('/vendor/dashboard');
            }
        }
    };
};
```

**Backend avec validation** :
```javascript
router.post('/login', async (req, res) => {
    const { email, password, expected_role } = req.body;

    // Authentification normale...
    const user = await authenticateUser(email, password);

    // Validation du rôle attendu (optionnel mais recommandé)
    if (expected_role === 'client' && user.role.nom !== 'CLIENT') {
        return res.status(403).json({
            error: 'Veuillez utiliser l\'espace vendeur/admin',
            redirect_to: '/vendor/login'
        });
    }

    if (expected_role === 'vendor' && user.role.nom === 'CLIENT') {
        return res.status(403).json({
            error: 'Veuillez utiliser l\'espace client',
            redirect_to: '/login'
        });
    }

    // Retourner le token + user
    res.json({ token, user });
});
```

**Avantages** :
- ✅ UX différenciée par audience
- ✅ Sécurité renforcée (vérification du rôle attendu)
- ✅ Marketing : valorisation de l'espace vendeur

**Inconvénients** :
- ❌ Plus complexe à maintenir
- ❌ Confusion possible pour les utilisateurs

---

## 🔐 Sécurité : Points Importants

### ⚠️ Ne JAMAIS faire confiance au frontend

```javascript
// ❌ MAUVAIS - Le rôle vient du frontend
router.post('/login', async (req, res) => {
    const { email, password, role } = req.body;
    // Le client peut envoyer n'importe quel rôle !
});

// ✅ BON - Le rôle vient de la DB
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    // Récupérer le rôle depuis la base de données
    const user = await getUserFromDB(email);
    const role = user.role; // Vient de la DB, sécurisé
});
```

### 🛡️ Middleware de vérification de rôle

```javascript
// middlewares/auth.middleware.js
const authorize = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            // 1. Vérifier le token JWT
            const token = req.headers.authorization?.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 2. Récupérer l'utilisateur + rôle depuis la DB
            const { data: user } = await supabase
                .from('users')
                .select('*, role:roles(nom)')
                .eq('id', decoded.userId)
                .single();

            // 3. Vérifier le rôle
            if (!allowedRoles.includes(user.role.nom)) {
                return res.status(403).json({
                    error: 'Accès refusé - Permissions insuffisantes'
                });
            }

            // 4. Attacher l'utilisateur à la requête
            req.user = user;
            next();
        } catch (error) {
            return res.status(401).json({ error: 'Non authentifié' });
        }
    };
};

// Utilisation dans les routes
router.get('/admin/users', authorize('ADMIN'), async (req, res) => {
    // Seuls les ADMIN peuvent accéder
});

router.get('/vendor/products', authorize('VENDEUR', 'ADMIN'), async (req, res) => {
    // VENDEUR et ADMIN peuvent accéder
});
```

---

## 📊 Comparaison des Options

| Critère | Login Unique | Deux Boutons |
|---------|-------------|--------------|
| **Simplicité** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **UX** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Sécurité** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Maintenance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Marketing** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🎯 Recommandation Finale

### Pour Ultrathink (marketplace avec vendeurs)

**Je recommande l'Option 2 (Deux boutons/pages)** parce que :

1. **Marketplace** : Vous avez deux audiences distinctes (acheteurs vs vendeurs)
2. **Professionnel** : Les vendeurs attendent une interface dédiée
3. **Marketing** : `/vendor/login` est une page de landing pour recruter des vendeurs
4. **Branding** : Renforce l'image marketplace professionnelle

### Implémentation suggérée

```
Frontend :
- /login → Pour les clients
- /vendor/login → Pour vendeurs + admins
- /admin/login → Optionnel, redirige vers /vendor/login

Backend :
- POST /api/auth/login
  → Paramètre optionnel expected_role
  → Validation + redirection si mauvais rôle
  → Toujours récupérer le rôle depuis la DB
```

---

## 💡 Bonus : Réponse sur "Entry Point"

**OUI, vous avez parfaitement raison !** 🎉

- **Entry Point** (Point d'entrée) = Le fichier qui démarre l'application (`index.js`)
- **Endpoints** (Points de terminaison) = Les routes de l'API (`/api/products`, `/api/auth/login`, etc.)

**Analogie** :
- **Entry point** = La porte d'entrée de l'immeuble
- **Endpoints** = Les différents appartements à l'intérieur

Le terme "entry point" est tout à fait approprié et montre que vous comprenez bien l'architecture ! 👍

Dans un projet Node.js/Express :
- `index.js` ou `server.js` = **Entry point** (démarre le serveur)
- `/api/...` = **Endpoints** (routes exposées par l'API)
