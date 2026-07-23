// Anava Importados — renderização do catálogo e filtros

// Gera o slug usado como nome do arquivo de imagem: img/products/<slug>.jpg
function slugify(brand, name) {
  return (brand + " " + name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[%+&:().,'’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CATALOG = PRODUCTS.map(function (p, i) {
  return {
    id: i,
    brand: p[0],
    line: p[1],
    cat: p[2],
    name: p[3],
    slug: slugify(p[0], p[3]),
  };
});

const params = new URLSearchParams(window.location.search);
const state = {
  brand: params.get("brand") || "todas",
  cat: params.get("cat") || "todas",
  q: "",
};

function uniqueSorted(list) {
  return Array.from(new Set(list)).sort(function (a, b) {
    return a.localeCompare(b, "pt-BR");
  });
}

function buildControls() {
  const brandSel = document.getElementById("filter-brand");
  if (!brandSel) return;

  uniqueSorted(CATALOG.map(function (p) { return p.brand; })).forEach(function (b) {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    brandSel.appendChild(opt);
  });
  brandSel.value = state.brand;
  if (brandSel.value !== state.brand) { state.brand = "todas"; brandSel.value = "todas"; }

  brandSel.addEventListener("change", function () {
    state.brand = brandSel.value;
    render();
  });

  const search = document.getElementById("filter-search");
  search.addEventListener("input", function () {
    state.q = search.value.trim().toLowerCase();
    render();
  });

  const chipRow = document.getElementById("chip-row");
  const cats = ["todas"].concat(uniqueSorted(CATALOG.map(function (p) { return p.cat; })));
  if (cats.indexOf(state.cat) === -1) state.cat = "todas";
  cats.forEach(function (c) {
    const chip = document.createElement("button");
    chip.className = "chip" + (c === state.cat ? " active" : "");
    chip.textContent = c === "todas" ? "Todas" : c;
    chip.dataset.cat = c;
    chip.addEventListener("click", function () {
      state.cat = c;
      chipRow.querySelectorAll(".chip").forEach(function (el) { el.classList.remove("active"); });
      chip.classList.add("active");
      render();
    });
    chipRow.appendChild(chip);
  });
}

function matches(p) {
  if (state.brand !== "todas" && p.brand !== state.brand) return false;
  if (state.cat !== "todas" && p.cat !== state.cat) return false;
  if (state.q) {
    const hay = (p.brand + " " + p.line + " " + p.name + " " + p.cat).toLowerCase();
    if (hay.indexOf(state.q) === -1) return false;
  }
  return true;
}

// ---------- Sacola (carrinho) ----------
const WHATSAPP = "5511965252427";
const CART_KEY = "anava_cart";

function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; }
  catch (e) { return {}; }
}

let cart = loadCart();

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function cartCount() {
  return Object.keys(cart).reduce(function (n, s) { return n + cart[s].qty; }, 0);
}

function setQty(p, qty) {
  if (qty <= 0) delete cart[p.slug];
  else cart[p.slug] = { qty: qty, name: p.name, brand: p.brand };
  saveCart();
  updateCardControls(p);
  renderCartUI();
}

function qtyOf(slug) {
  return cart[slug] ? cart[slug].qty : 0;
}

// Atualiza o rodapé de um card específico (botão Adicionar <-> seletor de quantidade)
function updateCardControls(p) {
  document.querySelectorAll('[data-slug="' + p.slug + '"]').forEach(function (box) {
    buildCardControls(box, p);
  });
}

function buildCardControls(box, p) {
  box.innerHTML = "";
  const qty = qtyOf(p.slug);
  if (!qty) {
    const add = document.createElement("button");
    add.className = "add-btn";
    add.textContent = "Adicionar à sacola";
    add.addEventListener("click", function () { setQty(p, 1); });
    box.appendChild(add);
  } else {
    const stepper = document.createElement("div");
    stepper.className = "qty-stepper";

    const minus = document.createElement("button");
    minus.textContent = "−";
    minus.setAttribute("aria-label", "Diminuir quantidade");
    minus.addEventListener("click", function () { setQty(p, qtyOf(p.slug) - 1); });

    const num = document.createElement("span");
    num.textContent = qty;

    const plus = document.createElement("button");
    plus.textContent = "+";
    plus.setAttribute("aria-label", "Aumentar quantidade");
    plus.addEventListener("click", function () { setQty(p, qtyOf(p.slug) + 1); });

    stepper.appendChild(minus);
    stepper.appendChild(num);
    stepper.appendChild(plus);
    box.appendChild(stepper);
  }
}

function whatsappLink() {
  const lines = ["Olá! Gostaria de fazer um pedido pela Anava Importados:", ""];
  Object.keys(cart).forEach(function (slug) {
    const it = cart[slug];
    lines.push("• " + it.qty + "x " + it.brand + " — " + it.name);
  });
  lines.push("", "Total: " + cartCount() + " item(ns)");
  return "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(lines.join("\n"));
}

