const variants = {
  primary: "bg-brand text-white hover:opacity-90",
  outline: "border border-line bg-card hover:bg-panel",
  ghost: "hover:bg-panel",
};

export default function Button({ variant = "primary", className = "", ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
