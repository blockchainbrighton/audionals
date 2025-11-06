if (!globalThis.crypto) {
  globalThis.crypto = {
    getRandomValues(array) {
      return array.fill(0);
    }
  };
}
