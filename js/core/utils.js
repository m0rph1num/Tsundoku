// Вспомогательные функции
export function escapeHTML(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function sanitizeHTML(html) {
  if (!html) return "";

  const div = document.createElement("div");
  div.innerHTML = html;

  const allowedTags = [
    "br",
    "strong",
    "em",
    "b",
    "i",
    "span",
    "div",
    "p",
    "h3",
    "h4",
  ];

  function cleanElement(element) {
    const children = Array.from(element.childNodes);

    children.forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (!allowedTags.includes(child.tagName.toLowerCase())) {
          const fragment = document.createDocumentFragment();
          Array.from(child.childNodes).forEach((grandChild) => {
            fragment.appendChild(grandChild.cloneNode(true));
          });
          element.replaceChild(fragment, child);
        } else {
          Array.from(child.attributes).forEach((attr) => {
            if (!["class", "style"].includes(attr.name.toLowerCase())) {
              child.removeAttribute(attr.name);
            }
          });
          cleanElement(child);
        }
      }
    });
  }

  cleanElement(div);
  return div.innerHTML;
}

export function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Форматирование даты для анонсов
export function formatAnnouncementDate(dateString) {
  if (!dateString) return "?";

  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) return "?";

    // Если указан только год (например, "2026")
    if (dateString.length === 4) {
      return dateString;
    }

    // Если указана полная дата
    const formatted = date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    return formatted.replace("г.", "").trim();
  } catch (error) {
    console.error("Ошибка форматирования даты:", dateString, error);
    return "?";
  }
}

export function normalizePosterUrl(url) {
  if (!url || url === "assets/placeholder-poster.png") {
    return "assets/placeholder-poster.png";
  }

  // Убираем параметры запроса
  url = url.split("?")[0];

  // Для Electron приложения - проверяем локальные пути
  if (window.location.protocol === "file:") {
    if (url.startsWith("C:/") || url.startsWith("file:///C:/")) {
      // Для Electron возвращаем как есть
      return url;
    }
  }

  // Если уже полный URL
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Если относительный путь Shikimori
  if (url.startsWith("/")) {
    return `https://shikimori.one${url}`;
  }

  // Если это просто имя файла (ID аниме)
  if (url.match(/^\d+\.(jpg|jpeg|png|webp)$/i)) {
    return `https://shikimori.one/system/animes/original/${url}`;
  }

  // Если это placeholder Shikimori
  if (
    url.includes("missing_original.jpg") ||
    url.includes("/assets/globals/")
  ) {
    return "assets/placeholder-poster.png";
  }

  if (window.location.protocol === "file:") {
    if (url.startsWith("C:/") || url.startsWith("file:///C:/")) {
      // Для Electron возвращаем как есть
      return url;
    }
    // Добавить для других дисков:
    if (url.match(/^[A-Za-z]:[\\/]/) || url.startsWith("file:///")) {
      return url;
    }
  }

  // По умолчанию возвращаем как есть (для локальных путей в Electron)
  return url;
}
