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
  render();
});
