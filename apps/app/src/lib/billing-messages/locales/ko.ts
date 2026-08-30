import type { BillingMessageCatalog } from "../types";

export const koBillingMessages = {
  reviewNotice: "아래 결제 문구는 전문 검토 전 번역 초안입니다. 내용이 다르면 영어 약관과 결제 서비스 페이지가 우선합니다.",
  activation: {
    page: { title: "활성화 코드 사용", description: "구매 후 받은 코드를 입력하여 현재 악보 작업 공간을 1년 동안 활성화하세요." },
    form: {
      eyebrow: "코드 사용", title: "구매 내역을 1년 이용 권한으로 전환", body: "구매 시 제공된 활성화 코드를 입력하세요. 이용 권한을 현재 계정에 연결하려면 먼저 로그인해야 합니다.",
      devSeed: "개발용 데모 코드", devSeedFootnote: "로컬 개발 또는 명시적 테스트 환경에서만 표시됩니다.", codeLabel: "활성화 코드", codePlaceholder: "활성화 코드 입력",
      submit: "코드 사용", submitting: "처리 중...", fillDemo: "데모 코드 입력", loginFirst: "코드를 사용하기 전에 로그인하세요.", required: "활성화 코드를 입력하세요.",
      success: "활성화되었습니다. 내 악보를 여는 중...", footnote: "유효한 코드는 계정의 이용 기간을 즉시 업데이트합니다.", fallbackError: "활성화 코드를 사용할 수 없습니다. 다시 시도하세요.",
    },
  },
  checkout: {
    unavailable: {
      eyebrow: "결제 출시 상태", title: "운영 결제의 실제 거래 검증을 마무리하고 있습니다.",
      body: "운영 사이트는 테스트 주문을 만들거나 staging 결제로 이동하지 않습니다. 실제 결제, 환불, 구독 갱신이 최종 검증을 통과한 뒤 이 경로가 열립니다.", continueFree: "무료 편집 계속하기",
    },
    page: {
      eyebrow: "크레딧 요금", title: "크레딧 요금제 선택", body: "과금 대상 작업이 성공할 때마다 크레딧 1개를 사용합니다. 로그인 전에 가격, 기능, 리소스를 비교하세요.",
      promoLabel: "연간 결제로 절약", promoValue: "약 45%~49% 절약", planNote: "월간 크레딧은 매달 초기화되며 이월되지 않습니다. 보기, 재생 제어, 제출하지 않은 기본 편집에는 크레딧이 들지 않습니다.",
    },
    selector: {
      plansAria: "크레딧 요금제 선택", selectedPlan: "선택한 요금제", continueTemplate: "{name} {cycle} 계속하기", freeEyebrow: "무료",
      freeTitle: "첫 번째 완전한 악보를 무료로 만들기", freeBody: "결제나 카드가 필요 없습니다. 무료 요금제는 완전한 악보 프로젝트 하나를 계속 보관하고 매달 크레딧을 제공합니다.", freeCta: "무료로 악보 만들기", creditUsage: "실제 사용할 때만 크레딧 차감", includedCapabilities: "포함 기능", benefitsAndResources: "혜택 및 리소스",
    },
    client: {
      checkoutEyebrow: "결제", title: "온라인 결제 후 이용 권한 자동 활성화", body: "결제가 완료되면 등록 계정의 이용 권한이 자동으로 활성화됩니다. 해외 고객은 코드를 직접 입력할 필요가 없습니다.",
      provider: "결제 서비스", plan: "구독 유형", individual: "개인", school: "학교/기관 좌석", organization: "결제 기관", organizationPlaceholder: "기관 선택",
      noOrganizations: "이 계정에는 결제에 사용할 수 있는 기관이 없습니다.", seats: "좌석 수", seatsHelp: "2~100,000석을 선택할 수 있습니다.",
      stripeTitle: "Stripe", stripeLiveBody: "해외 카드 및 지갑 결제에 적합합니다.", stripeBuildingBody: "운영 결제가 아직 연결되지 않았습니다. 현재는 청구 없이 수요만 기록합니다.",
      paddleTitle: "Paddle", paddleLiveBody: "Paddle이 해외 결제, 세금 및 구독을 처리합니다.", paddleBuildingBody: "운영 판매자 계정 승인을 기다리고 있습니다. 현재는 청구 없이 수요만 기록합니다.",
      available: "사용 가능", building: "개발 중", waiting: "운영 판매자 승인 대기", button: "현재 탭에서 안전한 결제로 계속", intentButton: "구매 요청을 운영자에게 알리기",
      loading: "결제 페이지로 이동 중...", checking: "로그인 상태 확인 중...", signInEyebrow: "로그인 필요", signInTitle: "결제 서비스를 선택하기 전에 로그인",
      signInBody: "Google 또는 이메일로 로그인하세요. 로그인 후에도 이 페이지에서 Stripe와 Paddle을 확인할 수 있으며, 아직 운영되지 않는 서비스는 청구하지 않습니다.",
      signInPoints: ["크레딧을 올바른 계정에 연결", "로그인한 고객만 구매 요청 제출 가능", "Google 또는 이메일 로그인 사용"], selectedPlan: "선택한 요금제",
      accountNote: "Google 계정은 구독을 받을 계정을 확인합니다. 카드, Google Pay 등은 선택한 결제 서비스가 제공하며 결제는 현재 탭에서 열립니다.",
      intentNote: "계속하기 전에 서버가 운영자에게 구매 요청 이메일을 보냅니다. 운영 중인 서비스만 결제로 이동하며 개발 중인 서비스는 청구하지 않습니다.",
      providerBuildingTemplate: "{provider} 운영 결제는 개발 중입니다. 구매 요청이 운영자에게 전달되었으며 청구는 발생하지 않았습니다.", notificationFailed: "운영자에게 알리지 못했습니다. 나중에 다시 시도하세요. 청구는 발생하지 않았습니다.",
      fallbackError: "결제를 시작할 수 없습니다. 다시 시도하세요.",
    },
    status: {
      loading: "결제 상태 확인 중...", pendingTitle: "결제 확인 중", pendingBody: "결제가 완료되면 현재 계정의 이용 권한이 자동으로 활성화됩니다.",
      successTitle: "결제 완료 및 계정 활성화", successBody: "이용 권한이 준비되었습니다. 코드를 직접 입력하지 않고 내 악보를 열 수 있습니다.", cancelledTitle: "결제가 취소되었습니다", cancelledBody: "완료된 결제가 기록되지 않았습니다. 내 악보로 돌아가거나 요금제를 다시 선택할 수 있습니다.", failedTitle: "결제가 완료되지 않았습니다", failedBody: "이용 권한 변경이 확인되지 않았습니다. 결제 서비스 페이지를 확인하거나 다시 시도하세요.", scores: "내 악보 열기", jobs: "작업 열기", fallbackError: "결제 상태를 불러올 수 없습니다. 다시 시도하세요.",
    },
  },
  billing: {
    page: { eyebrow: "결제 관리", title: "구독, 갱신, 환불 및 학교 좌석을 관리하세요.", body: "이용 권한은 검증된 결제 서비스 Webhook 원장을 따르며 갱신 실패, 취소, 환불도 권한 상태에 반영됩니다." },
    manager: {
      loading: "결제 정보 불러오는 중...", fallbackError: "결제 정보를 불러올 수 없습니다. 다시 시도하세요.", signIn: "결제 정보를 보려면 로그인하세요.",
      creditEyebrow: "크레딧 잔액", availableCredits: "이번 달 사용 가능 크레딧", creditUnit: "크레딧", creditSummaryTemplate: "이번 달 {limit}개 중 {used}개를 사용했습니다.", creditUsage: "이번 달 크레딧 사용량", storage: "파일 저장 공간",
      quotaNote: "과금 대상 작업이 성공할 때마다 크레딧 1개를 사용합니다. 크레딧은 매달 초기화되며 이월되지 않습니다.",
      freeEyebrow: "무료 이용 상태", noPaidTitle: "활성 유료 요금제가 없습니다", freeBody: "무료 계정은 완전한 여러 페이지 PDF 또는 악보 이미지로 평생 프로젝트 하나를 만들고 교정, 재생, 조옮김, 숫자보, 공유 및 내보내기를 이용할 수 있습니다. 무료 한도는 {credits}입니다.", unlock: "전체 이용 권한 활성화",
      subscriptionsEyebrow: "구독", subscriptionsTitle: "이용 권한 및 갱신 상태", manageStripe: "Stripe 결제 수단 관리", managingStripe: "Stripe 여는 중...", noSubscriptions: "이 계정에 연결된 구독이 없습니다.",
      currentPeriodEndsTemplate: "현재 기간 종료일: {date}", noFixedEnd: "고정된 기간 종료일 없음", renewalFailed: "최근 갱신에 실패했습니다. 결제 수단을 업데이트하세요.", cancellationScheduled: "현재 기간이 끝날 때 취소됩니다.",
      seatsTemplate: "{count}석", cancel: "기간 종료 시 취소", canceling: "취소 중...", cancelSuccess: "현재 결제 기간이 끝날 때 구독이 취소됩니다.",
      memberEmail: "구성원 이메일", memberEmailPlaceholder: "member@example.com", assignSeat: "좌석 배정", assigningSeat: "배정 중...", revoke: "회수", revoking: "회수 중...",
      invoicesEyebrow: "청구서", invoicesTitle: "결제, 환불 및 실패 내역", noInvoices: "청구서가 없습니다.", invoicePaidTemplate: "결제일: {date}", invoiceDueTemplate: "납부 기한: {date}", invoiceFailedTemplate: "실패일: {date}", refundedTemplate: "환불됨 {amount}", viewInvoice: "청구서 보기", amountPending: "금액 확인 중",
      subscriptionStatuses: { trialing: "체험 중", active: "활성", past_due: "연체", paused: "일시 중지", unpaid: "미결제", incomplete: "미완료", cancelled: "취소됨" },
      invoiceStatuses: { draft: "초안", open: "미결제", paid: "결제됨", failed: "실패", void: "무효", refunded: "환불됨" },
      quotaTiers: { free: "무료", starter: "Starter", "converter-pro": "Converter Pro" }, providers: { stripe: "Stripe", paddle: "Paddle" },
    },
  },
  plans: {
    names: { free: "무료", starter: "Starter", "converter-pro": "Converter Pro" }, cycles: { lifetime: "평생", monthly: "월간", annual: "연간" },
    badges: { free: "평생 무료", "starter-monthly": "유연한 월간 결제", "starter-annual": "Starter 연간", "converter-pro-monthly": "더 큰 용량", "converter-pro-annual": "고용량 연간" },
    audiences: {
      free: "완전한 악보 하나로 현재 프로젝트 기능 모두 사용", "starter-monthly": "개인 악보를 꾸준히 처리하는 사용자용", "starter-annual": "크레딧당 비용을 낮추며 장기간 사용하는 개인용",
      "converter-pro-monthly": "매달 더 많은 악보를 처리하는 개인용", "converter-pro-annual": "개인 악보를 장기간 자주 처리하는 사용자용",
    },
    ctas: { free: "무료로 악보 만들기", "starter-monthly": "Starter 월간 선택", "starter-annual": "Starter 연간 선택", "converter-pro-monthly": "Converter Pro 월간 선택", "converter-pro-annual": "Converter Pro 연간 선택" },
    unitPriceTemplate: "크레딧당 {unitPrice}", freeUnitPriceTemplate: "완전한 악보 프로젝트 {projectCount}개", creditsTemplate: "월 {monthlyCredits} 크레딧", freeCreditsTemplate: "완전한 악보 {projectCount}개 · 월 {monthlyCredits} 크레딧",
    benefits: {
      freeProject: "완전한 악보 프로젝트 {projectCount}개를 평생 생성", moreThanFreeProject: "무료 악보 프로젝트 {projectCount}개 제한 해제", starterIncluded: "현재 Starter의 모든 기능", starterMonthlyIncluded: "현재 Starter 월간의 모든 기능", converterMonthlyIncluded: "현재 Converter Pro 월간의 모든 기능",
      editor: "온라인 편집기, 파트 사본 생성기 Beta 및 실시간 공동 작업 Beta", practice: "재생, 브라우저 녹음 및 연습 피드백 Beta, 스마트 조옮김", conversion: "오선보 ↔ 숫자보 및 MusicXML ↔ MIDI 변환",
      exports: "해당 렌더러 사용 시 PDF/SVG/PNG 및 WAV/MP3 내보내기", freeExports: "무료 악보에서 현재 공개된 내보내기 및 프로젝트 기능 사용",
    },
    resources: {
      monthlyCredits: "매달 {monthlyCredits} 크레딧", monthlyCreditsReset: "매달 {monthlyCredits} 크레딧, 월별 초기화", storage: "파일 저장 공간 {storage} GB", personalLibrary: "개인 악보함, 수정 기록 및 공개 악보 카탈로그",
      monthlyRenewal: "장기 약정 없는 월간 갱신", annualSavings: "월간 결제 12회 대비 {annualSavings} 절약", freeLibrary: "공개 악보 라이브러리 및 CC0 다운로드", noCard: "카드 필요 없음; 무료 프로젝트 유지",
    },
  },
} satisfies BillingMessageCatalog;
