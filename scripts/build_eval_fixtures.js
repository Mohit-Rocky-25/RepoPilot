const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..', 'eval', 'fixtures');

const fixtures = {
  // SWR Fixtures
  'swr/_internal/utils/cache.ts': `export function initCache() {\n  return new Map();\n}\n`,
  'swr/_internal/utils/mutate.ts': `export async function mutate(key: string, data?: any, opts?: any) {\n  return data;\n}\n`,
  'swr/_internal/utils/config.ts': `export const SWRConfig = ({ children }: any) => children;\nexport const defaultConfig = { revalidateOnFocus: true };\n`,
  'swr/infinite/index.ts': `export function useSWRInfinite(getKey: (index: number) => string) {\n  return { data: [], size: 0, setSize: () => {} };\n}\n`,
  'swr/core/types.ts': `export interface SWRConfiguration {\n  suspense?: boolean;\n  revalidateOnFocus?: boolean;\n}\n`,
  'swr/immutable/index.ts': `import { useSWR } from "../core/use-swr";\nexport function useSWRImmutable(key: string, fn: any) {\n  return useSWR(key, fn, { revalidateOnFocus: false });\n}\n`,
  'swr/package.json': JSON.stringify({ name: "swr", version: "2.2.0" }, null, 2),

  // Flask Fixtures
  'flask/src/flask/app.py': `class Flask:\n    def __init__(self, import_name):\n        self.import_name = import_name\n        self.blueprints = {}\n    def run(self, host="127.0.0.1", port=5000):\n        pass\n`,
  'flask/src/flask/blueprints.py': `class Blueprint:\n    def __init__(self, name, import_name, url_prefix=None):\n        self.name = name\n        self.url_prefix = url_prefix\n`,
  'flask/src/flask/ctx.py': `class RequestContext:\n    def __init__(self, app, environ):\n        self.app = app\n        self.request = None\nclass AppContext:\n    def __init__(self, app):\n        self.app = app\n`,
  'flask/src/flask/cli.py': `class FlaskGroup:\n    def __init__(self, add_default_commands=True):\n        self.add_default_commands = add_default_commands\n`,
  'flask/src/flask/config.py': `class Config(dict):\n    def from_envvar(self, variable_name):\n        pass\n    def from_pyfile(self, filename):\n        pass\n`,
  'flask/src/flask/globals.py': `"""Global context local proxies including request, session, and current_app."""\nclass LocalProxy:\n    pass\nrequest = LocalProxy()\nsession = LocalProxy()\ng = LocalProxy()\ncurrent_app = LocalProxy()\n`,
  'flask/src/flask/templating.py': `def render_template(template_name_or_list, **context):\n    return f"rendered {template_name_or_list}"\n`,
  'flask/pyproject.toml': `[project]\nname = "flask"\nversion = "3.0.0"\n`,

  // Gin Fixtures
  'gin/gin.go': `package gin\n\ntype Engine struct {\n    RouterGroup\n    trees methodTrees\n}\n\nfunc New() *Engine {\n    return &Engine{}\n}\n\nfunc Default() *Engine {\n    engine := New()\n    return engine\n}\n`,
  'gin/context.go': `package gin\n\ntype Context struct {\n    Request string\n    Writer  string\n}\n\nfunc (c *Context) JSON(code int, obj any) {}\n`,
  'gin/tree.go': `package gin\n\ntype node struct {\n    path     string\n    indices  string\n    handlers []func()\n}\n`,
  'gin/recovery.go': `package gin\n\nfunc Recovery() func() {\n    return func() {}\n}\n`,
  'gin/logger.go': `package gin\n\nfunc Logger() func() {\n    return func() {}\n}\n`,
  'gin/binding/binding.go': `package binding\n\ntype Binding interface {\n    Name() string\n    Bind(req any, obj any) error\n}\n`,
  'gin/go.mod': `module github.com/gin-gonic/gin\n\ngo 1.20\n`
};

for (const [relPath, content] of Object.entries(fixtures)) {
  const fullPath = path.join(baseDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
}

console.log('Successfully generated eval fixtures for swr, flask, and gin.');
