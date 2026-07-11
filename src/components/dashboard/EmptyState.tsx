// src/components/dashboard/EmptyState.tsx
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

export default function EmptyState({ icon: Icon, title, description, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 py-10 text-center ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-700/50">
        <Icon size={22} className="text-gray-300 dark:text-gray-500" />
      </div>
      <p className="text-sm text-gray-400">{title}</p>
      {description && <p className="text-xs text-gray-300 dark:text-gray-500">{description}</p>}
    </div>
  );
}
