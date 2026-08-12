/**
 * Formats a number as Philippine Peso currency with cleaner display
 * - Removes unnecessary .00 from whole numbers
 * - Adds commas for thousands
 * - Always shows ₱ symbol
 * 
 * Examples:
 * formatCurrency(1200) → "₱1,200"
 * formatCurrency(350) → "₱350" 
 * formatCurrency(1200.50) → "₱1,200.50"
 * formatCurrency(999.99) → "₱999.99"
 * formatCurrency(0) → "₱0"
 */
export function formatCurrency(value) {
  const numValue = Number(value);
  
  // Handle invalid values
  if (isNaN(numValue)) {
    return '₱0';
  }
  
  // Format with commas and appropriate decimal places
  const formatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(numValue);
}

// Legacy alias for backward compatibility
export const formatPrice = formatCurrency;