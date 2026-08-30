import type { EducationMessages } from "../types";

export const zhCNEducationMessages = {
  pages: {
    classrooms: { metadataTitle: "课堂与学校协作", metadataDescription: "管理课堂、花名册、资源、通知与教学协作。", eyebrow: "课堂 / 学校 Beta", title: "课堂与学校协作 Beta", body: "集中管理课堂、学生名册、资源、通知和教学协作。" },
    student: { metadataTitle: "我的课堂", metadataDescription: "查看乐谱作业、学习资料、课堂通知、成绩和教师反馈。" },
  },
  shared: {
    roles: { owner: "所有者", admin: "管理员", teacher: "教师", assistant: "助教", observer: "观察者", student: "学生", guardian: "监护人" },
    statuses: { invited: "已邀请", active: "已激活", archived: "已归档", removed: "已移除", pending: "待处理", published: "已发布", scheduled: "已安排", cancelled: "已取消", draft: "草稿", verified: "已验证" },
    resourceTypes: { score: "乐谱", audio: "音频", video: "视频", document: "文档" },
    resourceSources: { external: "外链", file: "上传文件" },
    resourceVisibilities: { classroom: "全班", selected: "指定学生", staff: "仅教师团队" },
  },
  classrooms: {
    eyebrow: "教学协作", title: "课堂管理", body: "为教师、合唱团和培训机构管理班级与学生花名册。作业可绑定课堂，提交记录会按学生整理。",
    createTitle: "新建课堂", name: "课堂名称", description: "说明", create: "创建课堂", creating: "正在创建...", empty: "还没有课堂。", students: "学生", addStudent: "添加学生",
    displayName: "学生姓名", contactEmail: "联系邮箱", externalRef: "学号 / 备注", removeStudent: "移出", archiveClassroom: "归档课堂", loading: "正在加载课堂...", created: "课堂已创建。", studentAdded: "学生已添加。",
    bulkRoster: "批量花名册", bulkHint: "从表格粘贴，每行依次为姓名、邮箱、学号/备注，并用制表符分列。", importRoster: "导入花名册", rosterImported: "花名册已导入。",
    guardian: "监护人", guardianName: "监护人姓名", guardianEmail: "监护人登录邮箱", relationship: "关系，例如：母亲", inviteGuardian: "邀请监护人", guardianInvited: "监护人已邀请。", archived: "已归档。",
    statusAria: "课堂操作状态", loadingAria: "课堂加载状态", rosterAria: "课堂花名册",
  },
  organization: {
    eyebrow: "机构权限", title: "机构、校区与课堂人员", body: "机构管理员管理校区和成员；教师与助教可运营课堂，观察者保持只读。邀请邮箱会在账号登录后由服务端自动认领。",
    createOrganization: "新建机构", organizationName: "机构名称", addCampus: "添加校区", selectOrganization: "选择机构", campusName: "校区名称", campusCode: "校区代码", saveCampus: "保存校区",
    inviteOrganizationMember: "邀请机构成员", displayName: "姓名", signInEmail: "登录邮箱", inviteMember: "发送邀请", campuses: "校区", remove: "移除", classroomPlacement: "课堂归属", selectClassroom: "选择课堂",
    personalClassroom: "个人课堂", noCampus: "不指定校区", savePlacement: "保存归属", assignClassroomStaff: "分配课堂人员", assignStaff: "分配人员", classroomStaff: "课堂人员", noStaff: "尚未分配。",
    accessUpdated: "机构权限已更新。", placementUpdated: "课堂归属已更新。", memberRemoved: "成员已移除。", statusAria: "机构权限操作状态", organizationSelectAria: "机构", classroomSelectAria: "课堂", memberRoleAria: "机构成员角色", staffRoleAria: "课堂人员角色",
  },
  operations: {
    eyebrow: "课堂运营", title: "通知、资源库与 LMS", body: "学生账号按花名册邮箱关联；课堂资源、定时通知和阅读回执在此统一管理。", classroom: "课堂", currentClassroomAria: "当前课堂", selectClassroom: "选择课堂", statusAria: "教学运营状态",
    saved: "已保存到课堂。", archived: "已归档。", retriedEmails: "已将 {count} 封失败邮件重新加入队列。", rosterSynced: "已同步 {imported} 名学生，跳过 {skipped} 条非学生记录。", retentionSaved: "资源版本保留策略已保存。",
    retentionPurged: "已清理 {count} 个过期历史版本的文件内容。", fileUploaded: "文件已安全上传到课堂。", versionRestored: "已将 v{from} 恢复为新的 v{to}。", folderCreated: "文件夹已创建。",
    resourceReused: "资源已复用到当前课堂。", folderUpdated: "文件夹已更新；已创建 {count} 个资源新版本。", resourceMoved: "资源已移动，并创建不可变版本 v{version}。",
    resource: { add: "添加资源", publishVersion: "发布资源新版本", sourceAria: "资源来源", title: "资源标题", file: "资源文件", typeAria: "资源类型", visibilityAria: "资源可见范围", studentsWithAccess: "可访问学生", noActiveStudents: "当前课堂没有可授权的活跃学生。", folderAria: "资源文件夹", rootFolder: "根目录", tags: "标签，用逗号分隔", upload: "上传资源", save: "保存资源", cancel: "取消", version: "v{version}", selectedStudents: "指定学生（{count}）", history: "版本历史", newVersion: "新版本", archive: "归档", moveAria: "移动 {title}", move: "移动" },
    notification: { publish: "发布通知", title: "通知标题", body: "通知内容", scheduleLabel: "定时发布（留空则立即）", schedule: "安排发布", publishNow: "立即发布", history: "通知记录", empty: "还没有通知。", read: "已读", email: "邮件", sent: "已发送", pending: "待发送", failed: "失败", retryFailed: "重试失败邮件", cancel: "取消" },
    retention: { title: "历史版本保留", enable: "启用自动清理", days: "历史版本保留天数", minimumVersions: "每组至少保留的历史版本", note: "当前版本和手动锁定版本不会清理。清理只移除文件内容，版本记录仍保留。", previewSummary: "将清理 {count} 个版本，约 {size}。", save: "保存策略", preview: "预览", purge: "执行清理" },
    lms: { title: "LTI 1.3 连接", courseRef: "课程编号", baseUrl: "LMS 地址（可选）", issuer: "发行方（https://...）", clientId: "客户端 ID", deploymentId: "部署 ID", oidcAuthUrl: "OIDC 授权地址", tokenUrl: "OAuth 令牌地址", jwksUrl: "平台 JWKS 地址", note: "保存后从 LMS 发起一次工具启动；只有签名、nonce、deployment 与 target link 全部验证通过才会启用连接。", saveDraft: "保存草稿", deploymentMissing: "尚未配置部署 ID", rosterSynced: "名单同步于", syncRoster: "同步名单", section: "LMS / LTI", providers: { manual: "手动 / LTI", canvas: "Canvas", moodle: "Moodle", "google-classroom": "Google Classroom" } },
    library: { eyebrow: "资源库", resourceCount: "{count} 项资源", search: "搜索标题、文件夹或标签", noMatches: "没有匹配的资源。", newFolder: "新文件夹名称", parentFolderAria: "父文件夹", underRoot: "根目录下", createFolder: "创建文件夹", sourceClassroomAria: "来源课堂", sourceClassroom: "选择来源课堂", sourceResourceAria: "来源资源", selectResource: "选择资源", reuseFolderAria: "复用目标文件夹", reuseRoot: "复用到根目录", reuse: "复用资源", folderManagementAria: "文件夹管理", renameAria: "重命名 {path}", parentForAria: "{path} 的父文件夹", save: "保存", cancel: "取消", edit: "编辑", archiveEmptyFolder: "归档空文件夹", root: "根目录" },
    history: { aria: "{title} 版本历史", note: "历史版本保持只读；恢复会创建新的当前版本。", contentExpired: "内容已过期", historical: "历史", current: "当前", held: "保留锁", restoredFromHistory: "由历史版本恢复", download: "下载", open: "打开", removeHold: "取消保留", keep: "永久保留", restore: "恢复为新版" },
  },
  student: {
    eyebrow: "学习中心", title: "我的课堂", body: "集中查看教师发布的乐谱作业、练习资料、通知、成绩和反馈。", loading: "正在加载课堂内容...", login: "请先登录，再查看已关联到你邮箱的课堂。", empty: "还没有关联的课堂。请让教师把你的登录邮箱加入班级花名册。",
    assignments: "乐谱作业", resources: "学习资料", notifications: "课堂通知", unread: "条未读", due: "截止", noDue: "无截止时间", score: "乐谱", openScore: "打开乐谱", noShare: "教师尚未开放乐谱",
    submissionStatuses: { pending: "待提交", submitted: "已提交", reviewed: "已批改" }, feedback: "教师反馈", grade: "成绩", noAssignments: "暂无作业。", noResources: "暂无学习资料。", noNotifications: "暂无课堂通知。", markRead: "标为已读", read: "已读",
    guardianView: "监护人视图", studentView: "学生视图", exitClass: "退出课堂", exitReason: "退出原因（可选）", requestExit: "申请退出", awaitingGuardian: "等待监护人同意", cancelExit: "撤回申请", approveExit: "同意退出", rejectExit: "拒绝退出", exitRejected: "监护人已拒绝上次申请，可重新提交。",
    preferences: "通知设置", emailAnnouncements: "通过邮件接收课堂通知", emailHint: "默认关闭。开启后，新发布的课堂通知会发送到你的登录邮箱。", summaryAria: "课堂与未读通知摘要", loadingAria: "学生课堂加载状态", preferencesAria: "通知偏好设置",
  },
} satisfies EducationMessages;
