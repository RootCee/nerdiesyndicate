declare module 'node:fs' {
  export function readFileSync(path: string | URL, encoding: string): string;
}

declare module 'node:fs/promises' {
  export function appendFile(
    path: string | URL,
    data: string,
    encoding: string
  ): Promise<void>;
  export function mkdir(
    path: string,
    options?: { recursive?: boolean }
  ): Promise<string | undefined>;
}

declare module 'node:path' {
  const path: {
    resolve(...paths: string[]): string;
    dirname(path: string): string;
  };

  export default path;
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string;
}
