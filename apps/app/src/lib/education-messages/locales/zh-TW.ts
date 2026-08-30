import type { EducationMessages } from "../types";

export const zhTWEducationMessages = {
  pages: {
    classrooms: { metadataTitle: "課堂與學校協作", metadataDescription: "管理課堂、名冊、資源、通知與教學協作。", eyebrow: "課堂 / 學校 Beta", title: "課堂與學校協作 Beta", body: "集中管理課堂、學生名冊、資源、通知和教學協作。" },
    student: { metadataTitle: "我的課堂", metadataDescription: "查看樂譜作業、學習資源、課堂通知、成績和教師回饋。" },
  },
  shared: {
    roles: { owner: "擁有者", admin: "管理員", teacher: "教師", assistant: "助教", observer: "觀察者", student: "學生", guardian: "監護人" },
    statuses: { invited: "已邀請", active: "已啟用", archived: "已封存", removed: "已移除", pending: "待處理", published: "已發布", scheduled: "已排程", cancelled: "已取消", draft: "草稿", verified: "已驗證" },
    resourceTypes: { score: "樂譜", audio: "音訊", video: "影片", document: "文件" }, resourceSources: { external: "外部連結", file: "上傳檔案" }, resourceVisibilities: { classroom: "全班", selected: "指定學生", staff: "僅教師團隊" },
  },
  classrooms: {
    eyebrow: "教學協作", title: "課堂管理", body: "為教師、合唱團和培訓機構管理班級與學生名冊。作業可連結課堂，提交記錄會依學生整理。",
    createTitle: "建立課堂", name: "課堂名稱", description: "說明", create: "建立課堂", creating: "正在建立...", empty: "目前沒有課堂。", students: "學生", addStudent: "新增學生", displayName: "學生姓名", contactEmail: "聯絡信箱", externalRef: "學號 / 備註", removeStudent: "移出", archiveClassroom: "封存課堂", loading: "正在載入課堂...", created: "課堂已建立。", studentAdded: "學生已新增。",
    bulkRoster: "批次名冊", bulkHint: "從試算表貼上，每列依序為姓名、電子郵件、學號/備註，並以定位字元分欄。", importRoster: "匯入名冊", rosterImported: "名冊已匯入。", guardian: "監護人", guardianName: "監護人姓名", guardianEmail: "監護人登入信箱", relationship: "關係，例如：母親", inviteGuardian: "邀請監護人", guardianInvited: "監護人已邀請。", archived: "已封存。", statusAria: "課堂操作狀態", loadingAria: "課堂載入狀態", rosterAria: "課堂名冊",
  },
  organization: {
    eyebrow: "機構權限", title: "機構、校區與課堂人員", body: "機構管理員管理校區和成員；教師與助教可營運課堂，觀察者維持唯讀。邀請信箱會在帳號登入後由伺服器自動認領。",
    createOrganization: "建立機構", organizationName: "機構名稱", addCampus: "新增校區", selectOrganization: "選擇機構", campusName: "校區名稱", campusCode: "校區代碼", saveCampus: "儲存校區", inviteOrganizationMember: "邀請機構成員", displayName: "姓名", signInEmail: "登入信箱", inviteMember: "傳送邀請", campuses: "校區", remove: "移除", classroomPlacement: "課堂歸屬", selectClassroom: "選擇課堂", personalClassroom: "個人課堂", noCampus: "不指定校區", savePlacement: "儲存歸屬", assignClassroomStaff: "分配課堂人員", assignStaff: "分配人員", classroomStaff: "課堂人員", noStaff: "尚未分配。", accessUpdated: "機構權限已更新。", placementUpdated: "課堂歸屬已更新。", memberRemoved: "成員已移除。", statusAria: "機構權限操作狀態", organizationSelectAria: "機構", classroomSelectAria: "課堂", memberRoleAria: "機構成員角色", staffRoleAria: "課堂人員角色",
  },
  operations: {
    eyebrow: "課堂營運", title: "通知、資源庫與 LMS", body: "學生帳號依名冊信箱連結；課堂資源、排程通知和閱讀回條在此統一管理。", classroom: "課堂", currentClassroomAria: "目前課堂", selectClassroom: "選擇課堂", statusAria: "教學營運狀態",
    saved: "已儲存至課堂。", archived: "已封存。", retriedEmails: "已將 {count} 封失敗郵件重新加入佇列。", rosterSynced: "已同步 {imported} 名學生，略過 {skipped} 筆非學生記錄。", retentionSaved: "資源版本保留政策已儲存。", retentionPurged: "已清理 {count} 個過期歷史版本的檔案內容。", fileUploaded: "檔案已安全上傳至課堂。", versionRestored: "已將 v{from} 還原為新的 v{to}。", folderCreated: "資料夾已建立。", resourceReused: "資源已重複使用至目前課堂。", folderUpdated: "資料夾已更新；已建立 {count} 個資源新版本。", resourceMoved: "資源已移動，並建立不可變版本 v{version}。",
    resource: { add: "新增資源", publishVersion: "發布資源新版本", sourceAria: "資源來源", title: "資源標題", file: "資源檔案", typeAria: "資源類型", visibilityAria: "資源可見範圍", studentsWithAccess: "可存取學生", noActiveStudents: "目前課堂沒有可授權的啟用中學生。", folderAria: "資源資料夾", rootFolder: "根目錄", tags: "標籤，以逗號分隔", upload: "上傳資源", save: "儲存資源", cancel: "取消", version: "v{version}", selectedStudents: "指定學生（{count}）", history: "版本歷史", newVersion: "新版本", archive: "封存", moveAria: "移動 {title}", move: "移動" },
    notification: { publish: "發布通知", title: "通知標題", body: "通知內容", scheduleLabel: "排程發布（留空則立即）", schedule: "安排發布", publishNow: "立即發布", history: "通知記錄", empty: "目前沒有通知。", read: "已讀", email: "郵件", sent: "已傳送", pending: "待傳送", failed: "失敗", retryFailed: "重試失敗郵件", cancel: "取消" },
    retention: { title: "歷史版本保留", enable: "啟用自動清理", days: "歷史版本保留天數", minimumVersions: "每組至少保留的歷史版本", note: "目前版本和手動鎖定版本不會清理。清理只移除檔案內容，版本記錄仍保留。", previewSummary: "將清理 {count} 個版本，約 {size}。", save: "儲存政策", preview: "預覽", purge: "執行清理" },
    lms: { title: "LTI 1.3 連線", courseRef: "課程編號", baseUrl: "LMS 網址（選填）", issuer: "發行者（https://...）", clientId: "用戶端 ID", deploymentId: "部署 ID", oidcAuthUrl: "OIDC 授權網址", tokenUrl: "OAuth 權杖網址", jwksUrl: "平台 JWKS 網址", note: "儲存後從 LMS 啟動一次工具；只有簽章、nonce、deployment 與 target link 全部驗證通過才會啟用連線。", saveDraft: "儲存草稿", deploymentMissing: "尚未設定部署 ID", rosterSynced: "名冊同步於", syncRoster: "同步名冊", section: "LMS / LTI", providers: { manual: "手動 / LTI", canvas: "Canvas", moodle: "Moodle", "google-classroom": "Google Classroom" } },
    library: { eyebrow: "資源庫", resourceCount: "{count} 項資源", search: "搜尋標題、資料夾或標籤", noMatches: "沒有符合的資源。", newFolder: "新資料夾名稱", parentFolderAria: "上層資料夾", underRoot: "根目錄下", createFolder: "建立資料夾", sourceClassroomAria: "來源課堂", sourceClassroom: "選擇來源課堂", sourceResourceAria: "來源資源", selectResource: "選擇資源", reuseFolderAria: "重複使用目標資料夾", reuseRoot: "重複使用至根目錄", reuse: "重複使用資源", folderManagementAria: "資料夾管理", renameAria: "重新命名 {path}", parentForAria: "{path} 的上層資料夾", save: "儲存", cancel: "取消", edit: "編輯", archiveEmptyFolder: "封存空資料夾", root: "根目錄" },
    history: { aria: "{title} 版本歷史", note: "歷史版本保持唯讀；還原會建立新的目前版本。", contentExpired: "內容已過期", historical: "歷史", current: "目前", held: "保留鎖", restoredFromHistory: "由歷史版本還原", download: "下載", open: "開啟", removeHold: "取消保留", keep: "永久保留", restore: "還原為新版" },
  },
  student: {
    eyebrow: "學習中心", title: "我的課堂", body: "集中查看教師發布的樂譜作業、練習資源、通知、成績和回饋。", loading: "正在載入課堂內容...", login: "請先登入，再查看已連結至你信箱的課堂。", empty: "目前沒有連結的課堂。請教師將你的登入信箱加入班級名冊。", assignments: "樂譜作業", resources: "學習資源", notifications: "課堂通知", unread: "則未讀", due: "截止", noDue: "無截止時間", score: "樂譜", openScore: "開啟樂譜", noShare: "教師尚未開放樂譜", submissionStatuses: { pending: "待提交", submitted: "已提交", reviewed: "已批改" }, feedback: "教師回饋", grade: "成績", noAssignments: "目前沒有作業。", noResources: "目前沒有學習資源。", noNotifications: "目前沒有課堂通知。", markRead: "標示為已讀", read: "已讀", guardianView: "監護人檢視", studentView: "學生檢視", exitClass: "退出課堂", exitReason: "退出原因（選填）", requestExit: "申請退出", awaitingGuardian: "等待監護人同意", cancelExit: "撤回申請", approveExit: "同意退出", rejectExit: "拒絕退出", exitRejected: "監護人已拒絕上次申請，可重新提交。", preferences: "通知設定", emailAnnouncements: "透過電子郵件接收課堂通知", emailHint: "預設關閉。啟用後，新發布的課堂通知會傳送至你的登入信箱。", summaryAria: "課堂與未讀通知摘要", loadingAria: "學生課堂載入狀態", preferencesAria: "通知偏好設定",
  },
} satisfies EducationMessages;
