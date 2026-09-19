import { RegionSelector } from '~/features/generation/RegionSelector';
import { cancelSelection, finishSelection } from '~/shared/ipc/commands';

export function SelectionApp() {
  return (
    <RegionSelector
      onPick={(rect) => {
        void finishSelection(rect);
      }}
      onCancel={() => {
        void cancelSelection();
      }}
    />
  );
}
