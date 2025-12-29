// Поиск с debounce и авто-поиском
import { escapeHTML } from "../core/utils.js";
import { showNotification } from "./notifications.js";
import { updateUI } from "./ui.js";
import { RESULTS_PER_PAGE } from "../constants.js";

let searchTimeout = null;
let currentSearchQuery = "";
let currentPage = 1;
let searchResults = [];
let totalResults = 0;
let searchInitialized = false;

export function initSearchModule() {
  if (searchInitialized) {
    return;
  }

  initSearch();
  initSorting();

  searchInitialized = true;
}

function initSearch() {
  const searchInput = document.getElementById("searchInput");

  if (!searchInput) {
    return;
  }

  searchInput.removeEventListener("input", handleSearchInput);
  searchInput.removeEventListener("keypress", handleSearchKeypress);

  searchInput.addEventListener("input", handleSearchInput);
  searchInput.addEventListener("keypress", handleSearchKeypress);
}

function handleSearchInput() {
  if (searchTimeout) clearTimeout(searchTimeout);

  searchTimeout = setTimeout(() => {
    const query = this.value.trim();
    if (query.length >= 2 && query !== currentSearchQuery) {
      performSearch(query);
    } else if (query.length === 0) {
      closeSearchResults();
    }
  }, 500);
}

function handleSearchKeypress(e) {
  if (e.key === "Enter") {
    const query = this.value.trim();
    if (query.length >= 2) {
      performSearch(query);
    }
  }
}

export async function performSearch(query = "", page = 1) {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;

  const searchQuery = query || searchInput.value.trim();

  if (!searchQuery || searchQuery.length < 2) {
    showNotification("Введите минимум 2 символа для поиска", "warning");
    return;
  }

  showSearchResultsSection();

  currentSearchQuery = searchQuery;
  currentPage = page;

  showSkeletonLoader();

  try {
    const results = await window.ShikimoriAPI.searchAnime(searchQuery, 50);

    searchResults = results || [];
    totalResults = results.length || 0;

    updateSearchStats();
    displaySearchResults(results, page);

    if (results.length > RESULTS_PER_PAGE) {
      showPagination(Math.ceil(results.length / RESULTS_PER_PAGE), page);
    } else {
      hidePagination();
    }

    if (results.length === 0 && searchQuery) {
      const message = `По запросу "${searchQuery}" ничего не найдено. Попробуйте использовать английское название или уточнить запрос.`;
      showNotification(message, "warning");
    }
  } catch (error) {
    showSearchError(error.message);
  }
}

