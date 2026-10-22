(() => {
  const cards = [...document.querySelectorAll('.car-card')];
  const filters = [...document.querySelectorAll('.filter')];
  const search = document.querySelector('#car-search');
  const regionFilter = document.querySelector('#region-filter');
  const sortSelect = document.querySelector('#sort-select');
  const grid = document.querySelector('#car-grid');
  const catalogCount = document.querySelector('#catalog-count');
  const noResults = document.querySelector('#no-results');

  function updateCatalog() {
    const activeType = document.querySelector('.filter.is-active')?.dataset.filter ?? 'all';
    const activeRegion = regionFilter.value;
    const query = search.value.trim().toLocaleLowerCase('ru');
    const visibleCards = [];

    for (const card of cards) {
      const matchesType = activeType === 'all' || card.dataset.type === activeType;
      const matchesRegion = activeRegion === 'all' || card.dataset.region === activeRegion;
      const matchesSearch = card.dataset.search.toLocaleLowerCase('ru').includes(query);
      const show = matchesType && matchesRegion && matchesSearch;
      card.hidden = !show;
      if (show) visibleCards.push(card);
    }

    if (sortSelect.value === 'price-asc') {
      visibleCards.sort((a, b) => Number(a.dataset.price) - Number(b.dataset.price));
    } else if (sortSelect.value === 'price-desc') {
      visibleCards.sort((a, b) => Number(b.dataset.price) - Number(a.dataset.price));
    }
    visibleCards.forEach((card) => grid.appendChild(card));
    noResults.hidden = visibleCards.length !== 0;
    catalogCount.textContent = `${String(visibleCards.length).padStart(2, '0')} / ДЕМО-КАРТОЧКИ`;
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
  sortSelect.addEventListener('change', updateCatalog);
  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      search.focus();
    }
    if (event.key === 'Escape') {
      if (document.activeElement === search) search.blur();
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Открыть меню');
      mainNav.classList.remove('is-open');
    }
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

  const progressNumber = document.querySelector('#scroll-progress-number');
  const progressBar = document.querySelector('#scroll-progress-bar');
  function updateScrollProgress() {
    const maximum = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = maximum > 0 ? Math.max(0, Math.min(1, window.scrollY / maximum)) : 0;
    const value = 21 + Math.round(ratio * 100);
    progressNumber.textContent = String(value).padStart(3, '0');
    progressBar.style.width = `${(value / 121) * 100}%`;
  }
  document.addEventListener('scroll', updateScrollProgress, { passive: true });
  updateScrollProgress();

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
    // The 20% uplift is an invented demo scenario, not a real tariff.
    total.textContent = `${formatRubles.format(Math.round(value * 1.2))} ₽`;
  }
  budget.addEventListener('input', () => syncBudget(budget));
  range.addEventListener('input', () => syncBudget(range));
  document.querySelector('#calc-region').addEventListener('change', (event) => {
    const selected = event.target.options[event.target.selectedIndex].text;
    event.target.setAttribute('aria-label', `Выбрано направление: ${selected}`);
  });

  updateCatalog();
  syncBudget(budget);
})();
