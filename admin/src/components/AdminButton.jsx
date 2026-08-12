export default function AdminButton({ 
  children, 
  variant = 'primary', 
  size = 'default',
  disabled = false,
  className = '',
  ...props 
}) {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-2xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-900',
    secondary: 'bg-slate-200 text-slate-700 hover:bg-slate-300 focus:ring-slate-500',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500',
    warning: 'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500',
    outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-500',
    ghost: 'text-slate-600 hover:bg-slate-100 focus:ring-slate-500',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    default: 'px-4 py-3 text-sm',
    lg: 'px-6 py-4 text-base',
  };
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

export function AdminButtonGroup({ children, className = '' }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {children}
    </div>
  );
}