"use strict";

const menuDataAvailable = Array.isArray(window.restaurantMenuItems);
const menuItems = menuDataAvailable ? window.restaurantMenuItems : [];

function createMenuCard(item) {
  if (!item.name || !item.description || !item.image || !Number.isSafeInteger(item.price) || item.price < 1) {
    throw new Error("A menu item is missing required content.");
  }

  const card = document.createElement("article");
  card.className = "menu-card";
  card.dataset.category = item.category;

  const imageWrap = document.createElement("div");
  imageWrap.className = "card-image-wrap";
  const image = document.createElement("img");
  image.src = item.image;
  image.alt = item.alt;
  image.loading = "lazy";
  imageWrap.append(image);

  const categoryTag = document.createElement("span");
  categoryTag.className = "category-tag";
  if (item.category === "veg" || item.category === "non-veg") {
    const marker = document.createElement("span");
    marker.className = item.category === "veg" ? "veg-mark" : "nonveg-mark";
    marker.setAttribute("aria-hidden", "true");
    categoryTag.append(marker, document.createTextNode(item.category === "veg" ? " Veg" : " Non-Veg"));
  } else {
    if (item.category === "desserts") categoryTag.classList.add("dessert-tag");
    categoryTag.textContent = item.category === "desserts" ? "Dessert" : "Drink";
  }
  imageWrap.append(categoryTag);

  const content = document.createElement("div");
  content.className = "card-content";
  const titleRow = document.createElement("div");
  titleRow.className = "card-title-row";
  const title = document.createElement("h3");
  title.textContent = item.name;
  const price = document.createElement("span");
  price.className = "price";
  price.textContent = formatCurrency(item.price);
  titleRow.append(title, price);

  const description = document.createElement("p");
  description.textContent = item.description;
  const addButton = document.createElement("button");
  addButton.className = "add-button";
  addButton.type = "button";
  addButton.dataset.item = item.name;
  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "+";
  addButton.append(icon, document.createTextNode(" Add to cart"));
  if (item.imageSource && item.imageCredit && item.imageLicense) {
    const credit = document.createElement("a");
    credit.className = "photo-credit";
    credit.href = item.imageSource;
    credit.target = "_blank";
    credit.rel = "noopener noreferrer";
    credit.textContent = `Photo: ${item.imageCredit} · ${item.imageLicense}`;
    credit.title = "View the original photo and its license";
    credit.addEventListener("click", (event) => event.stopPropagation());
    imageWrap.append(credit);
  }
  content.append(titleRow, description, addButton);
  card.append(imageWrap, content);
  return card;
}

const menuGrid = document.querySelector(".menu-grid");
if (menuGrid) {
  const pageCategory = document.body.dataset.menuCategory;
  const newCards = document.createDocumentFragment();
  menuItems
    .filter((item) => !pageCategory || item.category === pageCategory)
    .forEach((item) => newCards.append(createMenuCard(item)));
  menuGrid.append(newCards);
}

const filterButtons = document.querySelectorAll(".filter-button");
const menuCards = document.querySelectorAll(".menu-card");
const menuSearch = document.querySelector("#menu-search");
const menuEmpty = document.querySelector("#menu-empty");
const cartCount = document.querySelector(".cart-count");
const cartLink = document.querySelector(".cart-link");
const cartFeedback = document.querySelector("#cart-feedback");
const cartItemsContainer = document.querySelector("#cart-items");
const cartEmpty = document.querySelector("#cart-empty");
const cartSubtotal = document.querySelector("#cart-subtotal");
const checkoutForm = document.querySelector("#checkout-form");
const cartMessage = document.querySelector("#cart-message") || cartFeedback;
if (!menuDataAvailable) {
  console.error("The additional menu items could not be loaded.");
  showCartMessage("Some menu items could not load. Please reload the page.", true);
}
const navToggle = document.querySelector(".nav-toggle");
const primaryNavigation = document.querySelector("#primary-navigation");
const contactForm = document.querySelector("#contact-form");
const formFeedback = document.querySelector("#form-feedback");
const feedbackForm = document.querySelector("#feedback-form");
const feedbackMessage = document.querySelector("#feedback-message");
const feedbackOrderStatus = document.querySelector("#feedback-order-status");
const feedbackOrderDetails = document.querySelector("#feedback-order-details");
const trackingForm = document.querySelector("#tracking-form");
const trackingOrderInput = document.querySelector("#tracking-order-id");
const trackingMessage = document.querySelector("#tracking-message");
const trackingResult = document.querySelector("#tracking-result");
const trackingOrderNumber = document.querySelector("#tracking-order-number");
let activeMenuCategory = document.body.dataset.menuCategory || "all";
const cartStorageKey = "saffron-and-stone-cart";
const demoOrderStorageKey = "saffron-and-stone-demo-order";
const feedbackStorageKey = "saffron-and-stone-feedback";
let pendingCartAdd = null;

