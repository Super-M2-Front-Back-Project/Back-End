# Évaluation : Prisma avec Supabase

## 🎯 Contexte

Vous avez choisi **Supabase** comme base de données PostgreSQL. Vous voulez maintenant ajouter un middleware d'authentification et vous envisagez **Prisma** comme ORM.

## 📊 Analyse de Pertinence

### Option 1 : Supabase Client (Sans Prisma)

**Avantages** ✅
- **Authentification intégrée** : Supabase Auth déjà inclus (pas besoin de JWT custom)
- **RLS (Row Level Security)** : Sécurité au niveau de la base de données
- **Moins de dépendances** : Pas besoin d'installer Prisma
- **Realtime inclus** : WebSockets pour les mises à jour en temps réel
- **Storage inclus** : Pour les images produits
- **SDK JavaScript optimisé** : Fait pour fonctionner avec Supabase
- **Migrations via dashboard** : Interface graphique Supabase Studio
- **Edge Functions** : Possibilité de déployer des fonctions serverless

**Inconvénients** ❌
- Requêtes moins typées (si vous utilisez TypeScript)
- Syntaxe spécifique à Supabase
- Vendor lock-in (difficile de migrer vers autre BDD)

### Option 2 : Prisma + Supabase

**Avantages** ✅
- **Type-safety** : Génération automatique des types TypeScript
- **Migrations versionnées** : Contrôle total via Prisma Migrate
- **Syntaxe familière** : ORM populaire et bien documenté
- **Portabilité** : Facile de changer de BDD plus tard
- **Autocomplétion** : IntelliSense complet dans l'IDE
- **Relations simplifiées** : Gestion intuitive des relations entre tables
- **Prisma Studio** : Interface graphique pour visualiser/éditer les données

**Inconvénients** ❌
- **Pas d'Auth Supabase native** : Doit gérer JWT manuellement
- **Pas de RLS** : Doit implémenter la sécurité en code
- **Configuration supplémentaire** : Setup Prisma + connexion Supabase
- **Perte de Realtime** : Doit utiliser autre solution (Socket.io, etc.)
- **Deux outils de migration** : Confusion entre Prisma Migrate et Supabase migrations

### Option 3 : Hybride (Supabase Client + Prisma) ⚠️

**Principe** : Utiliser Supabase Auth + Prisma pour les requêtes DB

**Avantages** ✅
- Meilleur des deux mondes (en théorie)
- Auth Supabase + Type-safety Prisma

**Inconvénients** ❌
- **Complexité accrue** : Deux systèmes à maintenir
- **Risque de confusion** : Quand utiliser Supabase vs Prisma ?
- **Overhead** : Deux connexions DB simultanées
- **Migrations conflictuelles** : Supabase et Prisma ne se parlent pas

---

## 🎯 Recommandation pour Ultrathink

### ✅ **Je recommande : Supabase Client (Sans Prisma)**

**Pourquoi ?**

1. **Vous utilisez déjà Supabase** : Autant utiliser tout l'écosystème
2. **Authentification gratuite** : Supabase Auth est excellent et inclus
3. **RLS = Sécurité renforcée** : Protection au niveau DB (très important pour marketplace)
4. **Storage pour images** : Essentiel pour les photos de produits
5. **Realtime utile** : Notifications commandes, commentaires en temps réel
6. **Moins de complexité** : Un seul outil à maîtriser

**Cas où Prisma serait mieux** :
- Si vous aviez besoin de multi-BDD (PostgreSQL + MongoDB)
- Si vous vouliez une portabilité maximale
- Si vous faisiez du TypeScript strict avec types générés
- Si RLS et Realtime n'étaient pas importants

---

## 🔧 Implémentation Recommandée : Supabase Client

### Étape 1 : Installation

```bash
npm install @supabase/supabase-js dotenv jsonwebtoken
```

### Étape 2 : Configuration Supabase

```javascript
// config/supabase.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client avec service role pour bypass RLS (backend uniquement)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Client avec clé publique pour opérations utilisateur
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = { supabase, supabaseAdmin };
```

### Étape 3 : Middleware d'Authentification

