import type { ReactNode } from "react";

type ButtonProps = {
  variant?: "default" | "primary";
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
};

export function Button({ variant = "default", disabled = false, onClick, children }: ButtonProps) {
  return (
    <button className={`button button-${variant}`} disabled={disabled} type="button" onClick={onClick}>
      {children}
    </button>
  );
}