function createDishDetailsDialog() {
  const dialog = document.createElement("dialog");
  dialog.className = "dish-dialog";
  dialog.setAttribute("aria-labelledby", "dish-dialog-title");

  const closeButton = document.createElement("button");
  closeButton.className = "dish-dialog-close";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close dish details");
  closeButton.textContent = "×";

  const image = document.createElement("img");
  image.className = "dish-dialog-image";

  const content = document.createElement("div");
  content.className = "dish-dialog-content";
  const category = document.createElement("span");
  category.className = "dish-dialog-category";
  const title = document.createElement("h2");
  title.className = "dish-dialog-title";
  title.id = "dish-dialog-title";
  const price = document.createElement("p");
  price.className = "dish-dialog-price";
  const descriptionHeading = document.createElement("h3");
  descriptionHeading.className = "dish-dialog-description-heading";
  descriptionHeading.textContent = "About this dish";
  const description = document.createElement("p");
  description.className = "dish-dialog-description";
  content.append(category, title, price, descriptionHeading, description);
  dialog.append(closeButton, image, content);
  document.body.append(dialog);

  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      dialog.close();
    }
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  return { dialog, image, category, title, price, description };
}

function openDishDetails(card, details) {
  const image = card.querySelector(".card-image-wrap img");
  details.image.src = image.src;
  details.image.alt = image.alt;
  details.category.textContent = card.querySelector(".category-tag").textContent.trim();
  details.title.textContent = card.querySelector(".card-title-row h3").textContent.trim();
  details.price.textContent = card.querySelector(".price").textContent.trim();
  details.description.textContent = card.querySelector(".card-content > p").textContent.trim();
  details.dialog.showModal();
}

if (menuCards.length > 0) {
  const dishDetails = createDishDetailsDialog();
  menuCards.forEach((card) => {
    const imageWrap = card.querySelector(".card-image-wrap");
    const image = imageWrap.querySelector("img");
    const title = card.querySelector(".card-title-row h3").textContent.trim();
    const imageButton = document.createElement("button");
    imageButton.className = "dish-image-button";
    imageButton.type = "button";
    imageButton.setAttribute("aria-label", `Learn about ${title}`);
    const hint = document.createElement("span");
    hint.className = "dish-image-hint";
    hint.textContent = "Tap to learn about this dish";
    imageWrap.insertBefore(imageButton, image);
    imageButton.append(image, hint);

    imageButton.addEventListener("click", () => openDishDetails(card, dishDetails));
    card.addEventListener("click", (event) => {
      if (!(event.target instanceof Element) || event.target.closest("button, a, .menu-quantity-controls")) return;
      openDishDetails(card, dishDetails);
    });
  });
}

function showCartMessage(message, isError) {
  if (!cartMessage) return;
  cartMessage.textContent = message;
  cartMessage.classList.toggle("is-error", Boolean(isError));
}

