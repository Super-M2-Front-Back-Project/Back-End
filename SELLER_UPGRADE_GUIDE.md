# Guide : Passage Client → Vendeur

## 📋 Vue d'ensemble

Les clients peuvent désormais devenir vendeurs en **self-service** avec validation admin.

---

## 🔄 Flow complet

```
CLIENT
  │
  ├─► POST /api/clients/me/request-seller-upgrade
  │   Body: { shop_name, siret, description? }
  │
  ├─► Role changé → VENDEUR (is_verified: false)
  │
  ├─► Ne peut PAS encore créer de produits
  │   (Middleware bloque car is_verified = false)
  │
  ▼
ADMIN
  │
  ├─► GET /api/sellers/admin/pending
  │   Liste les vendeurs en attente
  │
  ├─► PATCH /api/sellers/admin/:id/verify
  │   Body: { is_verified: true }  ← Approuve
  │   Body: { is_verified: false } ← Rejette
  │
  ▼
VENDEUR VÉRIFIÉ
  │
  └─► Peut créer des produits ✅
```

---

## 🔌 Endpoints implémentés

### 1. **Pour les CLIENTS**

#### `POST /api/clients/me/request-seller-upgrade`
**Auth:** CLIENT uniquement
**Body:**
```json
{
  "shop_name": "Ma Boutique",
  "description": "Description optionnelle",
  "siret": "12345678901234"
}
```

**Validations:**
- ✅ `shop_name` : Min 3 caractères
- ✅ `siret` : Exactement 14 chiffres
- ✅ User doit avoir role CLIENT (pas déjà VENDEUR)

**Response 201:**
```json
{
  "message": "Demande envoyée avec succès. Votre compte sera vérifié par un administrateur.",
  "seller": {
    "id": "uuid",
    "shop_name": "Ma Boutique",
    "is_verified": false,
    "status": "pending_verification"
  }
}
```

**Errors:**
- `400` : Validation échouée (shop_name, siret)
- `400` : "Vous êtes déjà vendeur"
- `400` : "Les administrateurs ne peuvent pas devenir vendeur"

---

### 2. **Pour les ADMINS**

#### `GET /api/sellers/admin/pending`
**Auth:** ADMIN uniquement
**Query params:**
- `page` (default: 1)
- `limit` (default: 20)

**Response 200:**
```json
{
  "pending_sellers": [
    {
      "id": "uuid",
      "name": "Ma Boutique",
      "description": "...",
      "siret": "12345678901234",
      "is_verified": false,
      "created_at": "2025-12-09T10:00:00Z",
      "user": {
        "id": "uuid",
        "last_name": "Doe",
        "first_name": "John",
        "email": "john@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

---

#### `PATCH /api/sellers/admin/:id/verify`
**Auth:** ADMIN uniquement
**Body:**
```json
{
  "is_verified": true   // ou false pour rejeter
}
```

**Response 200 (approuvé):**
```json
{
  "message": "Vendeur vérifié avec succès. Il peut maintenant créer des produits.",
  "seller": {
    "id": "uuid",
    "name": "Ma Boutique",
    "is_verified": true,
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "last_name": "Doe",
      "first_name": "John"
    }
  }
}
```

**Response 200 (rejeté):**
```json
{
  "message": "Vendeur rejeté. Il ne pourra pas créer de produits.",
  "seller": { ... }
}
```

**Errors:**
- `400` : `is_verified` manquant ou invalide
- `404` : Vendeur non trouvé
- `400` : "Ce vendeur est déjà vérifié"

---

## 🔒 Sécurité

### Middleware d'authentification
Le middleware existant ([auth.middleware.js:19-29](middlewares/auth.middleware.js#L19-29)) bloque automatiquement les vendeurs non vérifiés :

```javascript
if (userData.role?.name === 'VENDEUR') {
    const { data: seller } = await supabase
        .from('sellers')
        .select('is_verified')
        .eq('user_id', userData.id)
        .single();

    if (!seller || !seller.is_verified) {
        return res.status(403).json({
            error: 'Seller not verified'
        });
    }
}
```

**Conséquence :**
- Vendeur non vérifié → **Bloqué** sur toutes les routes protégées
- Vendeur vérifié → **Accès complet** aux routes VENDEUR

---

## 🎯 États possibles d'un user

| Role | `is_verified` | Peut créer produits ? | Statut |
|------|--------------|----------------------|---------|
| CLIENT | N/A | ❌ | Client normal |
| VENDEUR | `false` | ❌ | En attente validation |
| VENDEUR | `true` | ✅ | Vendeur actif |
| ADMIN | N/A | ✅ | Admin (bypass) |

---

## 📊 Base de données

### Tables utilisées
- **`users`** : Change `role_id` → VENDEUR
- **`sellers`** : Nouveau profil créé avec `is_verified: false`
- **`roles`** : Récupère l'ID du role VENDEUR

### Aucune migration nécessaire ✅
La structure actuelle suffit (tables `users`, `sellers`, `roles` existantes).

---

## 🧪 Tests manuels

### Scénario 1 : Client devient vendeur

```bash
# 1. Login CLIENT
POST /api/auth/login
{ "email": "client@example.com", "password": "..." }
→ Récupérer le token

# 2. Demande upgrade
POST /api/clients/me/request-seller-upgrade
Authorization: Bearer <token>
{
  "shop_name": "Test Shop",
  "siret": "12345678901234"
}
→ Response 201: "pending_verification"

# 3. Tente de créer un produit (doit échouer)
POST /api/products
Authorization: Bearer <token>
→ Response 403: "Seller not verified"
```

### Scénario 2 : Admin approuve

```bash
# 1. Login ADMIN
POST /api/auth/login
{ "email": "admin@example.com", "password": "..." }
→ Récupérer le token admin

# 2. Liste vendeurs en attente
GET /api/sellers/admin/pending
Authorization: Bearer <admin_token>
→ Voir la liste

# 3. Approuver vendeur
PATCH /api/sellers/admin/{seller_id}/verify
Authorization: Bearer <admin_token>
{ "is_verified": true }
→ Response 200: "Vendeur vérifié"

# 4. Le vendeur peut maintenant créer des produits
POST /api/products (avec token vendeur)
→ Response 201: Produit créé ✅
```

---

## ✅ Avantages de cette approche

1. **Cohérence** : Réutilise `sellers.is_verified` (pas de nouvelle table)
2. **Clarté** : 1 source de vérité (table `sellers`)
3. **Efficacité** : Middleware existant gère déjà le blocage
4. **Sécurité** : Validation admin obligatoire
5. **Scalabilité** : Facile d'ajouter notifications email plus tard

---

## 📝 Notes supplémentaires

- **Retour arrière** : Admin peut "rejeter" un vendeur en faisant `PATCH` avec `is_verified: false`
- **Pas de suppression** : Les profils vendeurs restent en DB (soft state via `is_verified`)
- **SIRET** : Validation format uniquement (14 chiffres), pas de vérification API externe pour l'instant

---

## 🚀 Prochaines améliorations possibles

1. **Notifications email** : Informer le client quand son compte est vérifié
2. **Raison de rejet** : Ajouter un champ `rejection_reason` dans `sellers`
3. **Statistiques admin** : Dashboard avec nombre de demandes en attente
4. **Webhook** : Notifier un service tiers lors des vérifications
