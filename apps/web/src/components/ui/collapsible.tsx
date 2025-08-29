import {
  CollapsibleContent as CollapsibleContent_1,
  CollapsibleTrigger as CollapsibleTrigger_1,
  Root,
} from '@radix-ui/react-collapsible';

function Collapsible({ ...props }: React.ComponentProps<typeof Root>) {
  return <Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsibleTrigger_1>) {
  return <CollapsibleTrigger_1 data-slot="collapsible-trigger" {...props} />;
}

function CollapsibleContent({
  ...props
}: React.ComponentProps<typeof CollapsibleContent_1>) {
  return <CollapsibleContent_1 data-slot="collapsible-content" {...props} />;
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
