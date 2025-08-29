'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Loader } from '@/components/ai-elements/loader';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
} from '@/components/ai-elements/prompt-input';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import { Response } from '@/components/ai-elements/response';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/ai-elements/sources';
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion';

const suggestions = [
  'Explain how machine learning works',
  'Write a Python function to sort a list',
  'What are the latest trends in web development?',
  'Help me plan a healthy meal for today',
];

const ChatBotDemo = () => {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat({
    transport: {
      async sendMessages(options) {
        const { client } = await import('@/utils/orpc');
        const { eventIteratorToStream } = await import('@orpc/client');

        return eventIteratorToStream(
          await client.chat(
            {
              messages: options.messages,
            },
            { signal: options.abortSignal }
          )
        );
      },
      reconnectToStream() {
        throw new Error('Reconnection not supported');
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage({ text: suggestion });
  };

  return (
    <div className="relative mx-auto size-full h-screen max-w-4xl p-6">
      <div className="flex h-full flex-col">
        <Conversation className="h-full">
          <ConversationContent>
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-6">
                <div className="text-center">
                  <h2 className="mb-2 font-semibold text-2xl">
                    Welcome to AI Chat
                  </h2>
                  <p className="mb-6 text-muted-foreground">
                    Get started by choosing a suggestion or typing your own
                    message
                  </p>
                </div>
                <Suggestions className="max-w-2xl">
                  {suggestions.map((suggestion) => (
                    <Suggestion
                      key={suggestion}
                      onClick={handleSuggestionClick}
                      suggestion={suggestion}
                    />
                  ))}
                </Suggestions>
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id}>
                {message.role === 'assistant' && (
                  <Sources>
                    <SourcesTrigger
                      count={
                        message.parts.filter(
                          (part) => part.type === 'source-url'
                        ).length
                      }
                    />
                    {message.parts
                      .filter((part) => part.type === 'source-url')
                      .map((part, i) => (
                        <SourcesContent key={`${message.id}-${i}`}>
                          <Source
                            href={part.url}
                            key={`${message.id}-${i}`}
                            title={part.url}
                          />
                        </SourcesContent>
                      ))}
                  </Sources>
                )}
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case 'text':
                          return (
                            <Response key={`${message.id}-${i}`}>
                              {part.text}
                            </Response>
                          );
                        case 'reasoning':
                          return (
                            <Reasoning
                              className="w-full"
                              isStreaming={status === 'streaming'}
                              key={`${message.id}-${i}`}
                            >
                              <ReasoningTrigger />
                              <ReasoningContent>{part.text}</ReasoningContent>
                            </Reasoning>
                          );
                        default:
                          return null;
                      }
                    })}
                  </MessageContent>
                </Message>
              </div>
            ))}
            {status === 'submitted' && <Loader />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput className="mt-4" onSubmit={handleSubmit}>
          <PromptInputTextarea
            onChange={(e) => setInput(e.target.value)}
            value={input}
          />
          <PromptInputToolbar>
            <PromptInputSubmit disabled={!input} status={status} />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
};

export default ChatBotDemo;
