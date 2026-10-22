const { readFileSync } = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const script = readFileSync(new URL('../script.js', `file://${__filename}`).pathname, 'utf8');

class Element {
  constructor({ dataset = {}, value = '', min, max, classes = '', attributes = {}, options = [] } = {}) {
    this.dataset = dataset;
    this.value = value;
    this.min = min;
    this.max = max;
    this.hidden = false;
    this.textContent = '';
    this.style = {};
    this.options = options;
    this.selectedIndex = 0;
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
    new Element({ dataset: { type: 'electric', region: 'usa', price: '3200000', search: 'tesla model 3 электромобиль америка тесла' } }),
    new Element({ dataset: { type: 'suv', region: 'europe', price: '5400000', search: 'volvo xc60 кроссовер европа вольво' } }),
    new Element({ dataset: { type: 'sport', region: 'europe', price: '12800000', search: 'porsche 911 carrera спорт купе германия порше' } }),
    new Element({ dataset: { type: 'sedan', region: 'asia', price: '4100000', search: 'lexus es 300h седан япония лексус гибрид' } }),
  ];
  const filters = ['all', 'electric', 'suv', 'sport', 'sedan'].map((filter) => new Element({
    dataset: { filter },
    classes: filter === 'all' ? 'filter is-active' : 'filter',
    attributes: { 'aria-pressed': String(filter === 'all') },
  }));
  const search = new Element();
  const region = new Element({ value: 'all' });
  const sort = new Element({ value: 'featured' });
  const noResults = new Element();
  const catalogCount = new Element();
  const grid = new Element();
  grid.children = [];
  grid.appendChild = (card) => { grid.children = [...grid.children.filter((item) => item !== card), card]; };
  const menuToggle = new Element({ attributes: { 'aria-expanded': 'false' } });
  const navLinks = [new Element(), new Element()];
  const nav = new Element();
  nav.querySelectorAll = () => navLinks;
  const budget = new Element({ value: '3000000' });
  const range = new Element({ value: '3000000', min: '500000', max: '15000000' });
  const total = new Element();
  const calcRegion = new Element({ options: [{ text: 'Азия' }, { text: 'Европа' }, { text: 'США' }] });
  const progressNumber = new Element();
  const progressBar = new Element();
  const elements = {
    '#car-search': search,
    '#region-filter': region,
    '#sort-select': sort,
    '#car-grid': grid,
    '#catalog-count': catalogCount,
    '#no-results': noResults,
    '.menu-toggle': menuToggle,
    '#main-nav': nav,
    '#budget': budget,
    '#budget-range': range,
    '#estimate-total': total,
    '#calc-region': calcRegion,
    '#scroll-progress-number': progressNumber,
    '#scroll-progress-bar': progressBar,
  };
  const documentListeners = {};
  const document = {
    documentElement: { scrollHeight: 4000 },
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
  const window = { innerHeight: 1000, scrollY: 0 };
  vm.runInNewContext(script, { document, window, Intl, Number, String, Math });
  return { cards, filters, search, region, sort, noResults, catalogCount, grid, menuToggle, nav, budget, range, total, document, window, progressNumber, progressBar };
}

function visible(cards) { return cards.filter((card) => !card.hidden); }
function numeric(text) { return Number(text.replace(/\D/g, '')); }

test('catalog filters by category, search text, and direction and reports empty results', () => {
  const app = setup();
  app.filters[1].emit('click');
  assert.equal(visible(app.cards).length, 1);
  assert.equal(app.catalogCount.textContent, '01 / ДЕМО-КАРТОЧКИ');

  app.search.value = 'tesla';
  app.search.emit('input');
  assert.equal(visible(app.cards).length, 1);
  assert.equal(app.cards[0].hidden, false);

  app.filters[0].emit('click');
  app.search.value = '';
  app.region.value = 'europe';
  app.region.emit('change');
  assert.equal(visible(app.cards).length, 2);

  app.search.value = 'not-a-car';
  app.search.emit('input');
  assert.equal(visible(app.cards).length, 0);
  assert.equal(app.noResults.hidden, false);
});

test('catalog sorting orders visible cards by demo price', () => {
  const app = setup();
  app.sort.value = 'price-asc';
  app.sort.emit('change');
  assert.deepEqual(app.grid.children.map((card) => card.dataset.price), ['3200000', '4100000', '5400000', '12800000']);

  app.sort.value = 'price-desc';
  app.sort.emit('change');
  assert.deepEqual(app.grid.children.map((card) => card.dataset.price), ['12800000', '5400000', '4100000', '3200000']);
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

  app.budget.value = '30000000';
  app.budget.emit('input');
  assert.equal(app.budget.value, '15000000');
  assert.equal(numeric(app.total.textContent), 18000000);
});

test('mobile menu updates its accessible state and closes on navigation or Escape', () => {
  const app = setup();
  app.menuToggle.emit('click');
  assert.equal(app.menuToggle.getAttribute('aria-expanded'), 'true');
  assert.equal(app.nav.classList.contains('is-open'), true);
  app.nav.querySelectorAll('a')[0].emit('click');
  assert.equal(app.menuToggle.getAttribute('aria-expanded'), 'false');
  assert.equal(app.nav.classList.contains('is-open'), false);

  app.menuToggle.emit('click');
  app.document.emit('keydown', { key: 'Escape' });
  assert.equal(app.menuToggle.getAttribute('aria-expanded'), 'false');
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

test('scroll progress starts at the reference marker and advances with page scroll', () => {
  const app = setup();
  assert.equal(app.progressNumber.textContent, '021');
  app.window.scrollY = 1500;
  app.document.emit('scroll');
  assert.equal(app.progressNumber.textContent, '071');
  assert.equal(app.progressBar.style.width, `${(71 / 121) * 100}%`);
});
