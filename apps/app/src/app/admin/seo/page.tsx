import { AdminSeoManager } from "../../../components/AdminSeoManager";
import { readAppLocale } from "../../../lib/locale";

export default async function AdminSeoPage() {
  const locale = await readAppLocale();
  return (
    <section className="container page-shell">
      <div className="page-banner">
        <p className="eyebrow">{locale === "zh-CN" ? "SEO 运营后台" : "SEO operations"}</p>
        <h1 className="page-title">
          {locale === "zh-CN" ? "内容审批、搜索表现与索引问题" : "Content approval, search performance, and indexing issues"}
        </h1>
        <p className="body-copy large">
          {locale === "zh-CN"
            ? "按内容哈希审核 AI TDK 页面，并导入 Search Console、百度搜索资源平台或 Bing Webmaster 快照，核对搜索词、CTR、排名与索引异常。"
            : "Approve AI TDK content by version hash, import Search Console, Baidu, or Bing snapshots, and review queries, CTR, position, and indexing issues."}
        </p>
      </div>
      <AdminSeoManager />
    </section>
  );
}
