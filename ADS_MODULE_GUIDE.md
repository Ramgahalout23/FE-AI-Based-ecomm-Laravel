# Complete Ads Module Guide: Step-by-Step Ad Creation & Management

This guide provides simple, practical steps to create, launch, and manage every type of ad supported in the platform — **Reel & Video Ads**, **Static Banner Ads**, **Multi-card Carousel Ads**, and **WhatsApp Broadcasts** — completely within your dashboard.

---

## 1. Quick Platform Setup (One-Time)

Before launching live ads, configure your platform credentials directly in the dashboard:

```
Dashboard ➔ Marketing & Ads ➔ Campaigns ➔ Click "Platform Connections" (Top Right)
```

| Platform | What You Need | Where to Get It | In-App Action |
| :--- | :--- | :--- | :--- |
| **Meta (FB & IG)** | System User Token, Ad Account ID (`act_...`), Page ID | [Meta Business Manager](https://business.facebook.com/) | Paste ➔ Click **"Test Meta Connection"** ➔ Click **"Save"** |
| **Google Ads** | Client ID, Client Secret, Developer Token, Refresh Token, Customer ID | [Google Cloud Console](https://console.cloud.google.com/) & MCC | Paste ➔ Click **"Test Google Ads Connection"** ➔ Click **"Save"** |
| **WhatsApp Cloud** | Permanent Access Token, Phone Number ID, WABA ID | [Meta Developers](https://developers.facebook.com/) | Paste ➔ Click **"Test WhatsApp Connection"** ➔ Click **"Save"** |
| **Webhooks** | Automated Callback URLs & Verify Token | Generated in **Platform Connections ➔ Webhooks Tab** | Copy URL & Token ➔ Paste in Meta App Dashboard |

> [!TIP]
> All credentials are encrypted and stored in the database. You never need to edit server `.env` files or restart the backend to update API tokens.

---

## 2. Simple Steps by Ad Type

```
                                  ┌────────────────────────┐
                                  │   Click "New Campaign"  │
                                  └───────────┬────────────┘
                                              │
         ┌──────────────────┬─────────────────┼─────────────────┬──────────────────┐
         ▼                  ▼                 ▼                 ▼                  ▼
   [ REEL / VIDEO ]     [ BANNER ]       [ CAROUSEL ]      [ WHATSAPP ]      [ LINK PRODUCT ]
   • 9:16 Aspect        • 1:1 or 16:9    • 2–10 Cards      • Approved        • Auto-generates
   • MP4/MOV, ≤500MB    • PNG/JPG/WebP   • Multi-product     Template          copy & creative
   • IG/FB Reels        • Feed & Story   • Drag-to-reorder • Broadcast       • Direct cart link
```

---

### Format A: Reel & Video Ads (Instagram / Facebook Reels & YouTube Shorts)

Best for high-engagement storytelling, product try-ons, and dynamic lifestyle promotions.

#### Step 1: Initialize Campaign
1. Go to **Campaigns** tab and click **"+ New Campaign"**.
2. Select **Platform**: `INSTAGRAM`, `FACEBOOK`, or `GOOGLE`.
3. Choose **Objective**:
   - `CONVERSION` (if driving direct purchases)
   - `TRAFFIC` (if driving site visits)
   - `ENGAGEMENT` (if maximizing video views)

#### Step 2: Upload Video Creative
1. Under **Creative Type**, choose **"Video"**.
2. Upload your video file or paste a direct video URL:
   - **Recommended specs**: MP4 or MOV, **9:16 vertical** aspect ratio ($1080 \times 1920\text{ px}$).
   - Max file size: 500 MB.
3. The built-in video player displays a live real-time preview of how the Reel looks in the feed.

#### Step 3: Write Headline & Hook
- Write a punchy headline (e.g., *"Unboxing the New Summer Drop 🔥"*).
- Select a Call-to-Action (CTA): `SHOP_NOW`, `LEARN_MORE`, or `ORDER_NOW`.
- *(Optional)* Click **"AI Ad Copy"** to generate 3 high-converting captions with emojis.

#### Step 4: Set Budget & Targeting
- Set **Daily Budget** (e.g., ₹500/day) or **Total Budget**.
- Set **Start Date** and optional **End Date**.
- Target **Locations** (e.g., `Mumbai, Delhi, Bangalore`), **Age** (`18–35`), and **Interests** (`streetwear, sneakers`).

#### Step 5: Launch / Push
- Click **"Save Campaign"**.
- In the campaign list, click **"Push to Meta"** or **"Push to Google"**.
- The ad is submitted to the platform's ad review API and begins tracking impressions automatically.

---

### Format B: Static Banner Ads (Single Image Feed & Story Banners)

Best for bold seasonal sales, coupon announcements, and retargeting cart abandoners.

#### Step 1: Initialize Campaign
1. Click **"+ New Campaign"**.
2. Select **Platform**: `INSTAGRAM`, `FACEBOOK`, or `GOOGLE`.
3. Select **Objective**: `CONVERSION` or `TRAFFIC`.

#### Step 2: Choose or Generate Banner Image
1. Under **Creative Type**, select **"Image"**.
2. Either:
   - **Upload**: Upload a PNG, JPG, or WebP image ($1080 \times 1080\text{ px}$ square for Feed, or $1080 \times 1920\text{ px}$ for Stories).
   - **AI Banner Generator**: Click **"AI Tools ➔ Generate Banner"**, enter your prompt (e.g. *"Minimalist luxury watch on black marble"*), and save it directly to the campaign.
   - **Creative Library**: Select a pre-approved visual from your saved **Creative Library**.

#### Step 3: Destination URL & UTM Parameters
1. Enter the **Landing URL** (e.g., `https://yourstore.com/collections/sale`).
2. The platform automatically injects UTM tracking parameters:
   - `utm_source=instagram`
   - `utm_medium=paid_ad`
   - `utm_campaign=[campaign_name]`
3. Ensure **"Enable Tracking"** is toggled **ON**.

#### Step 4: Review & Publish
1. Check the live Instagram/Facebook mock preview on the right side of the screen.
2. Click **"Save Campaign"** ➔ Click **"Push to Platform"**.

---

### Format C: Multi-Product Carousel Ads (Swipeable Cards)

Best for showcasing an entire collection, multi-color variants, or step-by-step product benefits.

#### Step 1: Initialize Campaign
1. Click **"+ New Campaign"**.
2. Select **Platform**: `INSTAGRAM` or `FACEBOOK`.
3. Set **Objective**: `CONVERSION`.

#### Step 2: Configure Carousel Cards
1. Under **Creative Type**, select **"Carousel"**.
2. Upload between **2 and 10 square images** ($1080 \times 1080\text{ px}$, 1:1 aspect ratio).
3. **Reorder Cards**: Drag and drop cards left or right to set the exact card sequence your customers see.
4. **Card Removal**: Click the `✕` on any card to delete it.

#### Step 3: Link Products to Carousel
1. Click **"Link Store Products"** inside the modal.
2. Search and select products from your catalog (e.g., 3 different jackets).
3. The ad automatically imports product pricing, titles, and product detail URLs for each card!

#### Step 4: Save & Push
1. Preview the swipeable carousel cards in the mockup panel.
2. Click **"Save Campaign"** ➔ Click **"Push to Meta"**.

---

### Format D: WhatsApp Broadcast & Chat Campaigns

Best for direct order follow-ups, flash discounts, and instant customer checkout via chat.

#### Step 1: Create WhatsApp Campaign
1. Click **"+ New Campaign"**.
2. Select **Platform**: `WHATSAPP`.
3. Select **Objective**: `CONVERSION` or `ENGAGEMENT`.
4. Enter Campaign Name and Budget.

#### Step 2: Open Broadcast Sender
1. In the Campaigns list, find your WhatsApp campaign.
2. Click the green **"WhatsApp Broadcast"** button.

#### Step 3: Select Template & Recipients
1. Select an approved Meta template (e.g., `seasonal_sale_offer` or `hello_world`).
2. Provide recipient phone numbers:
   - Enter comma or newline-separated numbers (e.g., `+919876543210, +919812345678`), OR
   - Click **"Load from Customers"** to pull opted-in customer numbers automatically.
3. Add body parameters (e.g., `CustomerName`, `DiscountCode`).

#### Step 4: Send & Track
1. Click **"Send Broadcast"**.
2. Messages are dispatched via WhatsApp Cloud API with built-in rate-limiting.
3. Delivery receipts (`sent`, `delivered`, `read`) are captured in real-time via the webhook receiver.

---

## 3. Advanced Features Walkthrough

### A. Dynamic Audience Sizing & Retargeting

Build targeted audiences based on real store visitor behavior:

1. Open **Audience Manager** tab.
2. Click **"+ New Audience"**.
3. Select Audience Type:
   - **Saved / Demographic**: Specify age range, gender, and target cities (e.g., *Mumbai, Delhi*).
   - **Retargeting**: Select source events (`CLICK`, `CONVERSION`, `PURCHASE`) and lookback days (e.g., 30 days).
   - **Lookalike**: Expands from high-value purchasers.
4. Click **"Estimate Reach"**:
   - Computes real-time addressable users from your database.
   - Shows **Reach Tier** (`TARGETED`, `BROAD`, `MASS`).
   - Recommends an optimal daily budget.
5. Click **"Create Audience"**.

---

### B. Scientific A/B Testing & Significance

Never guess which ad creative or copy works best:

1. Open **A/B Experiments** tab.
2. Click **"+ New Experiment"**.
3. Select the **Control Campaign** (Variant A) and 1 or more **Challenger Campaigns** (Variant B, C).
4. Set Objective: `CONVERSION` or `CTR`.
5. Click **"Start Experiment"**.
6. Click **"Analyze Significance"** at any time:
   - Evaluates a 2-proportion hypothesis z-test and p-value.
   - Shows **Confidence Level** (e.g., $97.2\%$).
   - Shows a green badge if statistically significant ($p < 0.05$).
   - Recommends an immediate action (e.g., *"Declare Variant B as Winner"*).
7. Click **"Declare Winner"** when confidence $\ge 95\%$.

---

### C. Automation Rules (Auto-Pilot)

Set rules to safeguard your ad spend automatically:

1. Open **Automation** tab.
2. Click **"+ New Rule"**.
3. Select a condition:
   - *Example 1*: If `ROAS` is `LT` (Less Than) `1.5`, Action: `PAUSE_CAMPAIGN`.
   - *Example 2*: If `CTR` is `GT` (Greater Than) `4.0%`, Action: `SCALE_BUDGET` by `20%`.
4. The background scheduler checks these rules hourly and executes actions automatically.

---

### D. Scheduled Email Digests

Receive performance summaries directly in your inbox:

1. Open **Reports** tab.
2. Click **"+ Schedule Report"**.
3. Enter report name, frequency (`DAILY`, `WEEKLY`, `MONTHLY`), time, and recipient emails.
4. Click **"Schedule Report"**.
5. Test the email immediately by clicking **"Send Now"** on any scheduled report:
   - Compiles 30-day KPIs (Spend, Revenue, ROAS, CTR, Conversions).
   - Sends a dark-themed HTML report via SMTP directly to all recipients.

---

## 4. End-to-End Tracking & Attribution Flow

```
[Ad Impression / Click on IG / FB / Google]
       │
       ▼ (User clicks ad link with UTM params)
[Landing Page / Storefront Session]
       │
       ▼ (User adds item to cart & completes checkout)
[Order Service: Order Created]
       │
       ▼ (Asynchronous fire-and-forget attribution)
[AdTrackingService.recordConversion()]
       │
       ├── Updates Campaign: conversions + 1, revenue + order_amount
       ├── Updates Daily Stats: calculates daily ROAS & conversion rate
       └── Updates Analytics Dashboard: live ROAS & trend graphs
```

> [!NOTE]
> Conversion recording runs completely in the background without adding any latency to the customer checkout process.

---

## 5. Ad Specs Quick Reference Table

| Ad Type | Best Aspect Ratio | Resolution | Max File Size | Supported Platforms |
| :--- | :--- | :--- | :--- | :--- |
| **Reel / Video** | 9:16 Vertical | $1080 \times 1920\text{ px}$ | 500 MB (MP4/MOV) | Instagram, Facebook, YouTube |
| **Feed Banner** | 1:1 Square | $1080 \times 1080\text{ px}$ | 30 MB (PNG/JPG/WebP) | Instagram, Facebook, Google |
| **Landscape Banner**| 16:9 Horizontal | $1200 \times 628\text{ px}$ | 30 MB (PNG/JPG/WebP) | Facebook, Google Display |
| **Carousel Cards** | 1:1 Square | $1080 \times 1080\text{ px}$ | 30 MB per card (2–10 cards) | Instagram, Facebook |
| **WhatsApp Template**| Text / Media Header | $1080 \times 1080\text{ px}$ | 16 MB | WhatsApp Cloud API |
