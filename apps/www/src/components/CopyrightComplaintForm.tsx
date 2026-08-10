"use client";

import { useState } from "react";
import { StatusPill } from "@score/ui";
import { apiRequest } from "../lib/api";

type SubmitResult = {
  referenceCode: string;
  accessCode: string;
  responseDueAt: string;
  confirmationDelivery: "resend" | "preview" | "failed";
};

type LookupResult = {
  referenceCode: string;
  status: string;
  responseDueAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  actionTaken: string | null;
  updatedAt: string;
  events: Array<{ status: string; message: string; createdAt: string }>;
};

function lines(value: string) {
  return value.split(/\r?\n/u).map((item) => item.trim()).filter(Boolean);
}

export function CopyrightComplaintForm({ locale }: { locale: string }) {
  const isChinese = locale === "zh-CN";
  const [claimantName, setClaimantName] = useState("");
  const [claimantEmail, setClaimantEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [rightsBasis, setRightsBasis] = useState<"owner" | "authorized_agent">("owner");
  const [work, setWork] = useState("");
  const [targets, setTargets] = useState("");
  const [evidence, setEvidence] = useState("");
  const [requestedAction, setRequestedAction] = useState("");
  const [goodFaith, setGoodFaith] = useState(false);
  const [accuracy, setAccuracy] = useState(false);
  const [signature, setSignature] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<SubmitResult | null>(null);
  const [referenceCode, setReferenceCode] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const copy = isChinese ? {
    submitTitle: "提交版权投诉",
    submitBody: "请提供权利基础、原创作品说明和平台内目标链接。提交后会生成投诉编号与一次性查询码。",
    name: "投诉人姓名",
    email: "联系邮箱",
    organization: "机构 / 出版方（可选）",
    relationship: "与作品的关系",
    owner: "版权所有者",
    agent: "经授权代理人",
    work: "原创作品与权利说明",
    workHint: "说明作品名称、作者、首发或登记信息，以及你主张权利的范围。",
    targets: "涉嫌侵权的 ScoreTransposer 链接",
    targetsHint: "每行一个平台内 URL，最多 20 个。",
    evidence: "补充证据链接（可选）",
    evidenceHint: "每行一个公开可访问 URL，最多 10 个。请勿在链接中放入敏感个人信息。",
    action: "请求平台采取的措施",
    goodFaith: "我诚信相信，上述使用未经权利人、代理人或法律授权。",
    accuracy: "我确认所填信息准确，并有权代表相关权利人提交本投诉。",
    signature: "电子签名（输入真实姓名）",
    submit: "提交投诉",
    submitting: "正在提交...",
    receiptTitle: "投诉已登记",
    receiptBody: "请立即保存编号和查询码。出于安全原因，查询码不会再次在网页中显示。",
    due: "首次响应目标",
    trackTitle: "查询处理进度",
    trackBody: "查询使用 POST 请求，查询码不会写入 URL 或浏览器历史。",
    reference: "投诉编号",
    access: "查询码",
    lookup: "查询进度",
    lookingUp: "查询中...",
    current: "当前状态",
    actionTaken: "已采取措施",
    history: "公开处理记录",
  } : {
    submitTitle: "Submit a copyright complaint",
    submitBody: "Provide the rights basis, original-work description, and target URLs on the platform. Submission creates a reference and one-time access code.",
    name: "Claimant name",
    email: "Contact email",
    organization: "Organization / publisher (optional)",
    relationship: "Relationship to the work",
    owner: "Copyright owner",
    agent: "Authorized agent",
    work: "Original work and rights description",
    workHint: "Include title, author, first publication or registration details, and the scope of rights claimed.",
    targets: "Allegedly infringing ScoreTransposer URLs",
    targetsHint: "One platform URL per line, up to 20.",
    evidence: "Supporting evidence links (optional)",
    evidenceHint: "One publicly accessible URL per line, up to 10. Do not place sensitive personal data in links.",
    action: "Requested platform action",
    goodFaith: "I have a good-faith belief that the use is not authorized by the owner, agent, or law.",
    accuracy: "I confirm the information is accurate and I am authorized to act for the relevant rights owner.",
    signature: "Electronic signature (type legal name)",
    submit: "Submit complaint",
    submitting: "Submitting...",
    receiptTitle: "Complaint registered",
    receiptBody: "Save the reference and access code now. For security, the code will not be shown on the website again.",
    due: "Initial response target",
    trackTitle: "Track complaint status",
    trackBody: "Lookup uses POST so the access code is not placed in the URL or browser history.",
    reference: "Complaint reference",
    access: "Access code",
    lookup: "Check status",
    lookingUp: "Checking...",
    current: "Current status",
    actionTaken: "Action taken",
    history: "Public case history",
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    const result = await apiRequest<SubmitResult>("/api/copyright/complaints", {
      method: "POST",
      body: JSON.stringify({
        locale,
        claimantName,
        claimantEmail,
        organization,
        rightsBasis,
        originalWorkDescription: work,
        allegedlyInfringingUrls: lines(targets),
        evidenceUrls: lines(evidence),
        requestedAction,
        goodFaithDeclared: goodFaith,
        accuracyDeclared: accuracy,
        signature,
        website,
      }),
    });
    setSubmitting(false);
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }
    setReceipt(result.data);
    setReferenceCode(result.data.referenceCode);
    setAccessCode(result.data.accessCode);
    document.getElementById("copyright-receipt")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function track(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLookingUp(true);
    setLookupError(null);
    setLookup(null);
    const result = await apiRequest<LookupResult>("/api/copyright/complaints/lookup", {
      method: "POST",
      body: JSON.stringify({ referenceCode, accessCode }),
    });
    setLookingUp(false);
    if (!result.ok) {
      setLookupError(result.error);
      return;
    }
    setLookup(result.data);
  }

  return (
    <div className="stack-xl">
      <section className="surface-panel stack-lg">
        <div className="stack-sm"><h2 className="card-title">{copy.submitTitle}</h2><p className="body-copy">{copy.submitBody}</p></div>
        <form className="form-grid" onSubmit={submit}>
          <div className="field-row">
            <label className="field-group" style={{ flex: 1 }}><span className="field-label">{copy.name}</span><input className="field-control" required maxLength={120} value={claimantName} onChange={(event) => setClaimantName(event.target.value)} /></label>
            <label className="field-group" style={{ flex: 1 }}><span className="field-label">{copy.email}</span><input className="field-control" type="email" required maxLength={160} value={claimantEmail} onChange={(event) => setClaimantEmail(event.target.value)} /></label>
          </div>
          <div className="field-row">
            <label className="field-group" style={{ flex: 1 }}><span className="field-label">{copy.organization}</span><input className="field-control" maxLength={160} value={organization} onChange={(event) => setOrganization(event.target.value)} /></label>
            <label className="field-group" style={{ flex: 1 }}><span className="field-label">{copy.relationship}</span><select className="field-select" value={rightsBasis} onChange={(event) => setRightsBasis(event.target.value as typeof rightsBasis)}><option value="owner">{copy.owner}</option><option value="authorized_agent">{copy.agent}</option></select></label>
          </div>
          <label className="field-group"><span className="field-label">{copy.work}</span><textarea className="field-control" required minLength={20} maxLength={6000} rows={6} value={work} onChange={(event) => setWork(event.target.value)} /><span className="helper-copy">{copy.workHint}</span></label>
          <label className="field-group"><span className="field-label">{copy.targets}</span><textarea className="field-control" required rows={4} value={targets} onChange={(event) => setTargets(event.target.value)} /><span className="helper-copy">{copy.targetsHint}</span></label>
          <label className="field-group"><span className="field-label">{copy.evidence}</span><textarea className="field-control" rows={3} value={evidence} onChange={(event) => setEvidence(event.target.value)} /><span className="helper-copy">{copy.evidenceHint}</span></label>
          <label className="field-group"><span className="field-label">{copy.action}</span><textarea className="field-control" required minLength={10} maxLength={2000} rows={4} value={requestedAction} onChange={(event) => setRequestedAction(event.target.value)} /></label>
          <label className="field-group"><span className="field-label">{copy.signature}</span><input className="field-control" required maxLength={120} value={signature} onChange={(event) => setSignature(event.target.value)} /></label>
          <label className="checkbox-row"><input type="checkbox" checked={goodFaith} onChange={(event) => setGoodFaith(event.target.checked)} required /><span>{copy.goodFaith}</span></label>
          <label className="checkbox-row"><input type="checkbox" checked={accuracy} onChange={(event) => setAccuracy(event.target.checked)} required /><span>{copy.accuracy}</span></label>
          <label className="sr-only">Website<input value={website} onChange={(event) => setWebsite(event.target.value)} autoComplete="off" /></label>
          <button className="public-button primary" type="submit" disabled={submitting}>{submitting ? copy.submitting : copy.submit}</button>
          {submitError ? <p className="form-status error">{submitError}</p> : null}
        </form>
      </section>

      {receipt ? <section id="copyright-receipt" className="surface-panel stack-lg" aria-live="polite">
        <div className="score-review-toolbar"><h2 className="card-title">{copy.receiptTitle}</h2><StatusPill tone="green">received</StatusPill></div>
        <p className="body-copy">{copy.receiptBody}</p>
        <dl className="detail-list"><div><dt>{copy.reference}</dt><dd><strong>{receipt.referenceCode}</strong></dd></div><div><dt>{copy.access}</dt><dd><strong>{receipt.accessCode}</strong></dd></div><div><dt>{copy.due}</dt><dd>{new Date(receipt.responseDueAt).toLocaleString(locale)}</dd></div></dl>
      </section> : null}

      <section id="track" className="surface-panel stack-lg">
        <div className="stack-sm"><h2 className="card-title">{copy.trackTitle}</h2><p className="body-copy">{copy.trackBody}</p></div>
        <form className="form-grid" onSubmit={track}>
          <div className="field-row">
            <label className="field-group" style={{ flex: 1 }}><span className="field-label">{copy.reference}</span><input className="field-control" required value={referenceCode} onChange={(event) => setReferenceCode(event.target.value)} /></label>
            <label className="field-group" style={{ flex: 1 }}><span className="field-label">{copy.access}</span><input className="field-control" required type="password" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} /></label>
          </div>
          <button className="public-button secondary" type="submit" disabled={lookingUp}>{lookingUp ? copy.lookingUp : copy.lookup}</button>
          {lookupError ? <p className="form-status error">{lookupError}</p> : null}
        </form>
        {lookup ? <div className="stack-lg" aria-live="polite">
          <div className="score-review-toolbar"><div><p className="item-title">{lookup.referenceCode}</p><p className="item-meta">{copy.current}</p></div><StatusPill tone={lookup.status === "actioned" || lookup.status === "closed" ? "green" : lookup.status === "rejected" ? "red" : "amber"}>{lookup.status}</StatusPill></div>
          <p className="item-meta">{copy.due}: {new Date(lookup.responseDueAt).toLocaleString(locale)}</p>
          {lookup.actionTaken ? <p className="body-copy"><strong>{copy.actionTaken}:</strong> {lookup.actionTaken}</p> : null}
          <div className="stack-md"><h3 className="card-title">{copy.history}</h3>{lookup.events.map((item, index) => <div className="list-item" key={`${item.createdAt}-${index}`}><div className="score-review-toolbar"><span className="item-title">{item.status}</span><span className="item-meta">{new Date(item.createdAt).toLocaleString(locale)}</span></div><p className="body-copy">{item.message}</p></div>)}</div>
        </div> : null}
      </section>
    </div>
  );
}
