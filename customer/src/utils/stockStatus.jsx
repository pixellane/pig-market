export function getStockStatus(stockKg) {
  const stock = Math.max(0, Number(stockKg) || 0);

  if (stock <= 0) {
    return {
      level: 'out_of_stock',
      label: '🔴 Out of Stock',
      shortLabel: '🔴 Out of Stock',
      detail: null,
      message: null,
      tone: 'sold',
      canAdd: false,
    };
  }

  if (stock <= 5) {
    return {
      level: 'low_stock',
      label: '🟡 Low Stock',
      shortLabel: '🟡 Low Stock',
      detail: `Stock: ${formatKg(stock)} kg`,
      message: null,
      tone: 'almost',
      canAdd: true,
    };
  }

  return {
    level: 'available',
    label: '🟢 Available',
    shortLabel: '🟢 Available',
    detail: `Stock: ${formatKg(stock)} kg`,
    message: null,
    tone: 'ok',
    canAdd: true,
  };
}


export function formatKg(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
}

const toneClasses = {
  ok: 'bg-leaf-mist text-leaf',
  limited: 'bg-amber-50 text-amber-800',
  almost: 'bg-orange-50 text-orange-800',
  last: 'bg-burgundy/10 text-burgundy',
  sold: 'bg-stone-200 text-stone-600',
};

export function StockBadge({ stockKg, compact = false }) {
  const status = getStockStatus(stockKg);

  return (
    <div className={`rounded-2xl px-3 py-2 text-xs font-semibold leading-snug sm:text-sm ${toneClasses[status.tone]}`}>
      <div>{compact ? status.shortLabel : status.label}</div>
      {status.detail ? <div className="mt-0.5 font-medium opacity-90">{status.detail}</div> : null}
    </div>
  );
}

/** Renders only when backend provides an active discount field later. */
export function ClearanceBanner({ product, formatPrice }) {
  const discountPercent = Number(product?.discountPercent);
  const hasDiscount = Number.isFinite(discountPercent) && discountPercent > 0;
  if (!hasDiscount) return null;

  const original = Number(product.pricePerKg);
  const sale = original * (1 - discountPercent / 100);
  const stock = getStockStatus(product.stockKg);

  return (
    <div className="rounded-2xl border border-burgundy/20 bg-burgundy/5 px-3 py-2 text-xs sm:text-sm">
      <p className="font-bold text-burgundy">🔥 CLEARANCE SALE</p>
      {stock.detail ? <p className="mt-1 text-burgundy/80">{stock.detail}</p> : null}
      <p className="mt-1 font-semibold text-burgundy">
        {discountPercent}% OFF{' '}
        <span className="text-burgundy/50 line-through">{formatPrice(original)}/kg</span>
        {' → '}
        <span>{formatPrice(sale)}/kg</span>
      </p>
    </div>
  );
}
