// /scripts/core/dom.js
// Универсальные хелперы для работы с DOM — создают, ищут и управляют элементами

/** Быстрый querySelector */
export const qs = (sel, parent = document) => parent.querySelector(sel);

/** Быстрый querySelectorAll (возвращает массив) */
export const qsa = (sel, parent = document) => [...parent.querySelectorAll(sel)];

/** Создание элемента */
export function el(tag, props = {}, children = []) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") element.className = value;
    else if (key === "text") element.textContent = value;
    else if (key === "html") element.innerHTML = value;
    else if (key.startsWith("on") && typeof value === "function") {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      element.setAttribute(key, value);
    }
  }
  if (!Array.isArray(children)) children = [children];
  for (const child of children) {
    if (child instanceof Node) element.appendChild(child);
    else if (child != null) element.append(String(child));
  }
  return element;
}

/** Очистить элемент */
export const clear = (node) => {
  if (node) node.innerHTML = "";
};

/** Удалить элемент */
export const remove = (node) => {
  if (node?.parentNode) node.parentNode.removeChild(node);
};

/** Показать или скрыть элемент */
export const toggle = (node, show = true) => {
  if (!node) return;
  node.style.display = show ? "" : "none";
};

/** Добавить класс */
export const addClass = (node, cls) => node?.classList.add(cls);

/** Удалить класс */
export const removeClass = (node, cls) => node?.classList.remove(cls);

/** Проверить, содержит ли элемент класс */
export const hasClass = (node, cls) => node?.classList.contains(cls);