// Injeta o botão flutuante e o painel da sacola na página
function buildCartUI() {
  const fab = document.createElement("button");
  fab.id = "cart-fab";
  fab.setAttribute("aria-label", "Abrir sacola");
  fab.innerHTML = '<span class="fab-icon">🛍</span><span class="fab-badge" id="cart-badge">0</span>';
  document.body.appendChild(fab);

  const overlay = document.createElement("div");
  overlay.id = "cart-overlay";
  document.body.appendChild(overlay);

  const drawer = document.createElement("aside");
  drawer.id = "cart-drawer";
  drawer.innerHTML =
    '<div class="cart-head"><h3>Sua sacola</h3><button id="cart-close" aria-label="Fechar">×</button></div>' +
    '<div class="cart-items" id="cart-items"></div>' +
    '<div class="cart-foot">' +
    '  <a id="cart-send" class="btn btn-whatsapp" target="_blank" rel="noopener">Enviar pedido pelo WhatsApp</a>' +
    '  <button id="cart-clear">Limpar sacola</button>' +
    "</div>";
  document.body.appendChild(drawer);

  function open() { document.body.classList.add("cart-open"); }
  function close() { document.body.classList.remove("cart-open"); }

  fab.addEventListener("click", open);
  overlay.addEventListener("click", close);
  document.getElementById("cart-close").addEventListener("click", close);
  document.getElementById("cart-clear").addEventListener("click", function () {
    cart = {};
    saveCart();
    renderCartUI();
    render();
  });

  renderCartUI();
}

function renderCartUI() {
  const badge = document.getElementById("cart-badge");
  if (!badge) return;

  const n = cartCount();
  badge.textContent = n;
  badge.style.display = n ? "flex" : "none";

  const box = document.getElementById("cart-items");
  box.innerHTML = "";

  if (!n) {
    box.innerHTML = '<div class="cart-empty">Sua sacola está vazia.<br>Adicione produtos do catálogo.</div>';
  } else {
    Object.keys(cart).forEach(function (slug) {
      const it = cart[slug];
      const p = { slug: slug, name: it.name, brand: it.brand };
      const row = document.createElement("div");
      row.className = "cart-item";

      const info = document.createElement("div");
      info.className = "ci-info";
      info.innerHTML = '<div class="ci-brand">' + it.brand + '</div><div class="ci-name">' + it.name + "</div>";

      const controls = document.createElement("div");
      controls.className = "card-cart";
      controls.dataset.slug = slug;
      buildCardControls(controls, p);

      row.appendChild(info);
      row.appendChild(controls);
      box.appendChild(row);
    });
  }

  const send = document.getElementById("cart-send");
  send.href = n ? whatsappLink() : "#";
  send.classList.toggle("disabled", !n);
}

function productCard(p) {
  const card = document.createElement("article");
  card.className = "product-card";

  const media = document.createElement("div");
  media.className = "product-media";
  media.innerHTML =
    '<div class="ph"><div class="drop"></div><small>' + p.brand + "</small></div>";

  const img = document.createElement("img");
  img.loading = "lazy";
  img.alt = p.brand + " " + p.name;
  img.src = "img/products/" + p.slug + ".jpg";
  img.addEventListener("error", function () { img.remove(); });
  media.appendChild(img);

  const info = document.createElement("div");
  info.className = "product-info";

  const meta = ['<span>' + p.cat + "</span>"];
  if (p.line) meta.push("<span>" + p.line + "</span>");

  info.innerHTML =
    '<div class="p-brand">' + p.brand + "</div>" +
    '<div class="p-name">' + p.name + "</div>" +
    '<div class="p-meta">' + meta.join("") + "</div>";

  const controls = document.createElement("div");
  controls.className = "card-cart";
  controls.dataset.slug = p.slug;
  buildCardControls(controls, p);
  info.appendChild(controls);

  card.appendChild(media);
  card.appendChild(info);
  return card;
}

function render() {
  const grid = document.getElementById("product-grid");
  if (!grid) return;

  const found = CATALOG.filter(matches);
  grid.innerHTML = "";

  const count = document.getElementById("result-count");
  count.textContent = found.length + " produto" + (found.length === 1 ? "" : "s");

  if (!found.length) {
    grid.innerHTML =
      '<div class="empty-state">Nenhum produto encontrado. Tente outra busca ou remova os filtros.</div>';
    return;
  }

  const frag = document.createDocumentFragment();
  found.forEach(function (p) { frag.appendChild(productCard(p)); });
  grid.appendChild(frag);
}

document.addEventListener("DOMContentLoaded", function () {
  buildControls();
  buildCartUI();
  render();
});
