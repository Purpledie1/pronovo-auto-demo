(() => {
  const cards = [...document.querySelectorAll('.car-card')];
  const filters = [...document.querySelectorAll('.filter')];
  const search = document.querySelector('#car-search');
  const regionFilter = document.querySelector('#region-filter');
  const noResults = document.querySelector('#no-results');

  function updateCatalog() {
    const activeType = document.querySelector('.filter.is-active')?.dataset.filter ?? 'all';
    const activeRegion = regionFilter.value;
    const query = search.value.trim().toLocaleLowerCase('ru');
    let visible = 0;

    for (const card of cards) {
      const matchesType = activeType === 'all' || card.dataset.type === activeType;
      const matchesRegion = activeRegion === 'all' || card.dataset.region === activeRegion;
      const matchesSearch = card.dataset.search.includes(query);
      const show = matchesType && matchesRegion && matchesSearch;
      card.hidden = !show;
      if (show) visible += 1;
    }
    noResults.hidden = visible !== 0;
  }

  filters.forEach((button) => {
    button.addEventListener('click', () => {
      filters.forEach((item) => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      updateCatalog();
    });
  });
  search.addEventListener('input', updateCatalog);
  regionFilter.addEventListener('change', updateCatalog);
  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      search.focus();
    }
    if (event.key === 'Escape' && document.activeElement === search) search.blur();
  });

  const menuToggle = document.querySelector('.menu-toggle');
  const mainNav = document.querySelector('#main-nav');
  menuToggle.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    mainNav.classList.toggle('is-open', open);
  });
  mainNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Открыть меню');
      mainNav.classList.remove('is-open');
    });
  });

  const budget = document.querySelector('#budget');
  const range = document.querySelector('#budget-range');
  const total = document.querySelector('#estimate-total');
  const formatRubles = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
  function syncBudget(source) {
    const min = Number(range.min);
    const max = Number(range.max);
    let value = Number(source.value);
    if (!Number.isFinite(value)) value = min;
    value = Math.min(max, Math.max(min, Math.round(value / 100000) * 100000));
    budget.value = String(value);
    range.value = String(value);
    // A 20% uplift is a made-up scenario shown only to demonstrate the control.
    total.textContent = `${formatRubles.format(Math.round(value * 1.2))} ₽`;
  }
  budget.addEventListener('input', () => syncBudget(budget));
  range.addEventListener('input', () => syncBudget(range));
  document.querySelector('#calc-region').addEventListener('change', (event) => {
    event.target.setAttribute('aria-label', `Выбрано направление: ${event.target.options[event.target.selectedIndex].text}`);
  });
  updateCatalog();
  syncBudget(budget);
})();
