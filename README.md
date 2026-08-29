# 🛍️ Threvolt — AI-Powered E-Commerce Frontend

Premium, mobile-first e-commerce storefront and admin panel built with **React 19**, **Vite**, **Tailwind CSS**, **Zustand**, and **Socket.IO**.

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite 8 |
| Language | JavaScript (JSX) |
| Styling | Tailwind CSS 3 |
| State | Zustand 5 |
| Server State | TanStack React Query 5 |
| Routing | React Router DOM 7 |
| Animation | Framer Motion 12 |
| Forms | React Hook Form + Zod |
| HTTP | Axios |
| Real-time | Socket.IO Client |
| i18n | i18next + react-i18next |
| Charts | Recharts |
| PWA | vite-plugin-pwa + Workbox |
| Push | Web Push (Service Worker) |
| Icons | Lucide React |
| QR/ZXing | @zxing/library |
| Testing | Vitest + Playwright |
| Linting | ESLint 10 |
| Deploy | Vercel |

## 📁 Project Structure

```
FE-AI-Based-ecomm-Laravel/
├── src/
│   ├── App.jsx                 # Router + page layout + chat/WhatsApp widgets
│   ├── main.jsx                # Entry point
│   ├── sw.js                   # Service Worker (push notifications)
│   │
│   ├── pages/
│   │   ├── storefront/         # Customer-facing pages (33 pages)
│   │   │   ├── HomePage.jsx            # Landing page with hero, reels, products
│   │   │   ├── ProductsPage.jsx        # Product grid with filters
│   │   │   ├── ProductDetailPage.jsx   # PDP with variants, reviews, AI
│   │   │   ├── CartPage.jsx            # Shopping cart
│   │   │   ├── CheckoutPage.jsx        # Multi-step checkout
│   │   │   ├── OrderThankYouPage.jsx   # Post-purchase confirmation
│   │   │   ├── OrdersPage.jsx          # Order history
│   │   │   ├── OrderDetailPage.jsx     # Order detail + timeline + tracking
│   │   │   ├── TrackOrderPage.jsx      # Guest order tracking
│   │   │   ├── WishlistPage.jsx        # Saved products
│   │   │   ├── ProfilePage.jsx         # User profile + push toggle
│   │   │   ├── AddressesPage.jsx       # Saved addresses
│   │   │   ├── ReturnsPage.jsx         # Return requests
│   │   │   ├── WatchAndBuyPage.jsx     # Video reels shopping
│   │   │   ├── CustomizePage.jsx       # Product customizer
│   │   │   ├── SizeGuidePage.jsx       # Size reference
│   │   │   ├── SupportTicketsPage.jsx  # Chat support tickets
│   │   │   ├── NotificationsPage.jsx   # User notifications
│   │   │   ├── AboutPage.jsx           # About us
│   │   │   ├── ContactPage.jsx         # Contact form
│   │   │   ├── FaqPage.jsx             # FAQ accordion
│   │   │   ├── SalesPage.jsx           # Sale products
│   │   │   └── ...                     # Policy, shipping, care pages
│   │   │
│   │   ├── admin/              # Admin panel (50+ pages)
│   │   │   ├── DashboardPage.jsx       # Analytics dashboard
│   │   │   ├── ProductsAdminPage.jsx   # Product management
│   │   │   ├── OrdersAdminPage.jsx     # Order management
│   │   │   ├── OrderDetailAdminPage.jsx # Order detail + timeline
│   │   │   ├── ChatPanel.jsx           # Live chat + AI chatbot
│   │   │   ├── SupportAdminPage.jsx    # Support dashboard
│   │   │   ├── ReelsAdminPage.jsx      # Video reels management
│   │   │   ├── AdsAdminPage.jsx        # Ad campaign management
│   │   │   ├── UsersAdminPage.jsx      # User management
│   │   │   ├── InventoryAdminPage.jsx  # Stock management
│   │   │   ├── ReviewsAdminPage.jsx    # Review moderation
│   │   │   ├── SettingsAdminPage.jsx   # System settings (16 tabs)
│   │   │   ├── DeliveryPartnersAdminPage.jsx  # Delivery partners
│   │   │   ├── ReturnsAdminPage.jsx    # Return requests
│   │   │   ├── PaymentsAdminPage.jsx   # Payment transactions
│   │   │   ├── CouponsAdminPage.jsx    # Discount coupons
│   │   │   ├── ShippingAdminPage.jsx   # Shipping zones
│   │   │   ├── TaxAdminPage.jsx        # Tax rules
│   │   │   ├── CMS pages, banners, etc.
│   │   │   └── settings/               # Settings tabs (16 tabs)
│   │   │       ├── GeneralTab.jsx
│   │   │       ├── PaymentsTab.jsx     # COD, partial payment, OTP
│   │   │       ├── ChatTab.jsx         # Auto-reply settings
│   │   │       ├── ThemeTab.jsx
│   │   │       ├── EmailTab.jsx
│   │   │       ├── SmsTab.jsx
│   │   │       ├── SeoTab.jsx
│   │   │       ├── IntegrationsTab.jsx
│   │   │       ├── ShippingLabelsTab.jsx
│   │   │       ├── TaxShippingTab.jsx
│   │   │       └── ...
│   │   │
│   │   └── auth/               # Login, register, forgot password
│   │
│   ├── components/
│   │   ├── layout/             # Navbar, Footer, CartDrawer, StorefrontLayout
│   │   ├── chat/               # LiveChatWidget, WhatsAppChatWidget, WhatsAppButton
│   │   ├── product/            # ProductCard, ProductGrid, QuickAdd, NewArrivals
│   │   ├── storefront/         # HeroSlider, Testimonials, ReviewsCarousel
│   │   ├── common/             # ScrollToTopButton, PushNotificationToggle, etc.
│   │   ├── admin/              # Admin-specific components
│   │   ├── ui/                 # Reusable UI primitives
│   │   ├── cart/               # Cart components
│   │   ├── reviews/            # Review display components
│   │   ├── seo/                # SEO head tags
│   │   ├── analytics/          # Tracking components
│   │   └── kinetics/           # 3D animations (Three.js)
│   │
│   ├── hooks/
│   │   ├── useChat.js          # Chat state + Socket.IO
│   │   ├── usePushNotifications.js  # Web Push subscribe/unsubscribe
│   │   ├── useSocket.js        # Socket.IO connection
│   │   ├── useAdCampaigns.js   # Ad campaign hooks
│   │   ├── useAdAnalytics.js   # Ad analytics
│   │   ├── useDisplayCurrency.js # Multi-currency
│   │   ├── useFlyToCart.js     # Add-to-cart animation
│   │   ├── usePullToRefresh.js # Mobile pull-to-refresh
│   │   └── useIdleTimer.js     # Idle timeout
│   │
│   ├── api/                    # API clients (admin, storefront)
│   ├── store/                  # Zustand stores
│   ├── contexts/               # React contexts
│   ├── services/               # Business logic services
│   ├── utils/                  # Helpers (notificationUtils, etc.)
│   ├── styles/                 # Global CSS
│   └── assets/                 # Images, fonts
│
├── public/                     # Static assets
├── dist/                       # Build output
├── vite.config.js              # Vite + PWA config
├── tailwind.config.js          # Tailwind theme
├── postcss.config.js           # PostCSS
├── index.html                  # HTML entry
└── package.json
```