function isValidCartItem(item) {
  return item &&
    typeof item.name === "string" &&
    item.name.trim().length > 0 &&
    item.name.length <= 100 &&
    Number.isSafeInteger(item.price) &&
    item.price > 0 &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0 &&
    item.quantity <= 99;
}

function loadCart() {
  let savedCart;
  try {
    savedCart = window.localStorage.getItem(cartStorageKey);
  } catch (error) {
    console.error("Could not read the saved cart.", error);
    showCartMessage("Cart storage is unavailable in this browser.", true);
    return [];
  }

  if (!savedCart) return [];

  let parsedCart;
  try {
    parsedCart = JSON.parse(savedCart);
  } catch (error) {
    console.error("The saved cart contains invalid data.", error);
    showCartMessage("The saved cart could not be read. Start a new cart.", true);
    return [];
  }

  if (!Array.isArray(parsedCart)) {
    console.error("The saved cart is not a list.");
    showCartMessage("The saved cart could not be read. Start a new cart.", true);
    return [];
  }

  const validItems = parsedCart.filter(isValidCartItem);
  if (validItems.length !== parsedCart.length) {
    console.error("Some invalid saved cart items were ignored.");
    showCartMessage("Some saved cart items were invalid and have been skipped.", true);
  }
  return validItems;
}

let cart = loadCart();

