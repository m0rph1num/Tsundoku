// Константы и хелперы для всего приложения

export const STATUS_LABELS = {
  planned: { text: "В планах", class: "status-planned" },
  watching: { text: "Смотрю", class: "status-watching" },
  completed: { text: "Просмотрено", class: "status-completed" },
  postponed: { text: "Отложено", class: "status-dropped" },
};

export const ANNOUNCEMENT_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 дней
export const ANNOUNCEMENT_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 1 день
export const ANNOUNCEMENT_DEBOUNCE_DELAY = 2000; // 2 секунды
export const CACHE_TTL = 5 * 60 * 1000; // 5 минут
export const API_REQUEST_DELAY = 1500;
export const RESULTS_PER_PAGE = 20;

export function getStatusTextFromStatus(status) {
  const statusMap = {
    planned: "В планах",
    watching: "Смотрю",
    completed: "Просмотрено",
    postponed: "Отложено",
  };
  return statusMap[status] || status;
}

export function getTabSectionInfo(tabStatus) {
  const infoMap = {
    planned: {
      title: "Аниме в планах",
      description:
        "Здесь собраны все аниме, которые вы планируете посмотреть. Добавляйте сюда новые тайтлы и следите за их выходом.",
    },
    watching: {
      title: "Смотрю сейчас",
      description:
        "Аниме, которые вы смотрите в данный момент. Отслеживайте прогресс и не пропускайте новые эпизоды.",
    },
    completed: {
      title: "Просмотренные аниме",
      description:
        "Здесь находятся все аниме, которые вы уже посмотрели. Включая завершенные сериалы и фильмы.",
    },
    postponed: {
      title: "Отложенные аниме",
      description:
        "Аниме, которые вы временно отложили. Вернитесь к ним, когда будет время или настроение.",
    },
  };

  return infoMap[tabStatus] || { title: "Аниме", description: "" };
}

export function getSectionId(tabStatus) {
  const sectionMap = {
    planned: "plannedSection",
    watching: "watchingSection",
    completed: "completedSection",
    postponed: "postponedSection",
    all: "",
  };
  return sectionMap[tabStatus] || "readyToWatchSection";
}

// Функции для обновления заголовков секций
export function updateTabSectionHeader(tabStatus, count) {
  const sectionHeader = document.querySelector(
    `#${getSectionId(tabStatus)} .section-header`
  );
  if (!sectionHeader) return;

  const titleElement = sectionHeader.querySelector("h2");
  const descriptionElement = sectionHeader.querySelector(
    ".section-description"
  );

  if (!titleElement) return;

  const { title, description } = getTabSectionInfo(tabStatus);
  titleElement.textContent = title;

  if (descriptionElement) {
    descriptionElement.textContent = description;
  } else {
    const descEl = document.createElement("p");
    descEl.className = "section-description";
    descEl.textContent = description;
    titleElement.parentNode.insertBefore(descEl, titleElement.nextSibling);
  }

  const counter = sectionHeader.querySelector(".section-count");
  if (counter) {
    counter.textContent = `(${count})`;
  }
}

// Глобальные экспорты
window.getStatusTextFromStatus = getStatusTextFromStatus;
window.getTabSectionInfo = getTabSectionInfo;
window.getSectionId = getSectionId;
window.updateTabSectionHeader = updateTabSectionHeader;
