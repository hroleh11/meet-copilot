import { ChatsSidebar } from '~/features/chat/ChatsSidebar';
import { MeetingDetails } from '~/features/history/MeetingDetails';
import { useMeeting } from '~/features/history/useMeeting';
import { uk } from '~/shared/i18n/uk';

export interface MeetingScreenProps {
  meetingId: string;
  onOpenChat: (chatId: string) => void;
  onChatRemoved: (chatId: string) => void;
}

export function MeetingScreen({
  meetingId,
  onOpenChat,
  onChatRemoved,
}: MeetingScreenProps) {
  const meeting = useMeeting(meetingId);

  return (
    <div className="flex min-h-0 flex-grow">
      <ChatsSidebar
        key={meetingId}
        meetingId={meetingId}
        activeChatId={null}
        answered={0}
        onOpenChat={onOpenChat}
        onChatRemoved={onChatRemoved}
      />

      <div className="min-h-0 flex-grow overflow-y-auto p-5">
        {meeting.loading ? (
          <p className="text-body text-ink-tertiary">{uk.history.loading}</p>
        ) : null}

        {meeting.details ? <MeetingDetails details={meeting.details} /> : null}

        {meeting.error ? <p className="text-body text-danger">{meeting.error}</p> : null}
      </div>
    </div>
  );
}
