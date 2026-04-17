const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const context = { console, setTimeout, clearTimeout };
context.window = context;
context.globalThis = context;
vm.createContext(context);

[
  'src/goog-shim.js',
  'vendor/google-input-tools/decoder/inputtoolcode.js',
  'vendor/google-input-tools/decoder/candidate.js',
  'vendor/google-input-tools/decoder/eventtype.js',
  'vendor/google-input-tools/decoder/dataloader.js',
  'vendor/google-input-tools/decoder/dataparser.js',
  'vendor/google-input-tools/decoder/heap.js',
  'vendor/google-input-tools/decoder/tokendecoder.js',
  'vendor/google-input-tools/decoder/mldecoder.js',
  'vendor/google-input-tools/decoder/decoder.js',
  'vendor/google-input-tools/pinyin/data.js',
  'src/pinyin-engine.js'
].forEach((file) => {
  vm.runInContext(
    fs.readFileSync(path.join(root, file), 'utf8'),
    context,
    { filename: file }
  );
});

const engine = new context.SandboxChinesePinyinEngine();
const cases = [
  ['chuang', '创'],
  ['shuang', '双'],
  ['zhuang', '装'],
  ['zhongwen', '中文'],
  ['nihao', '你好']
];

for (const [input, expected] of cases) {
  const result = engine.decode(input, 9);
  const tokens = result.tokens.join('|');
  const candidates = result.candidates.map((candidate) => candidate.text);
  if (!candidates.includes(expected)) {
    throw new Error(`${input} expected ${expected}; tokens=${tokens}; candidates=${candidates.join(' ')}`);
  }
  console.log(`${input}: ${tokens} => ${candidates.slice(0, 5).join(' ')}`);
}
