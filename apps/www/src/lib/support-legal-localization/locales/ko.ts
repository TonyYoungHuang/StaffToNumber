import type { SupportLegalLocalization } from "../types";

export const koSupportLegal = {
  openGraphLocale: "ko_KR", homeBreadcrumb: "홈",
  legalReviewNotice: { eyebrow: "법률 번역 안내", title: "이 번역문은 검토 전 초안입니다", body: "이 번역은 참고용이며 자격을 갖춘 법률 전문가의 검토가 필요합니다. 영어본과 충돌하는 경우 영어본이 우선합니다.", ariaLabel: "법률 번역 검토 안내" },
  support: {
    metadata: { title: "지원, 문의 및 주문 검토 | ScoreTransposer", description: "계정, 활성화, 악보 인식, 결과 전달 및 개인정보 문제에 대해 ScoreTransposer 지원팀에 문의하세요.", keywords: ["ScoreTransposer 지원", "활성화 도움", "악보 업로드 지원", "주문 검토", "개인정보 요청"], socialImageAlt: "영문 UI의 ScoreTransposer 악보 작업 공간 결과 미리보기" },
    schemaName: "ScoreTransposer 지원", schemaContactType: "고객 지원",
    hero: { eyebrow: "지원 / 문의 / 검토", title: "도움이 필요하신가요? 어떤 일이 있었는지 알려 주세요", body: "계정, 활성화, 인식, 다운로드 또는 개인정보 문제를 제출할 수 있습니다. 정보가 자세할수록 더 빠르게 조사하고 답변할 수 있습니다.", submitAction: "지원 요청 제출", faqAction: "FAQ 열기", checkoutAction: "구매 경로 보기" },
    form: {
      eyebrow: "요청 제출", title: "사이트 내 지원 양식", body: "사이트에서 직접 지원 요청을 제출합니다. 양식은 API로 전송되어 추적 가능한 요청을 만들고 연락처 이메일로 확인 메일을 자동 발송합니다.", categoryLabel: "지원 분류", categoryAriaLabel: "지원 분류 선택", nameLabel: "연락 담당자 이름(선택)", contactEmailLabel: "연락처 이메일", accountEmailLabel: "계정 이메일(선택)", orderReferenceLabel: "주문 번호 / 결제 참조(선택)", jobReferenceLabel: "작업 번호 / 파일 이름(선택)", subjectLabel: "제목", messageLabel: "문제 상세", messageHint: "문제를 일으킨 단계, 대략적인 시간, 표시된 오류나 증상, 이미 시도한 조치를 적어 주세요.", honeypotLabel: "웹사이트", submitting: "제출 중...", submit: "지원 요청 제출", emailAction: "공개 지원 이메일 사용", emailFallback: "자동 이메일을 일시적으로 사용할 수 없더라도 {supportEmail}로 직접 보낼 수 있습니다.", successSent: "요청이 {referenceCode} 번호로 접수되었고 확인 메일을 보냈습니다.", successPreview: "요청이 {referenceCode} 번호로 접수되었습니다. 이 환경에는 트랜잭션 메일이 설정되지 않아 확인 내용이 API 미리보기 로그에 기록되었습니다.", successFailed: "요청이 {referenceCode} 번호로 접수되었지만 확인 메일을 자동으로 보내지 못했습니다. 직접 문의할 때 이 번호를 사용하세요.",
      categories: { payment: { label: "결제 / 주문", helper: "결제 후 권한 미표시, 돌아오기 경로 문제, 중복 청구 우려 또는 수동 검토.", subject: "결제 / 주문 검토 요청" }, activation: { label: "활성화 / 권한", helper: "코드 교환 실패, 권한 미표시 또는 만료일 이상.", subject: "활성화 / 권한 문제" }, job: { label: "업로드 / 결과", helper: "업로드 실패, 멈춘 작업, 다운로드 오류 또는 final/draft 문의.", subject: "업로드 / 결과 지원 요청" }, privacy: { label: "개인정보 / 삭제", helper: "삭제, 내보내기 또는 개인정보 관련 수동 검토.", subject: "개인정보 / 삭제 요청" }, general: { label: "일반", helper: "그 밖의 문제 또는 지원팀의 분류가 필요한 경우.", subject: "일반 지원 요청" } },
    },
    workflows: { eyebrow: "지원 분류", title: "먼저 문제를 분류한 뒤 수동 검토로 진행합니다", items: [["01", "결제 및 주문 문제", "결제 후 계정 권한이 보이지 않거나 돌아오기 경로가 불완전하거나 중복 청구가 의심되거나 주문 수동 검토가 필요한 경우입니다."], ["02", "활성화 및 권한 문제", "코드 교환 실패, 권한 미활성화, 잘못된 만료일 또는 계정 범위 확인이 필요한 경우입니다."], ["03", "업로드 및 결과 문제", "PDF 업로드 실패, 작업 정지, 다운로드 오류 또는 final과 draft 결과에 사람의 판단이 필요한 경우입니다."]] },
    evidence: { eyebrow: "포함할 정보", title: "충분한 정보가 있으면 수동 지원이 더 빨라집니다", status: "권장 증빙", points: ["연락처 이메일 또는 계정 이메일", "구매 시간, 결제 제공자 및 결제 화면", "활성화 코드, 주문 번호, 작업 번호 또는 파일 이름", "오류 화면, 발생 단계 및 대략적인 시간"] },
    boundary: { eyebrow: "지원 범위", title: "지원팀이 도울 수 있는 문제", body: "계정 접근, 활성화 코드, 파일 업로드, 인식 작업, 결과 확인과 다운로드, 개인정보 요청을 지원합니다.", metrics: [["제품 도움", "계정과 악보", "계정, 결제, 활성화, 업로드, 작업 및 결과 전달 문제."], ["인식 안내", "검토 필요", "자동 인식은 수동 교정이 필요할 수 있습니다. 복잡한 악보는 원본 파일과 화면을 첨부하세요."], ["수동 검토", "이용 가능", "주문 검토, 교환 오류, 다운로드 이상 및 삭제 요청."]] },
    after: { eyebrow: "제출 후", title: "제출 후 처리", body: "성공적으로 제출하면 요청 번호가 생성됩니다. 번호를 보관하세요. 이메일 알림을 사용할 수 있으면 연락처로도 확인 메일이 발송됩니다.", aboutAction: "소개 열기", privacyAction: "개인정보", termsAction: "이용약관" },
    final: { title: "지원 요청 제출", body: "문제 유형을 선택하고 계정 이메일, 작업 번호, 파일 이름, 대략적인 시간과 관련 화면을 포함하세요.", formAction: "지원 양식 열기", faqAction: "FAQ", checkoutAction: "결제" },
  },
  copyright: {
    metadata: { title: "저작권 침해 신고 절차 | ScoreTransposer", description: "악보, 녹음 또는 공유 링크에 대한 저작권 신고를 제출하고 비공개 조회 코드와 공개 사건 업데이트를 확인하세요.", keywords: ["저작권 신고", "악보 삭제 요청", "침해 URL", "저작권 사건 상태", "ScoreTransposer 저작권"], socialImageAlt: "저작권 신고 절차를 위한 영문 UI ScoreTransposer 악보 미리보기" },
    hero: { eyebrow: "저작권 및 규정 준수", title: "저작권 신고와 사건 상태", body: "구조화된 제출, 비공개 조회, 공개 사건 업데이트 및 내부 감사는 서로 분리됩니다. 48시간은 최초 답변 목표이며 법적 판단이나 해결 기한을 보장하지 않습니다." }, faqTitle: "자주 묻는 질문",
    faqs: [["어떤 URL을 신고할 수 있나요?", "ScoreTransposer 사이트, 앱 또는 공개 공유 도메인의 구체적인 URL을 제출하세요."], ["조회 코드가 한 번만 표시되는 이유는 무엇인가요?", "해시만 저장되므로 원래 코드는 데이터베이스에서 복구할 수 없습니다."], ["제출하면 콘텐츠가 자동 삭제되나요?", "아닙니다. 플랫폼은 자료를 검토하고 추가 정보 요청, 조치 또는 기각 사유를 공개 사건 기록에 남깁니다."]],
    form: { submitTitle: "저작권 신고 제출", submitBody: "권리 근거, 원저작물 설명 및 플랫폼 내 대상 URL을 제공하세요. 제출하면 참조 번호와 일회용 조회 코드가 생성됩니다.", submitFormAriaLabel: "저작권 신고 제출 양식", name: "신고자 이름", email: "연락처 이메일", organization: "기관 / 출판사(선택)", relationship: "저작물과의 관계", owner: "저작권자", agent: "권한을 받은 대리인", work: "원저작물 및 권리 설명", workHint: "제목, 저자, 최초 공개 또는 등록 정보와 주장하는 권리 범위를 포함하세요.", targets: "침해가 의심되는 ScoreTransposer URL", targetsHint: "플랫폼 URL을 한 줄에 하나씩, 최대 20개 입력하세요.", evidence: "증빙 링크(선택)", evidenceHint: "공개 접근 가능한 URL을 한 줄에 하나씩, 최대 10개 입력하세요. 민감한 개인정보를 링크에 넣지 마세요.", action: "요청하는 플랫폼 조치", goodFaith: "해당 사용이 권리자, 대리인 또는 법률에 의해 허가되지 않았다고 선의로 믿습니다.", accuracy: "정보가 정확하며 관련 권리자를 대신해 신고할 권한이 있음을 확인합니다.", signature: "전자 서명(법적 이름 입력)", honeypotLabel: "웹사이트", submit: "신고 제출", submitting: "제출 중...", receiptTitle: "신고가 등록되었습니다", receiptStatus: "접수됨", receiptBody: "참조 번호와 조회 코드를 지금 저장하세요. 보안을 위해 코드는 사이트에 다시 표시되지 않습니다.", receiptAriaLabel: "저작권 신고 접수증", due: "최초 답변 목표", trackTitle: "신고 상태 조회", trackBody: "조회에는 POST가 사용되어 코드가 URL이나 브라우저 기록에 남지 않습니다.", trackFormAriaLabel: "저작권 신고 상태 조회 양식", reference: "신고 참조 번호", access: "조회 코드", lookup: "상태 확인", lookingUp: "확인 중...", current: "현재 상태", actionTaken: "취한 조치", history: "공개 사건 기록", emptyHistory: "아직 공개된 사건 업데이트가 없습니다.", statuses: { received: "접수됨", validating: "자료 확인 중", info_required: "추가 정보 필요", reviewing: "검토 중", actioned: "조치 완료", rejected: "기각됨", closed: "종료됨" } },
  },
  privacy: {
    metadata: { title: "악보 플랫폼 개인정보 처리방침 | ScoreTransposer", description: "계정 데이터, 업로드한 악보와 미디어, 생성 결과, 내보내기, 삭제 유예 기간 및 보관 정책을 확인하세요.", keywords: ["ScoreTransposer 개인정보", "악보 파일 보관", "계정 삭제", "음악 데이터 개인정보", "분석 동의"], socialImageAlt: "개인정보 처리방침을 위한 영문 UI ScoreTransposer 악보 미리보기" },
    hero: { eyebrow: "개인정보 처리방침", title: "scoretransposer.com의 현재 개인정보 기준", body: "이 정책은 계정 데이터, 업로드한 악보와 미디어, 구조화된 개정본, 생성 결과 및 지원 기록의 처리 방식을 설명합니다.", updatedPrefix: "최종 업데이트", termsAction: "이용약관 보기" },
    sections: [
      { title: "수집 정보", points: ["이메일 주소, 비밀번호 해시, 활성화 상태 및 권한 기간 등의 계정 데이터.", "업로드한 악보, 스캔, 오디오 또는 비디오, 구조화된 MusicXML과 Score JSON, 생성한 내보내기 및 교정 기록.", "업로드 시간, 작업 상태, 파일 이름 및 지원 연락 기록 등의 운영 메타데이터."] },
      { title: "데이터 이용", points: ["사용자 인증, 유료 접근 확인 및 악보 스캔, 편집, 변환, 조옮김, 재생, 연습, 내보내기 제공.", "로그인 사용자가 앱에서 검토하고 다운로드할 수 있도록 원본 파일과 생성 결과 보관.", "실패한 작업 조사, 지원 요청 대응 및 휴리스틱 변환 품질 개선."] },
      { title: "보관 및 삭제", points: ["계정과 권한 기록은 계정 활성 기간 및 필요한 후속 지원을 위해 보관됩니다.", "업로드 원본과 생성 결과는 다운로드, 검토 및 문제 해결을 위해 보관됩니다.", "로그인 사용자는 구조화된 데이터 사본을 내려받고 비밀번호 확인 후 삭제를 요청할 수 있습니다. 삭제에는 14일 취소 유예 기간이 있습니다.", "유예 기간 후 사용자 악보, 교실 데이터, 지원 기록과 저장 파일을 삭제하며 감사에 필요한 결제 기록은 비식별화합니다."] },
      { title: "데이터 공유", points: ["고객 파일을 판매하지 않습니다.", "서비스 제공을 위해 트래픽, 호스팅, DNS, 저장소, 로그 및 배포 제공자가 필요한 운영 데이터를 처리할 수 있습니다.", "법률상 요구되거나 악용, 사기 또는 보안 사고로부터 서비스를 보호하기 위해 공개할 수 있습니다."] },
      { title: "쿠키 및 분석", points: ["기능성 언어 쿠키가 선택한 인터페이스 언어를 기억합니다.", "Cloudflare Web Analytics의 실사용자 측정(RUM)은 페이지 조회와 로딩 성능을 측정하기 위해 전역에서 활성화됩니다. 쿠키와 브라우저 저장소를 사용하지 않고 Cloudflare 엣지에서 방문자 IP 주소를 폐기합니다.", "GA4 또는 Microsoft Clarity는 명시적 동의가 있고 운영 분석이 활성화된 경우에만 로드됩니다.", "동의가 필요한 분석을 거부해도 공개 콘텐츠나 제품 흐름을 이용할 수 있습니다."] },
      { title: "보안 기준", points: ["변환 도구 접근은 사용자 인증과 활성화 기반 권한 확인으로 제한됩니다.", "운영 환경 접근은 승인된 운영자로 제한하고 비밀값은 소스 코드가 아닌 호스팅 플랫폼에서 관리해야 합니다.", "불법 또는 무단 업로드를 피하고 게시나 공연 전 음악 정확성을 확인할 책임은 사용자에게 있습니다."] },
    ],
    contact: { title: "문의 및 정책 변경", body: "로그인한 대시보드에서 데이터 내보내기와 계정 삭제를 이용할 수 있습니다. 로그인할 수 없거나 정책 설명이 필요하면 공개 지원 채널에서 계정 신원을 확인하세요.", note: "호스팅, 저장, 분석, 결제 또는 계정 처리에 중대한 변경이 생기면 이 정책을 업데이트합니다.", action: "개인정보 지원 요청" },
    related: { eyebrow: "관련 정보", title: "약관과 제품 정보 계속 보기", body: "검색이나 결제에서 온 방문자는 제품 위치, 서비스 범위 및 구매 경로도 확인할 수 있습니다.", aboutAction: "소개 및 지원 열기", termsAction: "약관 열기", checkoutAction: "구매 경로 보기" },
    continue: { eyebrow: "계속 둘러보기", title: "다음으로 자주 찾는 곳은 지원, 약관 및 구매 안내입니다.", body: "데이터 처리, 계정 삭제 또는 개인정보 권리에 관한 질문은 지원 양식으로 문의하세요.", supportAction: "지원 문의", homeAction: "홈으로" },
  },
  terms: {
    metadata: { title: "악보 플랫폼 이용약관 | ScoreTransposer", description: "MusicXML 가져오기, 편집, 조옮김, Jianpu, 재생, 내보내기, 교육, 저작권 및 허용 사용 규칙을 확인하세요.", keywords: ["ScoreTransposer 약관", "악보 구독 약관", "악보 업로드 규칙", "구독 취소", "저작권 허용 사용"], socialImageAlt: "이용약관을 위한 영문 UI ScoreTransposer 악보 미리보기" },
    hero: { eyebrow: "이용약관", title: "ScoreTransposer 이용약관", body: "무료 접근, 구독 활성화, 자동 갱신, 취소, 결과 전달 및 사용자 책임을 설명합니다.", updatedPrefix: "최종 업데이트", privacyAction: "개인정보 처리방침 보기" },
    sections: [
      { title: "서비스 범위", points: ["악보 프로젝트, 구조화 악보 가져오기, 오선보/Jianpu 변환, 조옮김, 교정, 재생, 교육 흐름 및 설정된 내보내기 형식을 지원합니다.", "OMR, PDF/이미지 출력, 고품질 오디오 및 오디오 채보에는 외부 도구 설정이 필요하며 특정 배포에서 사용할 수 없을 수 있습니다.", "서비스 발전에 따라 사이트, 앱 및 출력물이 변경될 수 있으므로 구매 시 공개된 현재 범위만 기준으로 삼아야 합니다."] },
      { title: "계정 및 구독 접근", points: ["등록된 Free 계정은 공개된 월간 작업 및 저장 한도 안에서 완전한 악보 프로젝트 하나를 만들 수 있으며 결제 카드나 활성화 코드가 필요하지 않습니다.", "유료 접근은 결제 제공자가 구독을 확인한 후 자동 활성화되거나 공인 채널의 유효한 코드를 교환해 활성화됩니다.", "접근 권한은 적용 기간과 연결되며 사기, 악용, 결제 분쟁 또는 정책 위반 시 중단될 수 있습니다.", "사용자는 계정 자격 증명을 비밀로 유지하고 계정 내 모든 활동에 책임을 집니다."] },
      { title: "업로드 및 결과", points: ["사용자는 처리 권한이 있는 콘텐츠만 업로드할 수 있습니다.", "시스템이 결과를 확실히 승격할 수 없으면 final PDF 또는 draft 패키지로 전달될 수 있습니다.", "게시, 교육, 리허설 또는 공연 전 음악 정확성, 저작권 준수 및 적합성을 확인할 책임은 사용자에게 있습니다."] },
      { title: "청구, 갱신, 취소 및 환불", points: ["Starter와 Converter Pro는 결제 화면의 가격, 통화, 세금 및 주기에 따라 월간 또는 연간 자동 갱신되는 구독입니다.", "취소하지 않으면 구독이 자동 갱신되고 각 새 청구 기간 시작 시 저장된 결제 수단으로 청구됩니다.", "다음 갱신 전에 Billing에서 취소하거나 지원팀에 문의할 수 있습니다. 취소는 향후 갱신을 중단하며 환불, 결제 분쟁, 사기 검토 또는 법적 요구가 없으면 현재 유료 기간 끝까지 접근할 수 있습니다.", "환불은 지원팀에 요청할 수 있습니다. 구매 시 약관, 결제 제공자 규칙 및 강행 소비자법을 따르며 전액 환불은 관련 유료 권한을 종료할 수 있습니다."] },
      { title: "허용되는 사용", points: ["멀웨어, 침해 콘텐츠 또는 플랫폼 방해 목적의 파일 업로드는 금지됩니다.", "자동화된 악용, 자격 증명 공유, 비공개 고객 데이터 수집 및 권한 통제 우회는 금지됩니다.", "악용, 보안 위험 또는 법적 노출이 감지되면 ScoreTransposer는 접근을 중단하거나 종료할 수 있습니다."] },
    ],
    purchase: { title: "구매 및 환불 안내", body: "구독 가격, 청구 주기, 세금 및 결제 수단은 결제 화면을 따르며 취소와 환불은 이 약관, 구매 고지 및 제공자 규칙을 따릅니다.", note: "요금제, 가격, 갱신 방식 또는 서비스 범위가 크게 바뀌면 고지를 업데이트합니다.", supportAction: "지원 요청 제출" },
    related: { eyebrow: "관련 페이지", title: "개인정보, 제품 정보 및 지원 계속 보기", body: "서비스 범위를 확인한 뒤 데이터 처리, 지원 경로 및 실제 활성화 절차도 확인할 수 있습니다.", privacyAction: "개인정보 열기", copyrightAction: "저작권 신고 제출", aboutAction: "소개 및 지원 열기", checkoutAction: "구매 경로 보기" },
    help: { eyebrow: "도움이 필요하신가요", title: "약관이나 계정 접근에 질문이 있나요?", body: "개인정보 및 제품 정보를 계속 확인하거나 지원 양식으로 구체적인 질문을 제출하세요.", supportAction: "지원 문의", homeAction: "홈으로" },
  },
} as const satisfies SupportLegalLocalization;
