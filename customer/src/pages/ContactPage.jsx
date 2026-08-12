import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { resolveImageUrl } from '../utils/imageUrl.js';
import { formatCurrency } from '../utils/currency.js';
import io from 'socket.io-client';
import { getApiBasePath, getSocketUrl } from '../utils/apiUrl.js';

const api = axios.create({ baseURL: getApiBasePath() || '/api' });

// Opening hours concept removed — availability is driven by harvest/production schedule.

const defaultStoreSettings = {
  storeName: 'Heritage Hog Co.',
  contactNumber: '09171234567',
  email: 'freshporkmarket@example.com',
  address: 'Opol, Misamis Oriental',
businessHours: 'Available based on harvest schedule',
  deliveryInformation: 'Local delivery available within the service area.',
  facebookUrl: 'https://www.facebook.com',
};

function isValidSetting(value) {
  if (!value || typeof value !== 'string') return false;
  const normalized = value.trim();
  if (!normalized || normalized === '[Store contact number]' || normalized === '[Store email address]' || normalized === '[Store address]' || normalized === '[Business hours]' || normalized === '[Facebook page URL]') return false;
  if (/^example$/i.test(normalized) || /\[(?:Store|Business) .+\]/i.test(normalized)) return false;
  return true;
}

const weekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function formatTimeLabel(value) {
  if (!value) return 'Closed';
  const [hourString, minuteString] = String(value).split(':');
  const hour = Number(hourString) || 0;
  const minute = Number(minuteString) || 0;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const normalizedHour = ((hour + 11) % 12) + 1;
  return `${normalizedHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function isValidUrl(value) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

export default function ContactPage() {
  const [storeSettings, setStoreSettings] = useState(defaultStoreSettings);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', message: '', agree: false });
  const [formStatus, setFormStatus] = useState('');

  useEffect(() => {
    let active = true;
    let socket = null;

    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const [settingsResp, productsResp] = await Promise.all([
          api.get('/settings'),
          api.get('/products'),
        ]);
        if (!active) return;
        setStoreSettings({ ...defaultStoreSettings, ...settingsResp.data });
        setProducts(productsResp.data || []);
      } catch (err) {
        if (!active) return;
        setError('Unable to load contact settings or products. Please refresh the page.');
      } finally {
        if (active) setLoading(false);
      }
    }

    function setupRealtime() {
      const socketUrl = getSocketUrl();

      socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
      });

      socket.on('settings:update', (updatedSettings) => {
        if (active && updatedSettings) {
          setStoreSettings({ ...defaultStoreSettings, ...updatedSettings });
        }
      });

      socket.on('connect_error', (error) => {
        console.warn('Settings real-time connection failed:', error.message);
      });
    }

    loadData();
    setupRealtime();

    return () => {
      active = false;
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!form.agree) {
      setFormStatus('Please agree to the terms and conditions before sending your message.');
      return;
    }
    setFormStatus('The contact form is not currently connected to a messaging service. Please reach out using the phone, email, or Facebook information above.');
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-burgundy/70">
        <p className="text-lg font-semibold">Loading contact information...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[2rem] bg-white p-6 shadow-card sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-burgundy">Contact & Availability</h1>
            <p className="mt-2 max-w-2xl text-sm text-burgundy/70">Find store contact details and availability information. Reach out if you need help with your order.</p>
          </div>
          <Link to="/" className="market-btn w-full max-w-xs justify-center sm:w-auto">Back to Home</Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50/40 p-6 text-center text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6 rounded-[2rem] bg-white p-6 shadow-card sm:p-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-burgundy">Availability</h2>
            <p className="mt-2 text-sm text-burgundy/70">Product availability follows our harvest and production schedule rather than fixed daily opening hours.</p>
          </div>
          <div className="space-y-3 rounded-[2rem] border border-burgundy/10 bg-cream-50 p-5 text-sm text-burgundy/80">
            <div>
              <p className="text-sm text-burgundy/80">We prepare and sell fresh pork based on our production/harvest schedule (typically when animals reach the appropriate size, around 3–4 months). Availability can vary — please contact the shop for the latest schedule and product availability.</p>
            </div>
            {isValidSetting(storeSettings.businessHours) ? (
              <div className="mt-2 text-sm text-burgundy/70">Note: {storeSettings.businessHours}</div>
            ) : null}
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-burgundy">Store Information</h2>
            <p className="mt-2 text-sm text-burgundy/70">All shop details are fetched from the current store settings.</p>
          </div>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-3xl border border-burgundy/10 bg-cream-50 p-5">
              <dt className="font-semibold text-burgundy">Address</dt>
              <dd className="mt-1 text-burgundy/80 break-words">{isValidSetting(storeSettings.address) ? storeSettings.address : 'Address is not configured.'}</dd>
            </div>
            <div className="rounded-3xl border border-burgundy/10 bg-cream-50 p-5">
              <dt className="font-semibold text-burgundy">Phone</dt>
              <dd className="mt-1 text-burgundy/80">{isValidSetting(storeSettings.contactNumber) ? storeSettings.contactNumber : 'Phone is not configured.'}</dd>
            </div>
            <div className="rounded-3xl border border-burgundy/10 bg-cream-50 p-5">
              <dt className="font-semibold text-burgundy">Email</dt>
              <dd className="mt-1 text-burgundy/80">{isValidSetting(storeSettings.email) ? storeSettings.email : 'Email is not configured.'}</dd>
            </div>
            <div className="rounded-3xl border border-burgundy/10 bg-cream-50 p-5">
              <dt className="font-semibold text-burgundy">Facebook</dt>
              <dd className="mt-1 text-burgundy/80">
                {isValidUrl(storeSettings.facebookUrl) && storeSettings.facebookUrl !== 'https://www.facebook.com' ? (
                  <a href={storeSettings.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-burgundy hover:underline">Visit our Facebook page</a>
                ) : (
                  <span className="text-rose-600">Facebook is not configured or is a placeholder</span>
                )}
              </dd>
            </div>
          </dl>

          <div className="rounded-[2rem] border border-burgundy/10 bg-white p-5 shadow-sm">
            <h3 className="font-display text-xl font-bold text-burgundy">Follow Heritage Hog Co.</h3>
            <p className="mt-2 text-sm text-burgundy/70">Open the shop's Facebook page in a new tab when available.</p>
            {isValidUrl(storeSettings.facebookUrl) && storeSettings.facebookUrl !== 'https://www.facebook.com' ? (
              <a href={storeSettings.facebookUrl} target="_blank" rel="noopener noreferrer" className="market-btn-secondary mt-4 inline-flex">Visit Our Facebook Page</a>
            ) : (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-rose-600">Facebook URL is not configured or is a placeholder.</p>
                <p className="text-xs text-burgundy/60">If you have a Facebook page, add its full URL in store settings to enable this link.</p>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-6 rounded-[2rem] bg-white p-6 shadow-card sm:p-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-burgundy">Get in Touch</h2>
            <p className="mt-2 text-sm text-burgundy/70">Have a question about our pork products, orders, delivery, or preparation? Our team is happy to help.</p>
          </div>

          <div className="rounded-3xl border border-burgundy/10 bg-cream-50 p-5 text-sm text-burgundy/75">
            <p>Please contact us directly using the phone number, email address, or Facebook link shown above. The site does not currently provide an in-page messaging service.</p>
          </div>

          <div className="rounded-2xl border border-burgundy/10 bg-cream-50 p-5">
            <h3 className="font-display text-lg font-bold text-burgundy">Frequently Asked Questions</h3>
            <div className="mt-3 space-y-3 text-sm text-burgundy/75">
              <div>
                <div className="font-semibold">How do I place an order?</div>
                <div>Browse products, add desired kilos to your cart, go to Checkout, enter your contact and delivery address, then place the order. The backend creates a real order and returns a reference.</div>
              </div>
              <div>
                <div className="font-semibold">How can I track my order?</div>
                <div>After checkout we save your contact number locally. Visit My Orders and enter the same contact number to view and track your orders.</div>
              </div>
              <div>
                <div className="font-semibold">Can I cancel my order?</div>
                <div>If the backend allows cancellation for the order's current status (typically while Pending or Confirmed), you will see a Cancel button in My Orders. Cancellation is processed by the backend and may restore inventory there.</div>
              </div>
              <div>
                <div className="font-semibold">How is the meat sold?</div>
                <div>Meat is sold by kilogram. On product pages and in the cart you select the quantity in kg.</div>
              </div>
              <div>
                <div className="font-semibold">What happens if an item is out of stock?</div>
                <div>The storefront hides unavailable products where appropriate. If stock changes during checkout the backend validates the order and will return an error if there is insufficient stock.</div>
              </div>
              <div>
                <div className="font-semibold">How can I contact the store?</div>
                <div>Use the phone number, email, or Facebook link shown on this page. The contact form on this page is a placeholder and does not send messages yet.</div>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-burgundy/10 bg-white p-5 shadow-sm">
            <h3 className="font-display text-xl font-bold text-burgundy">Shop</h3>
            <p className="mt-2 text-sm text-burgundy/70">Browse our actual products from the fresh store inventory.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/" className="market-btn inline-flex">🛒 Browse Products</Link>
              <Link to="/my-orders" className="market-btn-secondary inline-flex">📦 My Orders</Link>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {products.slice(0, 4).map((product) => (
                <Link key={product.id} to={`/products/${product.id}`} className="rounded-3xl border border-burgundy/10 bg-cream-50 p-4 text-left hover:border-burgundy/20">
                  <div className="flex items-center gap-3">
                    {product.imageUrl ? (
                      <img src={resolveImageUrl(product.imageUrl)} alt={product.name} className="h-16 w-16 rounded-2xl object-cover" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-xs text-burgundy/50">No Image</div>
                    )}
                    <div>
                      <p className="font-semibold text-burgundy">{product.name}</p>
                      <p className="mt-1 text-sm text-burgundy/60">{formatCurrency(product.pricePerKg)} / kg</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
