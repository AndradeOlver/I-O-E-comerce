import { getPool, sql } from '../../config/db.js';

export async function listProducts(query: Record<string, unknown>) {
  const request = (await getPool()).request();
  const filters = ['p.activo = 1', 'pv.activo = 1'];
  if (typeof query.q === 'string' && query.q.trim()) {
    request.input('q', sql.NVarChar(120), `%${query.q.trim()}%`);
    filters.push('(p.nombre LIKE @q OR p.marca LIKE @q OR pv.sku LIKE @q)');
  }
  if (typeof query.categoria === 'string' && query.categoria) {
    request.input('categoria', sql.NVarChar(80), query.categoria);
    filters.push('c.slug = @categoria');
  }
  return (await request.query(
    `SELECT p.producto_id, pv.variante_id, pv.sku, p.nombre, p.descripcion, p.marca, c.slug AS categoriaSlug, p.genero, p.rango_edad, pv.talla, pv.color, pv.color_textura, pv.alt_text, pv.precio_venta, pv.stock FROM dbo.Producto p JOIN dbo.ProductoVariante pv ON pv.producto_id = p.producto_id JOIN dbo.Categoria c ON c.categoria_id = p.categoria_id WHERE ${filters.join(' AND ')} ORDER BY p.producto_id, pv.variante_id`
  )).recordset;
}

export async function listTaxonomy() {
  const pool = await getPool();
  const [categories, subcategories] = await Promise.all([
    pool.request().query('SELECT categoria_id, slug, nombre, descripcion, orden FROM dbo.Categoria WHERE activo = 1 ORDER BY orden'),
    pool.request().query('SELECT s.subcategoria_id, s.categoria_id, c.slug AS categorySlug, s.slug, s.nombre, s.aplica_hombre AS aplicaHombre, s.aplica_mujer AS aplicaMujer, s.aplica_ninos AS aplicaNinos FROM dbo.Subcategoria s JOIN dbo.Categoria c ON c.categoria_id = s.categoria_id WHERE s.activo = 1 ORDER BY s.categoria_id, s.orden')
  ]);
  return { categories: categories.recordset, subcategories: subcategories.recordset };
}

export async function listInventory(query: Record<string, unknown>) {
  const request = (await getPool()).request();
  const filters = ['p.activo = 1', 'pv.activo = 1'];
  if (typeof query.q === 'string' && query.q.trim()) {
    request.input('q', sql.NVarChar(120), `%${query.q.trim()}%`);
    filters.push('(p.nombre LIKE @q OR p.marca LIKE @q OR pv.sku LIKE @q)');
  }
  if (query.solo_stock === 'true') filters.push('pv.stock > 0');
  if (query.stock_critico === 'true') filters.push('pv.stock <= pv.stock_minimo');
  return (await request.query(
    `SELECT p.producto_id, pv.variante_id, CONVERT(NVARCHAR(40), p.producto_id) AS groupId, pv.sku, p.nombre, p.marca, c.slug AS categorySlug, pv.talla, pv.color, pv.color_textura, pv.precio_compra, pv.precio_venta, pv.stock, pv.stock_minimo, pv.activo FROM dbo.Producto p JOIN dbo.ProductoVariante pv ON pv.producto_id = p.producto_id JOIN dbo.Categoria c ON c.categoria_id = p.categoria_id WHERE ${filters.join(' AND ')} ORDER BY p.nombre, pv.talla`
  )).recordset;
}
