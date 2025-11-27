import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const URL_REGEX = /^https?:\/\/.+/i;

export type InputType = 'file' | 'url' | 'stdin';

export function classifyInput(input?: string): InputType {
  if (!input) return 'stdin';
  const trimmed = input.trim();
  return URL_REGEX.test(trimmed) ? 'url' : 'file';
}

export async function readInput(input: string | undefined, sourceType: InputType): Promise<string> {
  if (sourceType === 'stdin') {
    return new Promise<string>((resolve, reject) => {
      let data = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', chunk => { data += chunk; });
      process.stdin.on('end', () => resolve(data));
      process.stdin.on('error', reject);
    });
  }

  if (!input) {
    throw new Error('No input provided');
  }

  if (sourceType === 'url') {
    const response = await fetch(input);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }
    return response.text();
  }

  const absPath = resolve(process.cwd(), input);
  return readFile(absPath, 'utf8');
}