```javascript
// middlewares/auth.middleware.js
const { supabase } = require('../config/supabase');

/**
 * Middleware pour vérifier l'authentification
 * Vérifie le JWT Supabase et récupère l'utilisateur
 */
const authenticate = async (req, res, next) => {
    try {
        // 1. Récupérer le token depuis le header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant' });
        }

        const token = authHeader.split(' ')[1];

        // 2. Vérifier le token avec Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Token invalide' });
        }

        // 3. Récupérer les infos complètes (avec rôle) depuis la DB
        const { data: userData, error: dbError } = await supabase
            .from('users')
            .select(`
                id,
                email,
                nom,
                prenom,
                is_active,
                role:roles(id, nom)
            `)
            .eq('id', user.id)
            .single();

        if (dbError || !userData) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // 4. Vérifier que le compte est actif
        if (!userData.is_active) {
            return res.status(403).json({ error: 'Compte désactivé' });
        }

        // 5. Attacher l'utilisateur à la requête
        req.user = userData;
        next();
    } catch (error) {
        console.error('Erreur authentification:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
};

/**
 * Middleware pour vérifier les rôles autorisés
 * @param {...string} allowedRoles - Liste des rôles autorisés
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Non authentifié' });
        }

        const userRole = req.user.role?.nom;

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                error: 'Accès refusé',
                required_roles: allowedRoles,
                your_role: userRole
            });
        }

        next();
    };
};

module.exports = { authenticate, authorize };
```

### Étape 4 : Utilisation dans les routes

```javascript
// routes/products.routes.js
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Route publique (pas de middleware)
router.get('/', async (req, res) => {
    // Liste des produits - accessible à tous
});

// Route nécessitant authentification
router.get('/cart', authenticate, async (req, res) => {
    // req.user est disponible
    const userId = req.user.id;
});

// Route nécessitant authentification + rôle spécifique
router.post('/', authenticate, authorize('VENDEUR', 'ADMIN'), async (req, res) => {
    // Seulement VENDEUR et ADMIN peuvent créer des produits
});

// Route ADMIN uniquement
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
    // Seulement ADMIN peut supprimer
});
```

### Étape 5 : Fichier .env

```env
# Supabase
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre-clé-publique
SUPABASE_SERVICE_ROLE_KEY=votre-clé-service-role

# Serveur
PORT=3000
NODE_ENV=development
```

---

## 📋 Alternative : Si vous insistez sur Prisma

Si vous voulez quand même utiliser Prisma, voici les étapes :

### Étape 1 : Installation Prisma

```bash
npm install prisma @prisma/client
npx prisma init
```

### Étape 2 : Configuration Prisma

```env
# .env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
```

### Étape 3 : Schéma Prisma

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Role {
  id          String   @id @default(uuid())
  nom         String   @unique
  description String?
  users       User[]
}

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  password_hash String
  nom           String
  prenom        String
  role_id       String
  role          Role     @relation(fields: [role_id], references: [id])
  is_active     Boolean  @default(true)
  created_at    DateTime @default(now())

  panier        Panier?
  commandes     Commande[]
  commentaires  Commentaire[]
  vendeur       Vendeur?
}

// ... autres modèles
```

### Étape 4 : Générer le client

```bash
npx prisma generate
npx prisma db pull  # Importer le schéma depuis Supabase
```

### Étape 5 : Middleware avec Prisma

```javascript
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token manquant' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { role: true }
        });

        if (!user || !user.is_active) {
            return res.status(403).json({ error: 'Accès refusé' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token invalide' });
    }
};
```

**⚠️ Problème** : Avec Prisma, vous devez gérer JWT manuellement (pas de Supabase Auth).

---

## 🏆 Conclusion

### Pour Ultrathink : **Supabase Client sans Prisma**

**Raisons** :
1. ✅ Auth gratuite et puissante
2. ✅ RLS pour sécurité marketplace
3. ✅ Storage pour images produits
4. ✅ Realtime pour notifications
5. ✅ Moins de complexité
6. ✅ Écosystème complet

**Prisma serait justifié si** :
- Vous vouliez une portabilité maximale
- Vous aviez besoin de types TypeScript stricts
- Vous n'utilisiez pas les features Supabase (Auth, Storage, Realtime)

**Ma recommandation** : Commencez avec Supabase Client. Si plus tard vous avez besoin de Prisma (pour de la portabilité ou du TypeScript strict), vous pourrez l'ajouter en hybride.
