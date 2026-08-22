import '@testing-library/jest-dom'

// Node 26은 globalThis.localStorage를 미리 정의해 두는데, --localstorage-file 없이는 그 값이
// undefined다. vitest의 jsdom 환경은 이미 있는 전역 키를 건너뛰므로 jsdom이 제공하는
// localStorage가 가려지고, localStorage를 읽는 컴포넌트가 렌더 중에 터진다
// (sessionStorage는 Node가 정의하지 않아 영향이 없다).
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>()
  const localStorageStub: Storage = {
    get length() {
      return store.size
    },
    key: (index) => [...store.keys()][index] ?? null,
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, String(value)),
    removeItem: (key) => void store.delete(key),
    clear: () => store.clear(),
  }
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorageStub,
  })
}
