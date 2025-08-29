import type { Experimental_GeneratedImage } from 'ai';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export type ImageProps = Experimental_GeneratedImage & {
  className?: string;
  alt?: string;
  width?: number;
  height?: number;
};

export const AIImage = ({
  base64,
  uint8Array,
  mediaType,
  width = 400,
  height = 300,
  ...props
}: ImageProps) => (
  <Image
    alt={props.alt || 'Generated image'}
    className={cn(
      'h-auto max-w-full overflow-hidden rounded-md',
      props.className
    )}
    height={height}
    src={`data:${mediaType};base64,${base64}`}
    width={width}
    {...props}
  />
);

export { AIImage as Image };
