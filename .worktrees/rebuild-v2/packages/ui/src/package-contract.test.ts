import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

interface PackageJson {
  exports?: Record<string, string | { default?: string; types?: string }>;
}

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const srcRoot = fileURLToPath(new URL('./', import.meta.url));
const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as PackageJson;

function walkFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = `${dir}/${entry}`;
    if (statSync(path).isDirectory()) {
      return walkFiles(path);
    }
    return path;
  });
}

function sourcePath(path: string) {
  return `./${relative(packageRoot, path)}`;
}

function isPublicSourceFile(path: string) {
  const rel = relative(srcRoot, path);
  return (
    /^(components|forms|lib|store|theme)\//.test(rel) &&
    /\.(ts|tsx)$/.test(path) &&
    !/\.test\.(ts|tsx)$/.test(path)
  );
}

describe('@workspace/ui package contract', () => {
  it('uses explicit subpath exports only', () => {
    const exportsMap = packageJson.exports ?? {};
    const exportKeys = Object.keys(exportsMap);

    expect(exportsMap['.']).toBeUndefined();
    expect(exportKeys.every((key) => key.startsWith('./'))).toBe(true);
    expect(exportKeys.some((key) => key.includes('*'))).toBe(false);
    expect(exportKeys).toContain('./button');
    expect(exportKeys).toContain('./form-password-input');
    expect(exportKeys).toContain('./theme-provider');
    expect(exportKeys).toContain('./select-options');
    expect(exportKeys).toContain('./temporal');
    expect(exportKeys).toContain('./table');
    expect(exportKeys).toContain('./charts');
  });

  it('does not allow barrel files or re-export declarations', () => {
    const sourceFiles = walkFiles(srcRoot).filter((path) =>
      /\.(ts|tsx)$/.test(path),
    );
    const indexFiles = sourceFiles
      .map((path) => relative(srcRoot, path))
      .filter((path) => basename(path).match(/^index\.(ts|tsx)$/));

    const reExportFiles = sourceFiles
      .map((path) => ({
        path: relative(srcRoot, path),
        text: readFileSync(path, 'utf8'),
      }))
      .filter(({ text }) =>
        /\bexport\s+(?:type\s+)?(?:\*|\{[\s\S]*?\})\s+from\s+['"]/.test(text),
      )
      .map(({ path }) => path);

    expect(indexFiles).toEqual([]);
    expect(reExportFiles).toEqual([]);
  });

  it('publishes every public source file through its own subpath', () => {
    const exportsMap = packageJson.exports ?? {};
    const exportedFiles = new Set(
      Object.values(exportsMap).flatMap((value) => {
        if (typeof value === 'string') {
          return [value];
        }
        return [value.default, value.types].filter(Boolean) as string[];
      }),
    );

    const missingExports = walkFiles(srcRoot)
      .filter(isPublicSourceFile)
      .map(sourcePath)
      .filter((path) => !exportedFiles.has(path));

    expect(missingExports).toEqual([]);
  });

  it('keeps component code on semantic tokens instead of fixed color utilities', () => {
    const fixedColorPattern =
      /\b(?:bg|text|border|ring|outline|from|to|via)-(?:red|blue|green|emerald|cyan|amber|slate|gray|zinc|neutral|stone|white|black|yellow|purple|pink|orange)(?:-|\/|\b)/;

    const fixedColorFiles = walkFiles(srcRoot)
      .filter(
        (path) =>
          /src\/(components|forms|lib|store|theme)\//.test(path) &&
          /\.(ts|tsx)$/.test(path) &&
          !/\.test\.(ts|tsx)$/.test(path),
      )
      .filter((path) => fixedColorPattern.test(readFileSync(path, 'utf8')))
      .map((path) => relative(srcRoot, path));

    expect(fixedColorFiles).toEqual([]);
  });
});
