const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const dotenv = require('dotenv');

const resolveEnvPath = () => {
  const candidates = [
    process.env.ENV_FILE,
    path.join(__dirname, '..', '..', 'app.env'),
    path.join(__dirname, '..', '..', '.env'),
    path.join(__dirname, '..', '.env'),
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate));
};

const envPath = resolveEnvPath();
if (envPath) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const { loadData, saveData } = require('./store');
const { requireWhitelist, isWhitelisted } = require('./whitelist');
const { sendMessageNotification } = require('./mailer');

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', '..')));

const allowPublicRead = process.env.ALLOW_PUBLIC_READ !== 'false';
const publicWriteRequiresWhitelist =
  process.env.PUBLIC_WRITE_REQUIRES_WHITELIST === 'true';

const parseList = (value) =>
  value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const keygenAllowedIps = parseList(process.env.KEYGEN_ALLOWED_IPS);

const data = loadData();

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const normalizeStoredListing = (listing) => {
  if (!listing.stats) {
    listing.stats = { messages: 0, follows: 0, comments: 0 };
  }
  listing.highlights = ensureArray(listing.highlights);
  listing.gallery = ensureArray(listing.gallery);
};

const normalizeData = () => {
  let dirty = false;
  data.listings.forEach((listing) => {
    const before = JSON.stringify({
      stats: listing.stats,
      highlights: listing.highlights,
      gallery: listing.gallery,
    });
    normalizeStoredListing(listing);
    const after = JSON.stringify({
      stats: listing.stats,
      highlights: listing.highlights,
      gallery: listing.gallery,
    });
    if (before !== after) {
      dirty = true;
    }
  });
  if (dirty) {
    saveData();
  }
};

normalizeData();

const nowIso = () => new Date().toISOString();

const computeInterestScore = (listing) => {
  const stats = listing.stats || { messages: 0, follows: 0, comments: 0 };
  return stats.messages * 3 + stats.follows * 2 + stats.comments;
};

const withInterest = (listing) => ({
  ...listing,
  interestScore: computeInterestScore(listing),
});

const sanitizeListing = (listing) => ({
  id: listing.id,
  title: listing.title,
  segment: listing.segment,
  location: listing.location,
  year: listing.year,
  status: listing.status,
  coverImage: listing.coverImage,
  videoUrl: listing.videoUrl,
  highlights: listing.highlights || [],
  gallery: listing.gallery || [],
  description: listing.description || '',
  stats: listing.stats || { messages: 0, follows: 0, comments: 0 },
  createdAt: listing.createdAt,
  updatedAt: listing.updatedAt,
});

const normalizeArrayField = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const allowedSegments = ['ins', 'refit', 'bakim', 'destek'];

const normalizeSegment = (segment) => {
  if (!segment) {
    return 'ins';
  }
  const value = segment.toString().toLowerCase();
  if (allowedSegments.includes(value)) {
    return value;
  }
  if (value.includes('refit')) {
    return 'refit';
  }
  if (value.includes('bak')) {
    return 'bakim';
  }
  if (value.includes('destek') || value.includes('support')) {
    return 'destek';
  }
  return 'ins';
};

const findListing = (id) => data.listings.find((listing) => listing.id === id);

const normalizeIp = (ip) => (ip.startsWith('::ffff:') ? ip.slice(7) : ip);

const isKeygenIpAllowed = (req) => {
  if (keygenAllowedIps.length === 0) {
    return false;
  }
  const rawIp = req.socket?.remoteAddress || '';
  const normalizedIp = normalizeIp(rawIp);
  return (
    keygenAllowedIps.includes(rawIp) || keygenAllowedIps.includes(normalizedIp)
  );
};

const publicReadGate = (req, res, next) => {
  if (allowPublicRead) {
    next();
    return;
  }
  if (isWhitelisted(req)) {
    next();
    return;
  }
  res.status(403).json({ error: 'Whitelist disi erisim engellendi.' });
};

