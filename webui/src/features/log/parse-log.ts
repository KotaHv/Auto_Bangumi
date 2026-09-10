import type { LogLine } from './types';

export function parseLog(log: string): LogLine[] {
  const lines = log
    .trim()
    .split('\n')
    .filter((line) => line !== '');
  const startIndex = lines.findIndex((line) => /Version/.test(line));
  const logs = lines.slice(startIndex === -1 ? 0 : startIndex);
  const result: LogLine[] = [];

  for (const line of logs) {
    const parts = line.split('|');
    if (parts.length >= 3) {
      const [moduleName, ...contents] = parts.slice(2).join('|').split('-');
      result.push({
        index: result.length,
        date: parts[0].trim(),
        type: parts[1].trim(),
        module: moduleName.trim(),
        content: contents.join('-').trim(),
      });
    } else if (result.length > 0) {
      result[result.length - 1].content += `\n${line}`;
    } else {
      result.push({
        index: result.length,
        date: '',
        type: '',
        module: '',
        content: line,
      });
    }
  }

  return result;
}
