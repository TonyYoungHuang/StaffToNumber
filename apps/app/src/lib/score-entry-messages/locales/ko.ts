import type { ScoreEntryMessages } from "../types";

export const koScoreEntryMessages = {
  pages: {
    library: { eyebrow: "악보 작업 공간", title: "악보를 인식하고 관리하며 작업을 이어가세요", body: "PDF나 악보 이미지를 업로드해 인식을 시작하거나 저장된 악보를 열어 편집을 계속하세요. 업로드, 후보 결과 및 라이브러리를 한 작업 공간에서 관리할 수 있습니다." },
    newScore: {
      eyebrow: "새 악보 만들기", title: "어떤 자료로 시작하나요?", body: "자료 유형을 하나 선택하세요. 다음 페이지에는 해당 방식에 필요한 단계만 표시됩니다.", recommended: "추천", choose: "선택",
      choices: {
        scan: { title: "PDF 또는 악보 이미지 스캔", body: "인쇄 악보, 스캔 및 PDF에 적합합니다. 새 계정은 완전한 여러 페이지 PDF 또는 악보 이미지로 평생 무료 프로젝트 하나를 만들 수 있습니다." },
        jianpu: { title: "숫자보 입력", body: "숫자 음표를 입력하여 오선보를 만드세요." },
        musicxml: { title: "악보 제작 프로그램에서 가져오기", body: "MuseScore, Sibelius, Finale 등에서 내보낸 MusicXML 파일에 적합합니다." },
        midi: { title: "MIDI 가져오기", body: "MIDI의 음표와 리듬을 악보로 변환하세요." },
        audio: { title: "녹음 업로드", body: "단선율 녹음에서 악보 만들기를 시도합니다(실험 기능)." },
        backup: { title: "악보 백업 복원", body: "이전에 이 사이트에서 다운로드한 백업을 여세요." },
      },
    },
    source: {
      chooseAnother: "다른 자료 선택",
      headings: {
        scan: { eyebrow: "새 악보 만들기", title: "PDF 또는 악보 이미지 스캔", body: "파일 하나를 선택하고 인식을 시작하세요. 이 페이지는 스캔 전용입니다." },
        jianpu: { eyebrow: "새 악보 만들기", title: "숫자보에서 오선보 만들기", body: "숫자보를 입력하여 악보를 만드세요. 이 페이지는 숫자보 입력 전용입니다." },
        musicxml: { eyebrow: "새 악보 만들기", title: "악보 제작 프로그램에서 가져오기", body: "내보낸 MusicXML 파일을 선택하세요. 이 페이지는 파일 가져오기 전용입니다." },
        midi: { eyebrow: "새 악보 만들기", title: "MIDI에서 악보 만들기", body: "MIDI 파일 하나를 선택하세요. 이 페이지는 MIDI 가져오기 전용입니다." },
        audio: { eyebrow: "새 악보 만들기", title: "녹음에서 악보 만들기", body: "선율 녹음을 선택한 뒤 생성된 음높이와 리듬을 검토하세요." },
        backup: { eyebrow: "새 악보 만들기", title: "악보 백업 복원", body: "이전에 다운로드한 백업을 선택하세요. 이 페이지는 복원 전용입니다." },
      },
    },
  },
  access: { checking: "접근 권한을 확인하는 중...", errorFallback: "현재 계정을 불러올 수 없습니다." },
  library: {
    signInFirst: "먼저 로그인해 주세요.", createNew: "새 악보 만들기", editable: "편집 가능",
    metrics: {
      projects: { label: "내 악보", body: "저장한 모든 악보가 여기에 표시됩니다." },
      format: { label: "계속 편집 가능", body: "인식하거나 가져온 뒤 교정, 조옮김, 연습 및 내보내기를 계속하세요." },
      revisions: { label: "편집 기록", body: "필요할 때 돌아갈 수 있도록 이전 버전을 보관합니다." },
    },
    common: { selected: "선택됨", importInProgress: "가져오는 중...", uploadInProgress: "업로드 중...", chooseAnother: "다른 파일 선택", clearSelection: "선택 지우기" },
    musicxml: {
      chooseFile: ".musicxml, .xml 또는 .mxl 파일을 선택해 주세요.", importFailed: "MusicXML을 가져오지 못했습니다.", imported: "악보를 내 악보에 추가했습니다.", eyebrow: "악보 제작 프로그램에서 가져오기", title: "MusicXML 파일 선택", body: "MuseScore, Sibelius, Finale 또는 다른 악보 앱에서 내보낸 MusicXML을 가져와 여기서 편집을 계속하세요.", dropTitle: "파일 선택", dropBody: ".musicxml, .xml 및 .mxl 파일을 지원합니다.", empty: "아직 파일을 선택하지 않았습니다.", button: "MusicXML 가져오기",
    },
    scan: {
      chooseFile: "PDF 또는 이미지 파일을 선택해 주세요.", importFailed: "OMR 가져오기 작업을 만들 수 없습니다.", imported: "파일을 업로드했고 인식이 시작되었습니다. 나중에 내 악보에서 검토하세요.", eyebrow: "악보 인식", title: "PDF 또는 악보 이미지 업로드", body: "인쇄 악보나 PDF를 검토하고 교정할 수 있는 전자 악보로 바꾸세요. 복잡한 기보는 몇 가지 수동 수정이 필요할 수 있습니다.", dropTitle: "PDF 또는 이미지 선택", dropBody: "PDF, PNG, JPG, WEBP 및 TIFF를 지원합니다.", empty: "아직 스캔 파일을 선택하지 않았습니다.", button: "인식 시작", accessLoading: "무료 스캔 사용 가능 여부를 확인하는 중...", freeEyebrow: "로그인됨 · 무료 편집", freeBody: "완전한 여러 페이지 PDF 또는 악보 이미지 하나를 업로드하여 평생 무료 악보 프로젝트를 만드세요. 교정, 재생, 조옮김, 변환, 공유 및 내보내기를 계속할 수 있습니다.", exhaustedEyebrow: "무료 편집 스캔 사용 완료", exhaustedTitle: "이 계정은 평생 무료 악보 프로젝트 하나를 이미 만들었습니다.", exhaustedBody: "해당 완전한 악보는 계속 교정, 재생, 조옮김, 변환, 버전 관리, 공유 및 내보내기할 수 있습니다. 더 많은 악보를 만들고 처리할 때만 업그레이드하세요.", exhaustedLibrary: "무료 악보 계속 사용", exhaustedUpgrade: "전체 권한 활성화",
    },
    backup: {
      chooseFile: "악보 백업 파일을 선택해 주세요.", importFailed: "백업을 복원할 수 없습니다.", imported: "악보 백업을 복원했습니다.", eyebrow: "백업 복원", title: "악보 백업 선택", body: "이전에 이 사이트에서 다운로드한 악보 백업을 복원하고 편집을 계속하세요.", dropTitle: "백업 파일 선택", dropBody: ".score.json 및 .json 파일을 지원합니다.", empty: "아직 Score JSON 스냅샷을 선택하지 않았습니다.", button: "악보 복원",
    },
    midi: {
      chooseFile: "MIDI 파일을 선택해 주세요.", importFailed: "MIDI를 가져오지 못했습니다.", imported: "MIDI를 악보 프로젝트로 변환했습니다.", eyebrow: "MIDI 가져오기", title: "MIDI 파일 선택", body: "MIDI 음표와 리듬을 보고, 재생하고, 조옮김할 수 있는 악보로 바꾸세요. 복잡한 레이아웃은 수동 조정이 필요할 수 있습니다.", dropTitle: ".mid 또는 .midi 파일 선택", dropBody: "표준 MIDI 파일을 지원합니다.", empty: "아직 MIDI 파일을 선택하지 않았습니다.", button: "MIDI 가져오기",
    },
    audio: {
      formatLabel: "오디오",
      chooseFile: "오디오 파일을 선택해 주세요.", importFailed: "오디오 채보 작업을 만들 수 없습니다.", imported: "오디오 채보 프로젝트를 만들었습니다. Basic Pitch가 MIDI와 첫 편집 가능 악보 버전을 만들려고 시도합니다.", eyebrow: "녹음을 악보로(실험 기능)", title: "녹음 선택", body: "선율 녹음을 업로드하면 편집 가능한 악보 만들기를 시도합니다. 합주, 소음 및 복잡한 화음은 정확도를 낮출 수 있습니다.", dropTitle: "오디오 파일 선택", dropBody: "WAV, MP3, M4A, AAC, FLAC, OGG 및 AIFF를 지원합니다.", empty: "아직 오디오를 선택하지 않았습니다.", button: "채보 시작",
    },
    jianpu: {
      empty: "숫자보 텍스트를 입력해 주세요.", importFailed: "숫자보를 가져오지 못했습니다.", imported: "숫자보 악보 프로젝트를 만들었습니다. 이제 미리보기, 조옮김, 재생 및 MusicXML 내보내기를 사용할 수 있습니다.", eyebrow: "숫자보를 오선보로", title: "숫자보 입력", body: "조, 박자, 숫자 음표, 쉼표 및 마디선을 입력하여 재생, 조옮김 및 내보내기가 가능한 오선보를 만드세요.", titleLabel: "악보 제목", titlePlaceholder: "예: 작은별 숫자보", textLabel: "숫자보 텍스트", textPlaceholder: "1=C\n4/4\n1 1 5 5 | 6 6 5 - |", button: "숫자보 가져오기", clear: "예시 복원",
    },
    list: { eyebrow: "내 악보", title: "저장된 악보", body: "악보를 열어 교정, 변환, 조옮김, 연습 또는 내보내기를 계속하세요.", loading: "악보를 불러오는 중...", empty: "아직 악보가 없습니다. 첫 악보를 만들면 여기에 표시됩니다.", open: "악보 열기", revision: "편집 기록" },
    statuses: { imported: "가져옴", candidate: "교정 필요", needs_review: "검토 필요", ready: "사용 가능", archived: "보관됨" },
  },
  trial: {
    previewDeferred: "대용량 악보입니다. OSMD 비교 화면이 필요할 때 전체 MusicXML 미리보기를 불러오세요.",
    previewRender: "전체 미리보기 불러오기",
    previewEventLabel: "{part} · {measure}마디 · {number}번째 {type}",
    previewNote: "음표",
    previewRest: "쉼표",
    loadingJob: "작업을 불러오는 중", preparing: "무료 편집을 준비하는 중", loadingScore: "악보를 불러오는 중...", intro: "인식이 완료되면 완전한 무료 프로젝트에서 교정, 재생, 조옮김, 숫자보, 버전, 공유 및 내보내기를 사용할 수 있습니다. 더 많은 악보를 처리하려면 업그레이드하세요.", unlock: "전체 권한 활성화", back: "라이브러리로 돌아가기",
    statuses: { queued: "대기 중", processing: "인식 중", completed: "인식 완료", failed: "인식 실패", cancelled: "취소됨" },
    failedTitle: "인식을 완료하지 못했습니다. 아래 안내에 따라 파일을 확인하세요.", failedBody: "페이지 방향이 올바르고 선명하며 큰 그림자나 잘린 부분이 없는지 확인하세요. 실패한 무료 작업은 할당량 수동 검토가 필요하므로 다시 결제하지 마세요.", technicalDetails: "기술 세부 정보", reportIssue: "인식 문제 신고", diagnosticsEyebrow: "인식 진단", diagnosticsTitle: "업그레이드하기 전에 신뢰도와 경고를 검토하세요.", diagnosticsWarning: "인식 엔진이 수동 검토가 필요한 경고를 반환했습니다.", confidenceLabel: "전체 신뢰도", confidenceHelp: "신뢰도가 낮으면 마디별 검토가 필요합니다.", pagesLabel: "인식된 페이지", pagesHelp: "무료 프로젝트는 완전한 여러 페이지 PDF 하나를 지원합니다.", warningsLabel: "경고", engineFallback: "인식 엔진 진단", previewEyebrow: "오선보 미리보기", previewTitle: "Audiveris 인식 후보", previewEmpty: "처리가 끝나면 후보 오선보가 여기에 표시됩니다.", previewLoading: "오선보를 렌더링하는 중...", previewError: "인식 결과가 불완전하여 표시할 수 없습니다. 더 선명하고 방향이 올바르며 잘리지 않은 페이지를 사용하거나 지원팀에 문의하세요.", previewRetry: "다시 렌더링",
  },
  candidate: {
    notationRetry: "다시 렌더링",
    notationTechnicalDetails: "기술 세부 정보",
    notationEventLabel: "{part} · {measure}마디 · {number}번째 {type}",
    notationNote: "음표",
    notationRest: "쉼표",
    freeEyebrow: "무료 편집", reviewEyebrow: "후보 악보 검토", freeDescription: "평생 무료 악보 프로젝트를 사용 중입니다. 인식 결과 v{revision}을 지금 교정할 수 있으며 변경 사항은 후보 버전으로 저장됩니다.", reviewDescription: "인식 결과 v{revision}은 아직 공식 버전이 아닙니다. 수락하기 전에 원본과 비교하세요.", back: "악보로 돌아가기", processMore: "악보 더 처리하기", rejecting: "거부하는 중...", reject: "후보 거부", accepting: "수락하는 중...", accept: "공식 버전으로 수락", safetyEyebrow: "안전 상태", safetyTitle: "후보 버전은 기존 공식 버전을 덮어쓸 수 없습니다", freeSafetyBody: "무료 계정도 전체 악보를 교정하고 재생, 조옮김, 숫자보, 버전, 공유 및 사용 가능한 내보내기를 계속할 수 있습니다. 더 많은 악보 프로젝트를 만들려면 업그레이드하세요.", reviewSafetyBody: "교정은 공식 악보를 변경하지 않고 새 후보 버전을 만듭니다. 수락하면 최신 후보가 공식 버전으로 복사되고 조옮김, 재생 및 내보내기가 활성화됩니다.", historyGroupLabel: "후보 교정 실행 취소 및 다시 실행", undo: "교정 실행 취소", redo: "교정 다시 실행", viewportLabel: "검토 화면", syncScroll: "스크롤 동기화", zoomGroupLabel: "검토 확대/축소", zoomOut: "축소", zoomIn: "확대", fitWidth: "너비에 맞춤", notationEyebrow: "후보 악보", notationTitle: "MusicXML 오선보 미리보기", notationBody: "악보의 음표 또는 진단을 선택하여 후보 이벤트를 확인하세요.", notationEmpty: "렌더링 가능한 후보 MusicXML이 아직 없습니다.", notationLoading: "후보 악보를 렌더링하는 중...", notationError: "후보 MusicXML을 렌더링할 수 없습니다.", notationDeferred: "큰 악보입니다. 비교 화면이 필요할 때 전체 OSMD 미리보기를 불러오세요. 그래픽 편집기는 계속 사용할 수 있습니다.", notationRender: "전체 OSMD 미리보기 불러오기",
  },
  omr: {
    sources: { "omr-engine": "인식 엔진", structural: "구조 검증" },
    sourcePreviewFailed: "스캔 원본을 불러올 수 없습니다.", pageTemplate: "{page}페이지", measureTemplate: "{measure}마디", scanAltTemplate: "{name} 스캔 원본", eyebrow: "OMR 비교", title: "스캔 원본 및 인식 진단", body: "빨간 상자는 Audiveris 기호 좌표를 사용합니다. structural 점수는 리듬 완전성을 검증하며 모델 확률이 아닙니다.", issueNavigation: "문제 탐색", previous: "이전", next: "다음", sourceMode: "원본 표시 모드", original: "원본", overlay: "진단 오버레이", issuesOnly: "문제 기호만", scanPages: "스캔 페이지", noSource: "이 프로젝트에는 미리 볼 PDF/이미지 원본이 없습니다.", loadingSource: "스캔 원본을 불러오는 중...", geometryWarning: "페이지 이미지 픽셀 크기가 인식 기록과 다릅니다. 수락하기 전에 파일을 다시 인식하세요.", symbolLayer: "신뢰도가 낮은 기호 위치", pageSymbols: "페이지 기호", issueSymbols: "문제 기호", problemMeasures: "문제 마디", gradeLabel: "평가", contextGradeLabel: "문맥 평가", noDiagnostics: "이 페이지와 필터에 맞는 진단이 없습니다.",
  },
} satisfies ScoreEntryMessages;
