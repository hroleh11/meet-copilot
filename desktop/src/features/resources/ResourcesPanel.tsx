import { useState } from 'react';
import { uk } from '~/shared/i18n/uk';
import type { Resource } from '~/shared/ipc';
import { Button, PlusIcon, SectionLabel } from '~/shared/ui';
import { ResourceRow } from './ResourceRow';
import { ResourceViewer } from './ResourceViewer';
import { TextResourceForm } from './TextResourceForm';
import { pickResourceFile } from './pickResourceFile';
import { megabytes, useResourceLimits } from './useResourceLimits';
import type { UseResourcesResult } from './useResources';

export interface ResourcesPanelProps {
  title: string;
  hint?: string;
  resources: UseResourcesResult;
}

export function ResourcesPanel({ title, hint, resources }: ResourcesPanelProps) {
  const [writing, setWriting] = useState(false);
  const [opened, setOpened] = useState<Resource | null>(null);
  const limits = useResourceLimits();

  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>{title}</SectionLabel>
      {hint ? <p className="text-caption text-ink-tertiary">{hint}</p> : null}

      <div className="flex flex-col rounded-lg border border-separator bg-surface-elevated">
        {resources.resources.length === 0 && !writing ? (
          <p className="px-4 py-3 text-caption text-ink-tertiary">{uk.resources.empty}</p>
        ) : (
          <ul className="flex flex-col">
            {resources.resources.map((resource) => (
              <ResourceRow
                key={resource.id}
                resource={resource}
                onOpen={setOpened}
                onRemove={resources.remove}
              />
            ))}
          </ul>
        )}

        {writing ? (
          <TextResourceForm
            maxChars={limits?.maxTextChars ?? null}
            onSave={(name, text) => {
              resources.addText(name, text);
              setWriting(false);
            }}
            onCancel={() => {
              setWriting(false);
            }}
          />
        ) : (
          <div className="flex gap-2 border-t border-separator px-4 py-2">
            <Button
              type="button"
              variant="ghost"
              className="h-8"
              onClick={() => {
                void pickResourceFile().then((path) => {
                  if (path) {
                    resources.addFile(path);
                  }
                });
              }}
            >
              <PlusIcon size={14} />
              {uk.resources.addFile}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="h-8"
              onClick={() => {
                setWriting(true);
              }}
            >
              {uk.resources.addText}
            </Button>

            {limits ? (
              <span className="ml-auto self-center text-caption text-ink-tertiary">
                {uk.resources.limits.replace('{size}', megabytes(limits.maxBytes))}
              </span>
            ) : null}
          </div>
        )}
      </div>

      {resources.error ? (
        <p className="text-caption text-danger">{resources.error}</p>
      ) : null}

      {opened ? (
        <ResourceViewer
          resourceId={opened.id}
          name={opened.name}
          onClose={() => {
            setOpened(null);
          }}
        />
      ) : null}
    </section>
  );
}
