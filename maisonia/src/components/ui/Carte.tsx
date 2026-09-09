import type { ReactNode } from "react";
import { clsx } from "clsx";

interface ProprietesCarte {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  interactif?: boolean;
}

export function Carte({
  children,
  className,
  onClick,
  interactif = false,
}: ProprietesCarte): React.JSX.Element {
  return (
    <div
      className={clsx(
        "rounded-xl bg-fond-surface p-4 shadow-lg",
        interactif &&
          "cursor-pointer transition-all duration-200 hover:bg-fond-surface-claire hover:shadow-xl",
        className
      )}
      onClick={onClick}
      role={interactif ? "button" : undefined}
      tabIndex={interactif ? 0 : undefined}
      onKeyDown={
        interactif
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
