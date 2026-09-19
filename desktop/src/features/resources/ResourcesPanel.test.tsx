import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResourcesPanel } from '~/features/resources/ResourcesPanel';
import type { UseResourcesResult } from '~/features/resources/useResources';
import { uk } from '~/shared/i18n/uk';
import type { Resource } from '~/shared/ipc';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@tauri-apps/api/core', () => ({ invoke }));

invoke.mockImplementation((command: string) => {
  if (command === 'resource_limits') {
    return Promise.resolve({ maxBytes: 10_485_760, maxTextChars: 1_000 });
  }

  if (command === 'resource_content') {
    return Promise.resolve({
      name: 'cv.pdf',
      text: 'Сім років на Rust і TypeScript.',
      digest: null,
      chars: 31,
    });
  }

  return Promise.resolve(null);
});

const resource = (over: Partial<Resource> = {}): Resource => ({
  id: 'res-1',
  projectId: null,
  meetingId: null,
  kind: 'pdf',
  name: 'cv.pdf',
  byteSize: 84_211,
  status: 'ready',
  failure: null,
  createdAt: '2026-09-19T00:00:00.000Z',
  ...over,
});

function state(over: Partial<UseResourcesResult> = {}): UseResourcesResult {
  return {
    resources: [resource()],
    loading: false,
    reading: false,
    error: null,
    addFile: vi.fn(),
    addText: vi.fn(),
    remove: vi.fn(),
    ...over,
  };
}

describe('ResourcesPanel', () => {
  it('invites the first material when there is none', () => {
    render(
      <ResourcesPanel
        title={uk.resources.userTitle}
        resources={state({ resources: [] })}
      />,
    );

    expect(screen.getByText(uk.resources.empty)).toBeInTheDocument();
  });

  it('says a material is still being read', () => {
    render(
      <ResourcesPanel
        title={uk.resources.userTitle}
        resources={state({ resources: [resource({ status: 'pending' })] })}
      />,
    );

    expect(screen.getByText(uk.resources.pending)).toBeInTheDocument();
  });

  it('names the reason a material could not be taken in', () => {
    render(
      <ResourcesPanel
        title={uk.resources.userTitle}
        resources={state({
          resources: [resource({ status: 'failed', failure: 'no_text_layer' })],
        })}
      />,
    );

    expect(screen.getByText(uk.resources.failures.no_text_layer)).toBeInTheDocument();
  });

  it('says so when the file store is the thing that is down', () => {
    render(
      <ResourcesPanel
        title={uk.resources.userTitle}
        resources={state({
          resources: [resource({ status: 'failed', failure: 'storage' })],
        })}
      />,
    );

    expect(screen.getByText(uk.resources.failures.storage)).toBeInTheDocument();
  });

  it('takes a material away', () => {
    const remove = vi.fn();
    render(
      <ResourcesPanel title={uk.resources.userTitle} resources={state({ remove })} />,
    );

    fireEvent.click(screen.getByLabelText(uk.resources.remove));

    expect(remove).toHaveBeenCalledWith('res-1');
  });

  it('keeps pasted text until it has both a name and a body', () => {
    const addText = vi.fn();
    render(
      <ResourcesPanel title={uk.resources.userTitle} resources={state({ addText })} />,
    );

    fireEvent.click(screen.getByText(uk.resources.addText));

    const save = screen.getByText(uk.resources.save);
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText(uk.resources.namePlaceholder), {
      target: { value: 'Вакансія' },
    });
    fireEvent.change(screen.getByLabelText(uk.resources.textPlaceholder), {
      target: { value: 'Senior Rust' },
    });
    fireEvent.click(save);

    expect(addText).toHaveBeenCalledWith('Вакансія', 'Senior Rust');
  });
});

describe('ResourcesPanel, looking inside a material', () => {
  it('says how large a file may be', async () => {
    render(<ResourcesPanel title={uk.resources.userTitle} resources={state()} />);

    expect(
      await screen.findByText(uk.resources.limits.replace('{size}', '10 МБ')),
    ).toBeInTheDocument();
  });

  it('shows what was read out of a material that is ready', async () => {
    render(<ResourcesPanel title={uk.resources.userTitle} resources={state()} />);

    fireEvent.click(screen.getByText('cv.pdf'));

    await waitFor(() => {
      expect(screen.getByText('Сім років на Rust і TypeScript.')).toBeInTheDocument();
    });
  });

  it('does not open a material that could not be read', () => {
    render(
      <ResourcesPanel
        title={uk.resources.userTitle}
        resources={state({
          resources: [resource({ status: 'failed', failure: 'storage' })],
        })}
      />,
    );

    fireEvent.click(screen.getByText('cv.pdf'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
