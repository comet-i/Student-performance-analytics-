// `right` renders an icon or button inside the field (e.g. mail icon, show-password toggle).
export default function Input({ label, right, className = "", ...props }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <div className="relative mt-1.5">
        <input
          className={`w-full rounded-xl border border-line bg-card px-4 py-3 pr-11 text-sm font-normal outline-none focus:border-brand ${className}`}
          {...props}
        />
        {right && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">{right}</span>}
      </div>
    </label>
  );
}
