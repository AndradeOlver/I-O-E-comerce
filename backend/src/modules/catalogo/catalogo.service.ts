import * as repository from './catalogo.repository.js';

type Query = Record<string, unknown>;
const brands = [
  { id: 'io-studio', nombre: 'I&O Studio', monograma: 'iO', especialidad: 'Algodón Pima & Lino', tagline: 'Esenciales de casa con fibra peruana de exportación', categoryTarget: 'prendas-superiores' },
  { id: 'aurea-atelier', nombre: 'Aurea Atelier', monograma: 'AU', especialidad: 'Sastrería & Seda', tagline: 'Caídas fluidas y siluetas de gala contemporánea', categoryTarget: 'vestidos' },
  { id: 'kallpa-street', nombre: 'Kallpa Street', monograma: 'KS', especialidad: 'Outerwear Urbano', tagline: 'Capas para el ritmo de ciudad', categoryTarget: 'casacas' },
  { id: 'indigo-raw', nombre: 'Índigo Raw', monograma: 'IR', especialidad: 'Denim & Cargo', tagline: 'Tejido rígido y cortes utilitarios', categoryTarget: 'pantalones' },
  { id: 'vertice-lab', nombre: 'Vértice Lab', monograma: 'VL', especialidad: 'Active & Dry-Fit', tagline: 'Ingeniería textil transpirable', categoryTarget: 'sports' },
  { id: 'senda-footwear', nombre: 'Senda Minimal', monograma: 'SM', especialidad: 'Sneakers & Cuero', tagline: 'Diseño y confort anatómico', categoryTarget: 'calzado' }
];

export async function getProducts(query: Query) {
  const groups = new Map<number, Record<string, unknown> & { variants: Record<string, unknown>[]; disponible: boolean }>();
  for (const row of await repository.listProducts(query)) {
    let group = groups.get(row.producto_id);
    if (!group) {
      group = { producto_id: row.producto_id, groupId: String(row.producto_id), nombre: row.nombre, descripcion: row.descripcion ?? '', marca: row.marca, categoriaSlug: row.categoriaSlug, genero: row.genero ?? 'Unisex', rango_edad: row.rango_edad ?? null, disponible: false, variants: [] };
      groups.set(row.producto_id, group);
    }
    const available = row.stock > 0;
    group.disponible ||= available;
    group.variants.push({ producto_id: row.producto_id, variante_id: row.variante_id, sku: row.sku, talla: row.talla, color: row.color, colorHex: '#8C817A', color_textura: row.color_textura, alt_text: row.alt_text, precio_venta: Number(row.precio_venta), disponible: available, estado_stock: available ? 'disponible' : 'agotado' });
  }
  return [...groups.values()];
}

export async function getTaxonomy() {
  const taxonomy = await repository.listTaxonomy();
  return { marcas: brands, categorias: taxonomy.categories, subcategorias: taxonomy.subcategories };
}

export async function getInventory(query: Query) {
  return repository.listInventory(query);
}
