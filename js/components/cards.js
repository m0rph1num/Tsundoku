// Создание и рендеринг карточек аниме
import { escapeHTML } from "../core/utils.js";

export function createLibraryAnimeCard(animeData) {
  const title = escapeHTML(animeData.title);
  // Используем кастомный постер если есть
  const poster = escapeHTML(
    animeData.customPosterUrl ||
      animeData.poster ||
      "assets/placeholder-poster.png"
  );
  const kind = escapeHTML(animeData.kind || "unknown");
  const episodes = animeData.episodes || 0;
  const currentEpisode = animeData.currentEpisode || 0;

  let progressBar = "";
  if (animeData.status === "watching") {
    const progressPercent =
      episodes > 0 ? Math.min((currentEpisode / episodes) * 100, 100) : 0;
    progressBar = `
            <div class="watching-progress">
                <div class="progress-info">
                    <span class="progress-text">Просмотрено: ${currentEpisode}/${episodes}</span>
                    <span class="progress-percent">${Math.round(
                      progressPercent
                    )}%</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: ${progressPercent}%"></div>
                </div>
            </div>
        `;
  } else {
    let episodesInfo = "";
    if (episodes > 0) {
      episodesInfo = `<span class="anime-episodes">${episodes} эп.</span>`;
    }
    progressBar = `
            <div class="anime-meta">
                <span class="anime-type">${kind}</span>
                ${episodesInfo}
            </div>
        `;
  }

  return `
        <div class="anime-card library-card" data-id="${animeData.id}" data-status="${animeData.status}">
            <div class="poster-container">
                <img src="${poster}"
                     alt="${title}"
                     class="anime-poster"
                     loading="lazy"
                     onerror="this.src='assets/placeholder-poster.png'">
                <button class="edit-anime-btn" data-id="${animeData.id}" title="Изменить статус">
                    <i class="fas fa-pencil-alt"></i>
                </button>
            </div>
            <div class="anime-info">
                <div class="anime-title">${title}</div>
                ${progressBar}
            </div>
        </div>
    `;
}

export function attachCardEventListeners(container) {
  container.querySelectorAll(".anime-card").forEach((card) => {
    card.addEventListener("click", handleCardClick);
  });
}

export function handleCardClick(e) {
  // Эти функции будут доступны глобально из modals.js
  if (e.target.closest(".edit-anime-btn")) {
    const btn = e.target.closest(".edit-anime-btn");
    const animeId = btn.dataset.id;
    e.stopPropagation();
    e.preventDefault();
    if (window.showEditAnimeModal) {
      window.showEditAnimeModal(animeId);
    }
    return;
  }

  if (e.target.closest(".btn-details-card")) {
    const btn = e.target.closest(".btn-details-card");
    const animeId = btn.dataset.animeId;
    e.stopPropagation();
    e.preventDefault();
    if (window.showAnimeDetails) {
      window.showAnimeDetails(animeId);
    }
    return;
  }

  if (e.target.closest(".btn-add-card")) {
    const btn = e.target.closest(".btn-add-card");
    const animeId = btn.dataset.animeId;
    e.stopPropagation();
    e.preventDefault();
    if (window.addAnimeFromSearch) {
      window.addAnimeFromSearch(animeId);
    }
    return;
  }

  const animeId = e.currentTarget.dataset.id;
  if (animeId && window.showAnimeDetails) {
    window.showAnimeDetails(animeId);
  }
}

export function renderLibraryGrid(gridId, animeList) {
  const grid = document.getElementById(gridId);

  if (!grid) {
    return;
  }

  if (animeList.length === 0) {
    let emptyStateHTML = getEmptyStateHTML(gridId);
    grid.innerHTML = emptyStateHTML;
  } else {
    grid.innerHTML = animeList
      .map((anime) => createLibraryAnimeCard(anime))
      .join("");

    attachCardEventListeners(grid);
  }
}

function getEmptyStateHTML(gridId) {
  const emptyStates = {
    readyToWatchGrid: `
            <div class="empty-state">
                <i class="fas fa-check-circle fa-3x"></i>
                <h3>Нет готовых аниме</h3>
                <p>Здесь появятся аниме, когда все эпизоды выйдут</p>
            </div>
        `,
    waitingEpisodesGrid: `
            <div class="empty-state">
                <i class="fas fa-clock fa-3x"></i>
                <h3>Нет ожидающих аниме</h3>
                <p>Добавьте аниме в планы или отложите на потом</p>
            </div>
        `,
    plannedGrid: `
            <div class="empty-state">
                <i class="fas fa-calendar-plus fa-3x"></i>
                <h3>Планы пусты</h3>
                <p>Добавьте аниме в список планов</p>
            </div>
        `,
    default: `
            <div class="empty-state">
                <i class="fas fa-film fa-3x"></i>
                <h3>Нет аниме</h3>
                <p>Добавьте аниме в библиотеку</p>
            </div>
        `,
  };

  return emptyStates[gridId] || emptyStates.default;
}

