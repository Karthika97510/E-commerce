# MYNTRA — Enhanced E-Commerce Web Application

A complete, responsive, interactive Myntra-inspired fashion & lifestyle e-commerce storefront featuring **180 products across 9 categories**, full client-side search, multi-criteria filtering, sorting, product variations, persistent wishlist & shopping bag (`localStorage`), user authentication, order history, and responsive mobile/tablet/desktop layouts.

---

## Project Structure

```text
myntra-clone/
├── index.html                  # Main HTML layout, header, hero carousel, catalog, drawers & modals
├── js/
│   ├── products.js             # Structured catalog dataset (180 products across 9 categories)
│   └── app.js                  # Interactive storefront logic, state & localStorage persistence
├── assets/
│   └── images/
│       ├── hero/               # Carousel banner images (hero-1.jpg .. hero-4.jpg)
│       ├── categories/         # Circular category thumbnails (cat-*.jpg)
│       └── products/           # Local optimized 3:4 product images (180 items)
└── README.md                   # Project documentation & run instructions
```

---

## Key Features

- **9 Product Categories (20 products each = 180 total styles):**
  - `Ethnic Wear`, `Casual Wear`, `Office Wear`, `Western Wear`, `Footwear`, `Jewellery`, `Kids`, `Home`, and `Beauty`.
- **Interactive Hero Carousel & Partner Brand Strip:**
  - Multi-slide hero carousel with Previous/Next controls, slide dots, touch swipe, and clickable offer cards.
  - Partner brands bar (`PUMA`, `RARE RABBIT`, `U.S. POLO ASSN.`, `INDO ERA`, `COMET`, `MANGO`) filters straight to each brand's products.
- **Full Navigation & Mega Menus:**
  - Desktop hover mega menus (`MEN`, `WOMEN`, `KIDS`, `HOME`, `BEAUTY`, `GENZ`, `STUDIO`) plus responsive mobile navigation drawer.
  - Every header, category, studio lookbook, and footer policy link navigates to live content or interactive dialogs.
- **Search, Multi-Filter & Sorting:**
  - Instant search autocomplete across product titles, brands, categories, and descriptions.
  - Combined filters for Department/Gender, Category, Brand (with brand search), Price Range + custom Min/Max, Minimum Discount, and Customer Rating, plus removable filter chips & Clear All.
  - Sorting by Recommended, Price (Low to High / High to Low), Newest Arrivals, Popularity & Rating, and Better Discount.
- **Product Quick View & Variations:**
  - Interactive color swatches, category-appropriate size selection, size chart modal, 6-digit Indian pincode delivery checker, and View Similar shortcut.
- **Shopping Bag & Wishlist Persistence (`localStorage`):**
  - Add/remove items, adjust quantities, clear bag, apply coupon codes (`MYNTRA500`, `FESTIVE10`), dynamic MRP/discount/delivery calculations, and simulated checkout saved to order history.
  - Slide-over Wishlist drawer with duplicate prevention, one-click `MOVE TO BAG`, clear wishlist, and persistence across page reloads.
- **Account & Order Tracking:**
  - Tabbed Login & Registration modal, editable Profile & Delivery Address, and Order History / Tracking modal.

---

## How to Run the Project

### Prerequisites
- Any modern web browser (Google Chrome, Microsoft Edge, Firefox, Safari).
- Internet access is only needed on initial load for Tailwind CSS CDN, Plus Jakarta Sans font, and Material Symbols icons. All product, category, and banner images are bundled locally inside `assets/images/`.
- No backend server, database, or Node/Python package installation is required.

### Option 1: Open Directly in Browser
1. Extract the ZIP file.
2. Open `myntra-clone/index.html` by double-clicking it or opening it in your web browser.

### Option 2: Run with a Local HTTP Server (Recommended)
Using Python:
```bash
cd myntra-clone
python -m http.server 8000
```
Then visit `http://localhost:8000` in your browser.

Or using Node.js:
```bash
cd myntra-clone
npx serve .
```
