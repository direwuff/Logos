import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {test} from 'node:test';
import {transformSync} from 'esbuild';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../main.ts', import.meta.url), 'utf8');
const block = source.split('// LOGOS_DICTIONARY_UI_START')[1].split('// LOGOS_DICTIONARY_UI_END')[0];
function evaluate(code) {
  const module = {exports: {}};
  vm.runInNewContext(transformSync(code, {loader: 'ts', format: 'cjs', target: 'es2018'}).code, {
    module, exports: module.exports,
    require(id) {
      if (id === 'obsidian') return {Plugin: class {}, ItemView: class {}, Notice: class {}};
      if (id === '@breezystack/lamejs') return {};
      return require(id);
    }
  });
  return module.exports;
}
const Plugin = evaluate(source).default;
const mount = evaluate(`export function mount(dictionaryContainer: any) {${block}\nreturn {input: dictionarySearch, search: runDictionarySearch};}`).mount;
function harness() {
  const reading = {closest: selector => selector === '.markdown-preview-view' ? reading : null, contains: () => true};
  const selection = {anchorNode: {parentElement: reading}, focusNode: {}, toString: () => 'selected'};
  const doc = {defaultView: {getSelection: () => selection}};
  class Element {
    constructor(options = {}) {this.ownerDocument = doc; this.value = ''; this.children = []; this.textContent = options.text ?? '';}
    createEl(tag, options) {const child = new Element(options); this.children.push(child); return child;}
    createDiv(options) {return this.createEl('div', options);}
    createSpan(options) {return this.createEl('span', options);}
    addClass() {}
    setText(text) {this.textContent = text;}
    empty() {this.children = [];}
    isShown() {return true;}
  }
  const plugin = new Plugin();
  plugin.app = {workspace: {getActiveFile: () => ({extension: 'md'})}};
  plugin.savedVocabulary = [];
  plugin.logosMode = 'dictionary';
  const queries = []; let writes = 0;
  plugin.saveSettings = async () => {writes++;};
  plugin.searchDictionary = async query => {
    queries.push(query);
    return [{word: 'related', language: 'en'}, {word: query, language: 'en', definition: 'meaning', part_of_speech: 'noun', pronunciation: '/test/', examples: [{sentence: 'example'}], source: 'fixture'}];
  };
  const container = new Element();
  const view = {plugin};
  return {...mount.call(view, container), plugin, view, queries, container, selection, writes: () => writes};
}

test('typed query takes priority; selected text does not fill the input', async () => {
  const h = harness();
  h.input.value = ' explicit ';
  await h.search();
  h.input.value = ' ';
  await h.search();
  assert.deepEqual(h.queries, ['explicit', 'selected']);
  assert.equal(h.input.value, ' ');
});

test('shortcut toggles the first displayed exact result and preserves other vocabulary', async () => {
  const h = harness();
  h.plugin.savedVocabulary.push({key: 'en::keep', word: 'keep', language: 'en'});
  await h.search(true);
  const saved = h.plugin.savedVocabulary[1];
  assert.equal(saved.word, 'selected');
  assert.equal(saved.definition, 'meaning');
  assert.equal(saved.example, 'example');
  assert.equal(saved.pronunciation, '/test/');
  await h.search(true);
  assert.equal(h.plugin.savedVocabulary.length, 1);
  assert.equal(h.plugin.savedVocabulary[0].word, 'keep');
  await h.search(true);
  assert.equal(h.plugin.savedVocabulary.length, 2);
  assert.equal(h.writes(), 3);
});

test('normal lookup and empty results do not change vocabulary', async () => {
  const h = harness();
  await h.search();
  h.plugin.searchDictionary = async () => [];
  await h.search(true);
  assert.equal(h.plugin.savedVocabulary.length, 0);
  assert.equal(h.writes(), 0);
});

test('keyboard guards leave inputs, other tabs, modifiers, repeats and IME alone', () => {
  const h = harness();
  const event = extra => ({key: 's', target: {closest: () => null}, preventDefault() {throw Error('intercepted');}, stopPropagation() {}, ...extra});
  for (const extra of [{key: 'x'}, {repeat: true}, {isComposing: true}, {ctrlKey: true}, {metaKey: true}, {altKey: true}, {shiftKey: true}, {defaultPrevented: true}, {target: {closest: () => ({})}}]) h.view.dictionaryKeydown(event(extra));
  h.plugin.logosMode = 'reader'; h.view.dictionaryKeydown(event({}));
  h.plugin.logosMode = 'dictionary'; h.container.isShown = () => false; h.view.dictionaryKeydown(event({}));
  h.container.isShown = () => true; h.selection.toString = () => ''; h.view.dictionaryKeydown(event({}));
  assert.equal(h.queries.length, 0);
});

test('reading-view Enter looks up while S toggles the current query', async () => {
  const h = harness();
  const event = key => ({key, target: {closest: () => null}, preventDefault() {}, stopPropagation() {}});
  h.view.dictionaryKeydown(event('Enter'));
  for (let i = 0; i < 8; i++) await Promise.resolve();
  assert.equal(h.queries.length, 1);
  assert.equal(h.plugin.savedVocabulary.length, 0);
  h.view.dictionaryKeydown(event('s'));
  for (let i = 0; i < 8; i++) await Promise.resolve();
  assert.equal(h.plugin.savedVocabulary.length, 1);
  h.view.dictionaryKeydown(event('s'));
  for (let i = 0; i < 8; i++) await Promise.resolve();
  assert.equal(h.plugin.savedVocabulary.length, 0);
});
