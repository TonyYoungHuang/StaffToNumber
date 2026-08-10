export type ScrollViewportMetrics = {
  scrollLeft: number;
  scrollTop: number;
  scrollWidth: number;
  scrollHeight: number;
  clientWidth: number;
  clientHeight: number;
};

export function projectSynchronizedScroll(source: ScrollViewportMetrics, target: ScrollViewportMetrics) {
  return {
    left: projectAxis(source.scrollLeft, source.scrollWidth - source.clientWidth, target.scrollWidth - target.clientWidth),
    top: projectAxis(source.scrollTop, source.scrollHeight - source.clientHeight, target.scrollHeight - target.clientHeight),
  };
}

function projectAxis(position: number, sourceRange: number, targetRange: number) {
  if (!Number.isFinite(position) || sourceRange <= 0 || targetRange <= 0) return 0;
  const progress = Math.min(Math.max(position / sourceRange, 0), 1);
  return progress * targetRange;
}
