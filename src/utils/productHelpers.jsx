import { Sparkles, Cloud, Grid, Maximize2, ArrowUpDown } from 'lucide-react';

/**
 * Extract product attributes (from Prisma `productattribute` relation) into a key-value map.
 */
export function getAttributes(product) {
  const attrs = {};
  if (Array.isArray(product.productattribute)) {
    product.productattribute.forEach((attr) => {
      attrs[attr.name?.toLowerCase()] = attr.value;
    });
  }
  return attrs;
}

/**
 * Build a highlights array from available product data for the hover overlay.
 * Returns an array of { icon, label, value } objects.
 * @param {boolean} compact - if true, uses smaller icons (10px) and fewer neck detections
 */
export function buildHighlights(product, compact = false) {
  const attrs = getAttributes(product);
  const highlights = [];
  const s = compact ? 10 : 11;

  if (attrs['fabric']) highlights.push({ icon: <Cloud size={s} />, label: 'Fabric', value: attrs['fabric'] });
  if (attrs['gsm']) highlights.push({ icon: <ArrowUpDown size={s} />, label: 'GSM', value: `${attrs['gsm']} GSM` });
  if (attrs['fit']) highlights.push({ icon: <Maximize2 size={s} />, label: 'Fit', value: attrs['fit'] });

  const desc = ((product.description || '') + ' ' + (product.name || '')).toLowerCase();

  if (desc.includes('full sleeve') || desc.includes('long sleeve'))
    highlights.push({ icon: <Grid size={s} />, label: 'Sleeve', value: 'Full Sleeve' });
  else if (desc.includes('drop shoulder'))
    highlights.push({ icon: <Grid size={s} />, label: 'Sleeve', value: 'Drop Shoulder' });
  else if (desc.includes('roll-up sleeve'))
    highlights.push({ icon: <Grid size={s} />, label: 'Sleeve', value: 'Roll-Up' });
  else if (desc.includes('short sleeve') || desc.includes('half sleeve'))
    highlights.push({ icon: <Grid size={s} />, label: 'Sleeve', value: 'Short Sleeve' });

  if (desc.includes('henley'))
    highlights.push({ icon: <Sparkles size={s} />, label: 'Neck', value: 'Henley' });
  else if (desc.includes('polo'))
    highlights.push({ icon: <Sparkles size={s} />, label: 'Neck', value: 'Polo Collar' });
  else if (!compact && desc.includes('crew neck'))
    highlights.push({ icon: <Sparkles size={s} />, label: 'Neck', value: 'Crew Neck' });
  else if (!compact && (desc.includes('v-neck') || desc.includes('v neck')))
    highlights.push({ icon: <Sparkles size={s} />, label: 'Neck', value: 'V-Neck' });
  else if (!compact && desc.includes('hood'))
    highlights.push({ icon: <Sparkles size={s} />, label: 'Neck', value: 'Hooded' });

  return highlights;
}

/**
 * Extract a short style tagline from the product description (first meaningful sentence).
 */
export function getStyleTagline(product) {
  const desc = product.description || '';
  const sentences = desc.split(/[.!]/).filter(s => s.trim().length > 15);
  if (sentences.length > 0) return sentences[0].trim();
  if (desc.length > 60) return desc.substring(0, 60) + '...';
  return desc;
}
