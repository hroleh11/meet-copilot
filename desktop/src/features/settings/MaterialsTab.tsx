import { ResourcesPanel } from '~/features/resources/ResourcesPanel';
import { USER_RESOURCES } from '~/features/resources/scopes';
import { useResources } from '~/features/resources/useResources';
import { uk } from '~/shared/i18n/uk';

export function MaterialsTab() {
  const resources = useResources(USER_RESOURCES);

  return (
    <ResourcesPanel
      title={uk.resources.userTitle}
      hint={uk.resources.userHint}
      resources={resources}
    />
  );
}
