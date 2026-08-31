import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');
const root = import.meta.dirname;
const outputFile = path.join(root, 'app', 'bundle', 'main.js');

const sequentialRouterPrefetch = {
  name: 'sequential-router-prefetch',
  setup(buildContext) {
    buildContext.onLoad(
      { filter: /react-router[\\/]dist[\\/].*\.(js|mjs)$/ },
      async (args) => {
        const source = await readFile(args.path, 'utf8');
        const functionStart = source.indexOf('async function getKeyedPrefetchLinks(');
        if (functionStart < 0) return undefined;
        const functionEnd = source.indexOf('\nfunction getNewMatchesForLinks(', functionStart);
        if (functionEnd < 0) {
          throw new Error('React Routerのprefetch処理終端を確認できません。');
        }
        const sequentialFunction = `async function getKeyedPrefetchLinks(matches, manifest, routeModules) {
  let links = [];
  for (const match of matches) {
    let route = manifest.routes[match.route.id];
    if (route) {
      let mod = await loadRouteModule(route, routeModules);
      links.push(mod.links ? mod.links() : []);
    } else {
      links.push([]);
    }
  }
  return dedupeLinkDescriptors(
    links.flat(1).filter(isHtmlLinkDescriptor).filter((link) => link.rel === "stylesheet" || link.rel === "preload").map(
      (link) => link.rel === "stylesheet" ? { ...link, rel: "prefetch", as: "style" } : { ...link, rel: "prefetch" }
    )
  );
}`;
        return {
          contents: `${source.slice(0, functionStart)}${sequentialFunction}${source.slice(functionEnd)}`,
          loader: 'js',
        };
      },
    );
  },
};

const nodePaths = process.env.NODE_PATH
  ? process.env.NODE_PATH.split(path.delimiter).filter(Boolean)
  : [];

await build({
  entryPoints: [path.join(root, 'app', 'src', 'main.jsx')],
  bundle: true,
  format: 'iife',
  outfile: outputFile,
  nodePaths,
  plugins: [sequentialRouterPrefetch],
});

const output = await readFile(outputFile, 'utf8');
const forbiddenPromiseMethod = 'Promise' + '.all';
if (output.includes(forbiddenPromiseMethod)) {
  throw new Error('生成bundleに並列Promise処理が残っています。');
}
