export type MessagePart =
  | {
      type?: string;
      text?: string;
      content?: string;
    }
  | string;

export type Message = {
  content?: string | object;
  parts?: MessagePart[];
  role?: string;
};
