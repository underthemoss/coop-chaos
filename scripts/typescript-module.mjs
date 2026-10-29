import { readFile } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import ts from 'typescript';
const cache = new Map();
/** Design-time loading of the existing pure TypeScript owners on Node 20. */
export async function typescriptModule(path) {
  path = resolve(path);
  if (cache.has(path))
    return cache.get(path);
  const source = await readFile(path, 'utf8');
  let js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
  for (const match of [...js.matchAll(/from (["'])(\.[^"']+)\1/g)]) {
    const target = resolve(dirname(path), match[2] + (extname(match[2]) ? '' : '.ts'));
    js = js.replaceAll(match[0], `from ${JSON.stringify(await typescriptModule(target))}`);
  }
  const url = 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
  cache.set(path, url);
  return url;
}
