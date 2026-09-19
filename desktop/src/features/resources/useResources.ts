import { useCallback, useEffect, useRef, useState } from 'react';
import { uk } from '~/shared/i18n/uk';
import type { Resource, ResourceScope } from '~/shared/ipc';
import {
  addResourceText,
  deleteResource,
  getResource,
  listResources,
  uploadResource,
} from '~/shared/ipc/commands';
import { errorMessage } from '~/shared/lib/command-error';

const POLL_INTERVAL_MS = 700;

export interface UseResourcesResult {
  resources: Resource[];
  loading: boolean;
  reading: boolean;
  error: string | null;
  addFile: (path: string) => void;
  addText: (name: string, text: string) => void;
  remove: (id: string) => void;
}

/// Reading a document outlives the upload request, so a material arrives pending
/// and is followed until it settles. That wait is also what the start button
/// watches, so the brief is never built from a document nobody has read yet.
export function useResources(scope: ResourceScope, revision = 0): UseResourcesResult {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
    };
  }, []);

  const replace = useCallback((changed: Resource) => {
    setResources((current) => {
      const known = current.some((resource) => resource.id === changed.id);

      return known
        ? current.map((resource) => (resource.id === changed.id ? changed : resource))
        : [changed, ...current];
    });
  }, []);

  useEffect(() => {
    let wanted = true;

    listResources(scope)
      .then((found) => {
        if (wanted) {
          setResources(found);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (wanted) {
          setError(errorMessage(cause, uk.errors.resources));
        }
      })
      .finally(() => {
        if (wanted) {
          setLoading(false);
        }
      });

    return () => {
      wanted = false;
    };
  }, [revision, scope]);

  const pendingIds = resources
    .filter((resource) => resource.status === 'pending')
    .map((resource) => resource.id)
    .join(',');

  /// The list of ids being waited on does not change while they are still being
  /// read, so this has to keep asking on its own. A single timeout asked once and
  /// then sat there saying «Читаємо…» until the screen was opened again.
  useEffect(() => {
    if (pendingIds.length === 0) {
      return;
    }

    let asking = false;
    const timer = setInterval(() => {
      if (asking) {
        return;
      }

      asking = true;
      Promise.all(pendingIds.split(',').map((id) => getResource(id)))
        .then((settled) => {
          if (alive.current) {
            settled.forEach(replace);
          }
        })
        .catch(() => undefined)
        .finally(() => {
          asking = false;
        });
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(timer);
    };
  }, [pendingIds, replace]);

  const addFile = useCallback(
    (path: string) => {
      uploadResource(scope, path)
        .then((added) => {
          if (alive.current) {
            replace(added);
            setError(null);
          }
        })
        .catch((cause: unknown) => {
          setError(errorMessage(cause, uk.errors.resourceSave));
        });
    },
    [replace, scope],
  );

  const addText = useCallback(
    (name: string, text: string) => {
      addResourceText(scope, name, text)
        .then((added) => {
          if (alive.current) {
            replace(added);
            setError(null);
          }
        })
        .catch((cause: unknown) => {
          setError(errorMessage(cause, uk.errors.resourceSave));
        });
    },
    [replace, scope],
  );

  const remove = useCallback((id: string) => {
    deleteResource(id)
      .then(() => {
        if (alive.current) {
          setResources((current) => current.filter((resource) => resource.id !== id));
        }
      })
      .catch((cause: unknown) => {
        setError(errorMessage(cause, uk.errors.resourceDelete));
      });
  }, []);

  return {
    resources,
    loading,
    reading: pendingIds.length > 0,
    error,
    addFile,
    addText,
    remove,
  };
}