function showSearchResultsSection() {
  const sections = [
    "readyToWatchSection",
    "waitingEpisodesSection",
    "announcementsSection",
    "plannedSection",
    "watchingSection",
    "completedSection",
    "postponedSection",
  ];

  sections.forEach((sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.style.display = "none";
    }
  });

  const searchSection = document.getElementById("searchResultsSection");
  if (searchSection) {
    // Закрываем все модальные окна перед показом результатов поиска
    if (window.closeAllModals) {
      window.closeAllModals();
    }

    searchSection.classList.remove("hidden");
    searchSection.style.display = "block";

    setTimeout(() => {
      searchSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }
}

function displaySearchResults(results, page = 1) {
  const searchGrid = document.getElementById("searchResultsGrid");
  if (!searchGrid) {
    return;
  }

  if (!results || results.length === 0) {
    searchGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search fa-2x"></i>
                <h3>Ничего не найдено</h3>
                <p>Попробуйте уточнить запрос или использовать английское название</p>
            </div>
        `;
    return;
  }

  const startIndex = (page - 1) * RESULTS_PER_PAGE;
  const endIndex = startIndex + RESULTS_PER_PAGE;
  const pageResults = results.slice(startIndex, endIndex);

  searchGrid.innerHTML = pageResults
    .map((anime) => createSearchResultCard(anime))
    .join("");

  // ВАЖНО: Добавляем обработчики событий для новых карточек
  attachSearchCardListeners(searchGrid);
}

function attachSearchCardListeners(container) {
  container
    .querySelectorAll(".anime-card.search-result-card")
    .forEach((card) => {
      // Удаляем старые обработчики, если есть
      card.removeEventListener("click", handleSearchCardClick);

      // Добавляем новый обработчик
      card.addEventListener("click", handleSearchCardClick);
    });
}

function handleSearchCardClick(e) {
  // Проверяем, кликнули ли на кнопку "Добавить"
  if (e.target.closest(".btn-add-card")) {
    const btn = e.target.closest(".btn-add-card");
    const animeId = btn.dataset.animeId;
    e.stopPropagation();
    e.preventDefault();

    if (window.addAnimeFromSearch) {
      window.addAnimeFromSearch(animeId);
    } else {
    }
    return;
  }

  // Проверяем, кликнули ли на кнопку "Подробнее"
  if (e.target.closest(".btn-details-card")) {
    const btn = e.target.closest(".btn-details-card");
    const animeId = btn.dataset.animeId;
    e.stopPropagation();
    e.preventDefault();

    if (window.showAnimeDetails) {
      window.showAnimeDetails(animeId);
    } else {
    }
    return;
  }

  // Клик на саму карточку (не на кнопку)
  const animeId = e.currentTarget.dataset.id;
  if (animeId) {
    if (window.showAnimeDetails) {
      window.showAnimeDetails(animeId);
    }
  }
}

export function createSearchResultCard(anime) {
  const rating = anime.score ? Math.round(anime.score * 10) / 10 : "N/A";
  const year = anime.aired_on ? anime.aired_on.split("-")[0] : "?";
  const title = escapeHTML(anime.russian || anime.name);
  const kind = escapeHTML(anime.kind || "ТВ");
  const episodes = anime.episodes || "?";
  const imageUrl = anime.image?.preview
    ? `https://shikimori.one${anime.image.preview}`
    : "assets/placeholder-poster.jpg";

  // Проверяем, есть ли аниме в библиотеке
  const inLibrary = window.library && window.library[anime.id];
  const status = inLibrary ? inLibrary.status : null;
  const statusText = getStatusText(status);

  return `
    <div class="anime-card search-result-card" data-id="${anime.id}">
      <div class="poster-container">
        <img src="${imageUrl}" 
             alt="${title}" 
             class="anime-poster"
             loading="lazy"
             onerror="this.src='assets/placeholder-poster.jpg'">
        ${
          inLibrary
            ? `
          <div class="in-library-badge" data-status="${status}">
            <i class="fas ${getStatusIcon(status)}"></i> ${statusText}
          </div>
        `
            : ""
        }
        <div class="card-overlay">
          ${
            !inLibrary
              ? `
            <button class="btn-card-action btn-add-card" data-action="add" data-anime-id="${anime.id}">
              <i class="fas fa-plus"></i> Добавить
            </button>
          `
              : `
            <button class="btn-card-action btn-already-added" disabled>
              <i class="fas fa-check"></i> Уже в библиотеке
            </button>
          `
          }
          <button class="btn-card-action btn-details-card" data-action="details" data-anime-id="${
            anime.id
          }">
            <i class="fas fa-info-circle"></i> Подробнее
          </button>
        </div>
      </div>
      <div class="anime-info">
        <div class="anime-title">${title}</div>
        <div class="anime-meta">
          <div class="anime-type">${kind}</div>
          <div class="anime-episodes">${episodes}/${episodes}</div>
        </div>
      </div>
    </div>
  `;
}

// Вспомогательные функции
function getStatusText(status) {
  const statusMap = {
    planned: "В планах",
    watching: "Смотрю",
    completed: "Просмотрено",
    postponed: "Отложено",
  };
  return statusMap[status] || "В библиотеке";
}

function getStatusIcon(status) {
  const iconMap = {
    planned: "fa-calendar-plus",
    watching: "fa-play-circle",
    completed: "fa-check-circle",
    postponed: "fa-pause-circle",
  };
  return iconMap[status] || "fa-bookmark";
}

function showSkeletonLoader() {
  const searchGrid = document.getElementById("searchResultsGrid");
  if (!searchGrid) return;

  const skeletonCount = 8;
  searchGrid.innerHTML = Array(skeletonCount)
    .fill(0)
    .map(() => `<div class="skeleton-card"></div>`)
    .join("");
}

function showSearchError(message) {
  const searchGrid = document.getElementById("searchResultsGrid");
  if (!searchGrid) return;

  const errorMessage = escapeHTML(message || "Не удалось выполнить поиск");

  searchGrid.innerHTML = `
        <div class="search-error">
            <i class="fas fa-exclamation-triangle fa-2x"></i>
            <h3>Ошибка поиска</h3>
            <p>${errorMessage}</p>
            <button onclick="performSearch('${currentSearchQuery}')" class="btn-retry">
                <i class="fas fa-redo"></i> Попробовать снова
            </button>
        </div>
    `;
}

function showPagination(totalPages, currentPage) {
  const pagination = document.getElementById("searchPagination");
  if (!pagination || totalPages <= 1) {
    hidePagination();
    return;
  }

  pagination.classList.remove("hidden");

  pagination.innerHTML = `
        <div class="pagination-container">
            <button class="btn-pagination prev" ${
              currentPage === 1 ? "disabled" : ""
            }>
                <i class="fas fa-chevron-left"></i> Назад
            </button>
            <div class="page-numbers"></div>
            <button class="btn-pagination next" ${
              currentPage === totalPages ? "disabled" : ""
            }>
                Далее <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;

  const prevBtn = pagination.querySelector(".prev");
  const nextBtn = pagination.querySelector(".next");
  const pageNumbers = pagination.querySelector(".page-numbers");

  if (!pageNumbers) return;

  if (prevBtn) {
    prevBtn.onclick = () => {
      if (currentPage > 1) performSearch(currentSearchQuery, currentPage - 1);
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      if (currentPage < totalPages)
        performSearch(currentSearchQuery, currentPage + 1);
    };
  }

  let pagesHtml = "";
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  if (startPage > 1) {
    pagesHtml += `<div class="page-number" onclick="performSearch('${currentSearchQuery}', 1)">1</div>`;
    if (startPage > 2) pagesHtml += `<div class="page-dots">...</div>`;
  }

  for (let i = startPage; i <= endPage; i++) {
    pagesHtml += `
            <div class="page-number ${i === currentPage ? "active" : ""}" 
                 onclick="performSearch('${currentSearchQuery}', ${i})">
                ${i}
            </div>
        `;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1)
      pagesHtml += `<div class="page-dots">...</div>`;
    pagesHtml += `
            <div class="page-number" onclick="performSearch('${currentSearchQuery}', ${totalPages})">
                ${totalPages}
            </div>
        `;
  }

  pageNumbers.innerHTML = pagesHtml;
}

function hidePagination() {
  const pagination = document.getElementById("searchPagination");
  if (pagination) {
    pagination.classList.add("hidden");
  }
}

function initSorting() {
  const sortSelect = document.getElementById("searchSort");
  if (!sortSelect) {
    return;
  }

  sortSelect.removeEventListener("change", handleSortChange);
  sortSelect.removeEventListener("focus", handleSelectFocus);
  sortSelect.removeEventListener("blur", handleSelectBlur);

  sortSelect.addEventListener("change", handleSortChange);
  sortSelect.addEventListener("focus", handleSelectFocus);
  sortSelect.addEventListener("blur", handleSelectBlur);

  sortSelect.addEventListener("change", function () {
    this.classList.add("changed");
    setTimeout(() => {
      this.classList.remove("changed");
    }, 300);
  });
}

function handleSelectFocus(e) {
  const select = e.target;
  const customSelect = select.closest(".custom-select");
  if (customSelect) {
    customSelect.style.zIndex = "10";
  }
}

function handleSelectBlur(e) {
  const select = e.target;
  const customSelect = select.closest(".custom-select");
  if (customSelect) {
    customSelect.style.zIndex = "1";
  }
}

function handleSortChange(e) {
  sortSearchResults(e.target.value);
}

function sortSearchResults(sortBy) {
  if (!searchResults.length) return;

  let sortedResults = [...searchResults];

  switch (sortBy) {
    case "relevance":
      if (currentSearchQuery) {
        sortedResults.sort((a, b) => {
          const relevanceA = calculateRelevance(a, currentSearchQuery);
          const relevanceB = calculateRelevance(b, currentSearchQuery);
          return relevanceB - relevanceA;
        });
      }
      break;

    case "popularity":
      sortedResults.sort((a, b) => {
        const rankA = a.rank || 999999;
        const rankB = b.rank || 999999;
        return rankA - rankB;
      });
      break;

    case "name":
      sortedResults.sort((a, b) => {
        const nameA = (a.russian || a.name || "").toLowerCase();
        const nameB = (b.russian || b.name || "").toLowerCase();
        return nameA.localeCompare(nameB, "ru");
      });
      break;

    case "aired_on":
      sortedResults.sort((a, b) => {
        const dateA = a.aired_on || "9999-99-99";
        const dateB = b.aired_on || "9999-99-99";
        return dateB.localeCompare(dateA);
      });
      break;

    default:
      break;
  }

  searchResults = sortedResults;
  displaySearchResults(sortedResults, currentPage);
}

function calculateRelevance(anime, query) {
  const queryLower = query.toLowerCase();
  const title = (anime.russian || anime.name || "").toLowerCase();
  const score = anime.score || 0;
  const rank = anime.rank || 999999;

  let relevance = 0;

  if (title === queryLower) {
    relevance += 1000;
  }

  if (title.startsWith(queryLower)) {
    relevance += 500;
  }

  if (title.includes(queryLower)) {
    relevance += 300;
  }

  if (rank < 1000) relevance += 200;
  else if (rank < 5000) relevance += 100;
  else if (rank < 10000) relevance += 50;

  if (score > 8) relevance += 150;
  else if (score > 7) relevance += 100;
  else if (score > 6) relevance += 50;

  if (anime.aired_on && anime.aired_on > "2020-01-01") {
    relevance += 30;
  }

  return relevance;
}

function updateSearchStats() {
  const stats = document.getElementById("searchStats");
  if (stats) {
    stats.textContent = `Найдено ${totalResults} результатов по запросу "${currentSearchQuery}"`;
  }
}

export function closeSearchResults() {
  const searchSection = document.getElementById("searchResultsSection");
  const searchInput = document.getElementById("searchInput");

  if (searchSection) {
    searchSection.classList.add("hidden");
  }

  if (searchInput) {
    searchInput.value = "";
  }

  updateUI();
}

// Глобальные экспорты
window.performSearch = performSearch;
window.initSearchModule = initSearchModule;
window.closeSearchResults = closeSearchResults;
window.createSearchResultCard = createSearchResultCard;
