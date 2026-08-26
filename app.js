// In-memory only — resets on reload. Persistence arrives in a later stage.
let items = [];
let nextId = 1;

const form = document.getElementById("add-form");
const input = document.getElementById("new-item");
const list = document.getElementById("list");
const empty = document.getElementById("empty");
const status = document.getElementById("status");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  items.unshift({ id: nextId++, text, done: false });
  input.value = "";
  render();
});

list.addEventListener("click", (e) => {
  const li = e.target.closest("li");
  if (!li) return;
  const id = Number(li.dataset.id);

  if (e.target.matches("input[type='checkbox']")) {
    const item = items.find((i) => i.id === id);
    if (item) item.done = e.target.checked;
    render();
  }

  if (e.target.matches("button.remove")) {
    items = items.filter((i) => i.id !== id);
    render();
  }
});

function render() {
  list.innerHTML = "";
  for (const item of items) {
    const li = document.createElement("li");
    li.dataset.id = item.id;
    if (item.done) li.classList.add("done");
    li.innerHTML = `
      <input type="checkbox" ${item.done ? "checked" : ""} aria-label="Mark done">
      <span></span>
      <button class="remove" type="button" aria-label="Remove">✕</button>
    `;
    li.querySelector("span").textContent = item.text;
    list.appendChild(li);
  }
  empty.classList.toggle("hidden", items.length > 0);
}

render();

// Service worker registration — enables installability + offline shell.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .then(() => {
        status.textContent = "Ready to install";
      })
      .catch((err) => {
        console.error("Service worker registration failed:", err);
        status.textContent = "Offline support unavailable";
      });
  });
}
