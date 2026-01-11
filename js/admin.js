const apiBase = '/api/admin';
const keyInput = document.querySelector('[data-admin-key]');
const saveKeyButton = document.querySelector('[data-save-key]');
const refreshButton = document.querySelector('[data-refresh]');
const statusEl = document.querySelector('[data-admin-status]');
const listingForm = document.querySelector('[data-listing-form]');
const listingContainer = document.querySelector('[data-admin-listings]');
const messageContainer = document.querySelector('[data-admin-messages]');

const KEY_STORAGE = 'ykpAdminKey';

const segmentLabels = {
  ins: 'Yeni İnşa',
  refit: 'Refit',
  bakim: 'Bakım',
  destek: 'Destek',
};

const setStatus = (text, isError = false) => {
  if (!statusEl) {
    return;
  }
  statusEl.textContent = text;
  statusEl.classList.toggle('is-error', isError);
};

const getApiKey = () => (keyInput ? keyInput.value.trim() : '');

const getHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  const key = getApiKey();
  if (key) {
    headers['x-api-key'] = key;
  }
  return headers;
};

const parseError = async (response) => {
  try {
    const data = await response.json();
    return data?.error || response.statusText;
  } catch (error) {
    return response.statusText;
  }
};

const renderListings = (listings) => {
  if (!listingContainer) {
    return;
  }

  if (!listings.length) {
    listingContainer.innerHTML = '<div class="admin-item">Henüz ilan yok.</div>';
    return;
  }

  listingContainer.innerHTML = listings
    .map((listing) => {
      const stats = listing.stats || { messages: 0, follows: 0, comments: 0 };
      const interestScore = listing.interestScore ?? 0;
      return `
        <div class="admin-item">
          <strong>${listing.title}</strong>
          <div class="meta">
            <span>Segment: ${segmentLabels[listing.segment] || listing.segment}</span>
            <span>Lokasyon: ${listing.location || '-'} | Yil: ${listing.year || '-'}</span>
            <span>Durum: ${listing.status || '-'}</span>
            <span>Ilgi skoru: ${interestScore} (Mesaj ${stats.messages}, Takip ${stats.follows}, Yorum ${stats.comments})</span>
          </div>
          <div class="admin-actions">
            <button class="btn ghost" type="button" data-delete-id="${listing.id}">Sil</button>
          </div>
        </div>
      `;
    })
    .join('');

  listingContainer.querySelectorAll('[data-delete-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = button.getAttribute('data-delete-id');
      if (!id) {
        return;
      }
      if (!window.confirm('Ilani silmek istediginize emin misiniz?')) {
        return;
      }
      try {
        const response = await fetch(`${apiBase}/listings/${id}`, {
          method: 'DELETE',
          headers: getHeaders(),
        });
        if (!response.ok) {
          throw new Error(await parseError(response));
        }
        setStatus('Ilan silindi.');
        await loadAll();
      } catch (error) {
        setStatus(error.message || 'Silme islemi basarisiz.', true);
      }
    });
  });
};

const renderMessages = (messages) => {
  if (!messageContainer) {
    return;
  }

  if (!messages.length) {
    messageContainer.innerHTML = '<div class="admin-item">Mesaj bulunamadi.</div>';
    return;
  }

  messageContainer.innerHTML = messages
    .map((message) => {
      const serviceLine = message.service ? `<span>Talep Turu: ${message.service}</span>` : '';
      const sourceLine = message.type === 'contact'
        ? '<span>Kaynak: Iletisim Formu</span>'
        : '';
      return `
        <div class="admin-item">
          <strong>${message.listingTitle || 'Ilan'}</strong>
          <div class="meta">
            ${sourceLine}
            <span>Gonderen: ${message.name} (${message.email})</span>
            ${message.phone ? `<span>Telefon: ${message.phone}</span>` : ''}
            ${serviceLine}
            <span>Mesaj: ${message.message}</span>
            <span>Tarih: ${message.createdAt}</span>
          </div>
        </div>
      `;
    })
    .join('');
};

const fetchListings = async () => {
  const response = await fetch(`${apiBase}/listings`, { headers: getHeaders() });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  const payload = await response.json();
  return payload.listings || [];
};

const fetchMessages = async () => {
  const response = await fetch(`${apiBase}/messages`, { headers: getHeaders() });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  const payload = await response.json();
  return payload.messages || [];
};

const loadAll = async () => {
  try {
    const [listings, messages] = await Promise.all([fetchListings(), fetchMessages()]);
    renderListings(listings);
    renderMessages(messages);
    if (!statusEl?.textContent) {
      setStatus('Veriler guncellendi.');
    }
  } catch (error) {
    renderListings([]);
    renderMessages([]);
    setStatus(error.message || 'Veriler getirilemedi.', true);
  }
};

if (keyInput) {
  const savedKey = localStorage.getItem(KEY_STORAGE);
  if (savedKey) {
    keyInput.value = savedKey;
  }
}

saveKeyButton?.addEventListener('click', () => {
  const key = getApiKey();
  if (key) {
    localStorage.setItem(KEY_STORAGE, key);
    setStatus('Anahtar kaydedildi.');
  } else {
    localStorage.removeItem(KEY_STORAGE);
    setStatus('Anahtar temizlendi.');
  }
});

refreshButton?.addEventListener('click', () => {
  loadAll();
});

listingForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(listingForm);
  const payload = Object.fromEntries(formData.entries());

  if (!payload.title) {
    setStatus('Baslik gerekli.', true);
    return;
  }

  try {
    const response = await fetch(`${apiBase}/listings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    listingForm.reset();
    setStatus('Ilan kaydedildi.');
    await loadAll();
  } catch (error) {
    setStatus(error.message || 'Kayit basarisiz.', true);
  }
});

loadAll();