const publicWriteGate = (req, res, next) => {
  if (!publicWriteRequiresWhitelist) {
    next();
    return;
  }
  if (isWhitelisted(req)) {
    next();
    return;
  }
  res.status(403).json({ error: 'Whitelist disi erisim engellendi.' });
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/public/listings', publicReadGate, (req, res) => {
  const segment = (req.query.segment || '').toString().toLowerCase();
  const search = (req.query.search || '').toString().toLowerCase();
  const sort = (req.query.sort || 'interest').toString().toLowerCase();

  let items = data.listings.slice();

  if (segment && segment !== 'all') {
    items = items.filter((listing) => listing.segment === segment);
  }

  if (search) {
    items = items.filter((listing) => {
      return (
        listing.title.toLowerCase().includes(search) ||
        (listing.location || '').toLowerCase().includes(search) ||
        (listing.description || '').toLowerCase().includes(search)
      );
    });
  }

  const sorted = items
    .map((listing) => withInterest(sanitizeListing(listing)))
    .sort((a, b) => {
      if (sort === 'recent') {
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      }
      if (b.interestScore !== a.interestScore) {
        return b.interestScore - a.interestScore;
      }
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

  res.json({ listings: sorted, count: sorted.length });
});

app.get('/api/public/listings/:id', publicReadGate, (req, res) => {
  const listing = findListing(req.params.id);
  if (!listing) {
    res.status(404).json({ error: 'Ilan bulunamadi.' });
    return;
  }

  const comments = data.comments
    .filter((comment) => comment.listingId === listing.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    listing: withInterest(sanitizeListing(listing)),
    comments,
  });
});

app.post('/api/public/listings/:id/messages', publicWriteGate, async (req, res) => {
  const listing = findListing(req.params.id);
  if (!listing) {
    res.status(404).json({ error: 'Ilan bulunamadi.' });
    return;
  }

  const { name, email, phone, message } = req.body || {};
  if (!name || !email || !message) {
    res.status(400).json({ error: 'Ad, e-posta ve mesaj gerekli.' });
    return;
  }

  const newMessage = {
    id: `msg_${crypto.randomUUID()}`,
    listingId: listing.id,
    name: String(name).trim(),
    email: String(email).trim(),
    phone: phone ? String(phone).trim() : '',
    message: String(message).trim(),
    createdAt: nowIso(),
    ip: req.ip,
    status: 'new',
  };

  data.messages.push(newMessage);
  listing.stats.messages += 1;
  listing.updatedAt = nowIso();
  saveData();

  try {
    await sendMessageNotification({ listing, message: newMessage });
  } catch (error) {
    console.log('Mail gonderimi basarisiz:', error.message);
  }

  res.status(201).json({
    message: 'Mesajiniz alindi. En kisa surede size donus yapilacak.',
    id: newMessage.id,
  });
});

app.post('/api/public/listings/:id/comments', publicWriteGate, (req, res) => {
  const listing = findListing(req.params.id);
  if (!listing) {
    res.status(404).json({ error: 'Ilan bulunamadi.' });
    return;
  }

  const { name, message } = req.body || {};
  if (!name || !message) {
    res.status(400).json({ error: 'Ad ve yorum gerekli.' });
    return;
  }

  const comment = {
    id: `cmt_${crypto.randomUUID()}`,
    listingId: listing.id,
    name: String(name).trim(),
    message: String(message).trim(),
    createdAt: nowIso(),
  };

  data.comments.push(comment);
  listing.stats.comments += 1;
  listing.updatedAt = nowIso();
  saveData();

  res.status(201).json({ comment });
});

