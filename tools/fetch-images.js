// Baixa imagens oficiais de produtos a partir do products.json (Shopify) da marca.
// Uso: node fetch-images.js <marca> <dominio> [--dry]
// Ex.:  node fetch-images.js Medicube medicube.us --dry

const fs = require("fs");
const path = require("path");

const REPO = "C:/Users/Coller/source/repos/Ana_import";
const OUT = path.join(REPO, "img/products");

const [, , BRAND, DOMAIN, ...flags] = process.argv;
const DRY = flags.includes("--dry");

if (!BRAND || !DOMAIN) {
  console.error("uso: node fetch-images.js <marca> <dominio> [--dry]");
  process.exit(1);
}

const src = fs.readFileSync(path.join(REPO, "js/products.js"), "utf8");
const PRODUCTS = new Function(src + "; return PRODUCTS;")();

function slugify(b, n) {
  return (b + " " + n)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[%+&:().,'’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const STOP = new Set(["the", "de", "da", "do", "un", "e", "a", "spf50", "pa"]);
function tokens(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\(.*?\)/g, " ")
    .replace(/spf\s*50\+?|pa\+{1,4}/g, " ")
    .replace(/[^a-z0-9.]+/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t))
    .filter((t) => !/^\d+(\.\d+)?(ml|g|kg|oz|ea|un)$/.test(t)) // ignora tamanhos (35ml, 20g)
    .filter((t) => !/^\d\.\d$/.test(t)) // ignora versões &honey (1.0, 2.0…)
    .map((t) => PLURAL[t] || t);
}

const PLURAL = { pads: "pad", masks: "mask", sheets: "sheet", patches: "patch",
  serums: "serum", creams: "cream", toners: "toner", "nad+": "nad" };

// Palavras que indicam variação/kit que NÃO queremos casar por engano
const BAD = ["set", "kit", "duo", "refill", "gift", "trio", "bundle", "special", "sample", "off"];

// Tipos de produto: se o título tiver um destes e o nosso nome não, é outro produto
const TYPES = ["pads", "pad", "mask", "toner", "serum", "cream", "cleanser", "oil", "balm",
  "mist", "stick", "ampoule", "essence", "shot", "spray", "wash", "gel", "foam", "lotion",
  "sunscreen", "patch", "powder", "shampoo", "conditioner", "treatment"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url) {
  for (let tent = 1; tent <= 4; tent++) {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
    if (res.status === 429) { await sleep(8000 * tent); continue; }
    if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
    return res.json();
  }
  throw new Error(`rate limit persistente em ${url}`);
}

async function fetchAll(domain) {
  // cache local do catálogo para não repetir o download a cada marca
  const cacheFile = path.join(require("os").tmpdir(), `shopify-cache-${domain}.json`);
  if (fs.existsSync(cacheFile) && Date.now() - fs.statSync(cacheFile).mtimeMs < 6 * 3600e3) {
    return JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  }
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const j = await fetchJson(`https://${domain}/products.json?limit=250&page=${page}`);
    if (!j.products || !j.products.length) break;
    all.push(...j.products);
    await sleep(700);
    if (j.products.length < 250) break;
  }
  fs.writeFileSync(cacheFile, JSON.stringify(all));
  return all;
}

function scoreMatch(ourTokens, title) {
  const tt = tokens(title);
  const tset = new Set(tt);
  let hit = 0;
  for (const t of ourTokens) if (tset.has(t)) hit++;
  const coverage = hit / ourTokens.length; // quanto do nosso nome está no título
  const extra = tt.filter((t) => !ourTokens.includes(t)).length;
  return { coverage, extra, tt };
}

// Normalização para checar se um produto do revendedor é da marca certa
function normFlat(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

async function main() {
  const ours = PRODUCTS.filter((p) => p[0] === BRAND);
  console.log(`${BRAND}: ${ours.length} produtos na lista; buscando ${DOMAIN}...`);
  const shop = await fetchAll(DOMAIN);
  console.log(`${shop.length} produtos no site da marca`);

  const badRe = new RegExp(`\\b(${BAD.join("|")})\\b`, "i");
  const report = { matched: [], unmatched: [] };
  const brandFlat = normFlat(BRAND);

  for (const p of ours) {
    const name = p[3];
    const ourTokens = tokens((p[1] ? p[1] + " " : "") + name);
    const plain = tokens(name);

    let best = null;
    for (const sp of shop) {
      if (!sp.images || !sp.images.length) continue;
      // em loja multimarcas, só aceita produto da marca certa (vendor ou título)
      if (brandFlat && !normFlat(sp.vendor).includes(brandFlat) &&
          !normFlat(sp.title).includes(brandFlat)) continue;
      const s = scoreMatch(plain, sp.title);
      const isBad = badRe.test(sp.title) && !badRe.test(name);
      // exige que a grande maioria dos tokens do nosso nome esteja no título
      if (s.coverage < 0.85) continue;
      // título com tipo de produto que o nosso nome não tem => outro produto
      const ourSet = new Set(plain);
      // exceção: "pad" e "toner pad" são o mesmo formato
      const titleTypes = s.tt.filter((t) => TYPES.includes(t) && !ourSet.has(t))
        .filter((t) => !(t === "toner" && ourSet.has("pad") && s.tt.includes("pad")));
      if (titleTypes.length) continue;
      const rank = s.coverage * 100 - s.extra * 2 - (isBad ? 50 : 0);
      if (!best || rank > best.rank) best = { sp, rank, extra: s.extra, isBad };
    }

    if (best) {
      const slug = slugify(p[0], name);
      report.matched.push({
        name, title: best.sp.title, slug, img: best.sp.images[0].src,
        viaGift: best.isBad || undefined,
      });
    } else {
      report.unmatched.push({ name });
    }
  }

  console.log(`\ncasados: ${report.matched.length} | sem correspondência: ${report.unmatched.length}\n`);
  for (const m of report.matched) console.log(`  ${m.viaGift ? "OK*" : "OK "} ${m.name}  <-  "${m.title}"`);
  for (const u of report.unmatched) console.log(`  --  ${u.name}`);

  if (!DRY) {
    fs.mkdirSync(OUT, { recursive: true });
    let ok = 0, fail = 0;
    for (const m of report.matched) {
      const dest = path.join(OUT, m.slug + ".jpg");
      if (fs.existsSync(dest)) { ok++; continue; }
      try {
        // pede a imagem já redimensionada pelo CDN do Shopify (800x800)
        const url = m.img.replace(/(\.[a-z]+)(\?|$)/, "_800x800_crop_center$1$2");
        let res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
        if (!res.ok) res = await fetch(m.img, { headers: { "user-agent": "Mozilla/5.0" } });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(dest, buf);
        ok++;
      } catch (e) {
        fail++;
        console.log(`  ERRO baixando ${m.slug}: ${e.message}`);
      }
    }
    console.log(`\nimagens salvas: ${ok} | falhas: ${fail}`);
  }

  fs.writeFileSync(
    path.join(__dirname, `report-${BRAND.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`),
    JSON.stringify(report, null, 2)
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
