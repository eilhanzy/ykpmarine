document.documentElement.classList.add('js-enabled');

const body = document.body;
const navToggle = document.querySelector('[data-nav-toggle]');
const nav = document.querySelector('[data-nav]');
const navOverlay = document.querySelector('[data-nav-overlay]');

if (navToggle && nav) {
  const toggleNav = () => {
    const isOpen = nav.classList.toggle('is-open');
    navOverlay?.classList.toggle('is-visible', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
    body.classList.toggle('no-scroll', isOpen);
  };

  navToggle.addEventListener('click', toggleNav);
  navOverlay?.addEventListener('click', toggleNav);
  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (nav.classList.contains('is-open')) {
        toggleNav();
      }
    });
  });
}

const revealItems = document.querySelectorAll('[data-reveal]');
if (revealItems.length) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}

const listingSection = document.querySelector('[data-listings]');
if (listingSection) {
  const grid = listingSection.querySelector('[data-listing-grid]');
  const status = listingSection.querySelector('[data-listing-status]');
  const searchInput = listingSection.querySelector('[data-listing-search]');
  const typeFilter = listingSection.querySelector('[data-listing-type]');

  const apiUrl = '/api/public/listings';

  const fallbackListings = [
    {
      id: 'fallback_aurora_48',
      title: 'Aurora 48',
      segment: 'ins',
      location: 'Tuzla',
      year: 2025,
      status: 'Teklifte',
      coverImage: 'images/concepts/yacht_2.jpg',
      highlights: ['Alüminyum Gövde', 'Özel İç Mekan'],
    },
    {
      id: 'fallback_ege_refit_32',
      title: 'Ege Refit 32',
      segment: 'refit',
      location: 'Göcek',
      year: 2024,
      status: 'Aktif',
      coverImage: 'images/concepts/yacht_4.jpg',
      highlights: ['Makine Revizyonu', 'Güverte Yenileme'],
    },
    {
      id: 'fallback_marmara_bakim_24',
      title: 'Marmara Bakım 24',
      segment: 'bakim',
      location: 'İstanbul',
      year: 2024,
      status: 'Planlandı',
      coverImage: 'images/concepts/yacht_6.jpg',
      highlights: ['Boya', 'Elektrik Sistemleri'],
    },
  ];

  let listings = [];
  let hasApiError = false;

  const fallbackImages = [
    'images/concepts/yacht_1.jpg',
    'images/concepts/yacht_3.jpg',
    'images/concepts/yacht_5.jpg',
    'images/concepts/yacht_7.jpg',
  ];

  const segmentLabels = {
    ins: 'Yeni İnşa',
    refit: 'Refit',
    bakim: 'Bakım',
    destek: 'Destek',
  };

  const normalizeSegment = (value) => {
    if (!value) {
      return 'ins';
    }
    const segment = value.toString().toLowerCase();
    if (segmentLabels[segment]) {
      return segment;
    }
    if (segment.includes('refit')) {
      return 'refit';
    }
    if (segment.includes('bak')) {
      return 'bakim';
    }
    if (segment.includes('destek') || segment.includes('support')) {
      return 'destek';
    }
    if (segment.includes('ins') || segment.includes('new')) {
      return 'ins';
    }
    return 'ins';
  };

  const formatStatus = (item) => {
    if (item.status) {
      return item.status;
    }
    if (typeof item.active === 'boolean') {
      return item.active ? 'Aktif' : 'Pasif';
    }
    return 'Planlanıyor';
  };

  const getImage = (item) => {
    if (item.coverImage) {
      return item.coverImage;
    }
    if (item.image) {
      return item.image;
    }
    return fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
  };

  const normalizeListing = (item) => ({
    id: item.id || item._id || '',
    title: item.title || item.name || 'Yat Projesi',
    segment: normalizeSegment(item.segment || item.type),
    location: item.location || item.home_port || 'Akdeniz',
    year: item.year || item.year_built || 'Belirtilmedi',
    status: formatStatus(item),
    coverImage: getImage(item),
    highlights: item.highlights || item.roles || [],
  });

  const getSegmentLabel = (segment) => segmentLabels[segment] || 'Yeni İnşa';

  const buildCard = (listing) => {
    const highlightText =
      Array.isArray(listing.highlights) && listing.highlights.length
        ? listing.highlights.slice(0, 2).join(' / ')
        : 'İnşa ve bakım paketi';
    const year = listing.year ? listing.year : 'Belirtilmedi';
    const location = listing.location ? listing.location : 'Akdeniz';
    const segmentLabel = getSegmentLabel(listing.segment);

    return `
      <article class="listing-card reveal" data-reveal>
        <div class="listing-media">
          <img src="${listing.coverImage}" alt="${listing.title} görseli" loading="lazy">
          <span class="badge">${listing.status}</span>
        </div>
        <div class="listing-body">
          <h3>${listing.title}</h3>
          <p>${highlightText}</p>
          <div class="listing-meta">
            <span>Segment: ${segmentLabel}</span>
            <span>Lokasyon: ${location}</span>
            <span>Yıl: ${year}</span>
          </div>
          <div class="listing-actions">
            <a class="btn light" href="iletisim.html">Teklif İste</a>
            <a class="btn ghost" href="projeler.html">Benzer Projeler</a>
          </div>
        </div>
      </article>
    `;
  };

  const renderListings = (items) => {
    if (!grid) {
      return;
    }
    if (!items.length) {
      grid.innerHTML = '<div class="listing-status">Sonuç bulunamadı.</div>';
      return;
    }
    grid.innerHTML = items.map(buildCard).join('');
    const newRevealItems = grid.querySelectorAll('[data-reveal]');
    newRevealItems.forEach((item) => item.classList.add('is-visible'));
  };

  const applyFilters = () => {
    const searchValue = searchInput?.value.trim().toLowerCase() || '';
    const typeValue = typeFilter?.value || 'all';

    const filtered = listings.filter((listing) => {
      const segmentLabel = getSegmentLabel(listing.segment).toLowerCase();
      const matchesSearch =
        listing.title.toLowerCase().includes(searchValue) ||
        (listing.location || '').toLowerCase().includes(searchValue) ||
        segmentLabel.includes(searchValue);

      const matchesType = typeValue === 'all' || listing.segment === typeValue;

      return matchesSearch && matchesType;
    });

    renderListings(filtered);
    if (status) {
      status.textContent = hasApiError
        ? `API erişilemedi. ${filtered.length} ilan gösteriliyor.`
        : `${filtered.length} ilan görüntüleniyor`;
    }
  };

  const loadListings = async () => {
    if (status) {
      status.textContent = 'İlanlar yükleniyor...';
    }
    if (grid) {
      grid.innerHTML = '<div class="listing-status">Yükleniyor...</div>';
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(apiUrl, { signal: controller.signal });
      if (!response.ok) {
        throw new Error('API yanıt vermedi.');
      }
      const payload = await response.json();
      const items = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.listings)
        ? payload.listings
        : Array.isArray(payload.data)
        ? payload.data
        : [];
      listings = items.map(normalizeListing).slice(0, 12);

      if (!listings.length) {
        listings = fallbackListings;
      }
      hasApiError = false;
    } catch (error) {
      hasApiError = true;
      listings = fallbackListings;
      if (status) {
        status.textContent = 'API erişilemedi. Yedek ilanlar gösteriliyor.';
      }
    } finally {
      clearTimeout(timeoutId);
      applyFilters();
    }
  };

  searchInput?.addEventListener('input', applyFilters);
  typeFilter?.addEventListener('change', applyFilters);

  loadListings();
}
