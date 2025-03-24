// LocalStorage polyfill for environments where it might not be available
const createLocalStoragePolyfill = () => {
  const storage = {};

  return {
    getItem: (key) => {
      return storage[key] || null;
    },
    setItem: (key, value) => {
      storage[key] = value;
    },
    removeItem: (key) => {
      delete storage[key];
    },
    clear: () => {
      Object.keys(storage).forEach(key => {
        delete storage[key];
      });
    }
  };
};

// Use actual localStorage if available, otherwise use polyfill
const localStoragePolyfill = (() => {
  try {
    // Test if localStorage is available
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      return localStorage;
    }
    return createLocalStoragePolyfill();
  } catch (e) {
    console.warn('localStorage not available, using polyfill instead');
    return createLocalStoragePolyfill();
  }
})();

export default localStoragePolyfill; 