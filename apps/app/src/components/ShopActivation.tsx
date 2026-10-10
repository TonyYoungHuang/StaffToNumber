"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../lib/api";
import { clearStoredToken, getStoredToken, setStoredToken, setPreferredLoginMethod } from "../lib/auth-storage";
import type { AuthMessageCatalog } from "../lib/auth-messages";
import type { ActivationFormCopy } from "../lib/billing-messages/types";
import { workReturnPath } from "../lib/flow-return";
import { shopError } from "../lib/shop-activation";
import { ActivationForm } from "./ActivationForm";
import { AuthForm } from "./AuthForm";

type Account = { id: string; email: string; codeLoginEnabled: boolean; entitlement: { status: string; endsAt: string | null }; scorePasses?: Array<{ documentId: string | null; remaining: number; credits: number; maxPages: number }> };
type Usage = { tier: string; creditMode?: "monthly" | "prepaid"; prepaid?: { total: number; remaining: number }; jobs: { remaining: number; limit: number }; storage: { limitBytes: number } };
type LoginPayload = { token: string; user: Account; isNewUser: boolean };

export function ShopActivation({ authCopy, activationCopy, returnTo }: { authCopy: AuthMessageCatalog["form"]; activationCopy: ActivationFormCopy; returnTo?: string }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showLegacyLogin, setShowLegacyLogin] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError(false);
    const token = getStoredToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const result = await apiRequest<{ user: Account }>("/api/auth/me", { headers });
    if (result.ok) {
      setAccount(result.data.user);
      if (result.data.user.codeLoginEnabled) setPreferredLoginMethod("activation-code");
      const balance = await apiRequest<{ usage: Usage }>("/api/payments/billing/usage", { headers });
      setUsage(balance.ok ? balance.data.usage : null);
    } else if (result.status === 401) { clearStoredToken(); setAccount(null); setUsage(null); }
    else setError(true);
    setLoading(false);
  }, []);
  useEffect(() => { setPreferredLoginMethod("activation-code"); void load(); }, [load]);

  async function changeAccount() {
    setSubmitting(true);
    const token = getStoredToken();
    const result = await apiRequest("/api/auth/logout", { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : undefined });
    setSubmitting(false);
    if (!result.ok && result.status !== 401) { setError(true); return; }
    clearStoredToken(); setAccount(null); setUsage(null); setSuccess(null); setCode(""); setCodeError(null); setShowLegacyLogin(false);
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setCodeError(null); setSuccess(null);
    if (!code.trim()) { setCodeError("请输入完整的激活码。"); return; }
    setSubmitting(true);
    const enabling = Boolean(account);
    const token = getStoredToken();
    const result = await apiRequest<LoginPayload>(enabling ? "/api/auth/enable-code-login" : "/api/auth/activation-code", {
      method: "POST", headers: enabling && token ? { Authorization: `Bearer ${token}` } : undefined,
      body: JSON.stringify({ code }),
    });
    if (!result.ok) { setCodeError(shopError(result.error, result.status)); setSubmitting(false); return; }
    setPreferredLoginMethod("activation-code");
    if (!enabling) setStoredToken(result.data.token);
    setCode(""); setShowLegacyLogin(false);
    setSuccess(enabling ? "已开启激活码登录" : result.data.isNewUser ? "激活成功" : "登录成功");
    await load(); setSubmitting(false);
  }

  const usable = account?.entitlement.status === "active" || Boolean(account?.scorePasses?.length);
  const audioAvailable = process.env.NEXT_PUBLIC_AUDIO_TRANSCRIPTION_AVAILABLE === "true";
  const codeForm = <form onSubmit={submitCode} className="form-grid">
    <label className="field-group">
      <span className="field-label">激活码</span>
      <input className="field-control" name="activationCode" value={code} onChange={event => setCode(event.target.value)} maxLength={128} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="粘贴店铺发来的完整激活码" aria-describedby="code-login-help" aria-invalid={Boolean(codeError)} />
    </label>
    <div className="button-row"><button className="button button-primary" disabled={submitting} type="submit">{submitting ? "正在处理…" : account ? "用此码开启免邮箱登录" : "用激活码登录"}</button></div>
    {codeError ? <p className="form-status error" role="alert">{codeError}</p> : null}
  </form>;

  return <section className="container page-shell" style={{ maxWidth: 860 }}>
    <div className="page-banner">
      <p className="eyebrow">淘宝 / 小红书 · 已购用户入口</p>
      <h1 className="page-title">输入激活码，开始使用</h1>
      <p className="body-copy large">1 输入激活码登录 → 2 选择功能</p>
      <p className="micro-copy">无需邮箱、密码或注册。首次使用自动开通，以后用同一个激活码登录。</p>
    </div>
    <div className="page-stack">
      {error ? <div className="surface-panel stack-sm"><p role="alert">暂时无法读取账户，请检查网络后重试。</p><button className="button button-secondary" onClick={() => void load()}>重新加载</button></div>
      : loading ? <p role="status">正在读取账户…</p>
      : !account ? <>
        <div className="surface-panel stack-lg">
          <h2 className="card-title">激活码就是你的登录凭证</h2>
          {codeForm}
          <p id="code-login-help" className="micro-copy">请保存好店铺发来的激活码，不要分享。换手机或电脑时仍用原码，乐谱和剩余额度会保留。重复登录不会重新计算使用期限。</p>
          <button type="button" className="button button-tertiary" onClick={() => setShowLegacyLogin(value => !value)}>{showLegacyLogin ? "收起旧账户登录" : "以前绑定过邮箱？登录原账户"}</button>
        </div>
        {showLegacyLogin ? <div className="surface-panel"><AuthForm mode="login" messages={authCopy} emailOnly onAuthenticated={() => void load()} /></div> : null}
      </> : <>
        {success ? <div className="surface-panel stack-sm" role="status"><h2 className="card-title">{success}</h2><p className="body-copy">{usable ? "权限已就绪，可以选择下面的功能。" : "账户已登录，原套餐已到期；可以查看已有乐谱或续期。"}</p></div> : null}
        <div className="surface-panel stack-sm">
          <p className="item-title">当前账户：{account.codeLoginEnabled ? `激活码账户 ${account.id.slice(-8).toUpperCase()}` : account.email}</p>
          <p className="body-copy">{usable ? `使用权限已开通${account.entitlement.endsAt ? `，到期时间：${new Date(account.entitlement.endsAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}（北京时间）` : ""}。` : "当前没有有效套餐，可查看已有乐谱或兑换新码续期。"}</p>
          {usage && account.entitlement.status === "active" ? <p className="micro-copy">{usage.creditMode === "prepaid" ? `一次性积分包 · 剩余 ${usage.jobs.remaining} / ${usage.jobs.limit} 积分 · 不按月清零，未用积分保留` : `本月剩余 ${usage.jobs.remaining} / ${usage.jobs.limit} 积分${usage.prepaid?.total ? ` · 另有一次性积分 ${usage.prepaid.remaining} / ${usage.prepaid.total}` : ""}`} · 存储上限 {Math.round(usage.storage.limitBytes / 1024 / 1024)} MiB</p> : null}
          {account.scorePasses?.map((pass, index) => <p key={index} className="micro-copy">单谱体验：剩余 {pass.remaining} / {pass.credits} 积分 · 仅限1份乐谱，最多{pass.maxPages}页 · 未用积分不设到期日{pass.documentId ? "（已绑定乐谱）" : "（待导入乐谱）"}</p>)}
          <button type="button" className="button button-tertiary" disabled={submitting} onClick={() => void changeAccount()}>退出 / 换一个激活码登录</button>
        </div>
        {!account.codeLoginEnabled ? <div className="surface-panel stack-lg">
          <h2 className="card-title">为原账户开启激活码登录</h2>
          <p id="code-login-help" className="micro-copy">输入已绑定当前账户的旧码。开启后，持有这个码就能访问本账户的全部乐谱，请确认它只由你保管。</p>
          {codeForm}
        </div> : null}
        {usable ? <div className="surface-panel stack-lg">
          <h2 className="card-title">选择你要使用的功能</h2>
          <div className="button-row">
            <Link className="button button-primary" href="/scores/new/scan">五线谱转音频 / 简谱 / 移调</Link>
            {audioAvailable ? <Link className="button button-secondary" href="/scores/new/audio">音频转五线谱</Link> : <button className="button button-secondary" disabled>音频转五线谱（暂未开放）</button>}
            <Link className="button button-secondary" href="/scores/new/jianpu">简谱转五线谱</Link>
            <Link className="button button-secondary" href={workReturnPath(returnTo)}>打开我的乐谱 / 继续操作</Link>
          </div>
          <p className="micro-copy">五线谱转音频：上传 PDF 或图片 → 校对识别结果 → 打开“播放”试听，或在“导出”选择 MP3 / WAV。已有 MusicXML 文件可从“创建新乐谱”导入。</p>
          <p className="micro-copy">{audioAvailable ? "音频转谱适合清晰的单旋律录音，目前为试用功能；复杂伴奏、人声混合可能不准确，生成后请校对。" : "音频转五线谱暂未开放，激活套餐不会提前开启此功能。"}</p>
        </div> : null}
        {!usable ? <Link className="button button-secondary" href="/scores">查看已有乐谱</Link> : null}
        <details className="surface-panel stack-lg">
          <summary className="item-title">补充积分 / 续期当前账户</summary>
          <p className="micro-copy">在这里兑换新码：一次性积分包加到当前账户，旧月卡/年卡按原规则顺延。之后仍使用原登录码进入，新码不会自动成为登录码。</p>
          <ActivationForm copy={activationCopy} errorMessage={shopError} returnTo={returnTo} onActivated={payload => { setSuccess(payload.alreadyRedeemed ? "这个码已经兑换过，权益没有重复增加" : "权益已添加到当前账户"); void load(); }} />
        </details>
      </>}
      <div className="mini-card stack-sm">
        <h2 className="card-title">遇到问题</h2>
        <p className="micro-copy">如店铺内置浏览器无法上传或下载，请复制本页链接到手机或电脑浏览器打开。激活码遗失或无法登录时，请在购买店铺提供订单号和报错截图，截图请遮住完整激活码。</p>
      </div>
    </div>
  </section>;
}
