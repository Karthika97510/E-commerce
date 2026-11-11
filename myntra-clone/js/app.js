// ============================================================
// MYNTRA E-COMMERCE APPLICATION CONTROLLER
// ============================================================
(function () {
  "use strict";

  const CATALOG = Array.isArray(window.PRODUCTS_CATALOG) ? window.PRODUCTS_CATALOG : [];

  // ----------------------------------------------------
  // 1. PERSISTENT STATE (localStorage)
  // ----------------------------------------------------
  function safeParse(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      const parsed = JSON.parse(raw);
      return parsed !== null && parsed !== undefined ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function findProduct(id) {
    return CATALOG.find((p) => p.id === id);
  }

  const DEFAULT_WISHLIST = ["deal-1", "deal-3", "deal-4", "deal-5"];
  const DEFAULT_CART = [
    { id: "deal-1", size: "M", color: "Ruby Pink", quantity: 1 },
    { id: "deal-4", size: "S", color: "Midnight Black", quantity: 1 },
  ];

  let wishlistItems = Array.from(
    new Set(safeParse("myntra_wishlist", DEFAULT_WISHLIST))
  ).filter((id) => Boolean(findProduct(id)));

  let cartItems = safeParse("myntra_cart", DEFAULT_CART)
    .filter((item) => item && findProduct(item.id) && item.quantity > 0)
    .map((item) => {
      const p = findProduct(item.id);
      return {
        id: item.id,
        size: item.size || (p.sizes && p.sizes[0]) || "M",
        color: item.color || (p.colors && p.colors[0] && p.colors[0].name) || "Classic",
        quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
      };
    });

  let currentUser = safeParse("myntra_user", null);
  let registeredAccounts = safeParse("myntra_accounts", []);
  let orderHistory = safeParse("myntra_orders", []);
  let appliedCoupon = localStorage.getItem("myntra_coupon") || "";
  let savedPincode = localStorage.getItem("myntra_pincode") || "560103";

  let activeQuickViewId = null;
  let selectedSizeValue = "M";
  let selectedColorValue = "";
  let showAllInPage = false;

  const filterState = {
    category: "All",
    subcategory: "",
    gender: "All",
    brands: [],
    priceRange: "All",
    minPrice: "",
    maxPrice: "",
    minDiscount: 0,
    minRating: 0,
    search: "",
    sort: "recommended",
    page: 1,
    pageSize: 20,
    brandSearch: "",
  };

  function saveState() {
    localStorage.setItem("myntra_wishlist", JSON.stringify(wishlistItems));
    localStorage.setItem("myntra_cart", JSON.stringify(cartItems));
    localStorage.setItem("myntra_user", JSON.stringify(currentUser));
    localStorage.setItem("myntra_accounts", JSON.stringify(registeredAccounts));
    localStorage.setItem("myntra_orders", JSON.stringify(orderHistory));
    localStorage.setItem("myntra_coupon", appliedCoupon);
    localStorage.setItem("myntra_pincode", savedPincode);
    updateUIIndicators();
  }

  // ----------------------------------------------------
  // 2. TOAST NOTIFICATIONS
  // ----------------------------------------------------
  let toastTimeout = null;
  function showToast(message, icon = "check_circle") {
    const toast = document.getElementById("toastNotification");
    const msg = document.getElementById("toastMessage");
    const ic = document.getElementById("toastIcon");
    if (!toast || !msg) return;
    msg.textContent = message;
    if (ic) ic.textContent = icon;
    toast.classList.remove("opacity-0", "pointer-events-none");
    toast.classList.add("opacity-100");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove("opacity-100");
      toast.classList.add("opacity-0", "pointer-events-none");
    }, 3000);
  }

  // ----------------------------------------------------
  // 3. UI INDICATORS & NAV ACTIVE STATE
  // ----------------------------------------------------
  function updateUIIndicators() {
    const wishlistCountEl = document.getElementById("wishlistCount");
    const profileWishlistCounter = document.getElementById("profileWishlistCounter");
    const wishlistDrawerCount = document.getElementById("wishlistDrawerCount");
    if (wishlistCountEl) wishlistCountEl.textContent = wishlistItems.length;
    if (profileWishlistCounter) profileWishlistCounter.textContent = wishlistItems.length;
    if (wishlistDrawerCount) wishlistDrawerCount.textContent = wishlistItems.length;

    const cartCountEl = document.getElementById("cartCount");
    const cartDrawerCount = document.getElementById("cartDrawerCount");
    const totalBagQty = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    if (cartCountEl) cartCountEl.textContent = totalBagQty;
    if (cartDrawerCount) cartDrawerCount.textContent = totalBagQty;

    document.querySelectorAll(".product-card").forEach((card) => {
      const id = card.getAttribute("data-id");
      const btn = card.querySelector(".wishlist-btn");
      if (btn) {
        const icon = btn.querySelector(".material-symbols-outlined");
        if (icon) {
          if (wishlistItems.includes(id)) {
            icon.classList.add("text-primary", "fill");
          } else {
            icon.classList.remove("text-primary", "fill");
          }
        }
      }
    });

    const welcomeEl = document.getElementById("profileWelcomeText");
    const subEl = document.getElementById("profileSubText");
    const authBtn = document.getElementById("authActionBtn");
    const authBtnsRow = document.getElementById("authButtonsRow");
    const logoutSec = document.getElementById("logoutSection");
    const profileEditLink = document.getElementById("profileEditLink");
    const profileLabel = document.getElementById("profileLabel");
    const ordersCountBadge = document.getElementById("profileOrdersBadge");

    if (ordersCountBadge) {
      ordersCountBadge.textContent = orderHistory.length;
      ordersCountBadge.classList.toggle("hidden", orderHistory.length === 0);
    }

    if (currentUser) {
      if (welcomeEl) welcomeEl.textContent = "Hello, " + (currentUser.name || "Member");
      if (subEl) subEl.textContent = currentUser.phone || currentUser.email || "Myntra Member";
      if (authBtn) authBtn.classList.add("hidden");
      if (authBtnsRow) authBtnsRow.classList.add("hidden");
      if (logoutSec) logoutSec.classList.remove("hidden");
      if (profileEditLink) profileEditLink.classList.remove("hidden");
      if (profileLabel) {
        profileLabel.textContent = currentUser.name ? currentUser.name.split(" ")[0] : "Member";
      }
    } else {
      if (welcomeEl) welcomeEl.textContent = "Welcome";
      if (subEl) subEl.textContent = "To access wishlist & orders";
      if (authBtn) authBtn.classList.remove("hidden");
      if (authBtnsRow) authBtnsRow.classList.remove("hidden");
      if (logoutSec) logoutSec.classList.add("hidden");
      if (profileEditLink) profileEditLink.classList.add("hidden");
      if (profileLabel) profileLabel.textContent = "Profile";
    }
  }

  function setActiveNavTab(navKey) {
    document.querySelectorAll("[data-nav-key]").forEach((el) => {
      const key = el.getAttribute("data-nav-key");
      if (key === navKey) {
        el.classList.add("border-b-4", "border-primary", "text-primary");
        el.classList.remove("text-on-surface");
      } else {
        el.classList.remove("border-b-4", "border-primary", "text-primary");
        el.classList.add("text-on-surface");
      }
    });
  }

  // ----------------------------------------------------
  // 4. HERO CAROUSEL CONTROLLER
  // ----------------------------------------------------
  const HERO_SLIDES = [
    {
      badgeIcon: "stars",
      badgeText: "BIG FASHION FESTIVAL",
      titleHTML: 'GRAND <br/><span class="text-amber-300">50-90% OFF</span>',
      subtitle:
        "India's Biggest Fashion Celebration with 10 Lakh+ Styles & Unbeatable festive prices across top luxury and everyday labels.",
      ctaText: "EXPLORE NOW",
      ctaAction: () => scrollToDeals(),
      offerTitle: "10% Instant Discount*",
      offerSub: "On Leading Bank Cards & EMI",
      offerAction: () => openInfoModal("offers"),
      image: "assets/images/hero/hero-1.jpg",
      alt: "Festive Indian High-Fashion couple in traditional wedding ethnic attire",
      bgGradient: "from-amber-700 via-rose-900 to-amber-900",
      overlayGradient: "from-amber-950/90",
    },
    {
      badgeIcon: "auto_awesome",
      badgeText: "ROYAL FESTIVE EDIT",
      titleHTML: 'ETHNIC <br/><span class="text-amber-300">MIN. 50% OFF</span>',
      subtitle:
        "Handwoven Banarasi sarees, designer kurtas, embroidered lehengas & sherwanis crafted for wedding & celebration seasons.",
      ctaText: "SHOP ETHNIC",
      ctaAction: () => filterByCategoryTile("Ethnic Wear"),
      offerTitle: "Extra ₹500 Off*",
      offerSub: "Use Code MYNTRA500 on Bag",
      offerAction: () => openInfoModal("offers"),
      image: "assets/images/hero/hero-2.jpg",
      alt: "Royal Indian Festive Silk Ethnic Collection",
      bgGradient: "from-emerald-900 via-teal-950 to-amber-900",
      overlayGradient: "from-emerald-950/90",
    },
    {
      badgeIcon: "bolt",
      badgeText: "GENZ & SNEAKER FEST",
      titleHTML: 'STREET <br/><span class="text-amber-300">40-70% OFF</span>',
      subtitle:
        "Drop-shoulder oversized tees, heavy-wash denims, hoodies & iconic chunky sneakers from Comet, Puma, Highlander & Rare Rabbit.",
      ctaText: "SHOP STREET & KICKS",
      ctaAction: () => filterByCategoryTile("Footwear"),
      offerTitle: "Fresh Drop Alert",
      offerSub: "Explore GenZ Streetwear",
      offerAction: () => filterBySubcategory("Streetwear"),
      image: "assets/images/hero/hero-3.jpg",
      alt: "Urban Streetwear and Sneakers Editorial",
      bgGradient: "from-slate-900 via-zinc-900 to-rose-950",
      overlayGradient: "from-slate-950/90",
    },
    {
      badgeIcon: "spa",
      badgeText: "BEAUTY, HOME & KIDS",
      titleHTML: 'GLOW & <br/><span class="text-amber-300">HOME 60% OFF</span>',
      subtitle:
        "Luxury fragrances, hydrating skincare serums, handcrafted home lamps, 300TC bedsheets & playful kids fashion in one place.",
      ctaText: "EXPLORE BEAUTY",
      ctaAction: () => filterByCategoryTile("Beauty"),
      offerTitle: "Home Makeover",
      offerSub: "Shop Curated Home Decor",
      offerAction: () => filterByCategoryTile("Home"),
      image: "assets/images/hero/hero-4.jpg",
      alt: "Luxury Beauty Perfumes and Modern Home Decor",
      bgGradient: "from-rose-900 via-fuchsia-950 to-amber-900",
      overlayGradient: "from-rose-950/90",
    },
  ];

  let currentHeroIndex = 0;
  let heroTimer = null;

  function renderHeroSlide(index) {
    currentHeroIndex = (index + HERO_SLIDES.length) % HERO_SLIDES.length;
    const s = HERO_SLIDES[currentHeroIndex];
    const heroSec = document.getElementById("heroCarousel");
    if (!heroSec) return;

    const bgEl = document.getElementById("heroSlideContainer");
    const badgeIcon = document.getElementById("heroBadgeIcon");
    const badgeText = document.getElementById("heroBadgeText");
    const titleEl = document.getElementById("heroTitle");
    const subEl = document.getElementById("heroSubtitle");
    const ctaBtn = document.getElementById("heroCtaBtn");
    const ctaText = document.getElementById("heroCtaText");
    const offerBox = document.getElementById("heroOfferBox");
    const offerTitle = document.getElementById("heroOfferTitle");
    const offerSub = document.getElementById("heroOfferSub");
    const imgEl = document.getElementById("heroSlideImage");
    const overlayEl = document.getElementById("heroImageOverlay");

    if (bgEl) {
      bgEl.className = `grid grid-cols-1 md:grid-cols-12 min-h-[430px] md:min-h-[460px] items-center relative bg-gradient-to-r ${s.bgGradient} transition-colors duration-500`;
    }
    if (badgeIcon) badgeIcon.textContent = s.badgeIcon;
    if (badgeText) badgeText.textContent = s.badgeText;
    if (titleEl) titleEl.innerHTML = s.titleHTML;
    if (subEl) subEl.textContent = s.subtitle;
    if (ctaText) ctaText.textContent = s.ctaText;
    if (ctaBtn) ctaBtn.onclick = s.ctaAction;
    if (offerTitle) offerTitle.textContent = s.offerTitle;
    if (offerSub) offerSub.textContent = s.offerSub;
    if (offerBox) {
      offerBox.onclick = (e) => {
        e.stopPropagation();
        s.offerAction();
      };
    }
    if (imgEl) {
      imgEl.src = s.image;
      imgEl.alt = s.alt;
      imgEl.onclick = s.ctaAction;
    }
    if (overlayEl) {
      overlayEl.className = `absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r ${s.overlayGradient} via-transparent to-transparent pointer-events-none`;
    }

    document.querySelectorAll(".hero-dot").forEach((dot, i) => {
      if (i === currentHeroIndex) {
        dot.className = "hero-dot w-6 h-2 rounded-full bg-white transition-all cursor-pointer";
      } else {
        dot.className = "hero-dot w-2 h-2 rounded-full bg-white/45 hover:bg-white/80 transition-all cursor-pointer";
      }
    });
  }

  function prevHeroSlide() {
    renderHeroSlide(currentHeroIndex - 1);
    resetHeroAutoPlay();
  }

  function nextHeroSlide() {
    renderHeroSlide(currentHeroIndex + 1);
    resetHeroAutoPlay();
  }

  function goToHeroSlide(index) {
    renderHeroSlide(index);
    resetHeroAutoPlay();
  }

  function resetHeroAutoPlay() {
    clearInterval(heroTimer);
    heroTimer = setInterval(() => {
      renderHeroSlide(currentHeroIndex + 1);
    }, 6000);
  }

  function initHeroCarousel() {
    const heroSec = document.getElementById("heroCarousel");
    if (!heroSec) return;
    renderHeroSlide(0);
    resetHeroAutoPlay();

    heroSec.addEventListener("mouseenter", () => clearInterval(heroTimer));
    heroSec.addEventListener("mouseleave", resetHeroAutoPlay);

    let touchStartX = 0;
    heroSec.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.changedTouches[0].screenX;
      },
      { passive: true }
    );
    heroSec.addEventListener(
      "touchend",
      (e) => {
        const diff = e.changedTouches[0].screenX - touchStartX;
        if (Math.abs(diff) > 45) {
          if (diff < 0) nextHeroSlide();
          else prevHeroSlide();
        }
      },
      { passive: true }
    );
  }

  // ----------------------------------------------------
  // 5. PRODUCT CARD RENDERING
  // ----------------------------------------------------
  function createProductCardHTML(p, compact = false) {
    const isWishlisted = wishlistItems.includes(p.id);
    const heartCls = isWishlisted ? "text-primary fill" : "";
    const formattedPrice = p.price.toLocaleString("en-IN");
    const formattedOrig = p.originalPrice.toLocaleString("en-IN");
    const badgeColor =
      p.badge === "UNDER ₹499" ? "text-secondary" : p.badge === "NEW ARRIVAL" ? "text-emerald-700" : "text-primary";

    return `
      <div class="product-card group relative bg-white rounded-lg border border-surface-container overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between" data-id="${p.id}" onclick="openProductQuickView('${p.id}')">
        <div>
          <div class="aspect-[3/4] relative overflow-hidden bg-surface-container-low">
            <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" alt="${escapeHTML(p.title)}" src="${p.image}"/>
            <div class="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] sm:text-[11px] ${badgeColor} font-bold shadow-xs">
              ${escapeHTML(p.badge)}
            </div>
            <div class="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-bold text-on-surface flex items-center gap-0.5 shadow-xs">
              <span>${p.rating}</span>
              <span class="material-symbols-outlined text-[11px] text-amber-500 fill">star</span>
              <span class="text-outline hidden sm:inline">| ${p.reviews}</span>
            </div>
            <button type="button" class="wishlist-btn absolute top-2 right-2 w-7 h-7 bg-white/85 backdrop-blur-sm rounded-full flex items-center justify-center text-on-surface hover:text-primary transition-colors shadow-xs" onclick="toggleWishlist(this, '${p.id}', event)" title="Save to Wishlist" aria-label="Toggle Wishlist for ${escapeHTML(p.title)}">
              <span class="material-symbols-outlined text-base ${heartCls}">favorite</span>
            </button>
          </div>
          <div class="p-2.5 pb-1.5">
            <div class="text-xs font-bold text-on-surface truncate">${escapeHTML(p.brand)}</div>
            <div class="text-xs text-on-surface-variant truncate mt-0.5">${escapeHTML(p.title)}</div>
            <div class="mt-1 flex items-baseline gap-1.5 flex-wrap">
              <span class="text-xs font-extrabold text-on-surface">₹${formattedPrice}</span>
              <span class="text-[11px] text-outline line-through">₹${formattedOrig}</span>
              <span class="text-[11px] text-primary font-bold">(${escapeHTML(p.discount)})</span>
            </div>
          </div>
        </div>
        <div class="px-2.5 pb-2.5 pt-1 flex items-center gap-1.5">
          <button type="button" class="flex-1 py-1.5 px-2 bg-primary-container hover:bg-primary text-primary hover:text-white rounded text-[11px] font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-1" onclick="quickAddToCart('${p.id}', event)">
            <span class="material-symbols-outlined text-[13px]">shopping_bag</span>
            <span>Add${compact ? "" : " to Bag"}</span>
          </button>
          <button type="button" class="py-1.5 px-2 border border-surface-container-high hover:border-on-surface text-on-surface-variant hover:text-on-surface rounded text-[11px] font-bold transition-colors" onclick="event.stopPropagation(); openProductQuickView('${p.id}');" title="View Product Details">
            View
          </button>
        </div>
      </div>
    `;
  }

  function renderOMGDeals() {
    const grid = document.getElementById("dealsGrid");
    if (!grid) return;
    const featured = CATALOG.filter((p) => p.isFeaturedDeal).slice(0, 6);
    grid.innerHTML = featured.map((p) => createProductCardHTML(p, true)).join("");
  }

  // ----------------------------------------------------
  // 6. FILTERING, SORTING & CATALOG RENDERING
  // ----------------------------------------------------
  function matchesSubcategory(p, sub) {
    if (!sub) return true;
    const s = sub.toLowerCase();
    const pSub = (p.subcategory || "").toLowerCase();
    const pCat = (p.category || "").toLowerCase();
    const pTitle = (p.title || "").toLowerCase();

    if (pSub === s || pCat === s) return true;
    if (s === "streetwear") {
      return (
        pSub === "streetwear" ||
        pTitle.includes("oversized") ||
        pTitle.includes("graphic") ||
        pTitle.includes("drop-shoulder") ||
        pTitle.includes("hoodie") ||
        pTitle.includes("sneaker") ||
        pTitle.includes("crop")
      );
    }
    if (s === "office wear") {
      return pCat === "office wear" || pSub === "office wear" || pSub === "blazers & waistcoats" || pTitle.includes("blazer");
    }
    if (s === "nehru jackets") {
      return pTitle.includes("nehru") || pSub === "sherwanis" || pSub === "kurtas";
    }
    if (s === "sweatshirts") {
      return pSub === "sweatshirts" || pTitle.includes("hoodie") || pTitle.includes("sweatshirt") || pTitle.includes("jacket");
    }
    if (s === "lehengas") {
      return pTitle.includes("lehenga") || pSub === "lehengas" || pTitle.includes("anarkali") || pTitle.includes("bandhani");
    }
    if (s === "kurtas & suits") {
      return pSub === "kurtas & suits" || (pCat === "ethnic wear" && pTitle.includes("kurta"));
    }
    if (s === "ethnic dresses") {
      return pSub === "ethnic dresses" || pTitle.includes("anarkali") || pTitle.includes("ethnic");
    }
    if (s === "casual shoes") {
      return pSub === "casual shoes" || pSub === "sneakers" || pSub === "flats";
    }
    if (s === "casual trousers") {
      return pSub === "casual trousers" || pSub === "formal trousers" || pTitle.includes("trouser");
    }
    if (s === "shorts") {
      return pSub === "shorts" || pSub === "track pants" || pTitle.includes("shorts") || pTitle.includes("joggers");
    }
    if (s === "sunscreen") {
      return pSub === "sunscreen" || pSub === "skincare serums" || pTitle.includes("lotion") || pTitle.includes("serum");
    }
    if (s === "drinkware") {
      return pSub === "drinkware" || pSub === "dinnerware";
    }
    return pSub.includes(s) || pTitle.includes(s);
  }

  function getFilteredProducts() {
    const q = filterState.search.trim().toLowerCase();
    return CATALOG.filter((p) => {
      if (filterState.category !== "All" && p.category !== filterState.category) return false;
      if (filterState.gender !== "All") {
        if (filterState.gender === "Men") {
          if (p.gender !== "Men" && !(p.gender === "Unisex" && ["Footwear", "Beauty", "Casual Wear"].includes(p.category))) {
            return false;
          }
        } else if (filterState.gender === "Women") {
          if (p.gender !== "Women" && !(p.gender === "Unisex" && ["Footwear", "Beauty", "Jewellery"].includes(p.category))) {
            return false;
          }
        } else if (p.gender !== filterState.gender) {
          return false;
        }
      }
      if (filterState.subcategory && !matchesSubcategory(p, filterState.subcategory)) return false;
      if (filterState.brands.length > 0 && !filterState.brands.includes(p.brand)) return false;

      if (filterState.priceRange !== "All" && filterState.priceRange !== "custom") {
        if (filterState.priceRange === "0-500" && p.price > 500) return false;
        if (filterState.priceRange === "500-1000" && (p.price < 500 || p.price > 1000)) return false;
        if (filterState.priceRange === "1000-2000" && (p.price < 1000 || p.price > 2000)) return false;
        if (filterState.priceRange === "2000-5000" && (p.price < 2000 || p.price > 5000)) return false;
        if (filterState.priceRange === "5000+" && p.price < 5000) return false;
      }
      if (filterState.minPrice !== "" && !isNaN(Number(filterState.minPrice))) {
        if (p.price < Number(filterState.minPrice)) return false;
      }
      if (filterState.maxPrice !== "" && !isNaN(Number(filterState.maxPrice))) {
        if (p.price > Number(filterState.maxPrice)) return false;
      }
      if (filterState.minDiscount > 0 && p.discountPct < filterState.minDiscount) return false;
      if (filterState.minRating > 0 && p.rating < filterState.minRating) return false;

      if (q) {
        const hay = `${p.brand} ${p.title} ${p.category} ${p.subcategory} ${p.gender} ${p.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function sortProducts(list) {
    const arr = [...list];
    switch (filterState.sort) {
      case "price-asc":
        arr.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        arr.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        arr.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || b.arrivalOrder - a.arrivalOrder);
        break;
      case "rating":
        arr.sort((a, b) => b.rating * 100000 + b.reviewCount - (a.rating * 100000 + a.reviewCount));
        break;
      case "discount":
        arr.sort((a, b) => b.discountPct - a.discountPct);
        break;
      default:
        // Balanced "Recommended": keep featured first, then interleave categories when showing All
        if (filterState.category === "All" && !filterState.search && !filterState.subcategory) {
          const buckets = {};
          arr.forEach((p) => {
            if (!buckets[p.category]) buckets[p.category] = [];
            buckets[p.category].push(p);
          });
          const keys = Object.keys(buckets);
          const mixed = [];
          let added = true;
          while (added) {
            added = false;
            for (const k of keys) {
              if (buckets[k].length) {
                mixed.push(buckets[k].shift());
                added = true;
              }
            }
          }
          return mixed;
        }
        arr.sort((a, b) => (b.isFeaturedDeal ? 1 : 0) - (a.isFeaturedDeal ? 1 : 0) || b.reviewCount - a.reviewCount);
        break;
    }
    return arr;
  }

  function hasActiveFilters() {
    return (
      filterState.category !== "All" ||
      filterState.subcategory !== "" ||
      filterState.gender !== "All" ||
      filterState.brands.length > 0 ||
      filterState.priceRange !== "All" ||
      filterState.minPrice !== "" ||
      filterState.maxPrice !== "" ||
      filterState.minDiscount > 0 ||
      filterState.minRating > 0 ||
      filterState.search.trim() !== ""
    );
  }

  function renderActiveFilterChips() {
    const chipsContainer = document.getElementById("activeFilterChips");
    const banner = document.getElementById("filterNotificationBar");
    const display = document.getElementById("filterValueDisplay");
    const chips = [];

    if (filterState.search.trim()) {
      chips.push({ label: `Search: "${filterState.search.trim()}"`, clear: () => { filterState.search = ""; if (searchInput) searchInput.value = ""; } });
    }
    if (filterState.gender !== "All") {
      chips.push({ label: `Dept: ${filterState.gender}`, clear: () => { filterState.gender = "All"; setActiveNavTab(""); } });
    }
    if (filterState.category !== "All") {
      chips.push({ label: `Category: ${filterState.category}`, clear: () => { filterState.category = "All"; } });
    }
    if (filterState.subcategory) {
      chips.push({ label: `Type: ${filterState.subcategory}`, clear: () => { filterState.subcategory = ""; } });
    }
    filterState.brands.forEach((b) => {
      chips.push({
        label: `Brand: ${b}`,
        clear: () => {
          filterState.brands = filterState.brands.filter((x) => x !== b);
        },
      });
    });
    if (filterState.priceRange !== "All" && filterState.priceRange !== "custom") {
      const labels = {
        "0-500": "Under ₹500",
        "500-1000": "₹500 – ₹1,000",
        "1000-2000": "₹1,000 – ₹2,000",
        "2000-5000": "₹2,000 – ₹5,000",
        "5000+": "₹5,000+",
      };
      chips.push({ label: `Price: ${labels[filterState.priceRange] || filterState.priceRange}`, clear: () => { filterState.priceRange = "All"; } });
    }
    if (filterState.minPrice !== "" || filterState.maxPrice !== "") {
      chips.push({
        label: `₹${filterState.minPrice || 0} – ₹${filterState.maxPrice || "Max"}`,
        clear: () => {
          filterState.minPrice = "";
          filterState.maxPrice = "";
          filterState.priceRange = "All";
        },
      });
    }
    if (filterState.minDiscount > 0) {
      chips.push({ label: `${filterState.minDiscount}%+ OFF`, clear: () => { filterState.minDiscount = 0; } });
    }
    if (filterState.minRating > 0) {
      chips.push({ label: `${filterState.minRating}★ & above`, clear: () => { filterState.minRating = 0; } });
    }

    if (banner && display) {
      if (chips.length > 0) {
        display.textContent = chips.map((c) => c.label).join(" • ");
        banner.classList.remove("hidden");
      } else {
        banner.classList.add("hidden");
      }
    }

    if (chipsContainer) {
      if (chips.length === 0) {
        chipsContainer.innerHTML = "";
        chipsContainer.classList.add("hidden");
      } else {
        chipsContainer.classList.remove("hidden");
        chipsContainer.innerHTML =
          chips
            .map(
              (c, idx) => `
          <button type="button" class="inline-flex items-center gap-1 bg-rose-50 text-primary border border-primary/25 px-2.5 py-1 rounded-full text-[11px] font-bold hover:bg-primary hover:text-white transition-colors" onclick="removeFilterChip(${idx})">
            <span>${escapeHTML(c.label)}</span>
            <span class="material-symbols-outlined text-xs">close</span>
          </button>`
            )
            .join("") +
          `<button type="button" class="text-[11px] font-extrabold text-primary hover:underline ml-1" onclick="clearFilters()">Clear All</button>`;
        window.__activeChipClearers = chips.map((c) => c.clear);
      }
    }
  }

  function removeFilterChip(idx) {
    if (window.__activeChipClearers && window.__activeChipClearers[idx]) {
      window.__activeChipClearers[idx]();
      filterState.page = 1;
      renderCatalog();
    }
  }

  function renderFilterSidebar() {
    const categories = ["All", "Ethnic Wear", "Casual Wear", "Office Wear", "Western Wear", "Footwear", "Jewellery", "Kids", "Home", "Beauty"];
    const catCounts = { All: CATALOG.length };
    categories.slice(1).forEach((c) => {
      catCounts[c] = CATALOG.filter((p) => p.category === c).length;
    });

    const catHTML = categories
      .map((c) => {
        const active = filterState.category === c;
        return `
        <button type="button" onclick="setCategoryFilter('${c}')" class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
          active ? "bg-primary-container text-primary font-bold" : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
        }">
          <span>${c === "All" ? "All Categories" : c}</span>
          <span class="text-[11px] ${active ? "text-primary" : "text-outline"}">${catCounts[c] || 0}</span>
        </button>`;
      })
      .join("");

    const genders = ["All", "Women", "Men", "Kids", "Unisex"];
    const genderHTML = genders
      .map((g) => {
        const active = filterState.gender === g;
        return `
        <button type="button" onclick="setGenderFilter('${g}')" class="px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ${
          active ? "border-primary bg-primary text-white" : "border-surface-container-high bg-white text-on-surface-variant hover:border-primary"
        }">${g}</button>`;
      })
      .join("");

    // Dynamic brands list sorted by count, filtered by brandSearch
    const brandCounts = {};
    CATALOG.forEach((p) => {
      if (filterState.category !== "All" && p.category !== filterState.category) return;
      brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
    });
    const sortedBrands = Object.keys(brandCounts)
      .sort((a, b) => brandCounts[b] - brandCounts[a] || a.localeCompare(b))
      .filter((b) => !filterState.brandSearch || b.toLowerCase().includes(filterState.brandSearch.toLowerCase()));

    const brandsHTML =
      sortedBrands.length > 0
        ? sortedBrands
            .slice(0, 30)
            .map((b) => {
              const checked = filterState.brands.includes(b);
              return `
          <label class="flex items-center justify-between gap-2 text-xs cursor-pointer py-1 hover:text-primary">
            <span class="flex items-center gap-2 truncate">
              <input type="checkbox" class="rounded border-outline text-primary focus:ring-primary w-3.5 h-3.5" ${checked ? "checked" : ""} onchange="toggleBrandFilter('${escapeAttr(b)}')"/>
              <span class="truncate font-medium ${checked ? "font-bold text-primary" : "text-on-surface"}">${escapeHTML(b)}</span>
            </span>
            <span class="text-[10px] text-outline shrink-0">(${brandCounts[b]})</span>
          </label>`;
            })
            .join("")
        : `<div class="text-[11px] text-outline py-2">No matching brands</div>`;

    const prices = [
      { id: "All", label: "All Prices" },
      { id: "0-500", label: "Under ₹500" },
      { id: "500-1000", label: "₹500 – ₹1,000" },
      { id: "1000-2000", label: "₹1,000 – ₹2,000" },
      { id: "2000-5000", label: "₹2,000 – ₹5,000" },
      { id: "5000+", label: "₹5,000 & Above" },
    ];
    const priceHTML = prices
      .map((pr) => {
        const checked = filterState.priceRange === pr.id;
        return `
        <label class="flex items-center gap-2 text-xs cursor-pointer py-1 hover:text-primary">
          <input type="radio" name="priceRangeRadio" class="border-outline text-primary focus:ring-primary w-3.5 h-3.5" ${checked ? "checked" : ""} onchange="setPriceRangeFilter('${pr.id}')"/>
          <span class="font-medium ${checked ? "font-bold text-primary" : "text-on-surface"}">${pr.label}</span>
        </label>`;
      })
      .join("");

    const discounts = [
      { val: 0, label: "All Discounts" },
      { val: 30, label: "30% OFF & above" },
      { val: 50, label: "50% OFF & above" },
      { val: 60, label: "60% OFF & above" },
      { val: 70, label: "70% OFF & above" },
    ];
    const discHTML = discounts
      .map((d) => {
        const checked = filterState.minDiscount === d.val;
        return `
        <label class="flex items-center gap-2 text-xs cursor-pointer py-1 hover:text-primary">
          <input type="radio" name="discountRadio" class="border-outline text-primary focus:ring-primary w-3.5 h-3.5" ${checked ? "checked" : ""} onchange="setDiscountFilter(${d.val})"/>
          <span class="font-medium ${checked ? "font-bold text-primary" : "text-on-surface"}">${d.label}</span>
        </label>`;
      })
      .join("");

    const ratings = [
      { val: 0, label: "All Ratings" },
      { val: 4.0, label: "4.0★ & above" },
      { val: 4.5, label: "4.5★ & above" },
    ];
    const ratingHTML = ratings
      .map((r) => {
        const checked = filterState.minRating === r.val;
        return `
        <label class="flex items-center gap-2 text-xs cursor-pointer py-1 hover:text-primary">
          <input type="radio" name="ratingRadio" class="border-outline text-primary focus:ring-primary w-3.5 h-3.5" ${checked ? "checked" : ""} onchange="setRatingFilter(${r.val})"/>
          <span class="font-medium ${checked ? "font-bold text-primary" : "text-on-surface"}">${r.label}</span>
        </label>`;
      })
      .join("");

    const sidebarHTML = `
      <div class="space-y-5">
        <div class="flex items-center justify-between pb-3 border-b border-surface-container-high">
          <div class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-primary text-lg">tune</span>
            <h3 class="text-xs font-black uppercase tracking-wider text-on-surface">FILTERS</h3>
          </div>
          <button type="button" onclick="clearFilters()" class="text-[11px] font-extrabold text-primary hover:underline uppercase">CLEAR ALL</button>
        </div>

        <div>
          <h4 class="text-[11px] font-black uppercase tracking-wider text-on-surface mb-2">Department</h4>
          <div class="flex flex-wrap gap-1.5">${genderHTML}</div>
        </div>

        <div class="pt-3 border-t border-surface-container">
          <h4 class="text-[11px] font-black uppercase tracking-wider text-on-surface mb-2">Categories</h4>
          <div class="space-y-0.5">${catHTML}</div>
        </div>

        <div class="pt-3 border-t border-surface-container">
          <h4 class="text-[11px] font-black uppercase tracking-wider text-on-surface mb-2">Price Range</h4>
          <div class="space-y-0.5">${priceHTML}</div>
          <div class="mt-2.5 flex items-center gap-1.5">
            <input type="number" min="0" placeholder="Min ₹" value="${escapeAttr(filterState.minPrice)}" onchange="setCustomPriceFilter(this.value, null)" class="w-full px-2 py-1 text-xs rounded border border-surface-container-high bg-surface-container-low focus:border-primary focus:ring-0 outline-none"/>
            <span class="text-outline text-xs">-</span>
            <input type="number" min="0" placeholder="Max ₹" value="${escapeAttr(filterState.maxPrice)}" onchange="setCustomPriceFilter(null, this.value)" class="w-full px-2 py-1 text-xs rounded border border-surface-container-high bg-surface-container-low focus:border-primary focus:ring-0 outline-none"/>
          </div>
        </div>

        <div class="pt-3 border-t border-surface-container">
          <h4 class="text-[11px] font-black uppercase tracking-wider text-on-surface mb-2">Brand</h4>
          <input type="text" placeholder="Search brand..." value="${escapeAttr(filterState.brandSearch)}" oninput="setBrandSearchFilter(this.value)" class="w-full px-2.5 py-1.5 mb-2 text-xs rounded-md border border-surface-container-high bg-surface-container-low focus:border-primary focus:ring-0 outline-none"/>
          <div class="max-h-48 overflow-y-auto pr-1 space-y-0.5">${brandsHTML}</div>
        </div>

        <div class="pt-3 border-t border-surface-container">
          <h4 class="text-[11px] font-black uppercase tracking-wider text-on-surface mb-2">Discount Range</h4>
          <div class="space-y-0.5">${discHTML}</div>
        </div>

        <div class="pt-3 border-t border-surface-container">
          <h4 class="text-[11px] font-black uppercase tracking-wider text-on-surface mb-2">Customer Rating</h4>
          <div class="space-y-0.5">${ratingHTML}</div>
        </div>
      </div>
    `;

    const desktopSidebar = document.getElementById("desktopFilterSidebar");
    const mobileSidebar = document.getElementById("mobileFilterBody");
    if (desktopSidebar) desktopSidebar.innerHTML = sidebarHTML;
    if (mobileSidebar) mobileSidebar.innerHTML = sidebarHTML;
  }

  function renderCatalog() {
    const grid = document.getElementById("catalogGrid");
    const heading = document.getElementById("catalogHeading");
    const countLabel = document.getElementById("catalogCountLabel");
    const paginationEl = document.getElementById("catalogPagination");
    const sortSelect = document.getElementById("catalogSortSelect");
    if (!grid) return;

    if (sortSelect) sortSelect.value = filterState.sort;

    renderFilterSidebar();
    renderActiveFilterChips();

    const filtered = sortProducts(getFilteredProducts());
    const total = filtered.length;

    // Heading
    if (heading) {
      if (filterState.search.trim()) {
        heading.textContent = `SEARCH RESULTS FOR "${filterState.search.trim().toUpperCase()}"`;
      } else if (filterState.subcategory) {
        heading.textContent = `${filterState.subcategory.toUpperCase()} COLLECTION`;
      } else if (filterState.category !== "All") {
        heading.textContent = `${filterState.category.toUpperCase()} COLLECTION`;
      } else if (filterState.gender !== "All") {
        heading.textContent = `${filterState.gender.toUpperCase()}'S FASHION`;
      } else if (filterState.brands.length === 1) {
        heading.textContent = `${filterState.brands[0]} STORE`;
      } else {
        heading.textContent = "EXPLORE ALL STYLES";
      }
    }

    if (total === 0) {
      if (countLabel) countLabel.textContent = "Showing 0 products";
      grid.className = "w-full";
      grid.innerHTML = `
        <div class="bg-surface-container-low border border-surface-container-high rounded-xl py-16 px-6 text-center flex flex-col items-center justify-center">
          <span class="material-symbols-outlined text-5xl text-outline mb-3">search_off</span>
          <h3 class="text-lg font-extrabold text-on-surface font-display">No products found matching your criteria</h3>
          <p class="text-xs text-on-surface-variant mt-1.5 max-w-md">
            Try clearing some filters or searching for popular terms like <strong>Kurtas</strong>, <strong>Sneakers</strong>, <strong>Blazers</strong>, <strong>Sarees</strong>, or <strong>Jewellery</strong>.
          </p>
          <button type="button" onclick="clearFilters()" class="mt-5 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-lg uppercase tracking-wider shadow-sm transition-colors">
            Reset All Filters & View All
          </button>
        </div>
      `;
      if (paginationEl) paginationEl.innerHTML = "";
      return;
    }

    const pageSize = showAllInPage ? total : filterState.pageSize;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (filterState.page > totalPages) filterState.page = totalPages;
    const startIdx = (filterState.page - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, total);
    const pageItems = filtered.slice(startIdx, endIdx);

    if (countLabel) {
      countLabel.textContent = `Showing ${startIdx + 1}–${endIdx} of ${total} products`;
    }

    grid.className = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4";
    grid.innerHTML = pageItems.map((p) => createProductCardHTML(p, false)).join("");

    // Pagination
    if (paginationEl) {
      if (totalPages <= 1 && !showAllInPage) {
        paginationEl.innerHTML = "";
      } else {
        let pageBtns = "";
        for (let i = 1; i <= totalPages; i++) {
          if (totalPages > 7 && Math.abs(i - filterState.page) > 2 && i !== 1 && i !== totalPages) {
            if (i === 2 || i === totalPages - 1) {
              pageBtns += `<span class="px-2 text-xs text-outline">...</span>`;
            }
            continue;
          }
          const active = i === filterState.page;
          pageBtns += `<button type="button" onclick="goToCatalogPage(${i})" class="w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
            active ? "bg-primary text-white shadow-sm" : "bg-white border border-surface-container-high text-on-surface hover:border-primary hover:text-primary"
          }">${i}</button>`;
        }

        paginationEl.innerHTML = `
          <div class="flex flex-wrap items-center justify-between gap-4 pt-6 mt-4 border-t border-surface-container-high">
            <div class="text-xs text-on-surface-variant font-medium">Page ${filterState.page} of ${totalPages} (${total} styles)</div>
            <div class="flex items-center gap-1.5">
              <button type="button" onclick="goToCatalogPage(${filterState.page - 1})" ${filterState.page <= 1 ? "disabled" : ""} class="px-3 h-8 rounded-lg border border-surface-container-high text-xs font-bold bg-white hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">chevron_left</span> Prev
              </button>
              ${pageBtns}
              <button type="button" onclick="goToCatalogPage(${filterState.page + 1})" ${filterState.page >= totalPages ? "disabled" : ""} class="px-3 h-8 rounded-lg border border-surface-container-high text-xs font-bold bg-white hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
                Next <span class="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        `;
      }
    }
  }

  // Filter mutators
  function setCategoryFilter(cat) {
    filterState.category = cat;
    filterState.subcategory = "";
    filterState.page = 1;
    renderCatalog();
  }

  function setGenderFilter(g) {
    filterState.gender = g;
    filterState.page = 1;
    renderCatalog();
  }

  function toggleBrandFilter(brand) {
    const idx = filterState.brands.indexOf(brand);
    if (idx > -1) filterState.brands.splice(idx, 1);
    else filterState.brands.push(brand);
    filterState.page = 1;
    renderCatalog();
  }

  function setPriceRangeFilter(rangeId) {
    filterState.priceRange = rangeId;
    filterState.minPrice = "";
    filterState.maxPrice = "";
    filterState.page = 1;
    renderCatalog();
  }

  function setCustomPriceFilter(minVal, maxVal) {
    if (minVal !== null) filterState.minPrice = minVal;
    if (maxVal !== null) filterState.maxPrice = maxVal;
    filterState.priceRange = filterState.minPrice || filterState.maxPrice ? "custom" : "All";
    filterState.page = 1;
    renderCatalog();
  }

  function setDiscountFilter(minDisc) {
    filterState.minDiscount = minDisc;
    filterState.page = 1;
    renderCatalog();
  }

  function setRatingFilter(minRat) {
    filterState.minRating = minRat;
    filterState.page = 1;
    renderCatalog();
  }

  function setBrandSearchFilter(val) {
    filterState.brandSearch = val;
    renderFilterSidebar();
  }

  function setCatalogSort(sortVal) {
    filterState.sort = sortVal;
    filterState.page = 1;
    renderCatalog();
  }

  function goToCatalogPage(p) {
    filterState.page = Math.max(1, p);
    renderCatalog();
    scrollToCatalog();
  }

  // Navigation / Existing Filter Entry Points
  function filterCategoryByNav(navKey) {
    closeMobileMenu();
    filterState.search = "";
    filterState.subcategory = "";
    filterState.brands = [];
    filterState.page = 1;
    if (searchInput) searchInput.value = "";

    if (navKey === "Men" || navKey === "Women") {
      filterState.gender = navKey;
      filterState.category = "All";
    } else if (navKey === "Kids") {
      filterState.category = "Kids";
      filterState.gender = "All";
    } else if (navKey === "Home") {
      filterState.category = "Home";
      filterState.gender = "All";
    } else if (navKey === "Beauty") {
      filterState.category = "Beauty";
      filterState.gender = "All";
    }
    setActiveNavTab(navKey);
    renderCatalog();
    scrollToCatalog();
    showToast(`Browsing ${navKey} Collection`);
  }

  function filterBySubcategory(subcategory, gender = null) {
    closeMobileMenu();
    filterState.search = "";
    filterState.brands = [];
    filterState.category = "All";
    filterState.gender = gender || "All";
    filterState.subcategory = subcategory;
    filterState.page = 1;
    if (searchInput) searchInput.value = "";

    if (gender === "Men" || gender === "Women") setActiveNavTab(gender);
    else if (subcategory === "Streetwear") setActiveNavTab("GenZ");

    renderCatalog();
    scrollToCatalog();
    showToast(`Showing ${gender ? gender + " " : ""}${subcategory}`);
  }

  function filterByBrand(brandName) {
    filterState.search = "";
    filterState.category = "All";
    filterState.subcategory = "";
    filterState.gender = "All";
    filterState.brands = [brandName.toUpperCase()];
    filterState.page = 1;
    if (searchInput) searchInput.value = "";
    setActiveNavTab("");
    renderCatalog();
    scrollToCatalog();
    showToast(`Showing ${brandName} styles`);
  }

  function filterByCategoryTile(categoryTitle) {
    filterState.search = "";
    filterState.subcategory = "";
    filterState.gender = "All";
    filterState.brands = [];
    filterState.category = categoryTitle;
    filterState.page = 1;
    if (searchInput) searchInput.value = "";
    setActiveNavTab(categoryTitle === "Kids" || categoryTitle === "Home" || categoryTitle === "Beauty" ? categoryTitle : "");
    renderCatalog();
    scrollToCatalog();
    showToast(`Showing ${categoryTitle} (${CATALOG.filter((p) => p.category === categoryTitle).length} styles)`);
  }

  function clearFilters() {
    filterState.category = "All";
    filterState.subcategory = "";
    filterState.gender = "All";
    filterState.brands = [];
    filterState.priceRange = "All";
    filterState.minPrice = "";
    filterState.maxPrice = "";
    filterState.minDiscount = 0;
    filterState.minRating = 0;
    filterState.search = "";
    filterState.brandSearch = "";
    filterState.page = 1;
    if (searchInput) searchInput.value = "";
    if (clearSearchBtn) clearSearchBtn.classList.add("hidden");
    if (searchDefault) searchDefault.classList.remove("hidden");
    if (searchLive) searchLive.classList.add("hidden");
    setActiveNavTab("");
    renderCatalog();
  }

  function goHome() {
    clearFilters();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function scrollToDeals() {
    const el = document.getElementById("omgDealsSection");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scrollToCatalog() {
    const el = document.getElementById("catalogSection");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openMobileFilterDrawer() {
    const el = document.getElementById("mobileFilterDrawer");
    if (el) el.classList.remove("hidden");
  }

  function closeMobileFilterDrawer() {
    const el = document.getElementById("mobileFilterDrawer");
    if (el) el.classList.add("hidden");
  }

  // ----------------------------------------------------
  // 7. SEARCH & LIVE AUTOCOMPLETE
  // ----------------------------------------------------
  const searchInput = document.getElementById("searchInput");
  const searchDropdown = document.getElementById("searchDropdown");
  const searchDefault = document.getElementById("searchDropdownDefault");
  const searchLive = document.getElementById("searchResultsLive");
  const clearSearchBtn = document.getElementById("clearSearchBtn");

  function initSearch() {
    if (!searchInput) return;

    searchInput.addEventListener("focus", () => {
      if (searchDropdown) searchDropdown.classList.remove("hidden");
    });

    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.trim();
      const qLow = query.toLowerCase();
      if (query.length > 0) {
        if (clearSearchBtn) clearSearchBtn.classList.remove("hidden");
        if (searchDefault) searchDefault.classList.add("hidden");
        if (searchLive) searchLive.classList.remove("hidden");

        const matches = CATALOG.filter(
          (p) =>
            p.brand.toLowerCase().includes(qLow) ||
            p.title.toLowerCase().includes(qLow) ||
            p.category.toLowerCase().includes(qLow) ||
            (p.subcategory && p.subcategory.toLowerCase().includes(qLow))
        );

        if (searchLive) {
          if (matches.length > 0) {
            const top = matches.slice(0, 8);
            searchLive.innerHTML =
              top
                .map(
                  (p) => `
                <div class="flex items-center gap-3 p-3 hover:bg-surface-container-low cursor-pointer transition-colors" onclick="openProductQuickView('${p.id}'); hideSearchDropdown();">
                  <img src="${p.image}" alt="${escapeHTML(p.title)}" class="w-10 h-12 object-cover rounded bg-surface-container-low"/>
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-bold text-on-surface truncate">${escapeHTML(p.brand)}</div>
                    <div class="text-xs text-on-surface-variant truncate">${escapeHTML(p.title)}</div>
                    <div class="text-xs font-extrabold text-primary">₹${p.price.toLocaleString("en-IN")} <span class="text-outline line-through text-[10px]">₹${p.originalPrice.toLocaleString("en-IN")}</span></div>
                  </div>
                  <span class="material-symbols-outlined text-outline text-sm">north_west</span>
                </div>`
                )
                .join("") +
              `<button type="button" class="w-full py-2.5 px-4 bg-primary-container text-primary text-xs font-extrabold hover:bg-primary hover:text-white transition-colors text-center" onclick="executeQuickSearch('${escapeAttr(query)}')">
                View all ${matches.length} results for "${escapeHTML(query)}"
              </button>`;
          } else {
            searchLive.innerHTML = `
              <div class="p-4 text-center text-xs text-on-surface-variant">
                No products found for "<strong class="text-on-surface">${escapeHTML(query)}</strong>"
                <div class="text-[11px] text-outline mt-1">Try searching for Kurtas, Sneakers, Sarees, Jewellery, or Mango</div>
              </div>`;
          }
        }
      } else {
        if (clearSearchBtn) clearSearchBtn.classList.add("hidden");
        if (searchDefault) searchDefault.classList.remove("hidden");
        if (searchLive) searchLive.classList.add("hidden");
      }
    });

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const q = searchInput.value.trim();
        if (q) executeQuickSearch(q);
        else clearSearch();
      } else if (e.key === "Escape") {
        hideSearchDropdown();
      }
    });
  }

  function clearSearch() {
    if (searchInput) searchInput.value = "";
    if (clearSearchBtn) clearSearchBtn.classList.add("hidden");
    if (searchDefault) searchDefault.classList.remove("hidden");
    if (searchLive) searchLive.classList.add("hidden");
    filterState.search = "";
    filterState.page = 1;
    renderCatalog();
  }

  function hideSearchDropdown() {
    if (searchDropdown) searchDropdown.classList.add("hidden");
  }

  function executeQuickSearch(keyword) {
    if (searchInput) searchInput.value = keyword;
    if (clearSearchBtn) clearSearchBtn.classList.remove("hidden");
    hideSearchDropdown();
    filterState.category = "All";
    filterState.subcategory = "";
    filterState.gender = "All";
    filterState.brands = [];
    filterState.search = keyword;
    filterState.page = 1;
    setActiveNavTab("");
    renderCatalog();
    scrollToCatalog();
  }

  // ----------------------------------------------------
  // 8. WISHLIST TOGGLE, DRAWER & DUPLICATE PREVENTION
  // ----------------------------------------------------
  function toggleWishlist(btnEl, productId, event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const index = wishlistItems.indexOf(productId);
    const icon = btnEl ? btnEl.querySelector(".material-symbols-outlined") : null;
    if (icon) {
      icon.classList.add("heart-pop");
      setTimeout(() => icon.classList.remove("heart-pop"), 300);
    }

    const prod = findProduct(productId);
    const title = prod ? prod.brand : "Item";

    if (index > -1) {
      wishlistItems.splice(index, 1);
      showToast(`Removed "${title}" from Wishlist`, "favorite_border");
    } else if (!wishlistItems.includes(productId)) {
      wishlistItems.push(productId);
      showToast(`Added "${title}" to Wishlist!`, "favorite");
    }
    saveState();
    updateModalWishlistState();
    renderWishlistDrawer();
  }

  function openWishlistDrawer() {
    renderWishlistDrawer();
    const drawer = document.getElementById("wishlistDrawer");
    if (drawer) drawer.classList.remove("hidden");
  }

  function closeWishlistDrawer() {
    const drawer = document.getElementById("wishlistDrawer");
    if (drawer) drawer.classList.add("hidden");
  }

  function showWishlistToast() {
    openWishlistDrawer();
  }

  function clearWishlist() {
    if (wishlistItems.length === 0) {
      showToast("Your wishlist is already empty.", "favorite_border");
      return;
    }
    wishlistItems = [];
    saveState();
    renderWishlistDrawer();
    updateModalWishlistState();
    showToast("Wishlist cleared!", "favorite_border");
  }

  function moveWishlistToBag(productId) {
    const p = findProduct(productId);
    if (!p) return;
    const size = (p.sizes && p.sizes[0]) || "M";
    const color = (p.colors && p.colors[0] && p.colors[0].name) || "Classic";
    const existing = cartItems.find((i) => i.id === productId && i.size === size && i.color === color);
    if (existing) existing.quantity += 1;
    else cartItems.push({ id: productId, size, color, quantity: 1 });

    wishlistItems = wishlistItems.filter((id) => id !== productId);
    saveState();
    renderWishlistDrawer();
    showToast(`Moved "${p.brand}" to your Bag!`, "shopping_bag");
  }

  function renderWishlistDrawer() {
    const listEl = document.getElementById("wishlistItemsList");
    if (!listEl) return;

    if (wishlistItems.length === 0) {
      listEl.innerHTML = `
        <div class="py-16 text-center text-on-surface-variant flex flex-col items-center justify-center">
          <span class="material-symbols-outlined text-5xl text-outline mb-2">favorite_border</span>
          <div class="font-bold text-base text-on-surface">Your wishlist is empty</div>
          <p class="text-xs text-outline mt-1 max-w-xs">Save items you love here so you can easily review them and move them to your bag anytime.</p>
          <button type="button" class="mt-4 px-6 py-2 bg-primary text-white text-xs font-bold rounded-lg uppercase tracking-wider" onclick="closeWishlistDrawer(); scrollToCatalog();">EXPLORE STYLES</button>
        </div>
      `;
      return;
    }

    listEl.innerHTML = wishlistItems
      .map((id) => {
        const prod = findProduct(id);
        if (!prod) return "";
        return `
        <div class="py-4 first:pt-0 flex gap-3 relative group">
          <img src="${prod.image}" alt="${escapeHTML(prod.title)}" class="w-20 h-24 object-cover rounded-lg bg-surface-container-low shrink-0 cursor-pointer" onclick="closeWishlistDrawer(); openProductQuickView('${prod.id}')"/>
          <div class="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <div class="flex justify-between items-start gap-2">
                <h4 class="text-xs font-bold text-on-surface truncate cursor-pointer hover:text-primary" onclick="closeWishlistDrawer(); openProductQuickView('${prod.id}')">${escapeHTML(prod.brand)}</h4>
                <button type="button" class="text-outline hover:text-error transition-colors" onclick="toggleWishlist(null, '${prod.id}', event)" title="Remove from Wishlist">
                  <span class="material-symbols-outlined text-base">close</span>
                </button>
              </div>
              <p class="text-xs text-on-surface-variant truncate">${escapeHTML(prod.title)}</p>
              <div class="mt-1 flex items-baseline gap-1.5">
                <span class="text-xs font-extrabold text-on-surface">₹${prod.price.toLocaleString("en-IN")}</span>
                <span class="text-[11px] text-outline line-through">₹${prod.originalPrice.toLocaleString("en-IN")}</span>
                <span class="text-[10px] text-primary font-bold">(${escapeHTML(prod.discount)})</span>
              </div>
            </div>
            <div class="mt-2 flex items-center gap-2">
              <button type="button" class="flex-1 py-1.5 bg-primary hover:bg-primary-dark text-white text-[11px] font-bold rounded uppercase tracking-wider transition-colors" onclick="moveWishlistToBag('${prod.id}')">MOVE TO BAG</button>
              <button type="button" class="px-2.5 py-1.5 border border-surface-container-high hover:border-primary text-xs font-bold rounded text-on-surface" onclick="closeWishlistDrawer(); openProductQuickView('${prod.id}')">View</button>
            </div>
          </div>
        </div>
      `;
      })
      .join("");
  }

  // ----------------------------------------------------
  // 9. PRODUCT DETAILS / QUICK VIEW MODAL
  // ----------------------------------------------------
  function openProductQuickView(productId) {
    const product = findProduct(productId);
    if (!product) return;
    activeQuickViewId = productId;

    document.getElementById("modalProductImage").src = product.image;
    document.getElementById("modalProductImage").alt = product.title;
    document.getElementById("modalProductBrand").textContent = product.brand;
    document.getElementById("modalProductTitle").textContent = product.title;
    document.getElementById("modalProductPrice").textContent = `₹${product.price.toLocaleString("en-IN")}`;
    document.getElementById("modalProductOriginal").textContent = `₹${product.originalPrice.toLocaleString("en-IN")}`;
    document.getElementById("modalProductDiscount").textContent = `(${product.discount})`;
    document.getElementById("modalProductBadge").textContent = product.badge || product.discount;

    const ratingEl = document.getElementById("modalProductRating");
    const reviewsEl = document.getElementById("modalProductReviews");
    const catEl = document.getElementById("modalProductCategory");
    const descEl = document.getElementById("modalProductDescription");
    if (ratingEl) ratingEl.textContent = product.rating;
    if (reviewsEl) reviewsEl.textContent = `| ${product.reviews}`;
    if (catEl) catEl.textContent = `${product.gender} • ${product.category} • ${product.subcategory}`;
    if (descEl) descEl.textContent = product.description || "";

    // Dynamic Sizes
    const sizes = product.sizes && product.sizes.length ? product.sizes : ["Onesize"];
    selectedSizeValue = sizes.includes("M") ? "M" : sizes[0];
    const sizeSelector = document.getElementById("sizeSelector");
    if (sizeSelector) {
      sizeSelector.innerHTML = sizes
        .map((s) => {
          const active = s === selectedSizeValue;
          const cls = active
            ? "size-btn min-w-[38px] px-2.5 h-9 rounded-full border border-primary bg-primary text-white text-xs font-bold shadow-sm transition-all"
            : "size-btn min-w-[38px] px-2.5 h-9 rounded-full border border-surface-container-high text-xs font-bold hover:border-primary transition-all";
          return `<button type="button" class="${cls}" onclick="selectSize(this, '${escapeAttr(s)}')">${escapeHTML(s)}</button>`;
        })
        .join("");
    }

    // Dynamic Color Variations
    const colors = product.colors && product.colors.length ? product.colors : [{ name: "Classic", hex: "#282c3f" }];
    selectedColorValue = colors[0].name;
    const colorWrap = document.getElementById("colorSelectorWrap");
    const colorLabel = document.getElementById("selectedColorName");
    const colorSelector = document.getElementById("colorSelector");
    if (colorLabel) colorLabel.textContent = selectedColorValue;
    if (colorSelector && colorWrap) {
      colorWrap.classList.remove("hidden");
      colorSelector.innerHTML = colors
        .map((c, idx) => {
          const active = idx === 0;
          return `
          <button type="button" onclick="selectColor(this, '${escapeAttr(c.name)}')" title="${escapeAttr(c.name)}" class="color-btn flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold transition-all ${
            active ? "border-primary bg-primary-container text-primary" : "border-surface-container-high text-on-surface-variant hover:border-primary"
          }">
            <span class="w-3 h-3 rounded-full border border-black/15 shrink-0" style="background-color: ${c.hex}"></span>
            <span>${escapeHTML(c.name)}</span>
          </button>`;
        })
        .join("");
    }

    const pinInput = document.getElementById("pincodeInput");
    if (pinInput) pinInput.value = savedPincode;

    updateModalWishlistState();
    document.getElementById("productModal").classList.remove("hidden");
  }

  function closeProductQuickView() {
    document.getElementById("productModal").classList.add("hidden");
    activeQuickViewId = null;
  }

  function selectSize(btnEl, size) {
    selectedSizeValue = size;
    document.querySelectorAll("#sizeSelector .size-btn").forEach((b) => {
      b.className = "size-btn min-w-[38px] px-2.5 h-9 rounded-full border border-surface-container-high text-xs font-bold hover:border-primary transition-all";
    });
    btnEl.className = "size-btn min-w-[38px] px-2.5 h-9 rounded-full border border-primary bg-primary text-white text-xs font-bold shadow-sm transition-all";
  }

  function selectColor(btnEl, colorName) {
    selectedColorValue = colorName;
    const colorLabel = document.getElementById("selectedColorName");
    if (colorLabel) colorLabel.textContent = colorName;
    document.querySelectorAll("#colorSelector .color-btn").forEach((b) => {
      b.classList.remove("border-primary", "bg-primary-container", "text-primary");
      b.classList.add("border-surface-container-high", "text-on-surface-variant");
    });
    btnEl.classList.remove("border-surface-container-high", "text-on-surface-variant");
    btnEl.classList.add("border-primary", "bg-primary-container", "text-primary");
  }

  function checkPincode() {
    const pin = document.getElementById("pincodeInput").value.trim();
    const feedback = document.getElementById("pincodeFeedback");
    if (pin.length === 6 && /^\d+$/.test(pin)) {
      savedPincode = pin;
      saveState();
      feedback.innerHTML = `<span class="material-symbols-outlined text-sm">local_shipping</span> Express Delivery by Tomorrow to ${pin}, FREE`;
      feedback.className = "text-xs text-success mt-1.5 flex items-center gap-1 font-medium";
    } else {
      feedback.textContent = "Please enter a valid 6-digit Indian PIN code.";
      feedback.className = "text-xs text-error mt-1.5 flex items-center gap-1 font-medium";
    }
  }

  function updateModalWishlistState() {
    const icon = document.getElementById("modalWishlistIcon");
    const text = document.getElementById("modalWishlistText");
    const btn = document.getElementById("modalWishlistBtn");
    if (!icon || !text || !btn || !activeQuickViewId) return;

    if (wishlistItems.includes(activeQuickViewId)) {
      icon.classList.add("text-primary", "fill");
      text.textContent = "WISHLISTED";
      btn.classList.add("border-primary", "text-primary");
    } else {
      icon.classList.remove("text-primary", "fill");
      text.textContent = "WISHLIST";
      btn.classList.remove("border-primary", "text-primary");
    }
  }

  function toggleModalWishlist() {
    if (!activeQuickViewId) return;
    toggleWishlist(null, activeQuickViewId, null);
  }

  function addToBagFromModal() {
    if (!activeQuickViewId) return;
    const product = findProduct(activeQuickViewId);
    if (!product) return;

    const existing = cartItems.find(
      (i) => i.id === activeQuickViewId && i.size === selectedSizeValue && i.color === selectedColorValue
    );
    if (existing) {
      existing.quantity += 1;
    } else {
      cartItems.push({
        id: activeQuickViewId,
        size: selectedSizeValue,
        color: selectedColorValue,
        quantity: 1,
      });
    }
    saveState();
    closeProductQuickView();
    showToast(`Added ${product.brand} (${selectedSizeValue}, ${selectedColorValue}) to Bag!`, "shopping_bag");
    openCartDrawer();
  }

  function quickAddToCart(productId, event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const product = findProduct(productId);
    if (!product) return;
    const sizes = product.sizes && product.sizes.length ? product.sizes : ["Onesize"];
    const size = sizes.includes("M") ? "M" : sizes[0];
    const color = (product.colors && product.colors[0] && product.colors[0].name) || "Classic";

    const existing = cartItems.find((i) => i.id === productId && i.size === size && i.color === color);
    if (existing) existing.quantity += 1;
    else cartItems.push({ id: productId, size, color, quantity: 1 });

    saveState();
    showToast(`Added ${product.brand} (${size}) to your Bag!`, "shopping_bag");
  }

  function viewSimilarFromModal() {
    if (!activeQuickViewId) return;
    const p = findProduct(activeQuickViewId);
    if (!p) return;
    closeProductQuickView();
    filterByCategoryTile(p.category);
  }

  function openSizeChartModal() {
    openInfoModal("sizechart");
  }

  // ----------------------------------------------------
  // 10. SHOPPING BAG SLIDE-OVER DRAWER
  // ----------------------------------------------------
  function openCartDrawer() {
    renderCartDrawerItems();
    document.getElementById("cartDrawer").classList.remove("hidden");
  }

  function closeCartDrawer() {
    document.getElementById("cartDrawer").classList.add("hidden");
  }

  function calculateCartTotals() {
    let totalMRP = 0;
    let totalSelling = 0;
    cartItems.forEach((item) => {
      const prod = findProduct(item.id);
      if (!prod) return;
      totalMRP += prod.originalPrice * item.quantity;
      totalSelling += prod.price * item.quantity;
    });
    const discountOnMRP = totalMRP - totalSelling;
    let couponDiscount = 0;
    let couponNote = "";

    if (cartItems.length > 0 && appliedCoupon) {
      if (appliedCoupon === "MYNTRA500") {
        if (totalSelling >= 1499) {
          couponDiscount = 500;
          couponNote = "Coupon MYNTRA500 applied! Saved ₹500";
        } else {
          couponNote = `Add ₹${(1499 - totalSelling).toLocaleString("en-IN")} more for MYNTRA500 (₹500 OFF)`;
        }
      } else if (appliedCoupon === "FESTIVE10") {
        couponDiscount = Math.min(750, Math.round(totalSelling * 0.1));
        couponNote = `Coupon FESTIVE10 applied! Saved ₹${couponDiscount}`;
      }
    }

    const afterCoupon = Math.max(0, totalSelling - couponDiscount);
    const deliveryFee = cartItems.length === 0 ? 0 : afterCoupon >= 499 ? 0 : 49;
    const finalPayable = afterCoupon + deliveryFee;

    return { totalMRP, totalSelling, discountOnMRP, couponDiscount, couponNote, deliveryFee, finalPayable };
  }

  function applyCouponCode(codeInput) {
    const code = (codeInput || document.getElementById("cartCouponInput")?.value || "").trim().toUpperCase();
    if (!code) {
      showToast("Enter a coupon code (try MYNTRA500 or FESTIVE10)", "info");
      return;
    }
    if (code === "MYNTRA500" || code === "FESTIVE10") {
      appliedCoupon = code;
      saveState();
      renderCartDrawerItems();
      showToast(`Coupon ${code} applied!`, "local_offer");
    } else {
      showToast("Invalid coupon. Try MYNTRA500 or FESTIVE10", "error");
    }
  }

  function removeCouponCode() {
    appliedCoupon = "";
    saveState();
    renderCartDrawerItems();
    showToast("Coupon removed");
  }

  function clearCart() {
    if (cartItems.length === 0) {
      showToast("Your bag is already empty!");
      return;
    }
    cartItems = [];
    saveState();
    renderCartDrawerItems();
    showToast("Shopping Bag cleared!", "delete_sweep");
  }

  function renderCartDrawerItems() {
    const listEl = document.getElementById("cartItemsList");
    const clearCartBtn = document.getElementById("clearCartBtn");
    const footerSummary = document.getElementById("cartFooterSummary");
    if (!listEl) return;

    if (clearCartBtn) {
      clearCartBtn.classList.toggle("hidden", cartItems.length === 0);
    }

    if (cartItems.length === 0) {
      listEl.innerHTML = `
        <div class="py-16 text-center text-on-surface-variant flex flex-col items-center justify-center">
          <span class="material-symbols-outlined text-5xl text-outline mb-2">shopping_bag</span>
          <div class="font-bold text-base text-on-surface">Your bag is empty!</div>
          <p class="text-xs text-outline mt-1 max-w-xs">There is nothing in your bag. Let's add some items from our collection or your wishlist.</p>
          <div class="mt-4 flex items-center gap-2">
            <button type="button" class="px-5 py-2 bg-primary text-white text-xs font-bold rounded-lg uppercase tracking-wider" onclick="closeCartDrawer(); scrollToCatalog();">START SHOPPING</button>
            <button type="button" class="px-4 py-2 border border-surface-container-high text-on-surface text-xs font-bold rounded-lg uppercase tracking-wider hover:border-primary" onclick="closeCartDrawer(); openWishlistDrawer();">VIEW WISHLIST</button>
          </div>
        </div>
      `;
      if (footerSummary) footerSummary.classList.add("opacity-60");
      document.getElementById("cartTotalMRP").textContent = "₹0";
      document.getElementById("cartTotalDiscount").textContent = "₹0";
      document.getElementById("cartCouponDiscountRow")?.classList.add("hidden");
      document.getElementById("cartDeliveryFee").textContent = "FREE";
      document.getElementById("cartFinalAmount").textContent = "₹0";
      const couponBanner = document.getElementById("cartCouponStatus");
      if (couponBanner) couponBanner.classList.add("hidden");
      return;
    }

    if (footerSummary) footerSummary.classList.remove("opacity-60");

    listEl.innerHTML = cartItems
      .map((item, index) => {
        const prod = findProduct(item.id);
        if (!prod) return "";
        return `
        <div class="pt-4 first:pt-0 flex gap-3 relative group">
          <div class="w-20 h-24 bg-surface-container-low rounded-lg overflow-hidden shrink-0 cursor-pointer" onclick="closeCartDrawer(); openProductQuickView('${prod.id}')">
            <img src="${prod.image}" alt="${escapeHTML(prod.title)}" class="w-full h-full object-cover"/>
          </div>
          <div class="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <div class="flex justify-between items-start gap-2">
                <h4 class="text-xs font-bold text-on-surface truncate">${escapeHTML(prod.brand)}</h4>
                <button type="button" class="text-outline hover:text-error transition-colors shrink-0" onclick="removeCartItem(${index})" title="Remove item" aria-label="Remove item">
                  <span class="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
              <p class="text-xs text-on-surface-variant truncate">${escapeHTML(prod.title)}</p>
              <div class="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                <span class="bg-surface-container px-2 py-0.5 rounded text-[11px] font-bold">Size: ${escapeHTML(item.size)}</span>
                <span class="bg-surface-container px-2 py-0.5 rounded text-[11px] font-medium">${escapeHTML(item.color || "Classic")}</span>
                <div class="flex items-center border border-surface-container-high rounded">
                  <button type="button" class="px-2 py-0.5 text-xs font-bold hover:bg-surface-container" onclick="updateItemQuantity(${index}, -1)" aria-label="Decrease quantity">-</button>
                  <span class="px-2 text-xs font-bold">${item.quantity}</span>
                  <button type="button" class="px-2 py-0.5 text-xs font-bold hover:bg-surface-container" onclick="updateItemQuantity(${index}, 1)" aria-label="Increase quantity">+</button>
                </div>
              </div>
            </div>
            <div class="flex items-baseline gap-2 mt-2">
              <span class="text-xs font-extrabold text-on-surface">₹${(prod.price * item.quantity).toLocaleString("en-IN")}</span>
              <span class="text-[11px] text-outline line-through">₹${(prod.originalPrice * item.quantity).toLocaleString("en-IN")}</span>
              <span class="text-[10px] text-primary font-bold">(${escapeHTML(prod.discount)})</span>
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    const totals = calculateCartTotals();
    document.getElementById("cartTotalMRP").textContent = `₹${totals.totalMRP.toLocaleString("en-IN")}`;
    document.getElementById("cartTotalDiscount").textContent = `-₹${totals.discountOnMRP.toLocaleString("en-IN")}`;

    const couponRow = document.getElementById("cartCouponDiscountRow");
    const couponVal = document.getElementById("cartCouponDiscountVal");
    if (couponRow && couponVal) {
      if (totals.couponDiscount > 0) {
        couponRow.classList.remove("hidden");
        couponVal.textContent = `-₹${totals.couponDiscount.toLocaleString("en-IN")}`;
      } else {
        couponRow.classList.add("hidden");
      }
    }

    const delivEl = document.getElementById("cartDeliveryFee");
    if (delivEl) {
      delivEl.textContent = totals.deliveryFee === 0 ? "FREE" : `₹${totals.deliveryFee}`;
      delivEl.className = totals.deliveryFee === 0 ? "text-success font-bold uppercase text-[10px]" : "font-bold text-on-surface";
    }

    document.getElementById("cartFinalAmount").textContent = `₹${totals.finalPayable.toLocaleString("en-IN")}`;

    const couponInput = document.getElementById("cartCouponInput");
    if (couponInput && appliedCoupon) couponInput.value = appliedCoupon;

    const couponBanner = document.getElementById("cartCouponStatus");
    const couponBannerText = document.getElementById("cartCouponStatusText");
    if (couponBanner && couponBannerText) {
      if (appliedCoupon && totals.couponNote) {
        couponBanner.classList.remove("hidden");
        couponBannerText.textContent = totals.couponNote;
      } else {
        couponBanner.classList.add("hidden");
      }
    }
  }

  function updateItemQuantity(index, delta) {
    if (!cartItems[index]) return;
    cartItems[index].quantity += delta;
    if (cartItems[index].quantity <= 0) {
      cartItems.splice(index, 1);
      showToast("Item removed from bag");
    }
    saveState();
    renderCartDrawerItems();
  }

  function removeCartItem(index) {
    if (!cartItems[index]) return;
    cartItems.splice(index, 1);
    saveState();
    renderCartDrawerItems();
    showToast("Item removed from bag");
  }

  function checkoutOrder() {
    if (cartItems.length === 0) {
      showToast("Your bag is empty!", "error");
      return;
    }
    const totals = calculateCartTotals();
    const orderId = "MYN-" + Math.floor(100000 + Math.random() * 900000);
    const itemsSnapshot = cartItems.map((it) => {
      const p = findProduct(it.id);
      return {
        id: it.id,
        brand: p.brand,
        title: p.title,
        image: p.image,
        size: it.size,
        color: it.color,
        quantity: it.quantity,
        price: p.price * it.quantity,
      };
    });

    const newOrder = {
      orderId,
      date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      items: itemsSnapshot,
      totalPaid: totals.finalPayable,
      status: "Confirmed & Ready to Ship",
      pincode: (currentUser && currentUser.pincode) || savedPincode,
      address: (currentUser && currentUser.address) || "Bengaluru, India",
    };

    orderHistory.unshift(newOrder);
    cartItems = [];
    appliedCoupon = "";
    saveState();
    closeCartDrawer();
    renderOrderConfirmationModal(newOrder);
  }

  function renderOrderConfirmationModal(order) {
    const content = `
      <div class="text-center py-2">
        <div class="w-16 h-16 bg-emerald-50 text-success rounded-full flex items-center justify-center mx-auto mb-3">
          <span class="material-symbols-outlined text-4xl">verified</span>
        </div>
        <h3 class="text-xl font-black text-on-surface font-display">Order Placed Successfully!</h3>
        <p class="text-xs text-on-surface-variant mt-1">Thank you for shopping with Myntra.</p>
        <div class="mt-4 bg-surface-container-low border border-surface-container-high rounded-xl p-4 text-left space-y-2 text-xs">
          <div class="flex justify-between"><span class="text-on-surface-variant">Order ID</span><strong class="text-on-surface">${order.orderId}</strong></div>
          <div class="flex justify-between"><span class="text-on-surface-variant">Items</span><strong>${order.items.reduce((a, b) => a + b.quantity, 0)} item(s)</strong></div>
          <div class="flex justify-between"><span class="text-on-surface-variant">Total Paid</span><strong class="text-primary">₹${order.totalPaid.toLocaleString("en-IN")}</strong></div>
          <div class="flex justify-between"><span class="text-on-surface-variant">Delivery PIN</span><strong>${escapeHTML(order.pincode)}</strong></div>
          <div class="flex justify-between"><span class="text-on-surface-variant">Status</span><strong class="text-success">${escapeHTML(order.status)}</strong></div>
        </div>
        <div class="mt-5 flex gap-3">
          <button type="button" onclick="closeGenericModal(); openOrdersModal();" class="flex-1 py-2.5 bg-primary text-white text-xs font-bold rounded-lg uppercase tracking-wider">Track Order</button>
          <button type="button" onclick="closeGenericModal();" class="flex-1 py-2.5 border border-surface-container-high text-on-surface text-xs font-bold rounded-lg uppercase tracking-wider">Continue Shopping</button>
        </div>
      </div>
    `;
    showGenericModal("Order Confirmation", content);
  }

  // ----------------------------------------------------
  // 11. AUTH (LOGIN & REGISTER), PROFILE & ORDERS
  // ----------------------------------------------------
  function toggleProfileDropdown(forceClose = false) {
    const card = document.getElementById("profileCard");
    if (!card) return;
    if (forceClose) {
      card.classList.add("hidden");
      card.classList.remove("!block");
      return;
    }
    const isHidden = card.classList.contains("hidden") && !card.classList.contains("!block");
    if (isHidden) {
      card.classList.remove("hidden");
      card.classList.add("!block");
    } else {
      card.classList.add("hidden");
      card.classList.remove("!block");
    }
  }

  function openLoginModal(tab = "login") {
    toggleProfileDropdown(true);
    switchAuthTab(tab);
    document.getElementById("loginModal").classList.remove("hidden");
  }

  function closeLoginModal() {
    document.getElementById("loginModal").classList.add("hidden");
  }

  function switchAuthTab(tab) {
    const loginTabBtn = document.getElementById("tabLoginBtn");
    const regTabBtn = document.getElementById("tabRegisterBtn");
    const loginForm = document.getElementById("loginFormArea");
    const regForm = document.getElementById("registerFormArea");
    if (!loginTabBtn || !regTabBtn || !loginForm || !regForm) return;

    if (tab === "register") {
      regTabBtn.className = "flex-1 py-2 text-xs font-extrabold border-b-2 border-primary text-primary";
      loginTabBtn.className = "flex-1 py-2 text-xs font-bold border-b-2 border-transparent text-on-surface-variant hover:text-on-surface";
      loginForm.classList.add("hidden");
      regForm.classList.remove("hidden");
    } else {
      loginTabBtn.className = "flex-1 py-2 text-xs font-extrabold border-b-2 border-primary text-primary";
      regTabBtn.className = "flex-1 py-2 text-xs font-bold border-b-2 border-transparent text-on-surface-variant hover:text-on-surface";
      regForm.classList.add("hidden");
      loginForm.classList.remove("hidden");
    }
  }

  function performDemoLogin() {
    const phone = document.getElementById("loginPhoneInput").value.trim();
    if (!/^\d{10}$/.test(phone)) {
      showToast("Please enter a valid 10-digit mobile number.", "error");
      return;
    }
    const existing = registeredAccounts.find((a) => a.phone === "+91 " + phone || a.phone === phone);
    currentUser = existing
      ? { ...existing }
      : {
          name: "Priya Sharma",
          phone: "+91 " + phone,
          email: "priya.sharma@example.com",
          address: "Embassy Tech Village, Outer Ring Road, Bengaluru",
          pincode: savedPincode,
        };
    saveState();
    closeLoginModal();
    showToast(`Welcome back, ${currentUser.name}! Logged in successfully.`, "account_circle");
  }

  function performRegister() {
    const name = document.getElementById("regNameInput").value.trim();
    const email = document.getElementById("regEmailInput").value.trim();
    const phone = document.getElementById("regPhoneInput").value.trim();
    const password = document.getElementById("regPasswordInput").value;

    if (name.length < 2) {
      showToast("Please enter your full name.", "error");
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      showToast("Please enter a valid email address.", "error");
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      showToast("Please enter a valid 10-digit mobile number.", "error");
      return;
    }
    if (password.length < 4) {
      showToast("Password must be at least 4 characters.", "error");
      return;
    }

    const newAcc = {
      name,
      email,
      phone: "+91 " + phone,
      address: "Bengaluru, India",
      pincode: savedPincode,
    };
    registeredAccounts = registeredAccounts.filter((a) => a.phone !== newAcc.phone);
    registeredAccounts.push(newAcc);
    currentUser = newAcc;
    saveState();
    closeLoginModal();
    showToast(`Account created! Welcome to Myntra, ${name}!`, "account_circle");
  }

  function performLogout() {
    currentUser = null;
    toggleProfileDropdown(true);
    saveState();
    showToast("You have been logged out.");
  }

  function openProfileModal() {
    toggleProfileDropdown(true);
    if (!currentUser) {
      openLoginModal("login");
      return;
    }
    const html = `
      <form onsubmit="saveProfileChanges(event)" class="space-y-3 text-xs">
        <div>
          <label class="font-bold text-on-surface block mb-1">Full Name</label>
          <input type="text" id="editProfileName" value="${escapeAttr(currentUser.name || "")}" required class="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low focus:border-primary focus:ring-0 outline-none"/>
        </div>
        <div>
          <label class="font-bold text-on-surface block mb-1">Email Address</label>
          <input type="email" id="editProfileEmail" value="${escapeAttr(currentUser.email || "")}" required class="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low focus:border-primary focus:ring-0 outline-none"/>
        </div>
        <div>
          <label class="font-bold text-on-surface block mb-1">Mobile Number</label>
          <input type="text" id="editProfilePhone" value="${escapeAttr(currentUser.phone || "")}" required class="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low focus:border-primary focus:ring-0 outline-none"/>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div class="col-span-2">
            <label class="font-bold text-on-surface block mb-1">Delivery Address</label>
            <input type="text" id="editProfileAddr" value="${escapeAttr(currentUser.address || "")}" class="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low focus:border-primary focus:ring-0 outline-none"/>
          </div>
          <div>
            <label class="font-bold text-on-surface block mb-1">Pincode</label>
            <input type="text" id="editProfilePin" maxlength="6" value="${escapeAttr(currentUser.pincode || savedPincode)}" class="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low focus:border-primary focus:ring-0 outline-none"/>
          </div>
        </div>
        <div class="pt-2 flex gap-2">
          <button type="submit" class="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg uppercase tracking-wider">Save Profile</button>
          <button type="button" onclick="performLogout(); closeGenericModal();" class="px-4 py-2.5 border border-error text-error font-bold rounded-lg uppercase tracking-wider hover:bg-rose-50">Log Out</button>
        </div>
      </form>
    `;
    showGenericModal("My Account & Profile", html);
  }

  function saveProfileChanges(e) {
    e.preventDefault();
    if (!currentUser) return;
    currentUser.name = document.getElementById("editProfileName").value.trim();
    currentUser.email = document.getElementById("editProfileEmail").value.trim();
    currentUser.phone = document.getElementById("editProfilePhone").value.trim();
    currentUser.address = document.getElementById("editProfileAddr").value.trim();
    currentUser.pincode = document.getElementById("editProfilePin").value.trim();
    if (/^\d{6}$/.test(currentUser.pincode)) savedPincode = currentUser.pincode;
    saveState();
    closeGenericModal();
    showToast("Profile updated successfully!");
  }

  function openOrdersModal() {
    toggleProfileDropdown(true);
    let body = "";
    if (orderHistory.length === 0) {
      body = `
        <div class="py-10 text-center">
          <span class="material-symbols-outlined text-5xl text-outline mb-2">local_shipping</span>
          <h4 class="font-bold text-sm text-on-surface">No orders placed yet</h4>
          <p class="text-xs text-on-surface-variant mt-1">Add styles to your shopping bag and place an order to track it here.</p>
          <button type="button" onclick="closeGenericModal(); scrollToCatalog();" class="mt-4 px-5 py-2 bg-primary text-white text-xs font-bold rounded-lg uppercase">Start Shopping</button>
        </div>
      `;
    } else {
      body = `<div class="space-y-4 max-h-[60vh] overflow-y-auto pr-1">` +
        orderHistory
          .map(
            (ord) => `
          <div class="border border-surface-container-high rounded-xl p-3.5 bg-surface-container-low/50 space-y-2.5">
            <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-surface-container">
              <div>
                <div class="text-xs font-extrabold text-on-surface">${escapeHTML(ord.orderId)}</div>
                <div class="text-[11px] text-on-surface-variant">Ordered on ${escapeHTML(ord.date)} • PIN ${escapeHTML(ord.pincode)}</div>
              </div>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-success">${escapeHTML(ord.status)}</span>
            </div>
            <div class="space-y-2">
              ${ord.items
                .map(
                  (it) => `
                <div class="flex items-center gap-3 text-xs">
                  <img src="${it.image}" alt="${escapeHTML(it.title)}" class="w-10 h-12 object-cover rounded"/>
                  <div class="flex-1 min-w-0">
                    <div class="font-bold truncate">${escapeHTML(it.brand)}</div>
                    <div class="text-on-surface-variant truncate">${escapeHTML(it.title)} (${escapeHTML(it.size)}, Qty: ${it.quantity})</div>
                  </div>
                  <div class="font-bold">₹${it.price.toLocaleString("en-IN")}</div>
                </div>`
                )
                .join("")}
            </div>
            <div class="pt-2 border-t border-surface-container flex justify-between text-xs font-extrabold">
              <span>Total Paid</span>
              <span class="text-primary">₹${ord.totalPaid.toLocaleString("en-IN")}</span>
            </div>
          </div>`
          )
          .join("") +
        `</div>`;
    }
    showGenericModal("My Orders & Tracking", body);
  }

  // ----------------------------------------------------
  // 12. STUDIO LOOKBOOK & GENERIC INFO / POLICY MODALS
  // ----------------------------------------------------
  function showGenericModal(title, bodyHTML) {
    const modal = document.getElementById("genericModal");
    const titleEl = document.getElementById("genericModalTitle");
    const bodyEl = document.getElementById("genericModalBody");
    if (!modal || !titleEl || !bodyEl) return;
    titleEl.textContent = title;
    bodyEl.innerHTML = bodyHTML;
    modal.classList.remove("hidden");
  }

  function closeGenericModal() {
    const modal = document.getElementById("genericModal");
    if (modal) modal.classList.add("hidden");
  }

  function openStudioModal() {
    closeMobileMenu();
    const looks = [
      { title: "Festive Glam Look", tag: "Wedding Season", ids: ["deal-1", "jew-1", "jew-5"] },
      { title: "Urban GenZ Streetwear", tag: "Trending Drops", ids: ["deal-6", "foot-1", "cas-1"] },
      { title: "Power Boardroom Edit", tag: "9-to-9 Chic", ids: ["deal-5", "deal-2", "foot-2"] },
      { title: "Weekend Brunch & Glow", tag: "Date & Beauty", ids: ["deal-4", "bea-d-1", "jew-3"] },
    ];
    const html = `
      <p class="text-xs text-on-surface-variant mb-4">Curated influencer lookbooks powered by Myntra Studio. Click any piece to view details or add straight to your bag.</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
        ${looks
          .map((lk) => {
            const prods = lk.ids.map((id) => findProduct(id)).filter(Boolean);
            return `
            <div class="border border-surface-container-high rounded-xl p-3 bg-surface-container-low/40">
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-xs font-black text-on-surface uppercase">${lk.title}</h4>
                <span class="text-[10px] bg-primary-container text-primary font-bold px-2 py-0.5 rounded-full">${lk.tag}</span>
              </div>
              <div class="space-y-2">
                ${prods
                  .map(
                    (p) => `
                  <div class="flex items-center gap-2.5 bg-white p-2 rounded-lg border border-surface-container cursor-pointer hover:border-primary" onclick="closeGenericModal(); openProductQuickView('${p.id}')">
                    <img src="${p.image}" alt="${escapeHTML(p.title)}" class="w-10 h-12 object-cover rounded"/>
                    <div class="flex-1 min-w-0">
                      <div class="text-[11px] font-bold truncate">${escapeHTML(p.brand)}</div>
                      <div class="text-[11px] text-on-surface-variant truncate">${escapeHTML(p.title)}</div>
                      <div class="text-[11px] font-extrabold text-primary">₹${p.price.toLocaleString("en-IN")}</div>
                    </div>
                    <span class="material-symbols-outlined text-sm text-outline">arrow_forward</span>
                  </div>`
                  )
                  .join("")}
              </div>
            </div>`;
          })
          .join("")}
      </div>
    `;
    showGenericModal("MYNTRA STUDIO • Shop The Look", html);
  }

  function copyCouponAndNotify(code) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    appliedCoupon = code;
    saveState();
    showToast(`Copied & activated coupon ${code}!`, "local_offer");
  }

  function openInfoModal(topic) {
    toggleProfileDropdown(true);
    closeMobileMenu();
    const map = {
      offers: {
        title: "Exclusive Bank & Coupon Offers",
        html: `
          <div class="space-y-3 text-xs">
            <div class="p-3.5 rounded-xl bg-rose-50 border border-primary/20 flex items-center justify-between gap-3">
              <div>
                <div class="font-black text-primary">FLAT ₹500 OFF — Code: MYNTRA500</div>
                <div class="text-on-surface-variant mt-0.5">Applicable on shopping bags ₹1,499 & above.</div>
              </div>
              <button type="button" onclick="copyCouponAndNotify('MYNTRA500')" class="px-3 py-1.5 bg-primary text-white font-bold rounded-lg shrink-0">APPLY</button>
            </div>
            <div class="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
              <div>
                <div class="font-black text-secondary">EXTRA 10% OFF — Code: FESTIVE10</div>
                <div class="text-on-surface-variant mt-0.5">Instant 10% savings up to ₹750 on all orders.</div>
              </div>
              <button type="button" onclick="copyCouponAndNotify('FESTIVE10')" class="px-3 py-1.5 bg-[#282c3f] text-white font-bold rounded-lg shrink-0">APPLY</button>
            </div>
            <div class="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high">
              <div class="font-bold text-on-surface">HDFC & ICICI Bank Instant Discount</div>
              <div class="text-on-surface-variant mt-0.5">10% instant discount on Credit Cards & EMI above ₹3,000.</div>
            </div>
          </div>`,
      },
      app: {
        title: "Get the Myntra Mobile App",
        html: `
          <div class="space-y-4 text-xs text-on-surface-variant">
            <p>Experience faster checkout, early access to Big Fashion Festival drops, and unlock <strong class="text-primary">₹500 OFF</strong> with code <strong>MYNTRA500</strong>.</p>
            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 rounded-xl border border-surface-container-high bg-surface-container-low text-center">
                <span class="material-symbols-outlined text-3xl text-primary">android</span>
                <div class="font-bold text-on-surface mt-1">Google Play</div>
                <div class="text-[11px] mt-0.5">4.6★ • 100M+ Downloads</div>
              </div>
              <div class="p-3 rounded-xl border border-surface-container-high bg-surface-container-low text-center">
                <span class="material-symbols-outlined text-3xl text-on-surface">phone_iphone</span>
                <div class="font-bold text-on-surface mt-1">Apple App Store</div>
                <div class="text-[11px] mt-0.5">4.8★ • Editor's Choice</div>
              </div>
            </div>
            <button type="button" onclick="copyCouponAndNotify('MYNTRA500'); closeGenericModal();" class="w-full py-2.5 bg-primary text-white font-bold rounded-lg uppercase tracking-wider">Activate App Code MYNTRA500</button>
          </div>`,
      },
      giftcards: {
        title: "Myntra Gift Cards",
        html: `
          <div class="space-y-3 text-xs">
            <p class="text-on-surface-variant">Send the gift of fashion for birthdays, weddings & festivals. Instant digital delivery.</p>
            <div class="grid grid-cols-3 gap-2">
              <button type="button" onclick="showToast('₹500 Gift Voucher code MYNGIFT500 copied!')" class="p-3 rounded-lg border border-surface-container-high hover:border-primary text-center font-extrabold text-on-surface">₹500</button>
              <button type="button" onclick="showToast('₹1,000 Gift Voucher code MYNGIFT1K copied!')" class="p-3 rounded-lg border border-primary bg-primary-container text-center font-extrabold text-primary">₹1,000</button>
              <button type="button" onclick="showToast('₹2,500 Gift Voucher code MYNGIFT2500 copied!')" class="p-3 rounded-lg border border-surface-container-high hover:border-primary text-center font-extrabold text-on-surface">₹2,500</button>
            </div>
            <div class="p-3 rounded-lg bg-surface-container-low border border-surface-container flex justify-between items-center">
              <span>Your Gift Card Wallet Balance</span>
              <strong class="text-on-surface">₹0.00</strong>
            </div>
          </div>`,
      },
      insider: {
        title: "Myntra Insider VIP",
        html: `
          <div class="space-y-3 text-xs">
            <div class="p-4 rounded-xl bg-gradient-to-r from-[#282c3f] to-rose-900 text-white">
              <div class="text-[10px] uppercase tracking-widest text-amber-300 font-bold">Insider Select Tier</div>
              <div class="text-lg font-black mt-1">150 SuperCoins Available</div>
              <div class="text-white/80 mt-0.5">Enjoy priority shipping & early festival access.</div>
            </div>
            <button type="button" onclick="copyCouponAndNotify('FESTIVE10'); closeGenericModal();" class="w-full py-2.5 bg-primary text-white font-bold rounded-lg uppercase">Claim 10% Insider Voucher (FESTIVE10)</button>
          </div>`,
      },
      contact: {
        title: "Contact Us & Help Center",
        html: `
          <div class="space-y-3 text-xs">
            <div class="p-3 rounded-lg bg-surface-container-low border border-surface-container">
              <div><strong>24/7 Helpline:</strong> 080-40011450</div>
              <div class="mt-1"><strong>Grievance Officer:</strong> grievance@myntra.com</div>
            </div>
            <form onsubmit="event.preventDefault(); showToast('Support ticket #MYN-4821 submitted! Our team will reply shortly.'); closeGenericModal();" class="space-y-2.5">
              <input type="text" required placeholder="Your Name" class="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-xs"/>
              <textarea required rows="3" placeholder="How can we help you today?" class="w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-low text-xs"></textarea>
              <button type="submit" class="w-full py-2.5 bg-primary text-white font-bold rounded-lg uppercase">Send Message</button>
            </form>
          </div>`,
      },
      faq: {
        title: "Frequently Asked Questions",
        html: `
          <div class="space-y-3 text-xs text-on-surface-variant">
            <div><strong class="text-on-surface block">How do I track my order?</strong>Click Profile → Orders anytime to check real-time dispatch & delivery status.</div>
            <div><strong class="text-on-surface block">What is the return policy?</strong>Enjoy hassle-free 14-day returns and instant size exchanges at your doorstep.</div>
            <div><strong class="text-on-surface block">Are all products authentic?</strong>100% of items are sourced directly from authorized brands with original tags.</div>
          </div>`,
      },
      shipping: {
        title: "Shipping & Delivery Policy",
        html: `
          <div class="space-y-2.5 text-xs text-on-surface-variant">
            <p><strong class="text-on-surface">FREE Shipping</strong> on all orders of ₹499 and above across 19,000+ Indian pincodes.</p>
            <p>Orders under ₹499 carry a nominal convenience fee of ₹49. Express next-day delivery is available in metro cities.</p>
          </div>`,
      },
      returns: {
        title: "14-Day Return & Exchange Policy",
        html: `
          <div class="space-y-2.5 text-xs text-on-surface-variant">
            <p><strong class="text-on-surface">Easy 14-Day Doorstep Returns:</strong> Return unworn items with original tags within 14 days of delivery.</p>
            <p>Instant refunds to original payment method or Myntra Credit upon pickup verification.</p>
          </div>`,
      },
      terms: {
        title: "Terms & Conditions",
        html: `<div class="space-y-2 text-xs text-on-surface-variant"><p>All prices displayed include applicable GST. Promotional coupons such as MYNTRA500 and FESTIVE10 are subject to minimum cart thresholds and valid for online purchases.</p></div>`,
      },
      privacy: {
        title: "Privacy Policy",
        html: `<div class="space-y-2 text-xs text-on-surface-variant"><p>We respect your privacy. Your wishlist, shopping bag, and profile preferences are stored securely in your browser's local storage with zero third-party tracking.</p></div>`,
      },
      authenticity: {
        title: "100% Original Guarantee",
        html: `<div class="space-y-2 text-xs text-on-surface-variant"><p>Every garment, sneaker, jewellery piece, and beauty item on Myntra is sourced directly from brand-authorized distributors with verifiable brand tags and warranty.</p></div>`,
      },
      sizechart: {
        title: "Standard Size Guide",
        html: `
          <div class="space-y-3 text-xs">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse border border-surface-container-high">
                <thead class="bg-surface-container">
                  <tr><th class="p-2 border border-surface-container-high">Size</th><th class="p-2 border border-surface-container-high">Chest (in)</th><th class="p-2 border border-surface-container-high">Waist (in)</th><th class="p-2 border border-surface-container-high">UK Shoe</th></tr>
                </thead>
                <tbody>
                  <tr><td class="p-2 border border-surface-container-high font-bold">S / UK 6</td><td class="p-2 border border-surface-container-high">36 - 38</td><td class="p-2 border border-surface-container-high">28 - 30</td><td class="p-2 border border-surface-container-high">25.0 cm</td></tr>
                  <tr><td class="p-2 border border-surface-container-high font-bold">M / UK 7</td><td class="p-2 border border-surface-container-high">38 - 40</td><td class="p-2 border border-surface-container-high">30 - 32</td><td class="p-2 border border-surface-container-high">25.8 cm</td></tr>
                  <tr><td class="p-2 border border-surface-container-high font-bold">L / UK 8</td><td class="p-2 border border-surface-container-high">40 - 42</td><td class="p-2 border border-surface-container-high">32 - 34</td><td class="p-2 border border-surface-container-high">26.7 cm</td></tr>
                  <tr><td class="p-2 border border-surface-container-high font-bold">XL / UK 9</td><td class="p-2 border border-surface-container-high">42 - 44</td><td class="p-2 border border-surface-container-high">34 - 36</td><td class="p-2 border border-surface-container-high">27.5 cm</td></tr>
                  <tr><td class="p-2 border border-surface-container-high font-bold">XXL / UK 10</td><td class="p-2 border border-surface-container-high">44 - 46</td><td class="p-2 border border-surface-container-high">36 - 38</td><td class="p-2 border border-surface-container-high">28.4 cm</td></tr>
                </tbody>
              </table>
            </div>
          </div>`,
      },
    };
    const info = map[topic] || map.faq;
    showGenericModal(info.title, info.html);
  }

  // ----------------------------------------------------
  // 13. MOBILE MENU DRAWER
  // ----------------------------------------------------
  function openMobileMenu() {
    const el = document.getElementById("mobileMenuDrawer");
    if (el) el.classList.remove("hidden");
  }

  function closeMobileMenu() {
    const el = document.getElementById("mobileMenuDrawer");
    if (el) el.classList.add("hidden");
  }

  // ----------------------------------------------------
  // 14. COUNTDOWN TIMER & ESCAPE/OUTSIDE-CLICK HANDLERS
  // ----------------------------------------------------
  let timerSeconds = 4 * 3600 + 22 * 60 + 15;
  function startFlashTimer() {
    const timerEl = document.getElementById("flashTimer");
    if (!timerEl) return;
    setInterval(() => {
      if (timerSeconds > 0) {
        timerSeconds--;
        const h = String(Math.floor(timerSeconds / 3600)).padStart(2, "0");
        const m = String(Math.floor((timerSeconds % 3600) / 60)).padStart(2, "0");
        const s = String(timerSeconds % 60).padStart(2, "0");
        timerEl.textContent = `ENDS IN ${h}h : ${m}m : ${s}s`;
      }
    }, 1000);
  }

  function escapeHTML(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(str) {
    return String(str || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;");
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#searchInput") && !e.target.closest("#searchDropdown")) {
      hideSearchDropdown();
    }
    if (!e.target.closest("#profileContainer")) {
      toggleProfileDropdown(true);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeProductQuickView();
      closeCartDrawer();
      closeWishlistDrawer();
      closeLoginModal();
      closeGenericModal();
      closeMobileMenu();
      closeMobileFilterDrawer();
      hideSearchDropdown();
    }
  });

  // Expose public globals for inline HTML handlers
  Object.assign(window, {
    showToast,
    goHome,
    scrollToDeals,
    scrollToCatalog,
    prevHeroSlide,
    nextHeroSlide,
    goToHeroSlide,
    filterCategoryByNav,
    filterBySubcategory,
    filterByBrand,
    filterByCategoryTile,
    clearFilters,
    setCategoryFilter,
    setGenderFilter,
    toggleBrandFilter,
    setPriceRangeFilter,
    setCustomPriceFilter,
    setDiscountFilter,
    setRatingFilter,
    setBrandSearchFilter,
    setCatalogSort,
    goToCatalogPage,
    removeFilterChip,
    openMobileFilterDrawer,
    closeMobileFilterDrawer,
    clearSearch,
    hideSearchDropdown,
    executeQuickSearch,
    toggleWishlist,
    openWishlistDrawer,
    closeWishlistDrawer,
    showWishlistToast,
    clearWishlist,
    moveWishlistToBag,
    openProductQuickView,
    closeProductQuickView,
    selectSize,
    selectColor,
    checkPincode,
    toggleModalWishlist,
    addToBagFromModal,
    quickAddToCart,
    viewSimilarFromModal,
    openSizeChartModal,
    openCartDrawer,
    closeCartDrawer,
    updateItemQuantity,
    removeCartItem,
    clearCart,
    applyCouponCode,
    removeCouponCode,
    checkoutOrder,
    toggleProfileDropdown,
    openLoginModal,
    closeLoginModal,
    switchAuthTab,
    performDemoLogin,
    performRegister,
    performLogout,
    openProfileModal,
    saveProfileChanges,
    openOrdersModal,
    openStudioModal,
    openInfoModal,
    showGenericModal,
    closeGenericModal,
    copyCouponAndNotify,
    openMobileMenu,
    closeMobileMenu,
  });

  document.addEventListener("DOMContentLoaded", () => {
    initHeroCarousel();
    initSearch();
    renderOMGDeals();
    renderCatalog();
    updateUIIndicators();
    startFlashTimer();
  });
})();
