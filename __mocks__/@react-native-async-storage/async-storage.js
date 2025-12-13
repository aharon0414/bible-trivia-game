const store = {};

export default {
  getItem: jest.fn((key) => Promise.resolve(store[key] || null)),
  setItem: jest.fn((key, value) => Promise.resolve(store[key] = value)),
  removeItem: jest.fn((key) => Promise.resolve(delete store[key])),
  clear: jest.fn(() => Promise.resolve(store = {})),
};

