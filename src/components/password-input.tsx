"use client";

import { useState } from "react";

export function PasswordInput({
  name,
  placeholder,
  minLength,
  required,
  defaultValue,
  autoComplete,
  className,
}: {
  name: string;
  placeholder?: string;
  minLength?: number;
  required?: boolean;
  defaultValue?: string;
  autoComplete?: string;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const ignoreManagers = autoComplete === "off";

  return (
    <div className="relative">
      <input
        className={`field pr-12 ${className ?? ""}`.trim()}
        type={visible ? "text" : "password"}
        name={name}
        placeholder={placeholder}
        minLength={minLength}
        required={required}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        data-1p-ignore={ignoreManagers || undefined}
        data-lpignore={ignoreManagers ? "true" : undefined}
        data-bwignore={ignoreManagers || undefined}
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)]"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
