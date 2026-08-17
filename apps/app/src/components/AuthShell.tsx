"use client";

import Link from "next/link";
import React from "react";
import { APP_ROUTES } from "@score/shared";
import { ArrowNorthEastIcon, CheckSealIcon, SparkIcon, VaultIcon } from "@score/ui";
import { useAppLocale } from "./AppLocaleProvider";
import { accountActivationRoute } from "../lib/release";

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
          accessTitle: "在线支付与激活码开通",
          accessBody: "海外用户可在线支付自动开通，中国大陆用户也可兑换销售渠道提供的激活码。",
          scopeTitle: "全流程乐谱工程",
          scopeBody: "五线谱与简谱互换、图形修谱、移调、分声部播放和多格式导出都围绕同一份 Score JSON 工作。",
          draftTitle: "候选优先的安全机制",
          draftBody: "扫描识别和音频转谱先生成待校对候选，不会未经确认覆盖正式修订。",
          back: "返回工作台首页",
          preview: "预览流程",
        }
      : {
          eyebrow: "Secure score-workspace access",
          quote: "Create one MusicXML-first score project for import, correction, conversion, transposition, practice, and export.",
          accessTitle: "Automatic online activation",
          accessBody: "International users register first, pay online, and get access automatically on the same account.",
          scopeTitle: "Complete score-project workflow",
          scopeBody: "Staff and Jianpu conversion, visual correction, transposition, part playback, and multi-format export all use the same Score JSON revision.",
          draftTitle: "Candidate-first safety",
          draftBody: "OMR and audio transcription create review candidates and never replace an accepted revision without confirmation.",
          back: "Return to studio",
          preview: "Open checkout",
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
            <Link href={locale === "zh-CN" ? APP_ROUTES.upload : accountActivationRoute} className="button button-tertiary">
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
