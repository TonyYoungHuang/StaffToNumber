export function resolveEducationLabel(labels: Readonly<Record<string, string>>, value: string): string {
  return labels[value] ?? value;
}
