export type JianpuGoldCase = {
  name: string;
  text: string;
  expected: {
    pitches?: string[];
    midis?: number[];
    durations?: number[];
    eventTypes?: Array<"note" | "rest">;
    voices?: string[];
    staffs?: number[];
    chordFlags?: boolean[];
    ties?: string[][];
    tupletRatios?: Array<string | null>;
  };
};

const majorTonicCases: Array<[string, string]> = [
  ["C", "C:0:4"], ["G", "G:0:4"], ["D", "D:0:4"], ["A", "A:0:4"], ["E", "E:0:4"],
  ["B", "B:0:4"], ["F#", "F:1:4"], ["C#", "C:1:4"], ["F", "F:0:4"], ["Bb", "B:-1:4"],
  ["Eb", "E:-1:4"], ["Ab", "A:-1:4"], ["Db", "D:-1:4"], ["Gb", "G:-1:4"], ["Cb", "C:-1:4"],
];

const chromaticFixedDoCases: Array<[string, number]> = [
  ["1", 60], ["#1", 61], ["2", 62], ["#2", 63], ["3", 64], ["4", 65],
  ["#4", 66], ["5", 67], ["#5", 68], ["6", 69], ["#6", 70], ["7", 71],
];

const durationCases: Array<[string, number]> = [
  ["1---", 64], ["1-.", 48], ["1-", 32], ["1.", 24],
  ["1", 16], ["1_.", 12], ["1_", 8], ["1__", 4],
];

const minorDegreeCases: Array<[string, string]> = [
  ["1", "A:0:4"], ["2", "B:0:4"], ["3", "C:0:5"], ["4", "D:0:5"],
  ["5", "E:0:5"], ["6", "F:0:5"], ["7", "G:0:5"],
];

const octaveCases: Array<[string, string]> = [
  ["1,", "C:0:3"], ["1", "C:0:4"], ["1'", "C:0:5"], ["#1'", "C:1:5"],
];

export const JIANPU_GOLD_CASES: JianpuGoldCase[] = [
  ...majorTonicCases.map(([tonic, pitch], index) => ({
    name: `大调主音 ${index + 1} ${tonic}`,
    text: `标题：大调主音 ${tonic}\n1=${tonic}\n拍号：4/4\n| 1 |`,
    expected: { pitches: [pitch], durations: [16] },
  })),
  ...chromaticFixedDoCases.map(([token, midi], index) => ({
    name: `固定调半音 ${index + 1}`,
    text: `标题：固定调半音 ${index + 1}\n1=C\n唱名法：固定调\n升降号策略：优先升号\n| ${token} |`,
    expected: { midis: [midi], durations: [16] },
  })),
  ...durationCases.map(([token, duration], index) => ({
    name: `时值 ${index + 1}`,
    text: `标题：时值 ${index + 1}\n1=C\n| ${token} |`,
    expected: { pitches: ["C:0:4"], durations: [duration] },
  })),
  ...minorDegreeCases.map(([token, pitch], index) => ({
    name: `小调音级 ${index + 1}`,
    text: `标题：小调音级 ${index + 1}\n1=A (minor)\n| ${token} |`,
    expected: { pitches: [pitch], durations: [16] },
  })),
  ...octaveCases.map(([token, pitch], index) => ({
    name: `八度边界 ${index + 1}`,
    text: `标题：八度边界 ${index + 1}\n1=C\n| ${token} |`,
    expected: { pitches: [pitch], durations: [16] },
  })),
  {
    name: "结构 1 和弦",
    text: "标题：和弦\n1=C\n| [1,3,5] |",
    expected: { pitches: ["C:0:4", "E:0:4", "G:0:4"], durations: [16, 16, 16], chordFlags: [false, true, true] },
  },
  {
    name: "结构 2 多声部多谱表",
    text: "标题：多声部\n1=C\n| v1:1 v2@s2:0- |",
    expected: { eventTypes: ["note", "rest"], durations: [16, 32], voices: ["1", "2"], staffs: [1, 2] },
  },
  {
    name: "结构 3 跨小节延音",
    text: "标题：跨小节延音\n1=C\n| 1~ | ~1 |",
    expected: { pitches: ["C:0:4", "C:0:4"], durations: [16, 16], ties: [["start"], ["stop"]] },
  },
  {
    name: "结构 4 三连音",
    text: "标题：三连音\n1=C\n| 1_{3:2:start} 2_{3:2} 3_{3:2:stop} |",
    expected: { pitches: ["C:0:4", "D:0:4", "E:0:4"], durations: [8, 8, 8], tupletRatios: ["3:2", "3:2", "3:2"] },
  },
];
