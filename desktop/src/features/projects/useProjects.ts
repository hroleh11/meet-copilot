import { useCallback, useEffect, useState } from 'react';
import { uk } from '~/shared/i18n/uk';
import type { Project } from '~/shared/ipc';
import {
  createProject,
  deleteProject,
  listProjects,
  renameProject,
} from '~/shared/ipc/commands';
import { errorMessage } from '~/shared/lib/command-error';

interface UseProjectsResult {
  projects: Project[];
  loading: boolean;
  error: string | null;
  create: (name: string) => void;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
}

/// Counts live on the backend, and a meeting dropped on a card changes two of
/// them at once, so the list is read again on every change instead of being
/// patched here.
export function useProjects(revision: number, onChanged: () => void): UseProjectsResult {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let wanted = true;

    listProjects()
      .then((found) => {
        if (wanted) {
          setProjects(found);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (wanted) {
          setError(errorMessage(cause, uk.errors.projects));
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
  }, [revision]);

  const create = useCallback(
    (name: string) => {
      createProject(name)
        .then(onChanged)
        .catch((cause: unknown) => {
          setError(errorMessage(cause, uk.errors.projectSave));
        });
    },
    [onChanged],
  );

  const rename = useCallback(
    (id: string, name: string) => {
      renameProject(id, name)
        .then(onChanged)
        .catch((cause: unknown) => {
          setError(errorMessage(cause, uk.errors.projectSave));
        });
    },
    [onChanged],
  );

  const remove = useCallback(
    (id: string) => {
      deleteProject(id)
        .then(onChanged)
        .catch((cause: unknown) => {
          setError(
            errorMessage(cause, uk.errors.projectDelete, {
              conflict: uk.errors.liveMeeting,
            }),
          );
        });
    },
    [onChanged],
  );

  return { projects, loading, error, create, rename, remove };
}
