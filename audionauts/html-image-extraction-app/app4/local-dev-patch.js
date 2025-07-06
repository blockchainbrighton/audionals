// LOCAL DEV PATCH: Rewrites /content/ to https://ordinals.com/content/
window.LOCAL_DEV_PATCH_ACTIVE = true;
const ORD_DOMAIN = 'https://ordinals.com';
// Patch fetch
const origFetch = window.fetch;
window.fetch = function(url, ...args) {
  if (typeof url === 'string' && url.startsWith('/content/'))
    url = ORD_DOMAIN + url;
  return origFetch.call(this, url, ...args);
};
// Patch XHR
const origOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url, ...rest) {
  if (typeof url === 'string' && url.startsWith('/content/'))
    url = ORD_DOMAIN + url;
  return origOpen.call(this, method, url, ...rest);
};
// Patch src/href on images, scripts, links
['src','href'].forEach(attr => {
  ['HTMLImageElement','HTMLAudioElement','HTMLVideoElement','HTMLScriptElement','HTMLLinkElement'].forEach(ctor => {
    if (window[ctor]) {
      const proto = window[ctor].prototype, desc = Object.getOwnPropertyDescriptor(proto, attr);
      if (desc && desc.set) Object.defineProperty(proto, attr, {
        set(val) {
          if (typeof val === 'string' && val.startsWith('/content/'))
            val = ORD_DOMAIN + val;
          desc.set.call(this, val);
        }
      });
    }
  });
});
console.log('[LOCAL DEV PATCH] /content/ references rewritten for local dev.');