function saveCart() {
  try {
    window.localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    return true;
  } catch (error) {
    console.error("Could not save the cart.", error);
    showCartMessage("Your cart could not be saved in this browser.", true);
    return false;
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
}

function readDemoOrder() {
  const savedOrder = window.sessionStorage.getItem(demoOrderStorageKey);
  if (!savedOrder) return null;

  const order = JSON.parse(savedOrder);
  const paymentMethods = ["UPI (demo)", "Card (demo)", "Cash on pickup (demo)"];
  if (
    !order ||
    order.version !== 1 ||
    typeof order.orderId !== "string" ||
    !/^SS-[A-Z0-9]+-[A-Z0-9]{4}$/.test(order.orderId) ||
    !Number.isSafeInteger(order.itemCount) ||
    order.itemCount < 1 ||
    !Number.isSafeInteger(order.subtotal) ||
    order.subtotal < 0 ||
    !paymentMethods.includes(order.paymentMethod)
  ) {
    throw new Error("The saved demo order has an invalid format.");
  }
  return order;
}

function displayFeedbackOrder() {
  if (!feedbackOrderStatus) return;

  const itemCount = document.querySelector("#feedback-item-count");
  const orderNumber = document.querySelector("#feedback-order-number");
  const subtotal = document.querySelector("#feedback-subtotal");
  const paymentMethod = document.querySelector("#feedback-payment-method");
  try {
    const order = readDemoOrder();
    if (!order) {
      feedbackOrderStatus.textContent = "No recent demo order was found in this browser. You can still leave feedback.";
      return;
    }

    orderNumber.textContent = order.orderId;
    itemCount.textContent = `${order.itemCount} ${order.itemCount === 1 ? "item" : "items"}`;
    subtotal.textContent = formatCurrency(order.subtotal);
    paymentMethod.textContent = order.paymentMethod;
    feedbackOrderDetails.hidden = false;
    feedbackOrderStatus.textContent = "Your demo order is complete. No payment was processed.";
  } catch (error) {
    console.error("Could not load the demo order details.", error);
    feedbackOrderStatus.textContent = "Your demo checkout is complete, but its details are unavailable. No payment was processed. You can still leave feedback.";
  }
}

function displayTrackingOrder(order) {
  trackingOrderNumber.textContent = order.orderId;
  trackingResult.hidden = false;
  trackingMessage.classList.remove("is-error");
  trackingMessage.textContent = "Demo status only. This timeline does not update in real time.";
}

function findTrackingOrder(orderId) {
  const normalizedOrderId = orderId.trim().toUpperCase();
  if (!normalizedOrderId) {
    trackingResult.hidden = true;
    trackingMessage.textContent = "Enter your demo order ID to track it.";
    trackingMessage.classList.add("is-error");
    return;
  }

  try {
    const order = readDemoOrder();
    if (!order || normalizedOrderId !== order.orderId) {
      trackingResult.hidden = true;
      trackingMessage.textContent = "No matching demo order was found in this browser session.";
      trackingMessage.classList.add("is-error");
      return;
    }

    displayTrackingOrder(order);
  } catch (error) {
    console.error("Could not read the demo order for tracking.", error);
    trackingResult.hidden = true;
    trackingMessage.textContent = "Demo tracking details are unavailable in this browser session.";
    trackingMessage.classList.add("is-error");
  }
}

function cartItemCount() {
  return cart.reduce((total, item) => total + item.quantity, 0);
}

function decreaseCartItem(itemName) {
  const item = cart.find((cartItem) => cartItem.name === itemName);
  if (!item) return;

  item.quantity -= 1;
  cart = cart.filter((cartItem) => cartItem.quantity > 0);
  if (saveCart()) {
    showCartMessage(item.quantity === 0 ? `${itemName} removed from your cart.` : `${itemName} quantity decreased.`);
  }
  updateCart();
}

function createMenuQuantityControls(button) {
  const existingControls = button.closest(".menu-quantity-controls");
  if (existingControls) return existingControls;

  const controls = document.createElement("div");
  controls.className = "menu-quantity-controls";
  const decrease = document.createElement("button");
  decrease.className = "quantity-adjust";
  decrease.type = "button";
  decrease.dataset.item = button.dataset.item;
  decrease.setAttribute("aria-label", `Remove one ${button.dataset.item} from cart`);
  decrease.textContent = "−";
  decrease.addEventListener("click", () => decreaseCartItem(button.dataset.item));

  const status = document.createElement("span");
  status.className = "menu-quantity-status";

  button.parentElement.insertBefore(controls, button);
  controls.append(decrease, status, button);
  return controls;
}

function updateCart() {
  document.querySelectorAll(".add-button").forEach((button) => {
    const item = cart.find((cartItem) => cartItem.name === button.dataset.item);
    const controls = createMenuQuantityControls(button);
    const icon = button.querySelector("span");
    const decrease = controls.querySelector(".quantity-adjust");
    const status = controls.querySelector(".menu-quantity-status");

    decrease.disabled = !item;
    status.textContent = item ? `${item.quantity} in cart` : "Not added";
    status.classList.toggle("is-added", Boolean(item));
    button.classList.toggle("is-added", Boolean(item));
    button.setAttribute(
      "aria-label",
      item
        ? `Add another ${item.name} to cart. ${item.quantity} already in cart.`
        : `Add ${button.dataset.item} to cart.`
    );
    icon.textContent = "+";
    button.lastChild.textContent = item ? " Add more" : " Add to cart";
  });

  const count = cartItemCount();
  if (cartCount) cartCount.textContent = String(count);
  if (cartLink) cartLink.setAttribute("aria-label", `Cart, ${count} ${count === 1 ? "item" : "items"}`);

  if (!cartItemsContainer) return;

  cartItemsContainer.replaceChildren();
  cart.forEach((item) => {
    const row = document.createElement("li");
    row.className = "cart-item";

    const info = document.createElement("div");
    info.className = "cart-item-info";
    const name = document.createElement("h4");
    name.textContent = item.name;
    const unitPrice = document.createElement("p");
    unitPrice.textContent = `${formatCurrency(item.price)} each`;
    info.append(name, unitPrice);

    const controls = document.createElement("div");
    controls.className = "cart-item-controls";
    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.dataset.cartAction = "decrease";
    decrease.dataset.item = item.name;
    decrease.setAttribute("aria-label", `Remove one ${item.name}`);
    decrease.textContent = "−";
    const quantity = document.createElement("span");
    quantity.className = "cart-item-quantity";
    quantity.textContent = String(item.quantity);
    const increase = document.createElement("button");
    increase.type = "button";
    increase.dataset.cartAction = "increase";
    increase.dataset.item = item.name;
    increase.setAttribute("aria-label", `Add one ${item.name}`);
    increase.textContent = "+";
    controls.append(decrease, quantity, increase);

    const total = document.createElement("span");
    total.className = "cart-item-total";
    total.textContent = formatCurrency(item.price * item.quantity);
    row.append(info, controls, total);
    cartItemsContainer.append(row);
  });

  if (cartEmpty) cartEmpty.hidden = cart.length > 0;
  if (checkoutForm) checkoutForm.hidden = cart.length === 0;
  if (cartSubtotal) {
    cartSubtotal.textContent = formatCurrency(cart.reduce((total, item) => total + item.price * item.quantity, 0));
  }
}

updateCart();
displayFeedbackOrder();

function applyMenuFilters() {
  const query = menuSearch ? menuSearch.value.trim().toLowerCase() : "";
  let visibleCount = 0;
  menuCards.forEach((card) => {
    const name = card.querySelector(".card-title-row h3").textContent.toLowerCase();
    const description = card.querySelector(".card-content > p").textContent.toLowerCase();
    const matchesCategory = activeMenuCategory === "all" || card.dataset.category === activeMenuCategory;
    const matchesQuery = !query || name.includes(query) || description.includes(query);
    card.hidden = !matchesCategory || !matchesQuery;
    if (!card.hidden) visibleCount += 1;
  });
  if (menuEmpty) menuEmpty.hidden = visibleCount > 0;
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeMenuCategory = button.dataset.filter;
    filterButtons.forEach((filter) => {
      const selected = filter === button;
      filter.classList.toggle("is-active", selected);
      filter.setAttribute("aria-pressed", String(selected));
    });
    applyMenuFilters();
  });
});

