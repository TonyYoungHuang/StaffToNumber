"use client";

import type { SupportedLocale } from "@score/i18n";

const english = {
  uploadUnknown: "The upload result could not be confirmed. Check the original request before retrying; this avoids creating another score or charge.",
  uploadPending: "The original upload is still processing. Check its result again shortly; do not submit another copy.",
  uploadUnseen: "The original request was not received. You can retry safely with the same request.",
  uploadFailed: "The original upload failed. Your file is kept; you can retry safely.",
  uploadNeedsSupport: "The original upload could not be reconciled safely. Check your score library or contact support with this request ID:",
  checkUpload: "Check original upload",
  uploadCancelled: "Upload waiting was cancelled. The server may still finish the original request. Check its result before retrying.",
  cancel: "Cancel waiting",
  preflightTimeout: "The free file check timed out. Your file is kept; retry the check to continue.",
  preflightNetwork: "The free file check could not connect. Check your connection and retry; recognition has not started.",
  preflightCancelled: "The free file check was cancelled. Your file is kept; retry the check to continue. Recognition has not started.",
  jobsFailed: "Task status could not be refreshed. Your tasks are kept; checking will resume automatically, or you can retry now.",
  jobsRecovered: "Connection restored. Task status is up to date.",
  jobsCancelled: "Status checking was cancelled. Your tasks continue on the server; refresh to check again.",
  exportEmpty: "The selected range or parts contain no playable notes. Choose a range with notes or change the part filters, then export again.",
  exportGeneration: "The file could not be generated. Check task details and retry the failed export.",
  exportMissing: "The export finished without a usable file. Refresh task details; if no file appears, retry the export or contact support.",
  memory: "The server did not have enough memory to finish this task. Your score is kept. Retry the failed task shortly; a smaller page range may help.",
  resourceBusy: "The recognition and export queue is busy. This attempt has ended; your score is kept. Retry the failed task in a few minutes.",
  resourceUnavailable: "The server could not check available processing resources. This attempt has ended; your score is kept. Retry the failed task shortly.",
  downloadNetwork: "The download connection was interrupted. Your generated file is kept; retry downloading it.",
  downloadTimeout: "The download timed out. Your generated file is kept; retry on a stable connection.",
  downloadRead: "The browser could not read the downloaded file. Retry downloading it, or try another browser.",
  downloadInvalid: "The download did not contain a complete, usable file. Retry downloading it; contact support if this repeats.",
  fileReady: "Your file is ready to download.",
};
const chinese: typeof english = {
  uploadUnknown: "暂时无法确认上传结果。请先核对原请求，再安全重试，避免重复创建乐谱或扣点。",
  uploadPending: "原上传仍在处理中。请稍后再核对结果，暂勿重复提交同一文件。",
  uploadUnseen: "服务器尚未收到原请求，可以使用同一请求安全重试。",
  uploadFailed: "原上传已失败，文件已保留，可以安全重试。",
  uploadNeedsSupport: "暂时无法安全核对原上传。请查看乐谱库，或联系支持并提供此请求编号：",
  checkUpload: "核对原上传结果",
  uploadCancelled: "已取消等待上传。服务器可能仍会完成原请求，请先核对结果再重试。",
  cancel: "取消等待",
  preflightTimeout: "免费文件预检已超时，文件已保留；请重试预检后继续。",
  preflightNetwork: "免费文件预检连接失败，请检查网络后重试；尚未开始识别。",
  preflightCancelled: "免费文件预检已取消，文件已保留；请重试预检后继续，尚未开始识别。",
  jobsFailed: "暂时无法刷新任务状态。任务已保留，将自动恢复查询，也可立即重试。",
  jobsRecovered: "连接已恢复，任务状态已更新。",
  jobsCancelled: "已取消本次状态查询。服务器上的任务会继续，可刷新查看结果。",
  exportEmpty: "当前选区或声部没有可播放音符，请选择有音符的范围或调整声部筛选后再导出。",
  exportGeneration: "文件生成失败，请查看任务详情并重试失败的导出任务。",
  exportMissing: "导出结束，但未找到可用文件。请刷新任务详情；若仍无文件，请重试导出或联系支持。",
  memory: "服务器内存暂时不足，任务未完成，乐谱已保留。请稍后重试失败任务，也可缩小页码范围。",
  resourceBusy: "识别与导出队列繁忙，本次任务已结束，乐谱已保留。请几分钟后重试失败任务。",
  resourceUnavailable: "服务器暂时无法核验可用处理资源，本次任务已结束，乐谱已保留。请稍后重试失败任务。",
  downloadNetwork: "下载连接中断，已生成文件仍保留，请重新下载。",
  downloadTimeout: "下载已超时，已生成文件仍保留，请在网络稳定后重新下载。",
  downloadRead: "浏览器无法读取下载文件，请重新下载，或换一个浏览器。",
  downloadInvalid: "下载内容不是完整可用文件，请重新下载；若反复出现，请联系支持。",
  fileReady: "文件已生成，可以下载。",
};

/** Recovery messages are always readable in Chinese or English. */
export function scoreTransferCopy(locale: SupportedLocale) {
  return locale === "zh-CN" || locale === "zh-TW" ? chinese : english;
}

export function scoreGenerationError(input: { error?: string | null; code?: string | null }, locale: SupportedLocale) {
  const messages = scoreTransferCopy(locale);
  const error = `${input.code ?? ""} ${input.error ?? ""}`;
  if (/ENGINE_RESOURCE_BUSY/iu.test(error)) return messages.resourceBusy;
  if (/ENGINE_RESOURCE_UNAVAILABLE/iu.test(error)) return messages.resourceUnavailable;
  if (/ENOMEM|out of memory|ENGINE_MEMORY_PRESSURE|memory.*(?:exhaust|unavailable|insufficient)|RESOURCE_MEMORY|RESOURCE_EXHAUSTED|内存不足|内存暂时不足/iu.test(error)) return messages.memory;
  if (/EXPORT_EMPTY_SELECTION|(?:range|part filter).*does not contain playable notes|no playable notes/iu.test(`${input.code ?? ""} ${input.error ?? ""}`)) return messages.exportEmpty;
  return null;
}
