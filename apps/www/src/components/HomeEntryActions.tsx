import styles from "../app/home-page.module.css";

export function HomeEntryActions({ scanLabel, sampleLabel }: { scanLabel: string; sampleLabel: string }) {
  return (
    <div className={styles.entryActions} data-home-entry-actions>
      <a href="#home-workbench">{scanLabel}</a>
      <a href="#sample-score-demo">{sampleLabel}</a>
    </div>
  );
}
