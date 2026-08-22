import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RAW = path.join(HERE, 'raw');
const PROJECT = path.resolve(HERE, '..');

/* ------------------------------------------------------------------ *
 * Deterministic RNG so every rebuild produces the identical catalogue
 * ------------------------------------------------------------------ */
function rng(seed) {
  let a = seed * 1831565813 + 0x6d2b79f5;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

/* ------------------------------------------------------------------ *
 * Curation: the source feeds have machine titles. Every item gets a
 * real product name, a label, a category and material copy.
 * ------------------------------------------------------------------ */
const HOUSE = {
  OSTRO: 'Ostro',
  KESTER: 'Kester',
  HALDEN: 'Halden',
  MARLOWE: 'Marlowe & Vale',
  NINTH: 'Ninth Parallel',
  VERITY: 'Verity Rowe',
  CLARKE: 'Clarke Street',
  BELLAMY: 'Bellamy',
};

// key = `${source}:${sourceId}`
const CURATION = {
  // ---- fakestore -------------------------------------------------
  'fs:1':  { title: 'Foldsack No. 1 Backpack', brand: 'Fjällräven', gender: 'unisex', category: 'bags', sub: 'Backpacks', colour: 'Ochre', material: 'G-1000 HeavyDuty Eco canvas', fit: 'Fits a 15" laptop', origin: 'Made in Vietnam' },
  'fs:2':  { title: 'Premium Slim-Fit T-Shirt', brand: HOUSE.KESTER, gender: 'men', category: 'tops', sub: 'T-shirts', colour: 'Assorted', material: 'Combed cotton jersey, 180gsm', fit: 'Slim through the body', origin: 'Made in Portugal' },
  'fs:3':  { title: 'Waxed Cotton Field Jacket', brand: HOUSE.HALDEN, gender: 'men', category: 'outerwear', sub: 'Jackets', colour: 'Black', material: 'Waxed cotton, cupro lining', fit: 'Regular, room for a knit', origin: 'Made in Portugal' },
  'fs:4':  { title: 'Casual Slim-Fit Shirt', brand: HOUSE.KESTER, gender: 'men', category: 'shirts', sub: 'Casual shirts', colour: 'Charcoal', material: 'Cotton poplin, 120s two-ply', fit: 'Slim, darted back', origin: 'Made in Portugal' },
  'fs:5':  { title: 'Legends Naga Dragon Station Bracelet', brand: 'John Hardy', gender: 'women', category: 'jewellery', sub: 'Bracelets', colour: 'Gold and silver', material: 'Sterling silver with 18k gold', fit: '17.5cm, adjustable clasp', origin: 'Handmade in Bali' },
  'fs:6':  { title: 'Petite Micropavé Solitaire Ring', brand: HOUSE.VERITY, gender: 'women', category: 'jewellery', sub: 'Rings', colour: 'Yellow gold', material: 'Solid 14k gold, 0.25ct brilliant', fit: 'AU sizes L–R', origin: 'Made in Melbourne' },
  'fs:7':  { title: 'Princess-Cut Plated Ring', brand: HOUSE.VERITY, gender: 'women', category: 'jewellery', sub: 'Rings', colour: 'White gold', material: 'White-gold plate over brass, cubic zirconia', fit: 'AU sizes L–R', origin: 'Made in Melbourne' },
  'fs:8':  { title: 'Rose Gold Double-Flared Earrings', brand: HOUSE.BELLAMY, gender: 'unisex', category: 'jewellery', sub: 'Earrings', colour: 'Rose gold', material: 'Surgical stainless steel, rose-gold plate', fit: 'Sold as a pair', origin: 'Made in Italy' },
  'fs:15': { title: '3-in-1 Snowboard Jacket', brand: HOUSE.NINTH, gender: 'women', category: 'outerwear', sub: 'Technical', colour: 'Cobalt', material: 'Recycled ripstop shell, zip-out fleece', fit: 'Relaxed, layering cut', origin: 'Made in Vietnam' },
  'fs:16': { title: 'Hooded Faux-Leather Moto Jacket', brand: HOUSE.MARLOWE, gender: 'women', category: 'outerwear', sub: 'Jackets', colour: 'Black', material: 'Faux leather with removable jersey hood', fit: 'Cropped, true to size', origin: 'Made in China' },
  'fs:17': { title: 'Striped Windbreaker Raincoat', brand: HOUSE.NINTH, gender: 'women', category: 'outerwear', sub: 'Technical', colour: 'Navy stripe', material: 'Ripstop nylon, taped seams, 5k/5k', fit: 'Relaxed', origin: 'Made in Vietnam' },
  'fs:18': { title: 'Boat-Neck Short-Sleeve Tee', brand: HOUSE.OSTRO, gender: 'women', category: 'tops', sub: 'T-shirts', colour: 'Cream', material: 'Pima cotton jersey', fit: 'Classic, slight drape', origin: 'Made in Peru' },
  'fs:19': { title: 'Moisture-Wicking Sport Tee', brand: HOUSE.NINTH, gender: 'women', category: 'tops', sub: 'Active', colour: 'Sky', material: 'Recycled polyester piqué, UPF 50+', fit: 'Athletic', origin: 'Made in Vietnam' },
  'fs:20': { title: 'Cotton Short-Sleeve Tee', brand: HOUSE.OSTRO, gender: 'women', category: 'tops', sub: 'T-shirts', colour: 'White', material: 'Organic cotton jersey, GOTS certified', fit: 'Classic', origin: 'Made in Portugal' },

  // ---- dummyjson: mens shirts ------------------------------------
  'dj:83': { title: 'Check Overshirt', brand: HOUSE.HALDEN, gender: 'men', category: 'shirts', sub: 'Overshirts', colour: 'Blue and black check', material: 'Brushed cotton flannel, 240gsm', fit: 'Regular, wear open over a tee', origin: 'Made in Portugal' },
  'dj:84': { title: 'Graphic Jersey T-Shirt', brand: HOUSE.CLARKE, gender: 'men', category: 'tops', sub: 'T-shirts', colour: 'Black', material: 'Heavyweight cotton, 220gsm', fit: 'Boxy', origin: 'Made in Australia' },
  'dj:85': { title: 'Plaid Flannel Shirt', brand: HOUSE.HALDEN, gender: 'men', category: 'shirts', sub: 'Casual shirts', colour: 'Red plaid', material: 'Cotton flannel, brushed both sides', fit: 'Regular', origin: 'Made in Portugal' },
  'dj:86': { title: 'Short-Sleeve Camp Shirt', brand: HOUSE.KESTER, gender: 'men', category: 'shirts', sub: 'Casual shirts', colour: 'Sand', material: 'Linen and cotton blend', fit: 'Relaxed, camp collar', origin: 'Made in India' },
  'dj:87': { title: 'Fine Check Poplin Shirt', brand: HOUSE.KESTER, gender: 'men', category: 'shirts', sub: 'Casual shirts', colour: 'Navy check', material: 'Cotton poplin, mother-of-pearl buttons', fit: 'Slim', origin: 'Made in Portugal' },

  // ---- dummyjson: mens shoes -------------------------------------
  'dj:88': { title: 'Air Jordan 1 Retro High', brand: 'Nike', gender: 'men', category: 'shoes', sub: 'Sneakers', colour: 'Red and black', material: 'Leather upper, Air-Sole unit', fit: 'True to size', origin: 'Made in Vietnam' },
  'dj:89': { title: 'Alpha Huarache Baseball Cleats', brand: 'Nike', gender: 'men', category: 'shoes', sub: 'Sport', colour: 'White and navy', material: 'Synthetic upper, moulded plate', fit: 'Snug — size up half', origin: 'Made in Vietnam' },
  'dj:90': { title: 'Future Rider Trainers', brand: 'Puma', gender: 'men', category: 'shoes', sub: 'Sneakers', colour: 'Multi', material: 'Suede and mesh, RIDER foam', fit: 'True to size', origin: 'Made in Vietnam' },
  'dj:91': { title: 'Court Sneakers High', brand: HOUSE.CLARKE, gender: 'men', category: 'shoes', sub: 'Sneakers', colour: 'Off-white and red', material: 'Full-grain leather, vulcanised rubber sole', fit: 'True to size', origin: 'Made in Italy' },
  'dj:92': { title: 'Court Sneakers Low', brand: HOUSE.CLARKE, gender: 'men', category: 'shoes', sub: 'Sneakers', colour: 'Off-white and red', material: 'Full-grain leather, vulcanised rubber sole', fit: 'True to size', origin: 'Made in Italy' },

  // ---- dummyjson: mens watches -----------------------------------
  'dj:93': { title: 'Leather-Strap Field Watch', brand: HOUSE.HALDEN, gender: 'men', category: 'watches', sub: 'Automatic', colour: 'Brown', material: 'Stainless steel case, calf leather strap', fit: '38mm case, 20mm strap', origin: 'Assembled in Japan' },
  'dj:94': { title: 'Master Collection Automatic', brand: 'Longines', gender: 'men', category: 'watches', sub: 'Automatic', colour: 'Silver', material: 'Stainless steel, sapphire crystal', fit: '40mm case, 72h reserve', origin: 'Swiss made' },
  'dj:95': { title: 'Cellini Date, Black Dial', brand: 'Rolex', gender: 'men', category: 'watches', sub: 'Automatic', colour: 'Black and gold', material: '18k white gold, alligator strap', fit: '39mm case', origin: 'Swiss made' },
  'dj:96': { title: 'Cellini Moonphase', brand: 'Rolex', gender: 'men', category: 'watches', sub: 'Automatic', colour: 'White and rose gold', material: '18k Everose gold, alligator strap', fit: '39mm case', origin: 'Swiss made' },
  'dj:97': { title: 'Datejust 41', brand: 'Rolex', gender: 'men', category: 'watches', sub: 'Automatic', colour: 'Steel and gold', material: 'Oystersteel and yellow gold, Jubilee bracelet', fit: '41mm case', origin: 'Swiss made' },
  'dj:98': { title: 'Submariner Date', brand: 'Rolex', gender: 'men', category: 'watches', sub: 'Automatic', colour: 'Black', material: 'Oystersteel, Cerachrom bezel, 300m', fit: '41mm case', origin: 'Swiss made' },

  // ---- dummyjson: sunglasses (unisex eyewear) --------------------
  'dj:154': { title: 'Blackout Acetate Sunglasses', brand: HOUSE.OSTRO, gender: 'unisex', category: 'eyewear', sub: 'Sunglasses', colour: 'Black', material: 'Italian acetate, CR-39 lenses', fit: '52-20-145, Cat.3 lens', origin: 'Made in Italy' },
  'dj:155': { title: 'Classic Aviator Sunglasses', brand: HOUSE.OSTRO, gender: 'unisex', category: 'eyewear', sub: 'Sunglasses', colour: 'Gold and green', material: 'Metal frame, glass lenses', fit: '58-14-135, Cat.3 lens', origin: 'Made in Italy' },
  'dj:156': { title: 'Sport Wrap Sunglasses', brand: HOUSE.NINTH, gender: 'unisex', category: 'eyewear', sub: 'Sunglasses', colour: 'Green and black', material: 'TR-90 frame, polarised lenses', fit: 'One size, Cat.3 polarised', origin: 'Made in Taiwan' },
  'dj:157': { title: 'Oversize Frame Sunglasses', brand: HOUSE.CLARKE, gender: 'unisex', category: 'eyewear', sub: 'Sunglasses', colour: 'Clear', material: 'Bio-acetate, gradient lenses', fit: '56-18-140, Cat.2 lens', origin: 'Made in Italy' },
  'dj:158': { title: 'Round Metal Sunglasses', brand: HOUSE.OSTRO, gender: 'unisex', category: 'eyewear', sub: 'Sunglasses', colour: 'Silver', material: 'Stainless steel, mineral glass', fit: '50-21-145, Cat.3 lens', origin: 'Made in Japan' },

  // ---- dummyjson: "tops" feed is womenswear dresses --------------
  'dj:162': { title: 'Tiered Cotton Sundress', brand: HOUSE.OSTRO, gender: 'women', category: 'dresses', sub: 'Day dresses', colour: 'Blue', material: 'Cotton voile, cotton lining', fit: 'Midi, 118cm from shoulder', origin: 'Made in India' },
  'dj:163': { title: 'Summer Poplin Dress', brand: HOUSE.OSTRO, gender: 'women', category: 'dresses', sub: 'Day dresses', colour: 'Floral', material: 'Cotton poplin', fit: 'Mini, 92cm from shoulder', origin: 'Made in India' },
  'dj:164': { title: 'Ribbed Knit Midi Dress', brand: HOUSE.MARLOWE, gender: 'women', category: 'dresses', sub: 'Knitwear', colour: 'Grey', material: 'Extra-fine merino rib', fit: 'Body-skimming, 116cm', origin: 'Made in China' },
  'dj:165': { title: 'Pleated Mini Dress', brand: HOUSE.MARLOWE, gender: 'women', category: 'dresses', sub: 'Day dresses', colour: 'Ivory', material: 'Recycled polyester crêpe', fit: 'Mini, 88cm from shoulder', origin: 'Made in China' },
  'dj:166': { title: 'Tartan Shirt Dress', brand: HOUSE.HALDEN, gender: 'women', category: 'dresses', sub: 'Day dresses', colour: 'Red tartan', material: 'Pure wool tartan', fit: 'Belted, 104cm from shoulder', origin: 'Made in Scotland' },

  // ---- dummyjson: womens bags ------------------------------------
  'dj:172': { title: 'Structured Top-Handle Bag', brand: HOUSE.MARLOWE, gender: 'women', category: 'bags', sub: 'Handbags', colour: 'Blue', material: 'Pebbled calf leather, suede lining', fit: '28 × 20 × 12cm', origin: 'Made in Italy' },
  'dj:173': { title: 'Full-Grain Leather Tote', brand: HOUSE.BELLAMY, gender: 'women', category: 'bags', sub: 'Totes', colour: 'Tan', material: 'Vegetable-tanned full-grain leather', fit: '36 × 30 × 14cm, fits A4', origin: 'Made in Italy' },
  'dj:174': { title: 'Saffiano Shoulder Bag', brand: 'Prada', gender: 'women', category: 'bags', sub: 'Shoulder bags', colour: 'Black', material: 'Saffiano leather, enamel logo', fit: '24 × 16 × 8cm', origin: 'Made in Italy' },
  'dj:175': { title: 'Faux-Leather Backpack', brand: HOUSE.BELLAMY, gender: 'women', category: 'bags', sub: 'Backpacks', colour: 'White', material: 'Recycled faux leather', fit: '30 × 24 × 11cm', origin: 'Made in China' },
  'dj:176': { title: 'Everyday Shoulder Bag', brand: HOUSE.BELLAMY, gender: 'women', category: 'bags', sub: 'Shoulder bags', colour: 'Black', material: 'Grained leather', fit: '26 × 18 × 9cm', origin: 'Made in Italy' },

  // ---- dummyjson: womens dresses ---------------------------------
  'dj:177': { title: 'Column Evening Gown', brand: HOUSE.MARLOWE, gender: 'women', category: 'dresses', sub: 'Evening', colour: 'Black', material: 'Silk crêpe, bias cut', fit: 'Floor length, 148cm', origin: 'Made in Italy' },
  'dj:178': { title: 'Leather Corset and Skirt Set', brand: HOUSE.CLARKE, gender: 'women', category: 'dresses', sub: 'Sets', colour: 'Black', material: 'Nappa leather, boned bodice', fit: 'Sold as a two-piece set', origin: 'Made in Italy' },
  'dj:179': { title: 'Corset Top and Midi Skirt Set', brand: HOUSE.CLARKE, gender: 'women', category: 'dresses', sub: 'Sets', colour: 'Black', material: 'Cotton twill, satin-backed crêpe', fit: 'Sold as a two-piece set', origin: 'Made in Portugal' },
  'dj:180': { title: 'Belted Peacoat Dress', brand: HOUSE.HALDEN, gender: 'women', category: 'dresses', sub: 'Day dresses', colour: 'Camel', material: 'Wool and cashmere blend', fit: 'Midi, 112cm, self belt', origin: 'Made in Italy' },
  'dj:181': { title: 'Contrast Tailored Suit', brand: 'Marni', gender: 'women', category: 'outerwear', sub: 'Tailoring', colour: 'Red and black', material: 'Virgin wool, half-canvas construction', fit: 'Jacket and trouser, sold as a set', origin: 'Made in Italy' },

  // ---- dummyjson: womens jewellery -------------------------------
  'dj:182': { title: 'Crystal Drop Earrings', brand: HOUSE.VERITY, gender: 'women', category: 'jewellery', sub: 'Earrings', colour: 'Green', material: 'Green crystal, 18k gold plate', fit: '4.2cm drop', origin: 'Made in Melbourne' },
  'dj:183': { title: 'Oval Stone Earrings', brand: HOUSE.VERITY, gender: 'women', category: 'jewellery', sub: 'Earrings', colour: 'Green', material: 'Malachite, sterling silver posts', fit: '2.8cm drop', origin: 'Made in Melbourne' },
  'dj:184': { title: 'Enamel Palm Earrings', brand: HOUSE.BELLAMY, gender: 'women', category: 'jewellery', sub: 'Earrings', colour: 'Multi', material: 'Hand-painted enamel on brass', fit: '3.5cm drop', origin: 'Made in Italy' },

  // ---- dummyjson: womens shoes -----------------------------------
  'dj:185': { title: 'Shearling Slide', brand: HOUSE.BELLAMY, gender: 'women', category: 'shoes', sub: 'Flats', colour: 'Black and brown', material: 'Australian shearling, leather sole', fit: 'True to size', origin: 'Made in Australia' },
  'dj:186': { title: 'Pointed Leather Pumps', brand: 'Calvin Klein', gender: 'women', category: 'shoes', sub: 'Heels', colour: 'Nude', material: 'Calf leather, leather lining', fit: '85mm heel, true to size', origin: 'Made in Italy' },
  'dj:187': { title: 'Metallic Strap Heels', brand: HOUSE.MARLOWE, gender: 'women', category: 'shoes', sub: 'Heels', colour: 'Gold', material: 'Metallic nappa, ankle strap', fit: '95mm heel, narrow — size up', origin: 'Made in Spain' },
  'dj:188': { title: 'Leather Ballet Flats', brand: HOUSE.OSTRO, gender: 'women', category: 'shoes', sub: 'Flats', colour: 'Tan', material: 'Soft nappa leather', fit: 'True to size', origin: 'Made in Spain' },
  'dj:189': { title: 'Patent Block Heels', brand: HOUSE.MARLOWE, gender: 'women', category: 'shoes', sub: 'Heels', colour: 'Red', material: 'Patent calf leather', fit: '70mm block heel, true to size', origin: 'Made in Spain' },

  // ---- dummyjson: womens watches ---------------------------------
  'dj:190': { title: 'Ingenieur Automatic 35', brand: 'IWC Schaffhausen', gender: 'women', category: 'watches', sub: 'Automatic', colour: 'Steel', material: 'Stainless steel, soft-iron inner case', fit: '35mm case', origin: 'Swiss made' },
  'dj:191': { title: 'Cellini Moonphase 39', brand: 'Rolex', gender: 'women', category: 'watches', sub: 'Automatic', colour: 'White and rose gold', material: '18k Everose gold, alligator strap', fit: '39mm case', origin: 'Swiss made' },
  'dj:192': { title: 'Datejust 31', brand: 'Rolex', gender: 'women', category: 'watches', sub: 'Automatic', colour: 'Steel and gold', material: 'Oystersteel and yellow gold', fit: '31mm case', origin: 'Swiss made' },
  'dj:193': { title: 'Gold-Tone Bracelet Watch', brand: HOUSE.VERITY, gender: 'women', category: 'watches', sub: 'Quartz', colour: 'Gold', material: 'Gold-tone stainless steel', fit: '32mm case', origin: 'Assembled in Japan' },
  'dj:194': { title: 'Slim Quartz Watch', brand: HOUSE.VERITY, gender: 'women', category: 'watches', sub: 'Quartz', colour: 'Silver', material: 'Stainless steel, mesh bracelet', fit: '34mm case, 6mm thick', origin: 'Assembled in Japan' },
};

/* ------------------------------------------------------------------ *
 * Corrections applied after a visual audit of every photograph against
 * its metadata. The source feeds' titles are machine-generated and often
 * describe a different garment or colour than the image actually shows;
 * colour is a filter facet here, so it has to match the picture.
 * ------------------------------------------------------------------ */
const CORRECTIONS = {
  'fs:1':  { colour: 'Navy' },
  'fs:2':  { title: 'Raglan Henley Tee', colour: 'Grey and black' },
  'fs:3':  { colour: 'Tan' },
  'fs:4':  { title: 'Slim-Fit Long-Sleeve Tee', category: 'tops', sub: 'T-shirts', colour: 'Blue', material: 'Slub cotton jersey' },
  'fs:6':  { title: 'Micropavé Eternity Band', colour: 'White gold', material: 'Solid 14k white gold, 0.25ct pavé' },
  'fs:15': { colour: 'Purple' },
  'fs:17': { title: 'Striped-Lining Trench Coat', colour: 'Navy', material: 'Ripstop nylon, striped cotton lining, taped seams' },
  'fs:18': { colour: 'White' },
  'fs:19': { colour: 'Red' },
  'fs:20': { title: 'Be Kind Graphic Tee', colour: 'Purple' },

  'dj:84':  { colour: 'White' },
  'dj:86':  { colour: 'Blue floral', material: 'Viscose blend' },
  'dj:87':  { colour: 'Green check', material: 'Cotton flannel' },
  'dj:89':  { colour: 'White and green' },
  'dj:91':  { title: 'Arrow Court Sneakers', colour: 'White and red' },
  'dj:92':  { colour: 'White and red' },
  'dj:98':  { colour: 'Black and gold', material: 'Oystersteel and yellow gold, Cerachrom bezel, 300m' },

  'dj:154': { title: 'Browline Sunglasses', colour: 'Black and green' },
  'dj:155': { colour: 'Gold and blue' },
  'dj:156': { title: 'Green-Lens Aviator Sunglasses', colour: 'Green and black', material: 'Metal frame, polarised lenses' },
  'dj:157': { title: 'Pixel Party Sunglasses', colour: 'Black and pink', material: 'Moulded acrylic' },
  'dj:158': { title: 'Oversize Shield Sunglasses', colour: 'Clear', material: 'Bio-acetate, clear lenses' },

  'dj:162': { title: 'Spot Print Sundress', colour: 'Blue spot' },
  'dj:163': { title: 'Palm Print Maxi Dress', colour: 'Palm print', material: 'Viscose crêpe' },
  'dj:164': { title: 'Button-Front Midi Dress', colour: 'Ivory', material: 'Cotton poplin' },
  'dj:165': { colour: 'Sage green', material: 'Recycled polyester crêpe' },
  'dj:166': { title: 'Check Party Dress', colour: 'Black and white check', material: 'Cotton check with grosgrain sash' },

  'dj:174': { title: 'Saffiano Tote', colour: 'Sky blue', fit: '32 × 24 × 13cm' },
  'dj:177': { colour: 'Black floral', material: 'Floral jacquard over tulle' },
  'dj:178': { colour: 'Red' },
  'dj:180': { title: 'Spot Print Party Dress', colour: 'Pink spot', material: 'Cotton faille', fit: 'Mini, 86cm from shoulder' },
  'dj:181': { title: 'Two-Tone Column Dress', category: 'dresses', sub: 'Evening', colour: 'Burgundy and ivory', material: 'Virgin wool jersey', fit: 'Maxi, 138cm from shoulder' },

  'dj:183': { title: 'Checkerboard Hoop Earrings', colour: 'Green and white', material: 'Hand-painted enamel on brass' },
  'dj:184': { colour: 'Gold', material: 'Brushed brass' },

  'dj:185': { title: 'Contrast Heel Pumps', sub: 'Heels', colour: 'Brown and black', material: 'Calf leather', fit: '75mm heel, true to size' },
  'dj:186': { colour: 'Black', fit: '70mm heel, true to size' },
  'dj:188': { title: 'Two-Tone Pointed Pumps', sub: 'Heels', colour: 'Nude and black', material: 'Nappa leather', fit: '85mm heel, true to size' },
  'dj:189': { title: 'Patent Pointed Flats', sub: 'Flats', colour: 'Red', fit: 'True to size' },
  'dj:193': { colour: 'Gold and blue' },
};

for (const key of Object.keys(CORRECTIONS)) {
  if (!CURATION[key]) throw new Error('correction for unknown product ' + key);
  Object.assign(CURATION[key], CORRECTIONS[key]);
}

/* ------------------------------------------------------------------ *
 * Size systems (Australian conventions)
 * ------------------------------------------------------------------ */
function sizesFor(gender, category) {
  if (category === 'shoes') {
    return gender === 'women'
      ? ['AU 5', 'AU 6', 'AU 7', 'AU 8', 'AU 9', 'AU 10']
      : ['AU 7', 'AU 8', 'AU 9', 'AU 10', 'AU 11', 'AU 12'];
  }
  if (category === 'dresses') return ['AU 6', 'AU 8', 'AU 10', 'AU 12', 'AU 14', 'AU 16'];
  if (category === 'tops' || category === 'outerwear' || category === 'shirts') {
    return gender === 'women'
      ? ['AU 6', 'AU 8', 'AU 10', 'AU 12', 'AU 14', 'AU 16']
      : ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  }
  return ['One size'];
}

/* ------------------------------------------------------------------ *
 * Pricing: source feeds are USD. Convert, then snap to retail endings.
 * ------------------------------------------------------------------ */
const FX = 1.62;
function snapPrice(p) {
  if (p < 60) return Math.max(4, Math.round(p / 5) * 5) - 0.05;
  if (p < 250) return Math.round(p / 10) * 10 - 1;
  if (p < 1000) return Math.round(p / 20) * 20 - 1;
  if (p < 5000) return Math.round(p / 50) * 50 - 5;
  return Math.round(p / 100) * 100 - 5;
}

/* ------------------------------------------------------------------ *
 * Reviews — written locally so the copy reads Australian
 * ------------------------------------------------------------------ */
const REVIEWERS = [
  ['Alana W.', 'Newtown, NSW'], ['Jarrah M.', 'Fremantle, WA'], ['Priya S.', 'Carlton, VIC'],
  ['Tom H.', 'Paddington, QLD'], ['Steph L.', 'Glenelg, SA'], ['Dan O.', 'Hobart, TAS'],
  ['Mei C.', 'Chatswood, NSW'], ['Ben R.', 'Braddon, ACT'], ['Georgia T.', 'Fitzroy, VIC'],
  ['Nikhil A.', 'Parramatta, NSW'], ['Sam K.', 'Darwin, NT'], ['Ruby N.', 'Byron Bay, NSW'],
  ['Lachlan P.', 'Geelong, VIC'], ['Aisha D.', 'Bankstown, NSW'], ['Ollie F.', 'Toowoomba, QLD'],
  ['Hannah V.', 'Subiaco, WA'], ['Marco B.', 'Norwood, SA'], ['Freya J.', 'Launceston, TAS'],
  ['Wei L.', 'Box Hill, VIC'], ['Zoe A.', 'Coogee, NSW'],
];
const POSITIVE = [
  'Fit is exactly as described. Ordered a Tuesday, arrived Thursday to Sydney metro.',
  'Second one of these I have bought. The first has held up through two winters.',
  'Photos are accurate for colour — no surprises when it came out of the box.',
  'Went a size up on the advice in the fit notes and it was the right call.',
  'Quality is a step above what I expected at this price.',
  'Packaging was minimal and recyclable, which I appreciated.',
  'Wore it straight out of the box to a wedding. Zero complaints.',
  'Good weight to the fabric. Does not feel thin or cheap.',
  'Sizing chart was spot on. Rare.',
  'Arrived in three days to regional Victoria, which I was not expecting.',
];
const MIXED = [
  'Nice piece but runs a touch small through the shoulders. Size up if you are between.',
  'Colour is slightly deeper in person than on screen. Still happy with it.',
  'Took a week to reach Perth. Worth the wait but plan ahead.',
  'Lovely quality, though the fit is more relaxed than the photos suggest.',
  'Good buy on sale. Would have hesitated at full price.',
];
const CRITICAL = [
  'Fabric is fine but the stitching at the hem came loose after a month. Returns were painless though.',
  'Runs noticeably small. I exchanged for the next size and it was much better.',
  'Not quite the colour I expected from the listing.',
];

function makeReviews(seed, ratingHint, sizes) {
  const r = rng(seed + 4711);
  const n = 2 + Math.floor(r() * 4);
  const out = [];
  const used = new Set();
  for (let i = 0; i < n; i++) {
    let who = pick(r, REVIEWERS);
    let guard = 0;
    while (used.has(who[0]) && guard++ < 10) who = pick(r, REVIEWERS);
    used.add(who[0]);
    const roll = r();
    let stars, body;
    if (roll < 0.62) { stars = 5; body = pick(r, POSITIVE); }
    else if (roll < 0.85) { stars = 4; body = pick(r, MIXED); }
    else { stars = 3; body = pick(r, CRITICAL); }
    const daysAgo = 4 + Math.floor(r() * 180);
    const d = new Date(Date.UTC(2026, 7, 22) - daysAgo * 86400000);
    out.push({
      name: who[0],
      place: who[1],
      rating: stars,
      date: d.toISOString().slice(0, 10),
      size: sizes.length > 1 ? sizes[Math.floor(r() * sizes.length)] : null,
      body,
      verified: r() > 0.15,
    });
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* ------------------------------------------------------------------ *
 * Build
 * ------------------------------------------------------------------ */
const slugify = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const products = [];
const imageJobs = [];

function ingest(src, raw) {
  const key = `${src}:${raw.id}`;
  const c = CURATION[key];
  if (!c) return; // electronics and anything unclassified are dropped
  const seed = (src === 'fs' ? 5000 : 0) + raw.id;
  const r = rng(seed);

  const sizes = sizesFor(c.gender, c.category);
  const price = snapPrice((raw.price || 0) * FX);

  const discount = raw.discountPercentage || 0;
  const onSale = r() < 0.24 && discount > 4;
  const compareAt = onSale ? snapPrice(price / (1 - Math.min(discount, 30) / 100)) : null;

  const srcImages = raw.images && raw.images.length ? raw.images.slice(0, 4) : [raw.image];
  const images = srcImages.map((url, i) => {
    const ext = (url.match(/\.(webp|jpe?g|png|avif)(\?|$)/i) || [, 'jpg'])[1].toLowerCase();
    const file = `${src}${raw.id}-${i + 1}.${ext}`;
    imageJobs.push({ url, file });
    return `assets/img/products/${file}`;
  });

  const stock = {};
  let total = 0;
  sizes.forEach((s, i) => {
    const soldOut = sizes.length > 1 && r() < 0.13;
    const q = soldOut ? 0 : 1 + Math.floor(r() * 14);
    stock[s] = q;
    total += q;
  });
  if (total === 0) { stock[sizes[0]] = 6; total = 6; }

  const reviews = makeReviews(seed, raw.rating, sizes);
  const rating = reviews.reduce((a, b) => a + b.rating, 0) / reviews.length;

  const isNew = !onSale && r() < 0.3;
  const lowStock = total <= 6;

  const desc = (raw.description || '').replace(/\s+/g, ' ').trim();

  products.push({
    id: slugify(`${c.brand}-${c.title}`) + '-' + raw.id,
    sku: `AP-${String(seed).padStart(5, '0')}`,
    title: c.title,
    brand: c.brand,
    houseLabel: Object.values(HOUSE).includes(c.brand),
    gender: c.gender,
    category: c.category,
    sub: c.sub,
    colour: c.colour,
    material: c.material,
    fit: c.fit,
    origin: c.origin,
    care: c.category === 'watches' || c.category === 'jewellery'
      ? 'Wipe with the supplied cloth. Keep away from perfume and chlorinated water.'
      : c.category === 'shoes' || c.category === 'bags'
        ? 'Wipe clean with a damp cloth. Condition leather every few months. Store in the dust bag provided.'
        : 'Cold gentle machine wash with like colours. Do not tumble dry. Warm iron on the reverse.',
    price,
    compareAt,
    onSale,
    isNew,
    lowStock,
    currency: 'AUD',
    description: desc,
    images,
    sizes,
    stock,
    totalStock: total,
    rating: Math.round(rating * 10) / 10,
    reviewCount: reviews.length,
    reviews,
    shipsInDays: c.category === 'watches' && price > 5000 ? 5 : 1 + Math.floor(r() * 3),
    tags: [c.category, c.sub.toLowerCase(), c.gender, c.colour.toLowerCase()],
  });
}

for (const f of fs.readdirSync(RAW)) {
  const j = JSON.parse(fs.readFileSync(path.join(RAW, f), 'utf8'));
  if (f === 'fakestore.json') j.forEach((p) => ingest('fs', p));
  else j.products.forEach((p) => ingest('dj', p));
}

products.sort((a, b) => a.brand.localeCompare(b.brand) || a.title.localeCompare(b.title));

/* ---- editorial collections --------------------------------------- */
const collections = {
  'southerly-change': products.filter((p) => ['outerwear', 'shirts', 'watches'].includes(p.category)).slice(0, 8).map((p) => p.id),
  'new-in': products.filter((p) => p.isNew).map((p) => p.id),
  'the-sale': products.filter((p) => p.onSale).map((p) => p.id),
  'fine-watches': products.filter((p) => p.category === 'watches' && p.price > 3000).map((p) => p.id),
  'made-here': products.filter((p) => /Australia|Melbourne/.test(p.origin)).map((p) => p.id),
};

const catalogue = {
  meta: {
    store: 'ANTIPODE',
    country: 'AU',
    currency: 'AUD',
    gstRate: 0.1,
    freeShippingThreshold: 150,
    generated: '2026-08-22',
    sources: ['dummyjson.com/products', 'fakestoreapi.com/products'],
    count: products.length,
  },
  categories: [...new Set(products.map((p) => p.category))].sort(),
  brands: [...new Set(products.map((p) => p.brand))].sort(),
  colours: [...new Set(products.map((p) => p.colour))].sort(),
  collections,
  products,
};

fs.mkdirSync(path.join(PROJECT, 'data'), { recursive: true });
fs.mkdirSync(path.join(PROJECT, 'assets/js'), { recursive: true });
fs.writeFileSync(path.join(PROJECT, 'data/catalog.json'), JSON.stringify(catalogue, null, 2));
fs.writeFileSync(
  path.join(PROJECT, 'assets/js/catalog.js'),
  '/* ANTIPODE catalogue — generated from public product feeds, prices converted to AUD.\n' +
  '   Served as JS rather than JSON so the site also runs from file:// without a server. */\n' +
  'window.ANTIPODE_CATALOG = ' + JSON.stringify(catalogue) + ';\n'
);
fs.writeFileSync(path.join(HERE, 'image-jobs.json'), JSON.stringify(imageJobs, null, 2));

const by = (k) => products.reduce((m, p) => ((m[p[k]] = (m[p[k]] || 0) + 1), m), {});
console.log('products:', products.length);
console.log('by gender:', by('gender'));
console.log('by category:', by('category'));
console.log('brands:', catalogue.brands.length, catalogue.brands.join(', '));
console.log('on sale:', products.filter((p) => p.onSale).length, '| new:', products.filter((p) => p.isNew).length);
console.log('price range: A$' + Math.min(...products.map((p) => p.price)) + ' – A$' + Math.max(...products.map((p) => p.price)));
console.log('image jobs:', imageJobs.length);
