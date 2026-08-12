export default function AdminCard({ children, className = '' }) {
  return (
    <div className={`rounded-3xl bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function AdminCardHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-2 text-slate-600">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}

export function AdminCardContent({ children, className = '' }) {
  return (
    <div className={`space-y-6 ${className}`}>
      {children}
    </div>
  );
}