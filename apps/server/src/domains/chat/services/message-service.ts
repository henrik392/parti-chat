import type { Message, MessagePart } from '../types';

/**
 * Extract text content from a message object
 */
export function extractMessageContent(message: Message): string {
  if (typeof message?.content === 'string') {
    return message.content;
  }

  if (message?.parts && Array.isArray(message.parts)) {
    return message.parts
      .filter(
        (part: MessagePart) => typeof part === 'string' || part.type === 'text'
      )
      .map((part: MessagePart) =>
        typeof part === 'string' ? part : part.text || part.content || ''
      )
      .join(' ')
      .trim();
  }

  if (typeof message?.content === 'object' && message?.content) {
    return JSON.stringify(message.content);
  }

  return '';
}
