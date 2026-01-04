export function installNavigation({ journeyLog, onShow = {} } = {}) {
  window.showPage = (page) => {
    journeyLog?.(`Switching to page: ${page}`);
    document.querySelectorAll('[id^="page-"]').forEach((el) => el.classList.add('hidden'));
    document.getElementById(`page-${page}`)?.classList.remove('hidden');

    if (typeof onShow[page] === 'function') onShow[page]();
  };
}

