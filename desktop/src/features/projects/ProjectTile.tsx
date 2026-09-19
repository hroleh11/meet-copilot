import type { DragEvent, ReactNode } from 'react';

export interface ProjectTileProps {
  active: boolean;
  over: boolean;
  handlers: {
    onDragOver: (event: DragEvent<HTMLElement>) => void;
    onDragLeave: () => void;
    onDrop: (event: DragEvent<HTMLElement>) => void;
  };
  children: ReactNode;
}

export function ProjectTile({ active, over, handlers, children }: ProjectTileProps) {
  const border = over ? 'border-accent bg-accent/10' : 'border-separator';

  return (
    <div
      {...handlers}
      className={`group flex h-14 w-[220px] shrink-0 items-center gap-2 overflow-hidden rounded-md border bg-surface-elevated px-3 transition ${
        active && !over ? 'border-accent' : border
      }`}
    >
      {children}
    </div>
  );
}
