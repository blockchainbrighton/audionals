const CONTRACT_ID = 'SP8HMQP4Q63V3E6SXXPXZ4WJXA263HBD95QY2AM3.narcotix';
const MAX_SUPPLY = 3333;
const CSV_PATH = '../narcotix-collection-metadata.csv';
const ENCODED_CONTRACT = encodeURIComponent(CONTRACT_ID);
const CACHE_URL = (id) => `https://assets.hiro.so/api/mainnet/token-metadata-api/${ENCODED_CONTRACT}/${encodeURIComponent(String(id))}.png`;
const META_URL = (id) => `https://api.hiro.so/metadata/v1/nft/${ENCODED_CONTRACT}/${encodeURIComponent(String(id))}`;

function sanitizeColor(value, fallback = '#ffffff') {
    if (!value) return fallback;
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result.map(cell => cell.trim());
}

function normalizeKey(key, index) {
    const clean = key?.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return clean || `column_${index}`;
}

export const narcotixCollectionManager = {
    game: null,
    readyPromise: null,
    catalog: [],
    catalogMap: new Map(),
    collectedMap: new Map(),
    lastSpotlight: null,
    spotlightTimer: null,
    metadataPromises: new Map(),

    init(gameInstance) {
        if (this.game) return this.ensureReady();
        this.game = gameInstance;
        this.cacheElements();
        this.readyPromise = this.loadCatalog();
        return this.readyPromise;
    },

    ensureReady() {
        if (!this.readyPromise) {
            this.readyPromise = this.loadCatalog();
        }
        return this.readyPromise;
    },

    cacheElements() {
        this.spotlightEl = document.getElementById('pillSpotlight');
        this.spotlightImg = document.getElementById('pillSpotlightImage');
        this.spotlightName = document.getElementById('pillSpotlightName');
        this.spotlightEffect = document.getElementById('pillSpotlightEffect');
        this.spotlightColors = document.getElementById('pillSpotlightColors');
        this.codexGrid = document.getElementById('codexGrid');
        this.codexEmpty = document.getElementById('codexEmptyState');
        this.codexCount = document.getElementById('codexCount');
    },

    async loadCatalog() {
        try {
            const response = await fetch(CSV_PATH);
            const text = await response.text();
            const lines = text.split(/\r?\n/).filter(l => l.trim().length);
            if (!lines.length) throw new Error('Metadata CSV empty');
            const headerCells = parseCSVLine(lines.shift());
            const headers = headerCells.map((h, idx) => normalizeKey(h, idx));
            this.catalog = lines.map(line => {
                const cells = parseCSVLine(line);
                const entry = {};
                headers.forEach((key, idx) => { entry[key] = cells[idx] ?? ''; });
                const tokenId = Number(entry.id || entry.token_id || entry.column_1);
                if (!tokenId || tokenId > MAX_SUPPLY) return null;
                return {
                    tokenId,
                    name: entry.name || `NarcotiX #${tokenId}`,
                    colors: {
                        primary: sanitizeColor(entry.hex1 || entry.primary || entry.color1, '#903ef9'),
                        secondary: sanitizeColor(entry.hex2 || entry.secondary || entry.color2, '#54e507'),
                    },
                    effect: entry.effect || entry.effects || 'Experimental effect pending classification.',
                    sideEffect: entry.sideeffect || entry.side_effect || 'Side effects unknown.',
                    imageUrl: CACHE_URL(tokenId),
                };
            }).filter(Boolean);
            this.catalogMap = new Map(this.catalog.map(entry => [entry.tokenId, entry]));
        } catch (err) {
            console.error('Failed to load NarcotiX metadata, generating fallback set.', err);
            this.catalog = Array.from({ length: 25 }).map((_, idx) => {
                const tokenId = idx + 1;
                return {
                    tokenId,
                    name: `NarcotiX #${tokenId}`,
                    colors: {
                        primary: '#903ef9',
                        secondary: '#54e507',
                    },
                    effect: 'Unlocks a random systems boost.',
                    sideEffect: 'May destabilize nearby nodes.',
                    imageUrl: CACHE_URL(tokenId),
                };
            });
            this.catalogMap = new Map(this.catalog.map(entry => [entry.tokenId, entry]));
        }
    },

    getRandomEntry() {
        if (!this.catalog.length) return null;
        const randomIndex = Math.floor(Math.random() * this.catalog.length);
        return this.catalog[randomIndex];
    },

    getEntryById(tokenId) {
        return this.catalogMap.get(Number(tokenId));
    },

    recordPickup(entry) {
        if (!entry) return;
        this.collectedMap.set(entry.tokenId, entry);
        this.lastSpotlight = entry;
        this.renderCodexGrid();
        this.updateSpotlight(entry);
        this.ensureEntryMedia(entry);
        if (this.game) {
            this.game.utils.addMessage(`Catalogued ${entry.name}. Effect: ${entry.effect}`);
        }
    },

    renderCodexGrid() {
        if (!this.codexGrid) return;
        const entries = [...this.collectedMap.values()].sort((a, b) => a.tokenId - b.tokenId);
        if (this.codexCount) this.codexCount.textContent = `${entries.length}/${MAX_SUPPLY}`;

        if (!entries.length) {
            this.codexGrid.innerHTML = '';
            if (this.codexEmpty) this.codexEmpty.style.display = 'block';
            return;
        }
        if (this.codexEmpty) this.codexEmpty.style.display = 'none';
        if (!this.codexGrid) return;
        this.codexGrid.innerHTML = '';
        entries.forEach(entry => {
            const card = document.createElement('div');
            card.className = 'codex-card';
            card.style.setProperty('--pill-color-a', entry.colors.primary);
            card.style.setProperty('--pill-color-b', entry.colors.secondary);

            card.innerHTML = `
                <div class="codex-card__art" style="background-image:linear-gradient(120deg, ${entry.colors.primary}, ${entry.colors.secondary});">
                    <img src="${entry.imageUrl}" alt="${entry.name}" loading="lazy">
                </div>
                <div class="codex-card__body">
                    <h4>${entry.name}</h4>
                    <p>${entry.effect}</p>
                </div>
            `;
            card.addEventListener('click', () => this.updateSpotlight(entry, true));
            this.codexGrid.appendChild(card);
            this.ensureEntryMedia(entry).then(() => {
                if (!card.isConnected) return;
                const img = card.querySelector('img');
                if (img && entry.imageUrl) {
                    img.src = entry.imageUrl;
                }
            });
        });
    },

    updateSpotlight(entry, persist = false) {
        if (!entry || !this.spotlightEl) return;
        if (this.spotlightImg) {
            this.spotlightImg.src = entry.imageUrl;
            this.spotlightImg.alt = entry.name;
        }
        if (this.spotlightName) this.spotlightName.textContent = entry.name;
        if (this.spotlightEffect) {
            this.spotlightEffect.innerHTML = `
                <strong>Effect:</strong> ${entry.effect}<br/>
                <strong>Side-effect:</strong> ${entry.sideEffect}
            `;
        }
        this.spotlightEl.classList.add('visible');
        this.renderSpotlightColors(entry);

        if (this.spotlightTimer) clearTimeout(this.spotlightTimer);
        if (!persist) {
            this.spotlightTimer = setTimeout(() => {
                this.spotlightEl.classList.remove('visible');
            }, 10000);
        }
        this.ensureEntryMedia(entry).then(() => {
            if (this.spotlightImg && entry.imageUrl) {
                this.spotlightImg.src = entry.imageUrl;
            }
        });
    },

    ensureEntryMedia(entry) {
        if (!entry || entry.images?.length) return Promise.resolve(entry.images);
        if (this.metadataPromises.has(entry.tokenId)) {
            return this.metadataPromises.get(entry.tokenId);
        }
        const fetchPromise = fetch(META_URL(entry.tokenId))
            .then(resp => resp.ok ? resp.json() : null)
            .then(meta => {
                if (!meta) return [];
                const images = collectImageUrls(meta, entry.tokenId);
                entry.images = images;
                entry.imageUrl = images[0] || entry.imageUrl || CACHE_URL(entry.tokenId);
                entry.traits = extractTraits(meta);
                return images;
            })
            .catch(err => {
                console.warn('Failed to hydrate metadata for token', entry.tokenId, err);
                entry.images = [entry.imageUrl || CACHE_URL(entry.tokenId)];
                return entry.images;
            })
            .finally(() => {
                this.metadataPromises.delete(entry.tokenId);
            });
        this.metadataPromises.set(entry.tokenId, fetchPromise);
        return fetchPromise;
    },

    renderSpotlightColors(entry) {
        if (!this.spotlightColors) return;
        this.spotlightColors.innerHTML = '';
        const colors = [
            { label: 'Primary', value: entry.colors?.primary },
            { label: 'Secondary', value: entry.colors?.secondary },
        ];
        colors.forEach(color => {
            if (!color.value) return;
            const li = document.createElement('li');
            const swatch = document.createElement('span');
            swatch.className = 'pill-spotlight__swatch';
            swatch.style.background = color.value;
            li.appendChild(swatch);
            const text = document.createElement('span');
            text.textContent = `${color.label}: ${color.value}`;
            li.appendChild(text);
            this.spotlightColors.appendChild(li);
        });
    }
};

