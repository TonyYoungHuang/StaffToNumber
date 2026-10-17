import type { ScoreEntryMessages } from "../types";

export const koScoreEntryMessages = {
  reviewEntry: {
    "label": "스캔 악보 확인",
    "titles": {
      "one": "확인을 기다리는 스캔 악보가 1개 있어요",
      "few": "확인을 기다리는 스캔 악보가 {count}개 있어요",
      "many": "확인을 기다리는 스캔 악보가 {count}개 있어요",
      "other": "확인을 기다리는 스캔 악보가 {count}개 있어요"
    },
    "body": "원본 이미지와 비교해 내용을 확인한 뒤 확정해 주세요.",
    "continue": "계속 확인하기",
    "all": "확인할 스캔 악보 모두 보기",
    "emptyTitle": "확인을 기다리는 스캔 악보가 없어요",
    "emptyBody": "다음 스캔 악보는 처리가 끝나면 여기에 표시돼요. 저장한 악보도 계속 편집할 수 있어요.",
    "upload": "악보 업로드",
    "loading": "확인할 스캔 악보를 찾고 있어요…",
    "failed": "확인할 스캔 악보를 불러오지 못했어요. 다시 시도해 주세요.",
    "retry": "다시 시도"
  },
  pages: {
    library: { eyebrow: "악보 작업 공간", title: "악보를 인식하고 관리하며 작업을 이어가세요", body: "무료 파일 검사에서 페이지 수와 표준 처리 또는 대용량 파일 처리가 필요한지 표시합니다. 무료 인식 횟수나 크레딧을 사용하지 않습니다. 미사용 평생 무료 간단 인식은 표준 처리에서만 이용할 수 있습니다." },
    newScore: {
      eyebrow: "새 악보 만들기", title: "어떤 자료로 시작하나요?", body: "자료 유형을 하나 선택하세요. 다음 페이지에는 해당 방식에 필요한 단계만 표시됩니다.", recommended: "추천", choose: "선택",
      choices: {
        scan: { title: "PDF 또는 악보 이미지 스캔", body: "표준 처리에서 간단한 악보 인식을 평생 1회 무료로 이용할 수 있습니다. 보통 사진 1장 또는 약 5페이지 이하의 A4/Letter PDF가 해당되며 파일 검사 결과에 따릅니다. 매월 25크레딧은 기존 프로젝트에 사용할 수 있지만 새 악보 인식 권한은 주지 않습니다." },
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
        scan: { eyebrow: "새 악보 만들기", title: "PDF 또는 악보 이미지 스캔", body: "무료 파일 검사에서 페이지 수와 표준 처리 또는 대용량 파일 처리가 필요한지 표시합니다. 무료 인식 횟수나 크레딧을 사용하지 않습니다. 미사용 평생 무료 간단 인식은 표준 처리에서만 이용할 수 있습니다." },
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
      chooseFile: "PDF 또는 이미지 파일을 선택해 주세요.", importFailed: "OMR 가져오기 작업을 만들 수 없습니다.", imported: "파일을 업로드했고 인식이 시작되었습니다. 나중에 내 악보에서 검토하세요.", eyebrow: "악보 인식", title: "PDF 또는 악보 이미지 업로드", body: "일반 처리는 보통 악보 사진 한 장이나 약 1~5페이지의 A4·Letter PDF에, 대용량 파일 처리는 약 6~24페이지의 PDF에 적합합니다. 약 25페이지 이상의 A4·Letter PDF는 처리 한도를 초과할 수 있습니다. 20 MiB를 넘는 파일, 3,200만 화소(32 MP)를 넘는 이미지 또는 페이지가 사전 검사 픽셀 한도를 넘는 PDF는 접수할 수 없습니다. 페이지 수는 참고치이며 실제 접수 여부와 처리 경로는 파일 크기, 페이지 구성과 사전 검사로 결정됩니다. PDF를 파일당 약 24페이지 이하로 나누거나, 너무 큰 파일이나 이미지를 압축하거나, MusicXML을 가져오세요. 접수되지 않은 파일에는 요금이나 크레딧이 청구되지 않습니다. 간단 인식은 작업당 1크레딧, 복잡한 인식은 5크레딧입니다. 페이지 수는 처리 경로에 영향을 주며 페이지 수만큼 요금을 곱하지 않습니다. 일부만 제공되면 미제공 비율의 견적 크레딧을 반환하고 실패 또는 취소 시 처리 크레딧을 반환합니다. 현금 환불이 아닌 크레딧 반환입니다.", dropTitle: "PDF 또는 이미지 선택", dropBody: "PDF, PNG, JPG, WEBP 및 TIFF를 지원합니다.", empty: "아직 스캔 파일을 선택하지 않았습니다.", button: "인식 시작", accessLoading: "무료 스캔 사용 가능 여부를 확인하는 중...", freeEyebrow: "로그인됨 · 무료 편집", freeBody: "표준 처리에서 간단한 악보 인식을 평생 1회 무료로 이용할 수 있습니다. 보통 사진 1장 또는 약 5페이지 이하의 A4/Letter PDF가 해당되며 파일 검사 결과에 따릅니다. 매월 25크레딧은 기존 프로젝트에 사용할 수 있지만 새 악보 인식 권한은 주지 않습니다. 한 곡 이용권은 US$2.99 일회성 결제로 원본 악보와 추출 파트가 10크레딧을 공유하며 만료되지 않습니다. Starter는 월 US$7.99에 여러 악보에 쓸 수 있는 매월 50크레딧을 제공합니다. 두 상품 모두 파일 검사 범위 내에서 표준 처리와 대용량 파일 처리를 포함하며 처리 경로 추가 요금은 없습니다.", exhaustedEyebrow: "무료 편집 스캔 사용 완료", exhaustedTitle: "이 계정은 평생 무료 악보 프로젝트 하나를 이미 만들었습니다.", exhaustedBody: "평생 무료 간단 인식을 사용했습니다. 저장된 프로젝트 작업은 계속할 수 있습니다. 새 악보나 대용량 파일 처리에는 10크레딧을 포함한 US$2.99 한 곡 이용권 또는 매월 50크레딧을 제공하는 월 US$7.99 Starter를 선택하세요.", exhaustedLibrary: "무료 악보 계속 사용", exhaustedUpgrade: "전체 권한 활성화",
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
    compareSource: "원본 이미지와 비교",
    confirmationHelp: "원본 이미지와 비교하고 필요한 수정을 마친 뒤 악보 전체를 확정해 확인한 버전을 사용해 주세요.",
    notationRetry: "다시 렌더링",
    notationTechnicalDetails: "기술 세부 정보",
    notationEventLabel: "{part} · {measure}마디 · {number}번째 {type}",
    notationNote: "음표",
    notationRest: "쉼표",
    freeEyebrow: "무료 편집", reviewEyebrow: "후보 악보 검토", freeDescription: "평생 무료 악보 프로젝트를 사용 중입니다. 인식 결과 v{revision}을 지금 교정할 수 있으며 변경 사항은 후보 버전으로 저장됩니다.", reviewDescription: "인식 결과 v{revision}은 아직 공식 버전이 아닙니다. 수락하기 전에 원본과 비교하세요.", back: "악보로 돌아가기", processMore: "악보 더 처리하기", rejecting: "거부하는 중...", reject: "후보 거부", accepting: "수락하는 중...", accept: "이 악보 확정", safetyEyebrow: "안전 상태", safetyTitle: "후보 버전은 기존 공식 버전을 덮어쓸 수 없습니다", freeSafetyBody: "무료 계정도 전체 악보를 교정하고 재생, 조옮김, 숫자보, 버전, 공유 및 사용 가능한 내보내기를 계속할 수 있습니다. 더 많은 악보 프로젝트를 만들려면 업그레이드하세요.", reviewSafetyBody: "교정은 공식 악보를 변경하지 않고 새 후보 버전을 만듭니다. 수락하면 최신 후보가 공식 버전으로 복사되고 조옮김, 재생 및 내보내기가 활성화됩니다.", historyGroupLabel: "후보 교정 실행 취소 및 다시 실행", undo: "교정 실행 취소", redo: "교정 다시 실행", viewportLabel: "검토 화면", syncScroll: "스크롤 동기화", zoomGroupLabel: "검토 확대/축소", zoomOut: "축소", zoomIn: "확대", fitWidth: "너비에 맞춤", notationEyebrow: "후보 악보", notationTitle: "MusicXML 오선보 미리보기", notationBody: "악보의 음표 또는 진단을 선택하여 후보 이벤트를 확인하세요.", notationEmpty: "렌더링 가능한 후보 MusicXML이 아직 없습니다.", notationLoading: "후보 악보를 렌더링하는 중...", notationError: "후보 MusicXML을 렌더링할 수 없습니다.", notationDeferred: "큰 악보입니다. 비교 화면이 필요할 때 전체 OSMD 미리보기를 불러오세요. 그래픽 편집기는 계속 사용할 수 있습니다.", notationRender: "전체 OSMD 미리보기 불러오기",
  },
  omr: {
    symbolLabel: "기호",
    summary: "{count}곳을 확인해 주세요. 원본 이미지와 비교한 뒤 악보 전체를 확정해 주세요.",
    noIssues: "표시된 의심 지점은 없지만 원본 이미지와 몇 군데를 비교해 주세요.",
    checkLabel: "확인해 주세요",
    noFlagLabel: "의심 지점 없음",
    noLocation: "해당 음표나 영역을 정확히 표시할 수 없어요. 표시된 페이지나 마디를 확인해 주세요.",
    technicalDetails: "기술 정보",
    technicalHelp: "인식 점수는 참고용이며 정확도를 뜻하는 비율이 아니에요. 문제 확인을 위해 원래 진단 내용을 여기에 보관해요.",
    reasons: {"uncertainSymbol":"이 기호를 잘못 읽었을 수 있어요. 원본 이미지와 비교해 주세요.","rhythm":"이 마디의 박 수가 맞지 않을 수 있어요. 음표와 쉼표를 확인해 주세요.","duration":"이 음표나 쉼표의 길이가 불확실해요. 몇 박인지 확인해 주세요.","durationType":"음표나 쉼표의 길이를 읽지 못했어요. 원본 이미지의 모양을 확인해 주세요.","timeSignature":"박자표가 불확실해요. 악보 시작 부분의 박자표를 확인해 주세요.","unknown":"이 부분을 다시 살펴봐 주세요. 원본 이미지와 비교해 주세요."},
    sources: { "omr-engine": "인식 엔진", structural: "구조 검증" },
    sourcePreviewFailed: "스캔 원본을 불러올 수 없습니다.", pageTemplate: "{page}페이지", measureTemplate: "{measure}마디", scanAltTemplate: "{name} 스캔 원본", eyebrow: "OMR 비교", title: "원본 이미지와 비교", body: "불확실한 부분은 원본 이미지로 확인해 주세요. 표시는 확인이 필요하다는 뜻이며 틀렸다고 확정한 것은 아니에요.", issueNavigation: "문제 탐색", previous: "이전", next: "다음", sourceMode: "원본 표시 모드", original: "원본 이미지 보기", overlay: "의심 지점 표시", issuesOnly: "문제 기호만", scanPages: "스캔 페이지", noSource: "이 프로젝트에는 미리 볼 PDF/이미지 원본이 없습니다.", loadingSource: "스캔 원본을 불러오는 중...", geometryWarning: "페이지 이미지 픽셀 크기가 인식 기록과 다릅니다. 수락하기 전에 파일을 다시 인식하세요.", symbolLayer: "신뢰도가 낮은 기호 위치", pageSymbols: "페이지 기호", issueSymbols: "문제 기호", problemMeasures: "문제 마디", gradeLabel: "평가", contextGradeLabel: "문맥 평가", noDiagnostics: "현재 페이지와 필터에는 표시된 의심 지점이 없어요. 원본 이미지와 비교할 수 있어요.",
  },
} satisfies ScoreEntryMessages;
