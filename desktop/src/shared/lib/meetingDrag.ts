import { useState, type DragEvent } from 'react';

export const MEETING_DRAG_TYPE = 'application/x-meet-copilot-meeting';

export interface DragSource {
  draggable: true;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
}

export interface DropTarget {
  over: boolean;
  handlers: {
    onDragOver: (event: DragEvent<HTMLElement>) => void;
    onDragLeave: () => void;
    onDrop: (event: DragEvent<HTMLElement>) => void;
  };
}

/// A meeting travels under its own media type, so a project card can tell on
/// `dragover` whether what flies over it is a meeting at all: the payload of a
/// drag is unreadable until it is dropped, but the list of types is not.
export function useMeetingDrag(meetingId: string): DragSource {
  return {
    draggable: true,
    onDragStart: (event) => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData(MEETING_DRAG_TYPE, meetingId);
    },
  };
}

export function useMeetingDrop(onDrop: (meetingId: string) => void): DropTarget {
  const [over, setOver] = useState(false);

  return {
    over,
    handlers: {
      onDragOver: (event) => {
        if (!event.dataTransfer.types.includes(MEETING_DRAG_TYPE)) {
          return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setOver(true);
      },
      onDragLeave: () => {
        setOver(false);
      },
      onDrop: (event) => {
        event.preventDefault();
        setOver(false);

        const meetingId = event.dataTransfer.getData(MEETING_DRAG_TYPE);

        if (meetingId) {
          onDrop(meetingId);
        }
      },
    },
  };
}
