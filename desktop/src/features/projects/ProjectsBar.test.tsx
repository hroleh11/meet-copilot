import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectsBar } from '~/features/projects/ProjectsBar';
import type { ProjectsBarProps } from '~/features/projects/ProjectsBar';
import type { Project } from '~/shared/ipc';
import { MEETING_DRAG_TYPE } from '~/shared/lib/meetingDrag';

const project = (over: Partial<Project> = {}): Project => ({
  id: 'p-1',
  name: 'Співбесіда в Acme',
  meetingCount: 3,
  createdAt: '2026-09-18T00:00:00.000Z',
  updatedAt: '2026-09-19T00:00:00.000Z',
  ...over,
});

function props(over: Partial<ProjectsBarProps> = {}): ProjectsBarProps {
  return {
    projects: [project()],
    error: null,
    scope: { kind: 'all' },
    onScope: vi.fn(),
    onCreate: vi.fn(),
    onRename: vi.fn(),
    onRemove: vi.fn(),
    onMoveMeeting: vi.fn(),
    ...over,
  };
}

const dropped = { dataTransfer: { types: [MEETING_DRAG_TYPE], getData: () => 'm-1' } };

describe('ProjectsBar', () => {
  it('moves a meeting dropped on a project into it', () => {
    const onMoveMeeting = vi.fn();
    render(<ProjectsBar {...props({ onMoveMeeting })} />);

    fireEvent.drop(screen.getByText('Співбесіда в Acme').closest('div')!, dropped);

    expect(onMoveMeeting).toHaveBeenCalledWith('m-1', 'p-1');
  });

  it('takes a meeting dropped outside every project out of its own', () => {
    const onMoveMeeting = vi.fn();
    render(<ProjectsBar {...props({ onMoveMeeting })} />);

    fireEvent.drop(screen.getByText('Без проєкту').closest('div')!, dropped);

    expect(onMoveMeeting).toHaveBeenCalledWith('m-1', null);
  });

  it('filters the list by the project that was clicked', () => {
    const onScope = vi.fn();
    render(<ProjectsBar {...props({ onScope })} />);

    fireEvent.click(screen.getByText('Співбесіда в Acme'));

    expect(onScope).toHaveBeenCalledWith({ kind: 'project', id: 'p-1' });
  });

  it('shows everything again when the open project is clicked twice', () => {
    const onScope = vi.fn();
    render(
      <ProjectsBar {...props({ onScope, scope: { kind: 'project', id: 'p-1' } })} />,
    );

    fireEvent.click(screen.getByText('Співбесіда в Acme'));

    expect(onScope).toHaveBeenCalledWith({ kind: 'all' });
  });

  it('warns that the meetings go with the project', () => {
    render(<ProjectsBar {...props()} />);

    fireEvent.click(screen.getByLabelText('Видалити проєкт'));

    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'зникне разом з усіма зустрічами в ньому (3)',
    );
  });

  it('does not promise deleted meetings when the project is empty', () => {
    render(<ProjectsBar {...props({ projects: [project({ meetingCount: 0 })] })} />);

    fireEvent.click(screen.getByLabelText('Видалити проєкт'));

    expect(screen.getByRole('alertdialog')).not.toHaveTextContent('зустрічами');
  });

  it('deletes the project only after the dialog is confirmed', () => {
    const onRemove = vi.fn();
    render(<ProjectsBar {...props({ onRemove })} />);

    fireEvent.click(screen.getByLabelText('Видалити проєкт'));
    expect(onRemove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Видалити' }));

    expect(onRemove).toHaveBeenCalledWith('p-1');
  });

  it('creates a project from the name typed in the card', () => {
    const onCreate = vi.fn();
    render(<ProjectsBar {...props({ onCreate })} />);

    fireEvent.click(screen.getByText('Новий проєкт'));
    fireEvent.change(screen.getByLabelText('Назва проєкту'), {
      target: { value: 'Клієнт Beta' },
    });
    fireEvent.keyDown(screen.getByLabelText('Назва проєкту'), { key: 'Enter' });

    expect(onCreate).toHaveBeenCalledWith('Клієнт Beta');
  });

  it('renames a project in place', () => {
    const onRename = vi.fn();
    render(<ProjectsBar {...props({ onRename })} />);

    fireEvent.click(screen.getByLabelText('Перейменувати проєкт'));
    fireEvent.change(screen.getByLabelText('Перейменувати проєкт'), {
      target: { value: 'Співбесіда в Beta' },
    });
    fireEvent.keyDown(screen.getByLabelText('Перейменувати проєкт'), { key: 'Enter' });

    expect(onRename).toHaveBeenCalledWith('p-1', 'Співбесіда в Beta');
  });
});