## ⚡ Quick Start

### Prerequisites
- Node.js ≥ 18
- Backend API running (see `../Ai-Based-ecomm/`)

### 1. Install
```bash
git clone <repo-url>
cd FE-AI-Based-ecomm-Laravel
npm install
```

### 2. Configure
Create `.env` file:
```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_SOCKET_URL=http://localhost:3000
```

### 3. Run
```bash
npm run dev       # Development (http://localhost:5173)
npm run build     # Production build
npm run preview   # Preview production build
```

## 🎯 Key Features

### 🛍️ Storefront
- **Hero slider** with animated banners
- **Product grid** with filters, sorting, search
- **Quick add** — add to cart from product card
- **Product detail** — variants, size guide, reviews, AI recommendations
- **Video reels** — "Watch & Buy" shopping experience
- **Curated looks** — styled product collections
- **Customizer** — design-your-own product
- **Wishlist** — save products + shared wishlist links
- **Multi-currency** — display prices in local currency
- **Pull-to-refresh** — mobile gesture support

### 🤖 AI Chatbot (LiveChatWidget)
- **Instant open** — no loading spinner, opens immediately
- **Smart visibility** — shows on homepage (1s delay), hidden on checkout/cart
- **AI mode** — OpenAI-powered product recommendations
- **Live mode** — real-time chat with admin via Socket.IO
- **Image upload** — send images in chat
- **New conversation** — reset chat button
- **Notification badge** — unread message count
- **Auto-reply** — configurable timeout for live mode

