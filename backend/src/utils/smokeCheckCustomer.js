import axios from 'axios';

async function run() {
  const apiBase = process.env.API_BASE || 'http://localhost:5000/api';
  const customerUrl = process.env.CUSTOMER_URL || 'http://localhost:5175/';

  console.log('Fetching products from', apiBase + '/products');
  const { data: products } = await axios.get(`${apiBase}/products`);
  console.log(`Found ${products.length} products`);

  let allImagesOk = true;
  for (const p of products) {
    const url = p.imageUrl;
    try {
      const resp = await axios.head(url, { timeout: 5000 });
      console.log(`Image OK for ${p.name}: ${url} -> ${resp.status}`);
    } catch (err) {
      allImagesOk = false;
      console.error(`Image FAILED for ${p.name}: ${url} -> ${err.message}`);
    }
  }

  try {
    const r = await axios.get(customerUrl, { timeout: 5000 });
    console.log(`Customer app reachable: ${customerUrl} -> ${r.status}`);
  } catch (err) {
    console.error(`Customer app unreachable: ${customerUrl} -> ${err.message}`);
    process.exit(2);
  }

  if (!allImagesOk) process.exit(1);
  console.log('Smoke check passed');
}

run().catch((e) => {
  console.error('Smoke check error', e.message || e);
  process.exit(3);
});