export function getReadyToWatchAnime() {
  return Object.values(window.library).filter((anime) => {
    // === 1. ТОЛЬКО АНИМЕ СО СТАТУСОМ "planned" ===
    if (anime.status !== "planned") {
      return false;
    }

    // === 2. ПРОВЕРКА ЭПИЗОДОВ: ВСЕ ДОЛЖНЫ ВЫЙТИ ===
    const episodes = anime.episodes || 0;
    const episodesAired = anime.episodesAired || 0;

    if (episodes === 0) {
      return false;
    }

    // Если не все эпизоды вышли
    if (episodesAired < episodes) {
      return false;
    }

    // === 3. ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА ===
    const wasInWaitingSection =
      anime.shikimoriStatus === "released" ||
      (anime.history && anime.history.some((h) => h.reason === "ongoing")) ||
      (anime.episodesAired && anime.episodesAired > 0);

    if (!wasInWaitingSection) {
      const addedDate = new Date(anime.addedAt || anime.updatedAt);
      const now = new Date();
      const daysSinceAdded = (now - addedDate) / (1000 * 60 * 60 * 24);

      if (daysSinceAdded > 30) {
        return false;
      }
    }

    // === 4. ФИНАЛЬНАЯ ПРОВЕРКА ===
    const allEpisodesAired = episodes > 0 && episodesAired >= episodes;

    if (allEpisodesAired) {
      return true;
    }

    return false;
  });
}

export function getWaitingEpisodesAnime() {
  const now = new Date();
  const oneMonthFromNow = new Date(now);
  oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

  const result = Object.values(window.library).filter((anime) => {
    // ТОЛЬКО АНИМЕ СО СТАТУСОМ "planned"
    if (anime.status !== "planned") {
      return false;
    }

    const episodes = anime.episodes || 0;
    const episodesAired = anime.episodesAired || 0;
    const shikimoriStatus = anime.shikimoriStatus || "";

    // === 2. ЕСЛИ ВСЕ ЭПИЗОДЫ УЖЕ ВЫШЛИ - ИСКЛЮЧАЕМ ===
    if (episodes > 0 && episodesAired >= episodes) {
      return false;
    }

    // === 3. ЕСЛИ АНИМЕ УЖЕ ЗАВЕРШЕНО НА SHIKIMORI - ИСКЛЮЧАЕМ ===
    const completedStatuses = ["released", "finished_airing"];
    if (completedStatuses.includes(shikimoriStatus)) {
      return false;
    }

    // === 4. ПРОВЕРКА ПО СТАТУСУ НА SHIKIMORИ ===
    const ongoingStatuses = ["ongoing", "currently_airing"];
    if (ongoingStatuses.includes(shikimoriStatus)) {
      return true;
    }

    // === 5. ПРОВЕРКА ДАТЫ СЛЕДУЮЩЕГО ЭПИЗОДА ===
    if (anime.nextEpisodeAt) {
      try {
        const nextEpisodeDate = new Date(anime.nextEpisodeAt);
        if (nextEpisodeDate > now) {
          const timeDiff = nextEpisodeDate.getTime() - now.getTime();
          const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

          if (daysDiff <= 30) {
            return true;
          }
        }
      } catch (error) {}
    }

    // === 6. ПРОВЕРКА: ЕСЛИ ЧАСТЬ ЭПИЗОДОВ ВЫШЛА, НО НЕ ВСЕ ===
    if (episodes > 0 && episodesAired > 0 && episodesAired < episodes) {
      return true;
    }

    // === 7. ЕСЛИ НЕТ ИНФОРМАЦИИ, НО АНИМЕ НОВОЕ (анонсировано) ===
    if (anime.airedOn) {
      try {
        const airedDate = new Date(anime.airedOn);
        if (airedDate > now) {
          const timeDiff = airedDate.getTime() - now.getTime();
          const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

          if (daysDiff <= 90) {
            return true;
          }
        }
      } catch (error) {}
    }

    return false;
  });

  return result;
}
