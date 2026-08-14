import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);

function readCart() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('pigmarket-cart') || '[]');
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => readCart());

  // Debug: render count for CartProvider
  // CartProvider manages cart items and persists to localStorage

  useEffect(() => {
    localStorage.setItem('pigmarket-cart', JSON.stringify(items));
  }, [items]);

  const total = useMemo(() => items.reduce((sum, item) => sum + item.quantityKg * item.pricePerKg, 0), [items]);

  const addItem = useCallback((product, quantityKg) => {
    const inventoryStock = Math.max(0, Number(product.stockKg) || 0);
    if (inventoryStock <= 0) return;

    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      const alreadyInCart = Math.max(0, Number(existing?.quantityKg) || 0);
      const remaining = Math.max(0, inventoryStock - alreadyInCart);
      const requestedQuantity = Math.min(Math.max(0, Number(quantityKg) || 0), remaining);
      if (requestedQuantity <= 0) return current;

      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? {
              ...item,
              name: product.name,
              pricePerKg: Number(product.pricePerKg),
              // Preserve a reference to the product image so cart can render it
              imageUrl: product.imageUrl || item.imageUrl || null,
              quantityKg: alreadyInCart + requestedQuantity,
              // Live inventory snapshot for cart qty caps — never a DB deduction
              stockKg: inventoryStock,
            }
            : item
        );
      }
      return [...current, {
        productId: product.id,
        name: product.name,
        pricePerKg: Number(product.pricePerKg),
        // Capture product image at the time of adding so cart can display it
        imageUrl: product.imageUrl || null,
        quantityKg: requestedQuantity,
        stockKg: inventoryStock,
      }];
    });
  }, []);

  /**
   * Align cart line caps with live GET /api/products inventory.
   * Does not write to PostgreSQL — only local cart state / localStorage.
   */
  const syncInventory = useCallback((products) => {
    if (!Array.isArray(products)) return;
    const byId = new Map(products.map((product) => [product.id, product]));

    setItems((current) => {
      if (!current.length) return current;
      let changed = false;
      const next = [];
      for (const item of current) {
        const live = byId.get(item.productId);
        if (!live) {
          next.push(item);
          continue;
        }
        const inventoryStock = Math.max(0, Number(live.stockKg) || 0);
        const quantityKg = Math.min(Math.max(0, Number(item.quantityKg) || 0), inventoryStock);
        if (quantityKg <= 0) {
          changed = true;
          continue;
        }
        if (
          Number(item.stockKg) !== inventoryStock
          || Number(item.quantityKg) !== quantityKg
          || Number(item.pricePerKg) !== Number(live.pricePerKg)
          || item.name !== live.name
        ) {
          changed = true;
          next.push({
            ...item,
            name: live.name,
            pricePerKg: Number(live.pricePerKg),
            // Update image reference from live product when available
            imageUrl: live.imageUrl || item.imageUrl || null,
            stockKg: inventoryStock,
            quantityKg,
          });
        } else {
          next.push(item);
        }
      }
      return changed ? next : current;
    });
  }, []);

  /**
   * Live stock snapshot for cart line caps only.
   * Does not change cart quantities (checkout remains the authority).
   */
  const applyLiveStock = useCallback((productId, stockKg) => {
    const inventoryStock = Math.max(0, Number(stockKg) || 0);
    setItems((current) => {
      if (!current.some((item) => item.productId === productId)) return current;
      return current.map((item) => (
        item.productId === productId && Number(item.stockKg) !== inventoryStock
          ? { ...item, stockKg: inventoryStock }
          : item
      ));
    });
  }, []);

  const updateQuantity = useCallback((productId, quantityKg) => {
    setItems((current) => {
      const target = current.find((item) => item.productId === productId);
      if (!target) return current;

      const parsed = Number(quantityKg);
      const stockLimit = Math.max(0, Number(target.stockKg) || 0);
      const safeQuantity = Number.isFinite(parsed) ? parsed : target.quantityKg;
      const clamped = stockLimit <= 0
        ? 0
        : Math.min(Math.max(safeQuantity, 0.5), stockLimit);

      if (clamped <= 0 || stockLimit <= 0) {
        return current.filter((item) => item.productId !== productId);
      }

      return current.map((item) =>
        item.productId === productId ? { ...item, quantityKg: clamped } : item
      );
    });
  }, []);

  const removeItem = useCallback((productId) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, addItem, updateQuantity, removeItem, clear, syncInventory, applyLiveStock, total }),
    [items, addItem, updateQuantity, removeItem, clear, syncInventory, applyLiveStock, total]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('CartContext is required');
  return context;
}
