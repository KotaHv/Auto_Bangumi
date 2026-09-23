export function getLevelStyle(level: string) {
  switch (level) {
    case 'ERROR':
      return 'text-destructive bg-destructive/10';
    case 'WARNING':
      return 'text-amber-600 bg-amber-500/10 dark:text-amber-400';
    case 'DEBUG':
      return 'text-muted-foreground bg-muted';
    default:
      return 'text-brand bg-brand/10';
  }
}

export function formatLocalTime(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString();
}
