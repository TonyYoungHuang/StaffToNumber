import type { enScoreCorrectionMessages } from "./locales/en";

type WidenStrings<T> = T extends string
  ? string
  : T extends ReadonlyArray<infer U>
    ? WidenStrings<U>[]
    : T extends object
      ? { -readonly [K in keyof T]: WidenStrings<T[K]> }
      : T;

export type ScoreCorrectionMessages = WidenStrings<typeof enScoreCorrectionMessages>;
