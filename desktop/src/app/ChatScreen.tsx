import { ChatComposer } from '~/features/chat/ChatComposer';
import { ChatsSidebar } from '~/features/chat/ChatsSidebar';
import { ChatThread } from '~/features/chat/ChatThread';
import { useChat } from '~/features/chat/useChat';

export interface ChatScreenProps {
  meetingId: string;
  chatId: string;
  onOpenChat: (chatId: string) => void;
  onChatRemoved: (chatId: string) => void;
}

export function ChatScreen({
  meetingId,
  chatId,
  onOpenChat,
  onChatRemoved,
}: ChatScreenProps) {
  const chat = useChat(meetingId, chatId);

  return (
    <div className="flex min-h-0 flex-grow">
      <ChatsSidebar
        meetingId={meetingId}
        activeChatId={chatId}
        answered={chat.messages.length}
        onOpenChat={onOpenChat}
        onChatRemoved={onChatRemoved}
      />

      <div className="flex min-h-0 min-w-0 flex-grow flex-col">
        <ChatThread messages={chat.messages} pending={chat.pending} error={chat.error} />
        <ChatComposer busy={chat.pending !== null} onAsk={chat.ask} />
      </div>
    </div>
  );
}
