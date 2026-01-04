// ui/gallery-ui.js
import { fetchInscriptionMeta } from '../logic/gallery-data.js';

export const VIEWER_PAGE_SIZE = 16;

export async function renderGalleryPage(pageIndex) {
    const grid = document.getElementById('gallery-grid');
    const status = document.getElementById('gallery-status');
    const pageInput = document.getElementById('gallery-page-input');
    
    if (!grid) return;
    
    grid.innerHTML = '<div style="grid-column:1/-1; color:#888;">Loading...</div>';
    if (pageInput) pageInput.value = pageIndex;

    const startId = pageIndex * VIEWER_PAGE_SIZE;
    const endId = startId + VIEWER_PAGE_SIZE - 1;
    if (status) status.innerText = `Showing IDs ${startId}–${endId}`;

    // Create placeholders
    let html = '';
    for (let i = 0; i < VIEWER_PAGE_SIZE; i++) {
        html += `<div id="gallery-card-${startId + i}" class="gallery-card"><div class="id">#${startId + i}</div><div class="muted">Loading...</div></div>`;
    }
    grid.innerHTML = html;

    // Fetch in parallel
    const promises = [];
    for (let i = 0; i < VIEWER_PAGE_SIZE; i++) {
        const id = startId + i;
        promises.push(fetchInscriptionMeta(id).then(meta => ({ id, meta })));
    }

    const results = await Promise.all(promises);
    
    // Render results
    results.forEach(({ id, meta }) => {
        const card = document.getElementById(`gallery-card-${id}`);
        if (!card) return;
        
        if (!meta || !meta.owner) {
            card.innerHTML = `<div class="id">#${id}</div><div class="missing">Not found / Empty</div>`;
            return;
        }
        
        const shortOwner = meta.owner ? (meta.owner.slice(0, 6) + '…' + meta.owner.slice(-4)) : '???';
        card.innerHTML = `
            <div class="id">#${id}</div>
            <div style="font-weight:600; color:#333; margin:4px 0;">${meta.mimeType}</div>
            <div class="muted">Size: ${meta.totalSize}</div>
            <div class="muted">Owner: ${shortOwner}</div>
            <div class="muted">${meta.sealed ? 'Sealed' : 'Draft'}</div>
        `;
        
        // Add click handler to load this inscription
        card.onclick = () => {
            document.querySelectorAll('.gallery-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            
            const input = document.getElementById('manifest-id-input');
            if (input) input.value = id;
            
            // Trigger the global showPage if available, or just the view logic
            // We assume main.js exposes the logic to "load and view" via button click or function
            // Simulating button click is the easiest way to decouple without complex event bus
            const btn = document.getElementById('btn-play-single');
            if (btn) btn.click();
        };
    });
}
