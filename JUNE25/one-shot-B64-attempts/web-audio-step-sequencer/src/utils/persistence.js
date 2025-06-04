import { bus } from "./bus.js";

export function serialize(project) {
  return JSON.stringify({ version: 1, project });
}

export function deserialize(json) {
  return JSON.parse(json).project;
}

export function setupAutosave(store) {
  let timeout;
  store.observe("project", (proj) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      localStorage.setItem("autosave", serialize(proj));
      bus.emit("autosaved");
    }, 10000);
  });
}
