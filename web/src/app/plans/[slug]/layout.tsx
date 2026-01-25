import { ReactNode } from "react";

interface PlanLayoutProps {
  children: ReactNode;
}

export default function PlanLayout({ children }: PlanLayoutProps) {
  return <div className="max-w-4xl mx-auto">{children}</div>;
}