app.post('/api/public/listings/:id/follow', publicWriteGate, (req, res) => {
  const listing = findListing(req.params.id);
  if (!listing) {
    res.status(404).json({ error: 'Ilan bulunamadi.' });
    return;
  }

  const { email } = req.body || {};
  if (!email) {
    res.status(400).json({ error: 'E-posta gerekli.' });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = data.follows.find(
    (follow) => follow.listingId === listing.id && follow.email === normalizedEmail
  );

  if (existing) {
    res.json({ followed: false, message: 'Zaten takiptesiniz.' });
    return;
  }

  const follow = {
    id: `fol_${crypto.randomUUID()}`,
    listingId: listing.id,
    email: normalizedEmail,
    createdAt: nowIso(),
  };

  data.follows.push(follow);
  listing.stats.follows += 1;
  listing.updatedAt = nowIso();
  saveData();

  res.status(201).json({ followed: true });
});

app.delete('/api/public/listings/:id/follow', publicWriteGate, (req, res) => {
  const listing = findListing(req.params.id);
  if (!listing) {
    res.status(404).json({ error: 'Ilan bulunamadi.' });
    return;
  }

  const { email } = req.body || {};
  if (!email) {
    res.status(400).json({ error: 'E-posta gerekli.' });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const index = data.follows.findIndex(
    (follow) => follow.listingId === listing.id && follow.email === normalizedEmail
  );

  if (index === -1) {
    res.status(404).json({ error: 'Takip kaydi bulunamadi.' });
    return;
  }

  data.follows.splice(index, 1);
  listing.stats.follows = Math.max(0, listing.stats.follows - 1);
  listing.updatedAt = nowIso();
  saveData();

  res.json({ unfollowed: true });
});

app.post('/api/admin/keys', requireWhitelist, (req, res) => {
  if (!isKeygenIpAllowed(req)) {
    res.status(403).json({
      error: 'Bu IP icin anahtar uretimi kapali.',
    });
    return;
  }

  const rawKey = `ykp_${crypto.randomBytes(24).toString('hex')}`;
  const hash = crypto.createHash('sha256').update(rawKey).digest('hex');

  res.status(201).json({
    apiKey: rawKey,
    sha256: hash,
  });
});

app.get('/api/admin/listings', requireWhitelist, (req, res) => {
  const listings = data.listings.map((listing) => withInterest(sanitizeListing(listing)));
  res.json({ listings, count: listings.length });
});

app.post('/api/admin/listings', requireWhitelist, (req, res) => {
  const {
    title,
    segment,
    location,
    year,
    status,
    coverImage,
    highlights,
    gallery,
    description,
    videoUrl,
  } = req.body || {};

  if (!title) {
    res.status(400).json({ error: 'Baslik gerekli.' });
    return;
  }

  const listing = {
    id: `lst_${crypto.randomUUID()}`,
    title: String(title).trim(),
    segment: normalizeSegment(segment),
    location: location ? String(location).trim() : '',
    year: year ? Number(year) : null,
    status: status ? String(status).trim() : 'Planlanıyor',
    coverImage: coverImage ? String(coverImage).trim() : '',
    videoUrl: videoUrl ? String(videoUrl).trim() : '',
    highlights: normalizeArrayField(highlights),
    gallery: normalizeArrayField(gallery),
    description: description ? String(description).trim() : '',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    stats: { messages: 0, follows: 0, comments: 0 },
  };

  data.listings.push(listing);
  saveData();

  res.status(201).json({ listing: withInterest(sanitizeListing(listing)) });
});

app.patch('/api/admin/listings/:id', requireWhitelist, (req, res) => {
  const listing = findListing(req.params.id);
  if (!listing) {
    res.status(404).json({ error: 'Ilan bulunamadi.' });
    return;
  }

  const {
    title,
    segment,
    location,
    year,
    status,
    coverImage,
    highlights,
    gallery,
    description,
    videoUrl,
  } = req.body || {};

  if (title !== undefined) {
    listing.title = String(title).trim();
  }
  if (segment !== undefined) {
    listing.segment = normalizeSegment(segment);
  }
  if (location !== undefined) {
    listing.location = String(location).trim();
  }
  if (year !== undefined) {
    listing.year = year === null || year === '' ? null : Number(year);
  }
  if (status !== undefined) {
    listing.status = String(status).trim();
  }
  if (coverImage !== undefined) {
    listing.coverImage = String(coverImage).trim();
  }
  if (videoUrl !== undefined) {
    listing.videoUrl = String(videoUrl).trim();
  }
  if (highlights !== undefined) {
    listing.highlights = normalizeArrayField(highlights);
  }
  if (gallery !== undefined) {
    listing.gallery = normalizeArrayField(gallery);
  }
  if (description !== undefined) {
    listing.description = String(description).trim();
  }

  listing.updatedAt = nowIso();
  saveData();

  res.json({ listing: withInterest(sanitizeListing(listing)) });
});

app.delete('/api/admin/listings/:id', requireWhitelist, (req, res) => {
  const index = data.listings.findIndex((listing) => listing.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Ilan bulunamadi.' });
    return;
  }

  const [removed] = data.listings.splice(index, 1);
  data.messages = data.messages.filter((item) => item.listingId !== removed.id);
  data.comments = data.comments.filter((item) => item.listingId !== removed.id);
  data.follows = data.follows.filter((item) => item.listingId !== removed.id);
  saveData();

  res.json({ deleted: true });
});

app.get('/api/admin/messages', requireWhitelist, (req, res) => {
  const listingId = req.query.listingId ? String(req.query.listingId) : '';
  const listingMap = new Map(
    data.listings.map((listing) => [listing.id, listing.title])
  );

  const messages = data.messages
    .filter((message) => (listingId ? message.listingId === listingId : true))
    .map((message) => ({
      ...message,
      listingTitle: listingMap.get(message.listingId) || 'Ilan silinmis',
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ messages, count: messages.length });
});

app.get('/api/admin/comments', requireWhitelist, (req, res) => {
  const listingId = req.query.listingId ? String(req.query.listingId) : '';
  const listingMap = new Map(
    data.listings.map((listing) => [listing.id, listing.title])
  );

  const comments = data.comments
    .filter((comment) => (listingId ? comment.listingId === listingId : true))
    .map((comment) => ({
      ...comment,
      listingTitle: listingMap.get(comment.listingId) || 'Ilan silinmis',
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ comments, count: comments.length });
});

app.use((err, req, res, next) => {
  console.error('API error:', err);
  res.status(500).json({ error: 'Beklenmeyen bir hata olustu.' });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`YKP Marine API running on port ${port}`);
});
