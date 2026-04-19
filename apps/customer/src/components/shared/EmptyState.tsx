import { LucideIcon } from 'lucide-react';
import { Button } from '../ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-6 py-12">
      <div className="w-24 h-24 bg-stone-100 dark:bg-stone-900 rounded-full flex items-center justify-center border border-dashed border-stone-200 dark:border-stone-800">
        <Icon className="w-10 h-10 text-stone-300 dark:text-stone-600" />
      </div>
      <div className="space-y-2">
        <p className="text-xl font-black tracking-tight">{title}</p>
        <p className="text-sm text-stone-500 max-w-[250px] font-medium leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="h-14 px-8 rounded-2xl">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
