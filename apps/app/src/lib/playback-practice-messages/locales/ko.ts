import type { PlaybackPracticeMessages } from "../types";

export const koPlaybackPracticeMessages = {
  playback: {
    eyebrow: "재생 연습", title: "Tone.js 파트 연습 플레이어", body: "현재 Score JSON에서 연습용 재생 이벤트를 생성하며 템포, 구간 반복, 메트로놈, 카운트인, 파트 Solo/Mute를 지원합니다.",
    load: "재생 이벤트 생성", play: "재생", stop: "정지", tempo: "템포 BPM", playhead: "재생 위치", loop: "구간 반복", loopStart: "시작 박", loopEnd: "종료 박", metronome: "메트로놈", countIn: "한 마디 카운트인",
    loading: "재생 이벤트를 생성하는 중…", ready: "재생 이벤트가 생성되었습니다.", failed: "재생 이벤트를 생성하지 못했습니다.", empty: "듣기 전에 재생 이벤트를 생성하세요.", noEvents: "현재 파트 필터에 재생할 수 있는 음표가 없습니다.",
    events: "이벤트", activeEvents: "활성 이벤트", beats: "전체 박", parts: "파트", solo: "Solo", mute: "Mute", allParts: "모든 파트", revision: "리비전",
    speedLadder: "속도 단계 연습", targetTempo: "목표 템포", tempoStep: "회차별 증가", ladderComplete: "속도 단계 연습을 완료했습니다.", practiceExports: "연습 내보내기",
    startMeasure: "시작 마디", endMeasure: "종료 마디", byBeat: "박으로 지정", partVolume: "파트 음량", diagnostics: "재생 진단", playbackPath: "연주 순서", terminated: "종료 이유", unreachableMeasures: "도달할 수 없는 마디",
    markerTemplate: "{measure}마디", repeatedMarkerTemplate: "{measure}마디, {occurrence}번째", jumpsTemplate: "{count}회 이동", selectedSoloTemplate: "Solo: {count}", selectedMuteTemplate: "Mute: {count}", soloPartTemplate: "{part} 솔로", mutePartTemplate: "{part} 음소거",
    navigationMeasureTemplate: "{measure}마디",
    terminationReasons: { end: "악보 끝", fine: "Fine 기호", guard: "안전 제한" },
    navigationActions: { play: "마디 연주", "skip-ending": "반복 엔딩 건너뛰기", "repeat-jump": "반복 시작으로 돌아가기", "dc-jump": "D.C.로 이동", "ds-jump": "D.S.로 이동", "coda-jump": "Coda로 이동", "fine-stop": "Fine에서 정지", end: "악보 끝에 도달", "guard-stop": "안전 제한에서 정지" },
  },
  recorder: {
    title: "브라우저 녹음 및 연습 피드백 Beta", regionAria: "브라우저 녹음 및 연습 피드백", device: "마이크", defaultDevice: "시스템 기본 마이크", deviceTemplate: "마이크 {index}", countIn: "카운트인", beatsTemplate: "{count}박",
    start: "녹음 시작", requesting: "마이크 권한을 요청하는 중…", pause: "일시 정지", resume: "계속", stop: "정지", cancel: "취소", rerecord: "다시 녹음", ready: "녹음이 이 제출물에 첨부되었습니다. 제출 전에 확인하세요.",
    unsupported: "이 브라우저는 MediaRecorder를 지원하지 않습니다.", denied: "마이크를 사용할 수 없습니다. 브라우저 권한과 선택한 입력 장치를 확인하세요.", recordingStatusTemplate: "녹음 중 {duration}", pausedStatusTemplate: "일시 정지 {duration}", countInStatusTemplate: "준비: {count}",
    analysis: "음표별 연습 피드백", feedbackAria: "연습 분석 결과", analyzing: "녹음과 악보를 정렬하는 중…", analysisFailed: "이 녹음을 분석하지 못했지만 교사 검토용으로 제출할 수 있습니다.", completeness: "감지 완성도", completenessTemplate: "{detected}/{expected} · {percent}",
    alignment: "시간축 정렬", startOffset: "녹음 시작점(초)", timeScale: "시간 배율", applyAlignment: "수동 정렬 적용", measureTemplate: "{measure}마디", detectedTemplate: "감지: {detected}/{total}", pitchAttentionTemplate: "음높이 확인 필요: {count}", rhythmAttentionTemplate: "리듬 확인 필요: {count}", polyphonicTemplate: "다성부 미채점: {count}", jump: "이 음 듣기",
    pitchUnavailable: "음높이 없음", onsetUnavailable: "시작 시점 없음", centsTemplate: "{value}센트", onsetTemplate: "{value}밀리초", feedbackButtonTemplate: "{measure}, {note}: {status}. {action}",
    statuses: { idle: "대기", requesting: "권한 요청 중", count_in: "카운트인", recording: "녹음 중", paused: "일시 정지", ready: "준비됨", error: "오류" },
    alignmentSources: { automatic: "자동", manual: "수동" },
    eventStatuses: { matched: "일치", pitch_attention: "음높이 확인 필요", rhythm_attention: "리듬 확인 필요", missing: "감지되지 않음", polyphonic_unscored: "다성부, 미채점" },
  },
  jianpu: { regionAria: "대화형 숫자보", empty: "이 악보에는 표시할 숫자보가 없습니다.", note: "음표", rest: "쉼표", voice: "성부", staff: "보표", voiceShort: "성부", staffShort: "보표", eventLabelTemplate: "{kind} {degree}, 성부 {voice}, 보표 {staff}", measureAriaTemplate: "{measure}마디" },
  waveform: { waveformAria: "녹음 파형", waveformValueTemplate: "{label}: {current} / {duration}. 클릭하거나 화살표 키로 이동하세요.", waveformLoading: "녹음 파형을 불러오는 중…", waveformUnavailable: "파형 미리보기를 사용할 수 없습니다. 오디오 컨트롤을 이용하세요.", recordingPlayback: "연습 녹음 오디오", practiceSpeed: "연습 속도", rateTemplate: "{rate}×" },
} satisfies PlaybackPracticeMessages;
