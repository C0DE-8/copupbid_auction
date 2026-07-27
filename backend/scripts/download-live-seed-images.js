const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..", "..");
const seedSql = path.join(root, "backend", "migration", "20260727_live_shop_seed_products.sql");
const uploadsDir = path.join(root, "backend", "uploads");
const tmpDir = path.join(root, "backend", "tmp-live-seed-images");
const manifestPath = path.join(uploadsDir, "seed-image-sources.json");

const openverseApi = "https://api.openverse.engineering/v1/images/";
const commonsApi = "https://commons.wikimedia.org/w/api.php";

const queries = {
  "seed-iphone-15": "iPhone 15 product photo",
  "seed-iphone-16": "iPhone product photo",
  "seed-iphone-17": "iPhone product photo",
  "seed-galaxy-a55": "Samsung Galaxy smartphone product photo",
  "seed-oraimo-freepods-4": "wireless earbuds charging case",
  "seed-anker-20000-power-bank": "power bank portable charger",
  "seed-white-sneakers": "white sneakers product photo",
  "seed-oversized-hoodie": "hooded sweatshirt",
  "seed-crossbody-handbag": "crossbody handbag product photo",
  "seed-mens-chino-trousers": "chino trousers product photo",
  "seed-aviator-sunglasses": "sunglasses",
  "seed-leather-watch": "wrist watch",
  "seed-golden-penny-spaghetti": "spaghetti pasta package",
  "seed-indomie-carton": "instant noodles package",
  "seed-peak-milk-400g": "powdered milk package",
  "seed-milo-400g": "chocolate malt drink product photo",
  "seed-basmati-rice-5kg": "rice bag",
  "seed-power-oil-3l": "vegetable oil bottle product photo",
  "seed-led-desk-lamp": "desk lamp product photo",
  "seed-vacuum-flask-1l": "thermos flask",
  "seed-nonstick-frying-pan": "non stick frying pan product photo",
  "seed-digital-kitchen-scale": "digital kitchen scale product photo",
  "seed-travel-organizer-pouches": "packing cubes",
  "seed-household-tool-kit": "household tool kit product photo",
};

function sqlUnescape(value) {
  return value.replace(/''/g, "'");
}

function parseProducts() {
  const sql = fs.readFileSync(seedSql, "utf8");
  const rowRegex = /^\('((?:[^']|'')*)', '((?:[^']|'')*)'.*?'(\/uploads\/seed-[^']+\.jpg)'/gm;
  const products = [];
  let match;
  while ((match = rowRegex.exec(sql))) {
    const image = match[3];
    products.push({
      category: sqlUnescape(match[1]),
      name: sqlUnescape(match[2]),
      image,
      slug: path.basename(image, ".jpg"),
    });
  }
  return products;
}

async function searchOpenverse(query) {
  const url = new URL(openverseApi);
  url.searchParams.set("q", query);
  url.searchParams.set("page_size", "10");
  url.searchParams.set("license_type", "commercial");
  const response = await fetch(url, {
    headers: { "User-Agent": "CopUp seed image downloader/1.0" },
  });
  if (!response.ok) return [];
  const json = await response.json();
  return (json.results || []).map((item) => ({
    source: "Openverse",
    title: item.title,
    creator: item.creator,
    license: item.license,
    landing_url: item.foreign_landing_url,
    urls: [item.thumbnail, item.url].filter(Boolean),
  }));
}

async function searchCommons(query) {
  const url = new URL(commonsApi);
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", "10");
  url.searchParams.set("gsrsearch", query);
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|extmetadata");
  url.searchParams.set("iiurlwidth", "1200");
  const response = await fetch(url, {
    headers: { "User-Agent": "CopUp seed image downloader/1.0" },
  });
  if (!response.ok) return [];
  const json = await response.json();
  return Object.values(json.query?.pages || {}).map((page) => {
    const info = page.imageinfo?.[0] || {};
    return {
      source: "Wikimedia Commons",
      title: page.title,
      creator: info.extmetadata?.Artist?.value?.replace(/<[^>]*>/g, ""),
      license: info.extmetadata?.LicenseShortName?.value,
      landing_url: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
      urls: [info.thumburl, info.url].filter(Boolean),
    };
  });
}

async function downloadImage(url, out) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 CopUp seed image downloader/1.0",
      "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const type = response.headers.get("content-type") || "";
  if (!type.startsWith("image/")) throw new Error(`Not image: ${type}`);
  fs.writeFileSync(out, Buffer.from(await response.arrayBuffer()));
}

function convertToJpeg(input, output) {
  execFileSync("sips", ["-s", "format", "jpeg", input, "--out", output], { stdio: "ignore" });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  const existingManifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    : [];
  const manifest = [...existingManifest];
  const seenProducts = new Set(existingManifest.map((item) => item.product));
  const products = parseProducts();

  for (const product of products) {
    const query = queries[product.slug] || `${product.name} product photo`;
    const candidates = [
      ...(await searchCommons(query).catch(() => [])),
      ...(await searchOpenverse(query).catch(() => [])),
    ];
    const mainFile = path.basename(product.image);
    const mainOut = path.join(uploadsDir, mainFile);
    if (process.env.MISSING_ONLY === "1" && fs.existsSync(mainOut) && seenProducts.has(product.name)) {
      continue;
    }
    let sourceUsed = null;

    for (let i = 0; i < candidates.length && !sourceUsed; i++) {
      for (const url of candidates[i].urls) {
        const tmp = path.join(tmpDir, `${product.slug}-${i}.img`);
        try {
          await downloadImage(url, tmp);
          convertToJpeg(tmp, mainOut);
          sourceUsed = { ...candidates[i], downloaded_url: url };
          break;
        } catch (_) {
          await wait(300);
        }
      }
    }

    if (!sourceUsed) {
      console.warn(`No image downloaded for ${product.name}`);
      continue;
    }

    for (const suffix of ["-gallery-1.jpg", "-gallery-2.jpg"]) {
      fs.copyFileSync(mainOut, path.join(uploadsDir, mainFile.replace(".jpg", suffix)));
    }

    const { urls, ...record } = sourceUsed;
    manifest.push({
      product: product.name,
      files: [
        mainFile,
        mainFile.replace(".jpg", "-gallery-1.jpg"),
        mainFile.replace(".jpg", "-gallery-2.jpg"),
      ],
      query,
      ...record,
    });
    seenProducts.add(product.name);
    console.log(`Downloaded image for ${product.name}`);
    await wait(500);
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Saved ${manifest.length} image source records to ${manifestPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