### 📱 Mobile-First Design
- **Responsive** — optimized for all screen sizes
- **Mobile nav** — hamburger menu with smooth animations
- **Cart drawer** — slide-in cart from right
- **Quick add** — bottom sheet on mobile
- **Pull to refresh** — native-like gesture
- **PWA** — installable as app, works offline

### 💳 Checkout Flow
- **Multi-step** — address → payment → confirm
- **COD with OTP** — verification for cash on delivery
- **Partial payment** — advance payment option
- **Coupon codes** — discount application
- **Trust badges** — secure checkout indicators
- **Free shipping progress** — visual progress bar

### 👑 Admin Panel (50+ pages)
- **Dashboard** — sales, orders, revenue, charts
- **Products** — CRUD, variants, bulk import/export
- **Orders** — status management, timeline, invoicing
- **Live chat** — real-time support + AI mode toggle
- **Reels** — video reel management + product linking
- **Ads** — Meta/Google campaign management
- **Settings** — 16 tab settings panel
- **Inventory** — stock management across warehouses
- **Reviews** — moderation + responses
- **Returns** — return request processing
- **Delivery partners** — partner assignment
- **Push notifications** — auto-subscribe on admin login
- **Analytics** — traffic, conversion, ad performance

### 🔔 Push Notifications
- **Order updates** — status change notifications
- **Chat messages** — new message alerts
- **Lock screen** — appears on phone lock screen
- **Auto-subscribe** — admin auto-subscribes on login
- **User toggle** — "Order Updates" toggle in profile

### 🌐 i18n
- Multi-language support via i18next
- Translation keys from backend `/translations` API
- RTL support ready

## 🧩 Component Architecture

```
App.jsx
├── StorefrontLayout (public pages)
│   ├── Navbar
│   ├── <Outlet /> (page content)
│   ├── Footer
│   ├── LiveChatWidget (conditional)
│   ├── WhatsAppButton (conditional)
│   ├── ScrollToTopButton
│   └── MobileNav
│
├── AdminLayout (admin pages)
│   ├── AdminSidebar
│   ├── AdminHeader
│   ├── <Outlet /> (admin page content)
│   └── PushNotificationToggle (auto-subscribe)
│
└── AuthLayout (login/register)
```

## 🔌 Real-time Architecture

```
Browser ←→ Socket.IO ←→ Backend

Events:
├── chat:message     — New chat message
├── chat:typing      — Typing indicator
├── chat:mode        — Chat mode change
├── admin:message    — Admin reply
└── notification     — Push notification
```

## 🧪 Testing

```bash
npm test              # Run Vitest unit tests
npm run test:watch    # Watch mode
npx playwright test   # E2E tests
```

## 🚢 Deployment (Vercel)

1. Connect GitHub repo
2. Framework: Vite
3. Build command: `npm run build`
4. Output directory: `dist`
5. Environment variables:
   ```
   VITE_API_BASE_URL=https://your-api.onrender.com/api/v1
   VITE_SOCKET_URL=https://your-api.onrender.com
   ```

## 📄 License

MIT
