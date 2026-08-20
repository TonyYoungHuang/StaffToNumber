"use client";

import Link from "next/link";
import React from "react";
import { APP_ROUTES } from "@score/shared";
import { ArrowNorthEastIcon, CheckSealIcon, SparkIcon, VaultIcon } from "@score/ui";
import { PUBLIC_SITE_URL } from "../lib/support";
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
          eyebrow: "你的在线乐谱工作台",
          quote: "登录后，你的乐谱、修改记录和导出文件都会保存在同一个账户中。",
          proofTitle: "真实案例 · 乐谱生成练习音频",
          proofBody: "从结构化五线谱控制速度、循环与声部，再生成练习素材。",
          accessTitle: "先免费识别一页",
          accessBody: "上传一页 PDF 或一张乐谱图片，先看识别效果，再决定是否继续使用更多功能。",
          scopeTitle: "从识别到导出，一处完成",
          scopeBody: "识别乐谱后，可以继续校对、转简谱、移调、播放练习，并导出常用格式。",
          draftTitle: "你的原谱不会被覆盖",
          draftBody: "系统会先生成一份待确认的结果，只有你确认后才保存为正式版本。",
          back: "返回首页",
          preview: "免费识别一页",
        }
      : {
          eyebrow: "Secure score-workspace access",
          quote: "Sign in to keep your scores, edits, and exports together in one account.",
          proofTitle: "Real example · score to practice audio",
          proofBody: "Control tempo, loops, and parts from a structured score, then create practice media.",
          accessTitle: "Scan one page before paying",
          accessBody: "Upload one PDF page or score image, review the result, and decide whether to continue with more tools.",
          scopeTitle: "Everything stays in one place",
          scopeBody: "Correct the recognized score, convert notation, transpose, practice, and export without moving between tools.",
          draftTitle: "Your original stays safe",
          draftBody: "Recognition creates a result for your review and never replaces an approved version without confirmation.",
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
          <div className="auth-proof">
            <video
              src={`${PUBLIC_SITE_URL.replace(/\/$/, "")}/product/demo-score-to-audio.mp4`}
              poster={`${PUBLIC_SITE_URL.replace(/\/$/, "")}/product/feature-score-to-audio-real.png`}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label={copy.proofTitle}
            />
            <div><strong>{copy.proofTitle}</strong><span>{copy.proofBody}</span></div>
          </div>
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
            <Link href={`${APP_ROUTES.scores}/new/scan`} className="button button-tertiary">
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
