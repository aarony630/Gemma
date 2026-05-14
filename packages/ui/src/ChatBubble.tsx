import clsx from 'clsx';
import type { ChatMessage } from '@alio/mock-data';

/**
 * ChatBubble — single message bubble.
 * - `sender === 'me'`  → right-aligned, brand-primary bg, white text
 * - `sender === 'them'` → left-aligned, white bg, gray-100 text
 *
 * If `imageUrl` is set (only on `me` messages from image recognition), the
 * image renders inside the bubble above the text caption.
 */
export function ChatBubble({ message }: { message: ChatMessage }) {
  const isMe = message.sender === 'me';
  return (
    <div className={clsx('flex', isMe ? 'justify-end' : 'justify-start')}>
      <div
        className={clsx(
          'max-w-[75%] rounded-[20px] px-[14px] py-[12px]',
          isMe
            ? 'bg-brand-primary text-white rounded-tr-[6px]'
            : 'bg-white text-gray-100 rounded-tl-[6px]',
        )}
      >
        {message.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.imageUrl}
            alt="Attachment"
            className="mb-[8px] h-[140px] w-full rounded-[12px] object-cover"
          />
        )}
        <p className="text-[14px] leading-snug">{message.text}</p>
      </div>
    </div>
  );
}
