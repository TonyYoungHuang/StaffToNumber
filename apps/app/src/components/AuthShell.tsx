"use client";

import Link from "next/link";
import React from "react";
import { APP_ROUTES } from "@score/shared";
import { ArrowNorthEastIcon, CheckSealIcon, SparkIcon, VaultIcon } from "@score/ui";
import { useAppLocale } from "./AppLocaleProvider";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const { locale } = useAppLocale();
  const copy =
    locale === "zh-CN"
      ? {
          eyebrow: "安全访问乐谱工作台",
          quote: "注册后进入同一套 MusicXML 乐谱工程，完成导入、校对、转换、移调、练习和导出。",
          accessTitle: "注册后先免费识别一页",
          accessBody: "无需先付款或兑换激活码；查看 OMR 候选五线谱后，再决定是否开通校对、移调和完整导出。",
          scopeTitle: "全流程乐谱工程",
          scopeBody: "五线谱与简谱互换、图形修谱、移调、分声部播放和多格式导出都围绕同一份 Score JSON 工作。",
          draftTitle: "候选优先的安全机制",
          draftBody: "扫描识别先生成待校对候选，不会未经确认覆盖正式修订。",
          back: "返回工作台首页",
          preview: "查看免费识谱入口",
        }
      : {
          eyebrow: "Secure score-workspace access",
          quote: "Create one MusicXML-first score project for import, correction, conversion, transposition, practice, and export.",
          accessTitle: "Scan one page before paying",
          accessBody: "No payment or activation code is required to start. Review the OMR staff candidate first, then decide whether to unlock correction, transposition, and export.",
          scopeTitle: "Complete score-project workflow",
          scopeBody: "Staff and Jianpu conversion, visual correction, transposition, part playback, and multi-format export all use the same Score JSON revision.",
          draftTitle: "Candidate-first safety",
          draftBody: "OMR creates a review candidate and never replaces an accepted revision without confirmation.",
          back: "Return to studio",
          preview: "View free scanner",
        };

  return (
    <section className="container page-shell">
      <div className="auth-layout">
        <div className="hero-copy">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 className="display-title">{title}</h1>
          <p className="body-copy large">{description}</p>
          <div className="kicker-line" />
          <p className="editorial-quote">{copy.quote}</p>
          <div className="auth-copy-points">
            <div className="editorial-point">
              <span className="info-icon">
                <VaultIcon width={20} height={20} />
              </span>
              <div>
                <strong>{copy.accessTitle}</strong>
                <p className="helper-copy">{copy.accessBody}</p>
              </div>
            </div>
            <div className="editorial-point">
              <span className="info-icon tertiary">
                <SparkIcon width={20} height={20} />
              </span>
              <div>
                <strong>{copy.scopeTitle}</strong>
                <p className="helper-copy">{copy.scopeBody}</p>
              </div>
            </div>
            <div className="editorial-point">
              <span className="info-icon">
                <CheckSealIcon width={20} height={20} />
              </span>
              <div>
                <strong>{copy.draftTitle}</strong>
                <p className="helper-copy">{copy.draftBody}</p>
              </div>
            </div>
          </div>
          <div className="button-row">
            <Link href={APP_ROUTES.home} className="button button-secondary">
              {copy.back}
            </Link>
            <Link href={`${APP_ROUTES.scores}#omr-import`} className="button button-tertiary">
              {copy.preview}
              <ArrowNorthEastIcon width={16} height={16} />
            </Link>
          </div>
        </div>

        <div className="auth-card stack-lg">
          {children}
        </div>
      </div>
    </section>
  );
}
