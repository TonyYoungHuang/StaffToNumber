import type { enScoreSharingMessages } from "./locales/en";

type WidenStrings<T> = T extends string
  ? string
  : T extends ReadonlyArray<infer U>
    ? ReadonlyArray<WidenStrings<U>>
    : T extends object
      ? { -readonly [K in keyof T]: WidenStrings<T[K]> }
      : T;

export type ScoreSharingMessages = WidenStrings<typeof enScoreSharingMessages>;