if (menuSearch) menuSearch.addEventListener("input", applyMenuFilters);
applyMenuFilters();

document.querySelectorAll(".add-button").forEach((button) => {
  button.addEventListener("click", async () => {
    try {
      const response = await fetch("/api/auth/status", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(`Could not verify sign-in status (${response.status}).`);
      const status = await response.json();
      if (!status.authenticated) {
        if (!accountDialog) {
          showCartMessage("Please sign in before adding items to your cart.", true);
          return;
        }
        pendingCartAdd = button;
        const message = accountDialog.querySelector(".account-form-message");
        message.textContent = "Please sign in to add items to your cart.";
        if (!accountDialog.open) accountDialog.showModal();
        return;
      }

      addMenuItemToCart(button);
    } catch (error) {
      console.error("Could not verify sign-in before adding to cart.", error);
      showCartMessage("We could not verify your sign-in. Please try again.", true);
    }
  });
});

function addMenuItemToCart(button) {
  const card = button.closest(".menu-card");
  const itemName = button.dataset.item;
  const priceText = card.querySelector(".price").textContent;
  const price = Number(priceText.replace(/[^\d]/g, ""));
  if (!Number.isSafeInteger(price) || price < 1) {
    console.error(`Invalid menu price for ${itemName}.`);
    showCartMessage("This item has an invalid price and could not be added.", true);
    return;
  }

  const existingItem = cart.find((item) => item.name === itemName);
  if (existingItem) {
    if (existingItem.quantity >= 99) {
      showCartMessage("You can add up to 99 of each item.", true);
      return;
    }
    existingItem.quantity += 1;
  } else {
    cart.push({ name: itemName, price, quantity: 1 });
  }

  if (saveCart()) showCartMessage(`${itemName} added to your cart.`);
  updateCart();
}

if (cartItemsContainer) {
  cartItemsContainer.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest("button[data-cart-action]");
    if (!button) return;

    const item = cart.find((cartItem) => cartItem.name === button.dataset.item);
    if (!item) {
      showCartMessage("That item is no longer in your cart. Refresh the page and try again.", true);
      return;
    }

    if (button.dataset.cartAction === "increase") {
      if (item.quantity >= 99) {
        showCartMessage("You can add up to 99 of each item.", true);
        return;
      }
      item.quantity += 1;
    } else if (button.dataset.cartAction === "decrease") {
      item.quantity -= 1;
      if (item.quantity === 0) cart = cart.filter((cartItem) => cartItem !== item);
    } else {
      return;
    }

    if (saveCart()) showCartMessage("");
    updateCart();
  });
}

