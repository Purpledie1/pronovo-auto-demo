const { readFileSync } = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const script = readFileSync(new URL('../script.js', `file://${__filename}`).pathname, 'utf8');

class Element {
  constructor({ dataset = {}, value = '', min, max, classes = '', attributes = {} } = {}) {
    this.dataset = dataset;
    this.value = value;
    this.min = min;
    this.max = max;
    this.hidden = false;
    this.textContent = '';
    this.attributes = { ...attributes };
    this.listeners = {};
    const names = new Set(classes.split(/\s+/).filter(Boolean));
    this.classList = {
      contains: (name) => names.has(name),
      toggle: (name, force) => {
        const add = force ?? !names.has(name);
        if (add) names.add(name);
        else names.delete(name);
        return add;
      },
      add: (...items) => items.forEach((name) => names.add(name)),
      remove: (...items) => items.forEach((name) => names.delete(name)),
      names,
    };
  }

  addEventListener(type, callback) {
    (this.listeners[type] ??= []).push(callback);
  }
  emit(type, event = {}) {
    for (const callback of this.listeners[type] ?? []) callback(event);
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name] ?? null; }
  focus() { this.focused = true; }
  blur() { this.focused = false; }
}

function setup() {
  const cards = [
    new Element({ dataset: { type: 'suv', region: 'asia', search: 'toyota land cruiser япония' } }),
    new Element({ dataset: { type: 'sedan', region: 'asia', search: 'lexus es япония' } }),
    new Element({ dataset: { type: 'sport', region: 'europe', search: 'porsche 911 германия' } }),
    new Element({ dataset: { type: 'suv', region: 'usa', search: 'ford bronco сша' } }),
  ];
  const filters = ['all', 'suv', 'sedan', 'sport'].map((filter) => new Element({
    dataset: { filter },
    classes: filter === 'all' ? 'filter is-active' : 'filter',
    attributes: { 'aria-pressed': String(filter === 'all') },
  }));
  const search = new Element();
  const region = new Element({ value: 'all' });
  const noResults = new Element();
  const menuToggle = new Element({ attributes: { 'aria-expanded': 'false' } });
  const navLinks = [new Element(), new Element()];
  const nav = new Element();
  nav.querySelectorAll = () => navLinks;
  const budget = new Element({ value: '3000000' });
  const range = new Element({ value: '3000000', min: '500000', max: '15000000' });
  const total = new Element();
  const calcRegion = new Element();
  const elements = {
    '#car-search': search,
    '#region-filter': region,
    '#no-results': noResults,
    '.menu-toggle': menuToggle,
    '#main-nav': nav,
    '#budget': budget,
    '#budget-range': range,
    '#estimate-total': total,
    '#calc-region': calcRegion,
  };
  const documentListeners = {};
  const document = {
    querySelectorAll(selector) {
      if (selector === '.car-card') return cards;
      if (selector === '.filter') return filters;
      throw new Error(`Unexpected querySelectorAll: ${selector}`);
    },
    querySelector(selector) {
      if (selector === '.filter.is-active') return filters.find((item) => item.classList.contains('is-active'));
      if (elements[selector]) return elements[selector];
      throw new Error(`Unexpected querySelector: ${selector}`);
    },
    addEventListener(type, callback) { (documentListeners[type] ??= []).push(callback); },
    emit(type, event) { for (const callback of documentListeners[type] ?? []) callback(event); },
    get activeElement() { return search.focused ? search : null; },
  };
  vm.runInNewContext(script, { document, Intl, Number, String });
  return { cards, filters, search, region, noResults, menuToggle, nav, budget, range, total, document };
}

function visible(cards) { return cards.filter((card) => !card.hidden); }
function numeric(text) { return Number(text.replace(/\D/g, '')); }

test('catalog filters by type, search text, and region and reports empty results', () => {
  const app = setup();
  app.filters[1].emit('click');
  assert.equal(visible(app.cards).length, 2);

  app.search.value = 'toyota';
  app.search.emit('input');
  assert.equal(visible(app.cards).length, 1);
  assert.equal(app.cards[0].hidden, false);

  app.search.value = '';
  app.region.value = 'europe';
  app.region.emit('change');
  assert.equal(visible(app.cards).length, 0);
  assert.equal(app.noResults.hidden, false);
});

test('calculator syncs numeric input and slider using the disclosed 20% demo uplift', () => {
  const app = setup();
  assert.equal(numeric(app.total.textContent), 3600000);
  app.budget.value = '5200000';
  app.budget.emit('input');
  assert.equal(app.range.value, '5200000');
  assert.equal(numeric(app.total.textContent), 6240000);

  app.range.value = '1000000';
  app.range.emit('input');
  assert.equal(app.budget.value, '1000000');
  assert.equal(numeric(app.total.textContent), 1200000);
});

test('mobile menu updates its accessible state and closes on navigation', () => {
  const app = setup();
  app.menuToggle.emit('click');
  assert.equal(app.menuToggle.getAttribute('aria-expanded'), 'true');
  assert.equal(app.nav.classList.contains('is-open'), true);
  app.nav.querySelectorAll('a')[0].emit('click');
  assert.equal(app.menuToggle.getAttribute('aria-expanded'), 'false');
  assert.equal(app.nav.classList.contains('is-open'), false);
});

test('Command/Ctrl+K focuses search and Escape dismisses it', () => {
  const app = setup();
  let prevented = false;
  app.document.emit('keydown', { metaKey: false, ctrlKey: true, key: 'k', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(app.search.focused, true);
  app.document.emit('keydown', { key: 'Escape' });
  assert.equal(app.search.focused, false);
});
