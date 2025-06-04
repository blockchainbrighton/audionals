
export const Utils = {
  clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  },
  downloadJSON(obj, filename='audional-project.json') {
    const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display='none';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  },
  readFileAsText(file) {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result);
      reader.onerror = rej;
      reader.readAsText(file);
    });
  }
};
