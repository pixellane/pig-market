#!/usr/bin/env node
import fs from 'fs';

const API = process.env.API_BASE || 'http://localhost:5000/api';

async function run() {
  console.log('Fetching products...');
  const prodResp = await fetch(`${API}/products`);
  const products = await prodResp.json();
  if (!products || products.length === 0) {
    console.error('No products available');
    process.exit(1);
  }
  const product = products[0];
  console.log('Using product:', product.id, product.name);

  const payload = {
    customerName: 'E2E Tester',
    address: '123 Test St',
    contactNumber: '9998887777',
    items: [{ productId: product.id, quantityKg: 0.5 }],
  };

  console.log('Posting order...');
  const postResp = await fetch(`${API}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const postBody = await postResp.text();
  console.log('POST status', postResp.status);
  try { console.log('POST body', JSON.parse(postBody)); } catch { console.log('POST body', postBody); }

  console.log('Fetching orders for contact...');
  const listResp = await fetch(`${API}/orders/mine?contactNumber=9998887777`);
  const listBody = await listResp.json();
  console.log('List status', listResp.status);
  console.log(JSON.stringify(listBody, null, 2));

  // write outputs for inspection
  fs.writeFileSync('/tmp/e2e_order_post.json', postBody);
  fs.writeFileSync('/tmp/e2e_order_list.json', JSON.stringify(listBody, null, 2));
}

run().catch((err) => { console.error(err); process.exit(2); });
