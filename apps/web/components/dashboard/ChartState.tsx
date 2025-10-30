interface ChartStateProps {
  variant: "loading" | "error" | "empty";
  message: string;
  description?: string;
}

const stateStyles: Record<ChartStateProps["variant"], string> = {
  loading: "text-slate-400",
  empty: "text-slate-500",
  error: "text-rose-600",
};

const containerStyles: Record<ChartStateProps["variant"], string> = {
  loading: "",
  empty: "",
  error: "rounded-xl border border-rose-200 bg-rose-50 px-4 py-3",
};

export function ChartState({ variant, message, description }: ChartStateProps) {
  const title = variant === "error" ? "We couldn't load this chart" : message;
  const body =
    variant === "error"
      ? description ?? message
      : description;

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "loading" ? "polite" : "off"}
      className={`mt-8 flex flex-1 flex-col items-center justify-center text-center text-sm ${
        containerStyles[variant]
      } ${stateStyles[variant]}`.trim()}
    >
      <p className="font-medium text-slate-900">{title}</p>
      {body ? (
        <p className="mt-1 max-w-xs text-xs text-slate-500">{body}</p>
      ) : null}
    </div>
  );
}