function collectImageUrls(meta, id) {
    const md = meta?.metadata || {};
    const urls = [CACHE_URL(id)];
    urls.push(md.image, md.image_url, md.imageUrl, md.animation_url, md.animationUrl);
    const arraySources = md.images || md.image_urls || md.imageUrls || md.gallery || md.media;
    if (Array.isArray(arraySources)) urls.push(...arraySources);
    if (Array.isArray(md.media)) {
        md.media.forEach(m => {
            if (typeof m === 'string') urls.push(m);
            else if (m && typeof m === 'object') urls.push(m.url, m.uri, m.src, m.href);
        });
    }
    if (Array.isArray(md.files)) {
        md.files.forEach(f => {
            if (typeof f === 'string') urls.push(f);
            else if (f && typeof f === 'object') urls.push(f.uri, f.url, f.href);
        });
    }
    const unique = [];
    const seen = new Set();
    urls.forEach(url => {
        if (!url) return;
        const trimmed = String(url).trim();
        if (!trimmed) return;
        if (seen.has(trimmed)) return;
        seen.add(trimmed);
        unique.push(trimmed);
    });
    return unique;
}

function extractTraits(meta) {
    const md = meta?.metadata || {};
    if (Array.isArray(md.attributes)) {
        return md.attributes
            .map(a => ({ k: a?.trait_type ?? a?.type ?? a?.key ?? a?.name, v: a?.value ?? a?.val }))
            .filter(t => t.k != null && t.v != null);
    }
    if (Array.isArray(md.traits)) {
        return md.traits
            .map(a => ({ k: a?.trait_type ?? a?.type ?? a?.key ?? a?.name, v: a?.value ?? a?.val }))
            .filter(t => t.k != null && t.v != null);
    }
    if (md.traits && typeof md.traits === 'object') {
        return Object.entries(md.traits).map(([k, v]) => ({ k, v }));
    }
    if (Array.isArray(md.properties)) {
        return md.properties
            .map(p => ({ k: p?.key ?? p?.name, v: p?.value }))
            .filter(t => t.k != null && t.v != null);
    }
    if (md.properties && typeof md.properties === 'object') {
        if (md.properties.attributes && typeof md.properties.attributes === 'object') {
            return Object.entries(md.properties.attributes).map(([k, v]) => ({ k, v }));
        }
        return Object.entries(md.properties).map(([k, v]) => ({ k, v }));
    }
    return [];
}
