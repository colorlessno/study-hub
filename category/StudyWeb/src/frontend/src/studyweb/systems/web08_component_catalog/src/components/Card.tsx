import type { ReactNode } from "react";

type CardProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function Card({ title, description, children }: CardProps) {
  return (
    <article className="card">
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </article>
  );
}
