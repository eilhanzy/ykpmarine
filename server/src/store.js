const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '..', 'data', 'db.json');
const defaultData = {
  listings: [],
  messages: [],
  comments: [],
  follows: [],
};

let cache = null;

const loadData = () => {
  if (cache) {
    return cache;
  }

  if (!fs.existsSync(dataFile)) {
    cache = { ...defaultData };
    fs.writeFileSync(dataFile, JSON.stringify(cache, null, 2), 'utf8');
    return cache;
  }

  const raw = fs.readFileSync(dataFile, 'utf8');
  try {
    cache = JSON.parse(raw);
  } catch (error) {
    cache = { ...defaultData };
  }

  cache.listings = Array.isArray(cache.listings) ? cache.listings : [];
  cache.messages = Array.isArray(cache.messages) ? cache.messages : [];
  cache.comments = Array.isArray(cache.comments) ? cache.comments : [];
  cache.follows = Array.isArray(cache.follows) ? cache.follows : [];

  return cache;
};

const saveData = () => {
  if (!cache) {
    return;
  }
  fs.writeFileSync(dataFile, JSON.stringify(cache, null, 2), 'utf8');
};

module.exports = {
  loadData,
  saveData,
};
