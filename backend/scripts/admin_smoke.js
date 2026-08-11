#!/usr/bin/env node
import fs from 'fs';

const API = process.env.API_BASE || 'http://localhost:5000/api';
const adminCreds = { email: 'admin@pigmarket.local', password: 'password123' };

async function run() {
  const results = {};
  console.log('1) Admin login');
  try {
    const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(adminCreds) });
    const j = await r.json();
    if (!j.token) throw new Error('no token');
    results.login = { ok: true, token: j.token };
    console.log('  login OK');
  } catch (err) { results.login = { ok: false, error: String(err) }; console.log('  login FAIL', err); }

  const token = results.login.token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  console.log('2) Create product (admin POST /products)');
  let created;
  try {
    const payload = { name: 'Smoke Test Pork', description: 'temp', pricePerKg: 123.45, stockKg: 9.5, isActive: true };
    const r = await fetch(`${API}/products`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify(payload) });
    const j = await r.json();
    if (r.status !== 201) throw new Error(JSON.stringify(j));
    created = j;
    results.create = { ok: true, product: j };
    console.log('  created', j.id);
  } catch (err) { results.create = { ok: false, error: String(err) }; console.log('  create FAIL', err); }

  console.log('3) Update product price/stock (PUT /products/:id)');
  try {
    const r = await fetch(`${API}/products/${created.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify({ pricePerKg: 200, stockKg: 20 }) });
    const j = await r.json();
    if (!j || j.pricePerKg !== '200') {
      if (!(j && (j.pricePerKg === 200 || j.pricePerKg === '200'))) throw new Error(JSON.stringify(j));
    }
    results.update = { ok: true, product: j };
    console.log('  update OK');
  } catch (err) { results.update = { ok: false, error: String(err) }; console.log('  update FAIL', err); }

  console.log('4) Upload product image (POST /products/:id/image)');
  try {
    const jpg = Buffer.from(
      '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBUQEBAVFRUVFRUVFRUVFRUWFxUVFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGxAQGy0lHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAbAAACAwEBAQAAAAAAAAAAAAADBAECBQYAB//EADkQAAIBAgQDBgUEAwEBAAAAAAECAwQRAAUSITFBBhMiUWEycYGRoRQjQrHB0fAVYvEkM1Jy/8QAGQEAAwEBAQAAAAAAAAAAAAAAAAECAwQF/8QAIhEAAgICAgMBAQEAAAAAAAAAAAECEQMhEjEEQVFhInH/2gAMAwEAAhEDEQA/APfYQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/2Q==',
      'base64'
    );
    const form = new FormData();
    form.append('image', new Blob([jpg], { type: 'image/jpeg' }), 'smoke-test.jpg');
    const r = await fetch(`${API}/products/${created.id}/image`, { method: 'POST', headers: { ...authHeaders }, body: form });
    const j = await r.json();
    if (!j?.product?.imageUrl || !String(j.product.imageUrl).startsWith('/uploads/products/')) {
      throw new Error(JSON.stringify(j));
    }
    results.upload = { ok: true, product: j.product };
    console.log('  upload OK', j.product.imageUrl);
  } catch (err) { results.upload = { ok: false, error: String(err) }; console.log('  upload FAIL', err); }

  console.log('5) Get orders (admin GET /orders)');
  try {
    const r = await fetch(`${API}/orders`, { headers: authHeaders });
    const j = await r.json();
    if (!Array.isArray(j)) throw new Error('not array');
    results.orders = { ok: true, count: j.length };
    console.log('  orders OK count=', j.length);
  } catch (err) { results.orders = { ok: false, error: String(err) }; console.log('  orders FAIL', err); }

  console.log('6) Get buyers (admin GET /orders/buyers)');
  try {
    const r = await fetch(`${API}/orders/buyers`, { headers: authHeaders });
    const j = await r.json();
    if (!Array.isArray(j)) throw new Error('not array');
    results.buyers = { ok: true, count: j.length };
    console.log('  buyers OK count=', j.length);
  } catch (err) { results.buyers = { ok: false, error: String(err) }; console.log('  buyers FAIL', err); }

  console.log('7) Regenerate descriptions (admin POST /products/regenerate-descriptions)');
  try {
    const r = await fetch(`${API}/products/regenerate-descriptions`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify({ ids: [created.id] }) });
    const j = await r.json();
    if (!j || typeof j.updatedCount === 'undefined') throw new Error(JSON.stringify(j));
    results.regenerate = { ok: true, updatedCount: j.updatedCount };
    console.log('  regenerate OK', j.updatedCount);
  } catch (err) { results.regenerate = { ok: false, error: String(err) }; console.log('  regenerate FAIL', err); }

  console.log('8) Delete product (admin DELETE /products/:id)');
  try {
    const r = await fetch(`${API}/products/${created.id}`, { method: 'DELETE', headers: authHeaders });
    if (r.status !== 204) {
      const j = await r.text();
      throw new Error(`status ${r.status} ${j}`);
    }
    results.delete = { ok: true };
    console.log('  delete OK');
  } catch (err) { results.delete = { ok: false, error: String(err) }; console.log('  delete FAIL', err); }

  console.log('9) Product filters (GET /products?search=Smoke)');
  try {
    const r = await fetch(`${API}/products?search=Smoke`);
    const j = await r.json();
    results.filters = { ok: true, returned: Array.isArray(j) ? j.length : null };
    console.log('  filters returned', results.filters.returned);
  } catch (err) { results.filters = { ok: false, error: String(err) }; console.log('  filters FAIL', err); }

  console.log('10) CSV export (customer-facing export endpoint)');
  try {
    const r = await fetch(`${API}/orders/mine/export?contactNumber=9998887777`);
    const txt = await r.text();
    if (!txt.startsWith('orderId')) throw new Error('invalid csv');
    results.csv = { ok: true, length: txt.length };
    console.log('  csv OK len=', txt.length);
  } catch (err) { results.csv = { ok: false, error: String(err) }; console.log('  csv FAIL', err); }

  fs.writeFileSync('/tmp/admin_smoke_results.json', JSON.stringify(results, null, 2));
  console.log('\nSummary written to /tmp/admin_smoke_results.json');
}

run().catch((e) => { console.error(e); process.exit(1); });
