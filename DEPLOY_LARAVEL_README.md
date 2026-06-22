# 🚀 Laravel + React — Shared Hosting Deployment Guide

## 📁 Folder Structure (This Project)

```
Frontend/luxe-ecommerce-laravel-frontend/    ← Yeh project
├── .env                    ← Local dev (Laravel port 8000)
├── .env.production         ← Production (relative /api/v1 URL)
├── vite.config.js          ← Proxy for Laravel + build settings
├── src/                    ← React source code
├── public/                 ← Static assets
├── package.json
└── ...
```

---

## 🛠️ Local Development Setup

### 1. Install Dependencies
```bash
cd Frontend/luxe-ecommerce-laravel-frontend
npm install
```

### 2. Start Laravel Backend
```bash
# Laravel project mein jaao
cd luxe-ecommerce-laravel
php artisan serve --port=8000
```

### 3. Start React Dev Server (with Laravel Proxy)
```bash
# New terminal — yeh project
cd Frontend/luxe-ecommerce-laravel-frontend
npm run dev
```

React will start on `http://localhost:5173` and automatically proxy `/api` requests to Laravel on `http://localhost:8000`.

---

## 🚀 Production Build (For Shared Hosting)

### Step 1: Build React
```bash
cd Frontend/luxe-ecommerce-laravel-frontend
NODE_ENV=production npm run build
```

### Step 2: Copy Build Files to Laravel
```bash
# React build output → Laravel public folder
cp -r dist/* ../luxe-ecommerce-laravel/public/
```

### Step 3: Deploy to Hostinger (cPanel)

**Structure on Server:**
```
/home/yourusername/
├── laravel-app/                    ← Laravel project (OUTSIDE public_html)
│   ├── app/
│   ├── config/
│   ├── .env                        ← Production .env
│   └── ...
└── public_html/                    ← Laravel ka public/ folder
    ├── index.php                   ← (Modified paths)
    ├── .htaccess                   ← (React SPA + API routing)
    ├── assets/                     ← React built files
    ├── index.html                  ← React SPA entry point
    └── ...
```

### Step 4: Update Laravel public/index.php
```php
// Change paths to point to laravel-app folder
require __DIR__.'/../laravel-app/vendor/autoload.php';
$app = require_once __DIR__.'/../laravel-app/bootstrap/app.php';
```

### Step 5: .htaccess for Both Routes
```apache
<IfModule mod_rewrite.c>
    <IfModule mod_negotiation.c>
        Options -MultiViews -Indexes
    </IfModule>

    RewriteEngine On

    # Handle Authorization Header (important for Laravel Sanctum auth)
    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

    # Redirect Trailing Slashes If Not A Folder...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} (.+)/$
    RewriteRule ^ %1 [L,R=301]

    # API Routes → Laravel's index.php
    RewriteCond %{REQUEST_URI} ^/api/
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [L]

    # React SPA Routes → index.html (for React Router)
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^ index.html [L]
</IfModule>
```

---

## 📝 Key Configuration Files

| File | Purpose |
|------|---------|
| `.env` | Local: Laravel API at `localhost:8000/api/v1` |
| `.env.production` | Production: API at same domain `/api/v1` |
| `vite.config.js` | Dev proxy to Laravel port 8000 |

---

## 🔍 API Endpoint Mapping

React calls → Laravel handles:

```
React: axios.get('/products')
       → VITE_API_BASE_URL + /products
       → http://localhost:8000/api/v1/products  (dev)
       → /api/v1/products                       (production)

React: axios.post('/auth/login', data)
       → http://localhost:8000/api/v1/auth/login  (dev)
       → /api/v1/auth/login                      (production)
```

---

## ✅ Hostinger Checklist

- [ ] PHP 8.2+ selected in cPanel
- [ ] Database created + .env updated
- [ ] Composer install ran via SSH
- [ ] Migrations ran: `php artisan migrate --force`
- [ ] Storage link: `php artisan storage:link`
- [ ] Cache: `php artisan config:cache`
- [ ] Files uploaded with correct structure
- [ ] Domain/subdomain pointed correctly
