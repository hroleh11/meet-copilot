import { uk } from '~/shared/i18n/uk';
import { useRegionDrag, type Rect } from './useRegionDrag';

export interface RegionSelectorProps {
  onPick: (rect: Rect) => void;
  onCancel: () => void;
}

export function RegionSelector({ onPick, onCancel }: RegionSelectorProps) {
  const drag = useRegionDrag(onPick, onCancel);

  return (
    <main
      className={`relative h-screen w-screen cursor-crosshair select-none ${
        drag.rect ? 'bg-transparent' : 'bg-black/30'
      }`}
      onPointerDown={drag.onPointerDown}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
      onContextMenu={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      {drag.rect ? (
        <div
          className="absolute border border-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.3)]"
          style={{
            left: drag.rect.x,
            top: drag.rect.y,
            width: drag.rect.width,
            height: drag.rect.height,
          }}
        />
      ) : (
        <p className="absolute top-12 w-full text-center text-body text-white/85">
          {uk.answer.selectRegion}
        </p>
      )}
    </main>
  );
}
