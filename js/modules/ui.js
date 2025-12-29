// Обновление интерфейса

import { getSectionId, updateTabSectionHeader } from "../constants.js";
import { updateCounters } from "./counters.js";
import {
  getReadyToWatchAnime,
  getWaitingEpisodesAnime,
  renderLibraryGrid,
} from "../components/cards.js";

export function updateUI() {
  // Проверяем, открыт ли профиль
  const profileSection = document.getElementById("profileSection");
  const isProfileOpen =
    profileSection && !profileSection.classList.contains("hidden");

  if (isProfileOpen) {
    return; // Не обновляем навигацию когда открыт профиль
  }

  updateSectionVisibility();
  renderAnimeCards();
  updateCounters();
}

export function updateSectionVisibility(activeTab = "all") {
  const allSections = [
    "readyToWatchSection",
    "waitingEpisodesSection",
    "announcementsSection",
    "plannedSection",
    "watchingSection",
    "completedSection",
    "postponedSection",
    "searchResultsSection",
    "profileSection", // Добавляем профиль
  ];

  // Сначала скрыть все
  allSections.forEach((id) => {
    const section = document.getElementById(id);
    if (section) {
      // Используем hidden для секций, которые должны быть скрыты полностью
      if (id === "profileSection") {
        // Профиль управляется отдельно
      } else {
        section.style.display = "none";
        section.classList.add("hidden");
      }
    }
  });

  // Показать нужные
  if (activeTab === "all") {
    [
      "readyToWatchSection",
      "waitingEpisodesSection",
      "announcementsSection",
    ].forEach((id) => {
      const section = document.getElementById(id);
      if (section) {
        section.style.display = "block";
        section.classList.remove("hidden");
      }
    });
  } else if (activeTab === "search") {
    const searchSection = document.getElementById("searchResultsSection");
    if (searchSection) {
      // Скрываем все секции перед показом результатов поиска
      allSections.forEach((id) => {
        const section = document.getElementById(id);
        if (
          section &&
          id !== "searchResultsSection" &&
          id !== "profileSection"
        ) {
          section.style.display = "none";
          section.classList.add("hidden");
        }
      });

      searchSection.style.display = "block";
      searchSection.classList.remove("hidden");
    }
  } else {
    const activeSection = document.getElementById(`${activeTab}Section`);
    if (activeSection) {
      // Скрываем все секции перед показом активной
      allSections.forEach((id) => {
        const section = document.getElementById(id);
        if (
          section &&
          id !== `${activeTab}Section` &&
          id !== "profileSection"
        ) {
          section.style.display = "none";
          section.classList.add("hidden");
        }
      });

      activeSection.style.display = "block";
      activeSection.classList.remove("hidden");
    }
  }

  // Гарантируем, что профиль скрыт если мы не в профиле
  const profileSection = document.getElementById("profileSection");
  if (profileSection && activeTab !== "profile") {
    profileSection.style.display = "none";
    profileSection.classList.add("hidden");
  }
}

function renderAnimeCards() {
  let filteredAnime = [];

  if (window.currentFilter === "all") {
    filteredAnime = Object.values(window.library);
    renderMainPageSections();
  } else {
    filteredAnime = Object.values(window.library).filter(
      (anime) => anime.status === window.currentFilter
    );
    renderTabSection(window.currentFilter, filteredAnime);
  }

  updateCounters();
}

function renderTabSection(tabStatus, animeList) {
  updateSectionVisibility(tabStatus);
  updateTabSectionHeader(tabStatus, animeList.length);

  const sortedAnimeList = sortAnimeByDate(animeList, "added");
  const gridId = `${tabStatus}Grid`;

  // Убедимся, что сетка существует и очистим её
  const grid = document.getElementById(gridId);
  if (grid) {
    renderLibraryGrid(gridId, sortedAnimeList);
  } else {
    // Создадим сетку если её нет
    const section = document.getElementById(`${tabStatus}Section`);
    if (section) {
      const newGrid = document.createElement("div");
      newGrid.id = gridId;
      newGrid.className = "anime-grid";
      section.appendChild(newGrid);
      renderLibraryGrid(gridId, sortedAnimeList);
    }
  }
}

function sortAnimeByDate(animeList, sortBy = "added") {
  if (!Array.isArray(animeList) || animeList.length === 0) {
    return animeList || [];
  }

  return [...animeList].sort((a, b) => {
    const dateA =
      sortBy === "updated"
        ? new Date(a.updatedAt || a.addedAt || 0)
        : new Date(a.addedAt || 0);

    const dateB =
      sortBy === "updated"
        ? new Date(b.updatedAt || b.addedAt || 0)
        : new Date(b.addedAt || 0);

    return dateB - dateA;
  });
}

function renderMainPageSections() {
  const readyToWatch = getReadyToWatchAnime();
  const waitingEpisodes = getWaitingEpisodesAnime();

  const stats = {
    total: Object.keys(window.library).length,
    ready: readyToWatch.length,
    waiting: waitingEpisodes.length,
  };

  // Используем window.Logger если доступен, иначе console
  const Logger = window.Logger || console;

  // УДАЛИТЕ или ЗАМЕНИТЕ ЭТОТ БЛОК (строки 129-148):
  // Детальный дебаг только при DEBUG уровне
  if (Logger && Logger.LEVELS && Logger.LEVELS.DEBUG) {
    // ИЛИ просто всегда показываем краткую статистику:
    if (readyToWatch.length > 0) {
    }
    if (waitingEpisodes.length > 0) {
      waitingEpisodes.forEach((anime, index) => {
        const status = anime.shikimoriStatus || "нет данных";
      });
    }
    console.groupEnd();
  }

  updateMainSectionHeaders(readyToWatch.length, waitingEpisodes.length);
  updateSectionVisibility("all");

  renderLibraryGrid("readyToWatchGrid", readyToWatch);
  renderLibraryGrid("waitingEpisodesGrid", waitingEpisodes);

  if (window.renderAnnouncements) {
    window.renderAnnouncements();
  }
}

function updateMainSectionHeaders(readyCount, waitingCount) {
  const readySection = document.getElementById("readyToWatchSection");
  if (readySection) {
    const title = readySection.querySelector("h2");
    const description = readySection.querySelector(".section-description");

    if (title) {
      title.textContent = "Готово к просмотру";
    }

    if (description) {
      description.textContent =
        "Аниме, которые вы ждали и теперь все эпизоды вышли. Можно начинать смотреть!";
    }
  }

  const waitingSection = document.getElementById("waitingEpisodesSection");
  if (waitingSection) {
    const title = waitingSection.querySelector("h2");
    const description = waitingSection.querySelector(".section-description");

    if (title) {
      title.textContent = "Ожидают выхода серий";
    }

    if (description) {
      description.textContent =
        "Аниме, которые еще не завершились. Ждем выхода новых эпизодов.";
    }
  }
}

// Экспортируем глобально
window.updateUI = updateUI;
window.updateSectionVisibility = updateSectionVisibility;