if (checkoutForm) {
  checkoutForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (cart.length === 0) {
      showCartMessage("Add an item before placing an order.", true);
      return;
    }

    const total = cart.reduce((amount, item) => amount + item.price * item.quantity, 0);
    const count = cartItemCount();
    const method = new FormData(checkoutForm).get("payment_method");
    if (typeof method !== "string") {
      showCartMessage("Choose a payment method before placing your order.", true);
      return;
    }
    const randomSuffix = Math.floor(Math.random() * (36 ** 4)).toString(36).padStart(4, "0").toUpperCase();
    const orderId = `SS-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
    const previousCart = cart;
    cart = [];
    if (!saveCart()) {
      cart = previousCart;
      updateCart();
      return;
    }

    checkoutForm.reset();
    updateCart();
    try {
      window.sessionStorage.setItem(demoOrderStorageKey, JSON.stringify({
        version: 1,
        orderId,
        itemCount: count,
        subtotal: total,
        paymentMethod: method
      }));
    } catch (error) {
      console.error("Could not save the demo order details.", error);
    }
    window.location.href = "tracking.html";
  });
}

if (feedbackForm) {
  feedbackForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(feedbackForm);
    const rating = Number(formData.get("rating"));
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      feedbackMessage.textContent = "Please choose a star rating before sending your feedback.";
      feedbackMessage.classList.add("is-error");
      feedbackForm.elements.rating[0].focus();
      return;
    }

    let savedFeedback;
    try {
      const previousFeedback = window.localStorage.getItem(feedbackStorageKey);
      savedFeedback = previousFeedback ? JSON.parse(previousFeedback) : [];
      if (!Array.isArray(savedFeedback)) {
        throw new Error("Saved feedback is not a list.");
      }
      savedFeedback.push({
        rating,
        comments: String(formData.get("comments") || "").trim(),
        submittedAt: new Date().toISOString()
      });
      window.localStorage.setItem(feedbackStorageKey, JSON.stringify(savedFeedback));
    } catch (error) {
      console.error("Could not save feedback in this browser.", error);
      feedbackMessage.textContent = "Your feedback could not be saved in this browser. Please try again.";
      feedbackMessage.classList.add("is-error");
      return;
    }

    feedbackForm.reset();
    feedbackForm.hidden = true;
    feedbackMessage.classList.remove("is-error");
    feedbackMessage.textContent = "Thank you! Your feedback was saved on this device only; it was not sent to the restaurant.";
  });
}

if (trackingForm) {
  try {
    const order = readDemoOrder();
    if (order) {
      trackingOrderInput.value = order.orderId;
      displayTrackingOrder(order);
    }
  } catch (error) {
    console.error("Could not load the demo tracking details.", error);
    trackingMessage.textContent = "Demo tracking details are unavailable in this browser session.";
    trackingMessage.classList.add("is-error");
  }

  trackingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    findTrackingOrder(trackingOrderInput.value);
  });
}

function closeNavigation() {
  navToggle.setAttribute("aria-expanded", "false");
  navToggle.setAttribute("aria-label", "Open navigation");
  primaryNavigation.classList.remove("is-open");
}

navToggle.addEventListener("click", () => {
  const isExpanded = navToggle.getAttribute("aria-expanded") === "true";
  navToggle.setAttribute("aria-expanded", String(!isExpanded));
  navToggle.setAttribute("aria-label", isExpanded ? "Open navigation" : "Close navigation");
  primaryNavigation.classList.toggle("is-open", !isExpanded);
});

primaryNavigation.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeNavigation);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navToggle.getAttribute("aria-expanded") === "true") {
    closeNavigation();
    navToggle.focus();
  }
});

const validationRules = {
  name: (value) => value.trim() ? "" : "Please enter your name.",
  email: (value, input) => {
    if (!value.trim()) return "Please enter your email address.";
    return input.validity.valid ? "" : "Please enter a valid email address.";
  },
  message: (value) => value.trim() ? "" : "Please add a message."
};

function showFieldError(input, message) {
  const error = document.querySelector(`#${input.id}-error`);
  error.textContent = message;
  input.setAttribute("aria-invalid", message ? "true" : "false");
}

