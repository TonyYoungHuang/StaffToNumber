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
          eyebrow: "激活优先的访问模式",
          quote: "一套围绕购买、激活、上传五线谱 PDF、获取简谱结果而设计的完整流程。",
          accessTitle: "一年期激活访问",
          accessBody: "用户先注册，再通过你的外部销售流程提供的专属激活码解锁工作台。",
          scopeTitle: "当前正式功能刻意保持收敛",
          scopeBody: "本版本只上线五线谱 PDF 转简谱，因此界面更聚焦，也更容易讲清楚。",
          draftTitle: "草稿优先的安全机制",
          draftBody: "当源文件质量不够稳定时，系统可以输出草稿包，而不是假装结果已经足够可靠。",
          back: "返回工作台首页",
          preview: "预览流程",
        }
      : {
          eyebrow: "Activation-first access",
          quote: "A composed workflow for purchasing access, uploading staff PDFs, and retrieving clean Jianpu output.",
          accessTitle: "Automatic online activation",
          accessBody: "International users register first, pay online, and get access automatically on the same account.",
          scopeTitle: "Current production scope is narrow by design",
          scopeBody: "Only five-line staff PDF to numbered notation is live in this build, so the interface stays focused and teachable.",
          draftTitle: "Draft-first safety net",
          draftBody: "When source quality is weak, the pipeline can keep work in draft output instead of pretending confidence.",
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
            <Link href={locale === "zh-CN" ? APP_ROUTES.upload : APP_ROUTES.checkout} className="button button-tertiary">
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
