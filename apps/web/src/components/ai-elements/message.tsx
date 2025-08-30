import type { UIMessage } from 'ai';
import type { ComponentProps, HTMLAttributes } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage['role'];
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      'group flex w-full items-end justify-end gap-3 py-3',
      from === 'user' ? 'is-user' : 'is-assistant flex-row-reverse justify-end',
      '[&>div]:max-w-[85%] md:[&>div]:max-w-[75%]',
      className
    )}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({
  children,
  className,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(
      'flex flex-col gap-2 overflow-hidden rounded-3xl px-5 py-4 text-foreground text-sm backdrop-blur-sm transition-all duration-200',
      // User messages - modern gradient with subtle glow
      'group-[.is-user]:bg-gradient-to-br group-[.is-user]:from-blue-500 group-[.is-user]:to-blue-600',
      'group-[.is-user]:text-white group-[.is-user]:shadow-lg group-[.is-user]:shadow-blue-500/25',
      'group-[.is-user]:rounded-br-lg group-[.is-user]:border group-[.is-user]:border-blue-400/20',
      // Assistant messages - clean with subtle elevation
      'group-[.is-assistant]:bg-white/95 group-[.is-assistant]:text-gray-800',
      'group-[.is-assistant]:border group-[.is-assistant]:border-gray-200/80',
      'group-[.is-assistant]:rounded-bl-lg group-[.is-assistant]:shadow-lg group-[.is-assistant]:shadow-gray-900/5',
      'group-[.is-assistant]:ring-1 group-[.is-assistant]:ring-gray-100',
      // Hover effects
      'group-hover:scale-[1.01] group-hover:shadow-xl',
      'group-[.is-user]:hover:shadow-blue-500/35',
      'group-[.is-assistant]:hover:shadow-gray-900/10',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export type MessageAvatarProps = ComponentProps<typeof Avatar> & {
  src: string;
  name?: string;
};

export const MessageAvatar = ({
  src,
  name,
  className,
  ...props
}: MessageAvatarProps) => (
  <Avatar className={cn('size-8 ring-1 ring-border', className)} {...props}>
    <AvatarImage alt="" className="mt-0 mb-0" src={src} />
    <AvatarFallback>{name?.slice(0, 2) || 'ME'}</AvatarFallback>
  </Avatar>
);