if (contactForm) {
  Object.keys(validationRules).forEach((fieldName) => {
    const input = contactForm.elements[fieldName];
    input.addEventListener("blur", () => {
      showFieldError(input, validationRules[fieldName](input.value, input));
    });
    input.addEventListener("input", () => {
      if (input.getAttribute("aria-invalid") === "true") {
        showFieldError(input, validationRules[fieldName](input.value, input));
      }
    });
  });

  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    formFeedback.textContent = "";
    formFeedback.classList.remove("is-error");

    let firstInvalidField = null;
    Object.keys(validationRules).forEach((fieldName) => {
      const input = contactForm.elements[fieldName];
      const error = validationRules[fieldName](input.value, input);
      showFieldError(input, error);
      if (error && !firstInvalidField) firstInvalidField = input;
    });

    if (firstInvalidField) {
      formFeedback.textContent = "Please check the highlighted fields and try again.";
      formFeedback.classList.add("is-error");
      firstInvalidField.focus();
      return;
    }

    contactForm.reset();
    formFeedback.textContent = "Thanks! Your message passed validation. This demo doesn't send messages yet.";
    Object.keys(validationRules).forEach((fieldName) => {
      showFieldError(contactForm.elements[fieldName], "");
    });
  });
}

const signInLink = document.querySelector("#signin-link");
const authStatus = document.querySelector("#auth-status");
const authName = document.querySelector("#auth-name");
const authMessage = document.querySelector("#auth-message");
const signOutButton = document.querySelector("#signout-button");

function showAuthMessage(message) {
  if (!authMessage) return;
  authMessage.textContent = message;
  authMessage.hidden = false;
}

