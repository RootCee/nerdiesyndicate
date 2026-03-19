declare module 'node:fs' {
  export function readFileSync(path: string | URL, encoding: string): string;
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string;
}
