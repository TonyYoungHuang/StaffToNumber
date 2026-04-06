import { PRODUCT_NAME } from "@score/shared";

const sectionStyle = {
  maxWidth: "960px",
  margin: "0 auto",
  padding: "64px 24px",
};

export default function HomePage() {
  return (
    <main>
      <section style={{ ...sectionStyle, paddingTop: "96px" }}>
        <p style={{ letterSpacing: "0.12em", textTransform: "uppercase", color: "#6f6557" }}>SEO website shell</p>
        <h1 style={{ fontSize: "56px", lineHeight: 1.05, margin: "12px 0 16px" }}>{PRODUCT_NAME}</h1>
        <p style={{ fontSize: "20px", lineHeight: 1.7, maxWidth: "720px" }}>
          This is the marketing website skeleton. Module 1 only sets up the structure so SEO pages,
          FAQs, and conversion landing pages can be added incrementally.
        </p>
      </section>
    </main>
  );
}