async function updateAuthStatus() {
  if (!signInLink || !authStatus || !authName) return;

  try {
    const response = await fetch("/api/auth/status", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error(`Could not check sign-in status (${response.status}).`);
    const status = await response.json();
    signInLink.disabled = false;
    signInLink.textContent = "Sign in";

    if (status.authenticated && status.user) {
      authName.textContent = status.user.name || status.user.email || "Signed-in user";
      authStatus.hidden = false;
      signInLink.hidden = true;
    } else {
      authStatus.hidden = true;
      signInLink.hidden = false;
    }

    if (authMessage && !authParams.get("signin")) authMessage.hidden = true;
    return status.authenticated ? status.user : null;
  } catch (error) {
    console.error("Could not check sign-in status.", error);
    showAuthMessage("Sign-in status is unavailable.");
    return null;
  }
}

function createAccountDialog() {
  const dialog = document.createElement("dialog");
  dialog.className = "account-dialog";
  dialog.setAttribute("aria-labelledby", "account-dialog-title");

  dialog.innerHTML = `
    <button class="account-dialog-close" type="button" aria-label="Close sign-in">×</button>
    <div class="account-dialog-heading">
      <p class="eyebrow"><span class="eyebrow-line"></span> Account</p>
      <h2 id="account-dialog-title">Sign in.</h2>
    </div>
    <div class="account-mode" role="group" aria-label="Choose account action">
      <button type="button" class="account-mode-button is-active" data-mode="login" aria-pressed="true">Sign in</button>
      <button type="button" class="account-mode-button" data-mode="register" aria-pressed="false">Create account</button>
    </div>
    <form class="account-form" novalidate>
      <div class="account-name-field" hidden>
        <label for="account-name">Name</label>
        <input id="account-name" name="name" type="text" autocomplete="name" maxlength="80">
      </div>
      <div>
        <label for="account-email">Email</label>
        <input id="account-email" name="email" type="email" autocomplete="email" required>
      </div>
      <div>
        <label for="account-password">Password</label>
        <input id="account-password" name="password" type="password" autocomplete="current-password" minlength="8" maxlength="128" required>
      </div>
      <p class="account-form-message" role="alert"></p>
      <button class="button button-primary account-submit" type="submit">Sign in</button>
    </form>
  `;

  document.body.append(dialog);

  const closeButton = dialog.querySelector(".account-dialog-close");
  const modeButtons = dialog.querySelectorAll(".account-mode-button");
  const form = dialog.querySelector(".account-form");
  const nameField = dialog.querySelector(".account-name-field");
  const nameInput = dialog.querySelector("#account-name");
  const emailInput = dialog.querySelector("#account-email");
  const passwordInput = dialog.querySelector("#account-password");
  const submitButton = dialog.querySelector(".account-submit");
  const message = dialog.querySelector(".account-form-message");
  let mode = "login";

  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    pendingCartAdd = null;
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      mode = button.dataset.mode;
      modeButtons.forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      nameField.hidden = mode !== "register";
      nameInput.required = mode === "register";
      passwordInput.autocomplete = mode === "register" ? "new-password" : "current-password";
      submitButton.textContent = mode === "register" ? "Create account" : "Sign in";
      dialog.querySelector("#account-dialog-title").textContent = mode === "register" ? "Create your account." : "Welcome back.";
      message.textContent = "";
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";

    if (!form.checkValidity()) {
      message.textContent = mode === "register"
        ? "Enter your name, a valid email address, and a password of at least 8 characters."
        : "Enter a valid email address and your password.";
      form.reportValidity();
      return;
    }

    submitButton.disabled = true;
    modeButtons.forEach((button) => { button.disabled = true; });
    submitButton.textContent = mode === "register" ? "Creating account…" : "Signing in…";

    try {
      const response = await fetch(mode === "register" ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify({
          name: nameInput.value,
          email: emailInput.value,
          password: passwordInput.value
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Sign-in failed.");

      const queuedAdd = pendingCartAdd;
      pendingCartAdd = null;
      dialog.close();
      const user = await updateAuthStatus();
      if (queuedAdd && user) addMenuItemToCart(queuedAdd);
      showAuthMessage(mode === "register" ? "Account created." : "Signed in successfully.");
      form.reset();
    } catch (error) {
      message.textContent = error.message;
    } finally {
      submitButton.disabled = false;
      modeButtons.forEach((button) => { button.disabled = false; });
      submitButton.textContent = mode === "register" ? "Create account" : "Sign in";
    }
  });

  return dialog;
}

const accountDialog = signInLink ? createAccountDialog() : null;

if (signInLink && accountDialog) {
  signInLink.addEventListener("click", () => accountDialog.showModal());
}

if (signOutButton) {
  signOutButton.addEventListener("click", async () => {
    signOutButton.disabled = true;
    try {
      const response = await fetch("/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-Requested-With": "XMLHttpRequest" }
      });
      if (!response.ok) throw new Error(`Logout failed with status ${response.status}`);
      await updateAuthStatus();
    } catch (error) {
      console.error("Could not sign out.", error);
      showAuthMessage("Sign-out failed. Please try again.");
    } finally {
      signOutButton.disabled = false;
    }
  });
}

const authParams = new URLSearchParams(window.location.search);
if (authParams.get("signin") === "success") {
  showAuthMessage("Signed in successfully.");
} else if (authParams.get("signin") === "failed") {
  showAuthMessage("Google sign-in failed. Please try again.");
}

updateAuthStatus();

document.querySelector("#current-year").textContent = String(new Date().getFullYear());
