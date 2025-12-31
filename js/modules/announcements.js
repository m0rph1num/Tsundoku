// Работа с анонсами
import { escapeHTML } from "../core/utils.js";
import { showNotification } from "./notifications.js";
import { showStatusModal } from "./modals.js";
import {
  ANNOUNCEMENT_CACHE_TTL,
  ANNOUNCEMENT_CHECK_INTERVAL,
} from "../constants.js";
import { formatAnnouncementDate } from "../core/utils.js";
import { normalizePosterUrl } from "../core/utils.js";

function isFutureAnime(animeData) {
  if (!animeData) return false;

  const status = animeData.status || "";

  // Анонсировано - точно будущее
  if (status === "anons") return true;

  // Выходит сейчас
  if (status === "ongoing" || status === "currently_airing") return true;

  // Если завершено - проверяем дату
  if (
    animeData.status === "released" ||
    animeData.status === "finished_airing"
  ) {
    if (animeData.aired_on) {
      try {
        const airedDate = new Date(animeData.aired_on);
        const now = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        // Показываем если вышло в последний год
        return airedDate > oneYearAgo;
      } catch (error) {
        console.error("Ошибка проверки даты:", error);
        return false;
      }
    }
    // Если нет даты, но статус released - показываем
    return true;
  }

  // Если нет статуса - проверяем дату выхода
  if (animeData.aired_on) {
    try {
      const airedDate = new Date(animeData.aired_on);
      const now = new Date();
      return (
        airedDate > now ||
        airedDate > new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      );
    } catch (error) {
      return false;
    }
  }

  return false;
}

export function renderAnnouncements() {
  const grid = document.getElementById("announcementsGrid");
  if (!grid) return;

  // Устанавливаем класс как у сетки библиотеки
  grid.className = "announcements-grid";

  // Проверяем есть ли завершенные аниме в библиотеке
  const hasCompletedAnime =
    window.library &&
    Object.values(window.library).some((anime) => anime.status === "completed");

  // Если нет завершенных аниме - показываем сообщение
  if (!hasCompletedAnime) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-bell-slash fa-3x"></i>
        <h3>Нет завершенных аниме</h3>
        <p>Анонсы появятся после добавления завершенных аниме в библиотеку</p>
      </div>
    `;
    return;
  }

  const announcementEntries = Object.values(window.announcements);

  if (announcementEntries.length === 0) {
    grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell fa-3x"></i>
                <h3>Нет анонсов</h3>
                <p>Здесь будут отображаться анонсы новых сезонов</p>
            </div>
        `;
  } else {
    let allCardsHTML = "";
    let totalCards = 0;

    // Для каждой записи создаем карточки
    announcementEntries.forEach((entry) => {
      const cardsHTML = createAnnouncementCard(entry);
      allCardsHTML += cardsHTML;

      // Считаем количество карточек
      const futureAnnouncements = entry.announcements.filter((ann) =>
        isFutureAnime(ann.animeData)
      );
      totalCards += futureAnnouncements.length;
    });

    grid.innerHTML = allCardsHTML;

    // Добавляем обработчики событий для новых карточек
    attachAnnouncementCardListeners();
  }

  // Обновляем счетчик
  updateAnnouncementCount();
}

function attachAnnouncementCardListeners() {
  // Используем делегирование событий
  document.addEventListener("click", function (e) {
    // 1. Клик по кнопке редактирования постера - останавливаем всё
    const editBtn = e.target.closest(".edit-poster-btn");
    if (editBtn) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const animeId = editBtn.dataset.id;
      const animeTitle = editBtn.dataset.title || "Анонс";
      const currentPoster = editBtn.dataset.currentPoster;

      console.log("Клик по кнопке редактирования постера:", animeId);

      if (animeId && window.showAnnouncementPosterModal) {
        window.showAnnouncementPosterModal(animeId, animeTitle, currentPoster);
      }
      return;
    }

    // 2. Клик по кнопке "В планы" в оверлее
    const addBtn = e.target.closest(".btn-add-card");
    if (addBtn) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const animeId = addBtn.dataset.animeId;
      if (animeId && window.addAnnouncementToLibrary) {
        window.addAnnouncementToLibrary(parseInt(animeId));
      }
      return;
    }

    // 3. Клик по самой карточке анонса (но не по её содержимому)
    const card = e.target.closest(".announcement-card");
    if (
      card &&
      !e.target.closest(".edit-poster-btn") &&
      !e.target.closest(".btn-add-card") &&
      !e.target.closest(".card-overlay")
    ) {
      const animeId = card.dataset.id;
      if (animeId && window.showAnimeDetails) {
        console.log("Клик по карточке анонса, открываем детали:", animeId);
        window.showAnimeDetails(animeId);
      }
    }
  });
}

// Явный обработчик для кнопок редактирования
function setupEditPosterButtonListeners() {
  document.addEventListener(
    "click",
    function (e) {
      const editBtn = e.target.closest(".edit-poster-btn");
      if (editBtn) {
        e.preventDefault();
        e.stopPropagation();

        // Отменяем все другие возможные обработчики
        e.stopImmediatePropagation();

        const animeId = editBtn.dataset.id;
        const animeTitle = editBtn.dataset.title || "Анонс";
        const currentPoster = editBtn.dataset.currentPoster;

        if (animeId && window.showAnnouncementPosterModal) {
          window.showAnnouncementPosterModal(
            animeId,
            animeTitle,
            currentPoster
          );
        }
        return false; // Дополнительная отмена
      }
    },
    true
  ); // Используем capture phase для приоритета
}

function updateAnnouncementCount() {
  const countElement = document.querySelector(
    "#announcementsSection .section-count"
  );
  if (!countElement) return;

  let totalAnnouncements = 0;
  Object.values(window.announcements || {}).forEach((entry) => {
    const futureAnnouncements = entry.announcements.filter((ann) =>
      isFutureAnime(ann.animeData)
    );
    totalAnnouncements += futureAnnouncements.length;
  });

  countElement.textContent = `(${totalAnnouncements})`;
}

function createAnnouncementCard(entry) {
  const originalTitle = escapeHTML(entry.originalTitle);

  // Фильтруем только БУДУЩИЕ анонсы
  const futureAnnouncements = entry.announcements.filter((ann) =>
    isFutureAnime(ann.animeData)
  );

  if (futureAnnouncements.length === 0) {
    return "";
  }

  // Показываем отдельные карточки для каждого анонса
  return futureAnnouncements
    .map((ann) => createSingleAnnouncementCard(ann, originalTitle))
    .join("");
}

function createSingleAnnouncementCard(announcement, originalTitle) {
  const title = escapeHTML(announcement.title);
  const relation = escapeHTML(announcement.relation || "Связано");
  const animeData = announcement.animeData || {};

  // Получаем URL постера
  let posterUrl =
    announcement.customPosterUrl || "assets/placeholder-poster.png";

  if (!posterUrl || posterUrl === "assets/placeholder-poster.png") {
    if (animeData.image) {
      posterUrl =
        animeData.image.original ||
        animeData.image.preview ||
        animeData.image.x96 ||
        animeData.image.x48;
    } else if (animeData.poster) {
      posterUrl = animeData.poster;
    } else if (animeData.image_url) {
      posterUrl = animeData.image_url;
    }
  }

  // Нормализуем URL
  posterUrl = normalizePosterUrl(posterUrl);

  // Форматируем дату выхода
  function formatAiredDate(dateString) {
    if (!dateString) return "?";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "?";
      if (dateString.length === 4) return dateString;
      const formatted = date.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      return formatted.replace("г.", "").trim();
    } catch (error) {
      return "?";
    }
  }

  const kind = animeData.kind ? animeData.kind.toUpperCase() : "TV";
  const airedDate = formatAiredDate(
    animeData.aired_on || animeData.next_episode_at
  );

  return `
    <div class="anime-card announcement-card search-result-card" 
         data-id="${announcement.id}" 
         data-relation="${relation}"
         data-original-title="${escapeHTML(originalTitle)}">
      
      <!-- Контейнер постера -->
      <div class="poster-container anime-poster-wrapper">
        <img src="${posterUrl}"
             alt="${title}"
             class="anime-poster"
             loading="lazy"
             onerror="this.src='assets/placeholder-poster.png'">
        
        <!-- Кнопка редактирования с иконкой карандаша -->
        <button class="edit-poster-btn" 
                data-id="${announcement.id}"
                data-title="${escapeHTML(title)}"
                data-current-poster="${posterUrl}"
                title="Изменить постер">
          <i class="fas fa-pencil-alt"></i> <!-- ИКОНКА КАРАНДАША -->
        </button>
        
        <!-- Оверлей -->
        <div class="card-overlay">
          <div class="card-overlay-content">
            <button class="btn-card-action btn-add-card" 
                    data-anime-id="${announcement.id}"
                    onclick="event.stopPropagation(); addAnnouncementToLibrary(${
                      announcement.id
                    })">
              <i class="fas fa-plus"></i> В планы
            </button>
          </div>
        </div>
      </div>
      
      <!-- Информация под постером -->
      <div class="anime-info">
        <div class="anime-title">${title}</div>
        <div class="anime-meta">
          <span class="anime-type">${kind}</span>
          <span class="anime-episodes">${airedDate}</span>
        </div>
      </div>
    </div>
  `;
}

function getAnnouncementStatusText(animeData) {
  if (!animeData) return "Анонсировано";

  if (animeData.status === "anons") {
    return "Анонсировано";
  }

  if (
    animeData.status === "ongoing" ||
    animeData.status === "currently_airing"
  ) {
    // Пытаемся получить информацию о следующем эпизоде
    if (animeData.next_episode_at) {
      try {
        const nextDate = new Date(animeData.next_episode_at);
        const now = new Date();
        const daysDiff = Math.ceil((nextDate - now) / (1000 * 60 * 60 * 24));

        if (daysDiff > 0) {
          return `Через ${daysDiff} дн.`;
        } else {
          return "Скоро";
        }
      } catch (error) {
        return "Выходит сейчас";
      }
    }
    return "Выходит сейчас";
  }

  if (animeData.aired_on) {
    try {
      const airedDate = new Date(animeData.aired_on);
      const now = new Date();

      if (airedDate > now) {
        const daysDiff = Math.ceil((airedDate - now) / (1000 * 60 * 60 * 24));
        return `Через ${daysDiff} дн.`;
      } else {
        const daysAgo = Math.floor((now - airedDate) / (1000 * 60 * 60 * 24));
        if (daysAgo <= 7) {
          return `Вышло ${daysAgo} дн. назад`;
        }
        return "Вышло";
      }
    } catch (error) {
      return "Скоро";
    }
  }

  return "Скоро";
}

export async function addAnnouncementToLibrary(animeId) {
  try {
    // Сначала находим анонс в наших данных
    let foundAnnouncement = null;
    let originalTitle = "";
    let customPosterUrl = null;

    // Ищем в каких анонсах есть этот ID
    for (const [origId, entry] of Object.entries(window.announcements || {})) {
      const foundAnn = entry.announcements.find(
        (ann) => ann.id === parseInt(animeId)
      );
      if (foundAnn) {
        foundAnnouncement = foundAnn;
        originalTitle = entry.originalTitle;
        // ВАЖНО: Сохраняем кастомный постер из анонса
        customPosterUrl = foundAnn.customPosterUrl;
        break;
      }
    }

    // Получаем детали аниме
    const animeDetails = await window.ShikimoriAPI.getAnimeDetails(animeId);

    if (animeDetails) {
      // Исправляем URL постера из API если он некорректен
      let apiPosterUrl = "";
      if (
        animeDetails.image?.original &&
        !animeDetails.image.original.includes("missing_original.jpg")
      ) {
        if (animeDetails.image.original.startsWith("http")) {
          apiPosterUrl = animeDetails.image.original;
        } else {
          apiPosterUrl = `https://shikimori.one${animeDetails.image.original}`;
        }
      }

      // ВАЖНОЕ ИЗМЕНЕНИЕ: Используем кастомный постер из анонсов В ПЕРВУЮ ОЧЕРЕДЬ
      let finalPosterUrl =
        customPosterUrl || apiPosterUrl || "assets/placeholder-poster.png";

      // Проверяем что это не placeholder Shikimori
      if (finalPosterUrl.includes("missing_original.jpg")) {
        finalPosterUrl = "assets/placeholder-poster.png";
      }

      // Подготавливаем данные для сохранения с ФЛАГОМ кастомного постера
      const animeData = {
        id: animeId,
        title: animeDetails.russian || animeDetails.name,
        originalTitle: animeDetails.name,
        poster: finalPosterUrl,
        kind: animeDetails.kind || "tv",
        episodes: animeDetails.episodes || 0,
        episodesAired: animeDetails.episodes_aired || 0,
        status: "planned",
        currentEpisode: 0,
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        shikimoriStatus: animeDetails.status || "",
        airedOn: animeDetails.aired_on || "",
        nextEpisodeAt: animeDetails.next_episode_at || "",
        duration: animeDetails.duration || 24,

        // ВАЖНО: Сохраняем информацию о кастомном постере
        customPoster: !!customPosterUrl, // Флаг, что это кастомный постер
        customPosterUrl: customPosterUrl, // Сохраняем оригинальный URL

        // Добавляем информацию, что это было добавлено из анонсов
        fromAnnouncements: true,
        originalAnnouncementId: foundAnnouncement
          ? foundAnnouncement.originalAnimeId
          : null,
        originalAnnouncementTitle: originalTitle,
      };

      // Сохраняем в библиотеку
      if (window.saveAnimeToLibrary) {
        window.saveAnimeToLibrary(animeId.toString(), animeData);
      }

      // УДАЛЯЕМ АНОНС ИЗ СПИСКА ПОСЛЕ ДОБАВЛЕНИЯ
      removeAnnouncementFromList(animeId);

      // Обновляем UI
      if (window.updateUI) {
        window.updateUI();
      }

      // Показываем уведомление
      if (window.showNotification) {
        window.showNotification(
          `"${animeData.title}" добавлено в "В планах"`,
          "success"
        );
      }
    }
  } catch (error) {
    if (window.showNotification) {
      window.showNotification(
        "Не удалось добавить анонс в библиотеку",
        "error"
      );
    }
  }
}

export function restoreMissingPosters() {
  if (!window.library || !window.announcements) {
    return 0;
  }

  let restoredCount = 0;

  // Проходим по всем аниме в библиотеке
  Object.values(window.library).forEach((anime) => {
    // Если аниме из анонсов и нет кастомного постера
    if (anime.fromAnnouncements && !anime.customPosterUrl) {
      // Ищем оригинальный анонс
      for (const [originalId, entry] of Object.entries(
        window.announcements || {}
      )) {
        const announcement = entry.announcements.find(
          (ann) => ann.id === parseInt(anime.id)
        );

        if (announcement && announcement.customPosterUrl) {
          // Восстанавливаем постер
          anime.poster = announcement.customPosterUrl;
          anime.customPoster = true;
          anime.customPosterUrl = announcement.customPosterUrl;
          anime.updatedAt = new Date().toISOString();

          restoredCount++;
          break;
        }
      }
    }
  });

  if (restoredCount > 0) {
    // Сохраняем изменения
    localStorage.setItem("tsundoku-library", JSON.stringify(window.library));

    // Обновляем UI
    if (window.updateUI) {
      window.updateUI();
    }

    if (window.showNotification) {
      window.showNotification(
        `Восстановлено ${restoredCount} кастомных постеров`,
        "success"
      );
    }
  } else {
  }

  return restoredCount;
}

// Удалить анонс из списка после добавления в библиотеку
export function removeAnnouncementFromList(animeId) {
  // Ищем анонс во всех записях
  for (const [originalId, entry] of Object.entries(
    window.announcements || {}
  )) {
    const announcementIndex = entry.announcements.findIndex(
      (ann) => ann.id === parseInt(animeId)
    );

    if (announcementIndex !== -1) {
      const announcement = entry.announcements[announcementIndex];

      // Удаляем анонс из массива
      entry.announcements.splice(announcementIndex, 1);

      // Если анонсов не осталось, удаляем всю запись
      if (entry.announcements.length === 0) {
        delete window.announcements[originalId];
      } else {
        // Обновляем время последней проверки
        entry.lastChecked = new Date().toISOString();
      }

      // Сохраняем изменения
      saveAnnouncements();

      return true;
    }
  }
  return false;
}

export function saveAnnouncements() {
  try {
    localStorage.setItem(
      "tsundoku-announcements",
      JSON.stringify(window.announcements)
    );
  } catch (error) {}
}

export async function checkAnnouncementsWithCache() {
  // ОЧИСТКА: Удаляем анонсы для несуществующих аниме
  if (window.announcements && Object.keys(window.announcements).length > 0) {
    const validAnnouncements = {};

    for (const [originalId, entry] of Object.entries(window.announcements)) {
      // Проверяем, есть ли оригинальное аниме в библиотеке
      if (window.library && window.library[originalId]) {
        validAnnouncements[originalId] = entry;
      }
    }

    // Если есть разница - сохраняем
    if (
      Object.keys(validAnnouncements).length !==
      Object.keys(window.announcements).length
    ) {
      console.log(`🧹 Удалены анонсы для несуществующих аниме`);
      window.announcements = validAnnouncements;
      saveAnnouncements();
    }
  }
  if (!window.library || Object.keys(window.library).length === 0) {
    console.log("📚 Библиотека пуста, пропускаем проверку анонсов");
    return;
  }
  if (window.isCheckingAnnouncements) {
    return;
  }

  window.isCheckingAnnouncements = true;

  const ANNOUNCEMENT_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 часа

  try {
    // Загружаем кэш проверок
    let checkCacheData = {};
    const checkCache = localStorage.getItem("tsundoku-announcement-checks");
    if (checkCache) checkCacheData = JSON.parse(checkCache);

    const now = Date.now();
    const today = new Date();

    // Только завершенные аниме
    const completedAnime = Object.values(window.library).filter(
      (anime) => anime.status === "completed"
    );

    if (completedAnime.length === 0) {
      window.isCheckingAnnouncements = false;
      return;
    }

    let newAnnouncementsFound = 0;
    let announcementsUpdated = 0;
    let skippedToday = 0;

    // Проверяем каждое завершенное аниме
    for (const anime of completedAnime) {
      const animeId = anime.id.toString();

      // Проверка кэша
      if (checkCacheData[animeId]) {
        const lastCheck = checkCacheData[animeId];
        const lastCheckDate = new Date(lastCheck.timestamp);

        // Проверяем, была ли проверка сегодня
        const isSameDay =
          lastCheckDate.getDate() === today.getDate() &&
          lastCheckDate.getMonth() === today.getMonth() &&
          lastCheckDate.getFullYear() === today.getFullYear();

        // Если проверяли сегодня И анонсов не было - пропускаем
        if (isSameDay && lastCheck.foundAnnouncements === 0) {
          skippedToday++;
          continue;
        }

        // Если проверяли недавно (менее 24 часов) - пропускаем
        if (now - lastCheck.timestamp < ANNOUNCEMENT_CHECK_INTERVAL) {
          continue;
        }
      }

      try {
        // Получаем связанные аниме с Shikimori
        let relatedData = [];
        if (
          window.ShikimoriAPI &&
          typeof window.ShikimoriAPI.getAnimeRelated === "function"
        ) {
          relatedData = await window.ShikimoriAPI.getAnimeRelated(anime.id);
        } else {
          const details = await window.ShikimoriAPI.getAnimeDetails(anime.id);
          relatedData = details.related || [];
        }

        console.log(
          "📡 Результат запроса related для",
          anime.id,
          ":",
          relatedData
        );

        // Фильтруем только БУДУЩИЕ аниме-продолжения
        const animeSequels = relatedData.filter((rel) => {
          const isAnime =
            rel.anime &&
            ["tv", "movie", "ova", "ona", "special"].includes(rel.anime.kind);
          const isSequelType = [
            "Sequel",
            "Prequel",
            "Spin-off",
            "Side story",
          ].includes(rel.relation);
          const isFutureRelease = isFutureAnime(rel.anime || rel);
          return isAnime && isSequelType && isFutureRelease;
        });

        if (animeSequels.length > 0) {
          const existingAnnouncements =
            window.announcements[animeId]?.announcements || [];
          const newSequels = animeSequels.filter((seq) => {
            const sequelId = seq.anime?.id || seq.id;
            const alreadyInLibrary = window.library && window.library[sequelId];
            const alreadyInAnnouncements = existingAnnouncements.some(
              (existing) => existing.id === sequelId
            );
            return !alreadyInLibrary && !alreadyInAnnouncements;
          });

          if (newSequels.length > 0) {
            if (!window.announcements[animeId]) {
              window.announcements[animeId] = {
                originalId: anime.id,
                originalTitle: anime.title || anime.russian,
                cachedAt: new Date().toISOString(),
                lastChecked: new Date().toISOString(),
                announcements: [],
              };
            }

            newSequels.forEach((seq) => {
              const sequelId = seq.anime?.id || seq.id;
              const sequelTitle =
                seq.anime?.russian ||
                seq.anime?.name ||
                seq.russian ||
                seq.name;
              const relation = seq.relation || "Unknown";

              if (sequelId && sequelTitle) {
                window.announcements[animeId].announcements.push({
                  id: sequelId,
                  title: sequelTitle,
                  relation: relation,
                  addedAt: new Date().toISOString(),
                  cachedAt: new Date().toISOString(),
                  animeData: seq.anime || seq,
                });

                newAnnouncementsFound++;
              }

              // И после фильтрации animeSequels:
              console.log(
                "🎬 Найдены продолжения для",
                anime.title,
                ":",
                animeSequels.length
              );
              if (animeSequels.length > 0) {
                animeSequels.forEach((seq, index) => {
                  console.log(
                    `  ${index + 1}. ${seq.relation}: ${
                      seq.anime?.russian || seq.anime?.name || "Без названия"
                    }`
                  );
                  console.log(
                    "     Статус:",
                    seq.anime?.status || seq.status || "нет данных"
                  );
                  console.log(
                    "     Дата выхода:",
                    seq.anime?.aired_on || "нет данных"
                  );
                });
              }
            });

            announcementsUpdated++;
          }
        }

        // Обновляем кэш
        checkCacheData[animeId] = {
          timestamp: now,
          lastChecked: new Date().toISOString(),
          title: anime.title,
          foundAnnouncements: (relatedData || []).length,
        };

        // Задержка между запросами
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (error) {
        checkCacheData[animeId] = {
          timestamp: now,
          lastChecked: new Date().toISOString(),
          error: error.message,
          title: anime.title,
        };
      }
    }

    // Сохраняем результаты
    localStorage.setItem(
      "tsundoku-announcement-checks",
      JSON.stringify(checkCacheData)
    );
    saveAnnouncements();

    // Показываем итоговую статистику
    console.log(`
=== ИТОГ ПРОВЕРКИ ===
Завершенных аниме: ${completedAnime.length}
Пропущено (уже проверяли сегодня): ${skippedToday}
Проверено: ${announcementsUpdated}
Найдено новых анонсов: ${newAnnouncementsFound}
=====================`);

    if (newAnnouncementsFound > 0) {
      showNotification(
        `Найдено ${newAnnouncementsFound} новых анонсов!`,
        "success"
      );
      if (window.renderAnnouncements) window.renderAnnouncements();
    }
  } catch (error) {
    console.error("Ошибка при проверке анонсов:", error);
    showNotification("Ошибка при проверке анонсов", "error");
  } finally {
    window.isCheckingAnnouncements = false;
    if (window.updateUI) window.updateUI();
  }
}

export async function checkAnnouncementsForAnime(animeId) {
  try {
    const anime = window.library[animeId];
    if (!anime || anime.status !== 'completed') {
      return;
    }

    // Проверяем, не проверяли ли мы это аниме сегодня
    const checkCache = localStorage.getItem("tsundoku-announcement-checks");
    const checkCacheData = checkCache ? JSON.parse(checkCache) : {};
    const today = new Date();

    if (checkCacheData[animeId]) {
      const lastCheckDate = new Date(checkCacheData[animeId].timestamp);
      const isSameDay =
        lastCheckDate.getDate() === today.getDate() &&
        lastCheckDate.getMonth() === today.getMonth() &&
        lastCheckDate.getFullYear() === today.getFullYear();

      if (isSameDay) {
        console.log(`Анонсы для ${anime.title} уже проверялись сегодня`);
        return;
      }
    }

    // Получаем связанные аниме с Shikimori
    let relatedData = [];
    if (
      window.ShikimoriAPI &&
      typeof window.ShikimoriAPI.getAnimeRelated === "function"
    ) {
      relatedData = await window.ShikimoriAPI.getAnimeRelated(animeId);
    } else {
      const details = await window.ShikimoriAPI.getAnimeDetails(animeId);
      relatedData = details.related || [];
    }

    console.log(
      "📡 Проверка анонсов для",
      anime.title,
      ":",
      relatedData
    );

    // Фильтруем только БУДУЩИЕ аниме-продолжения
    const animeSequels = relatedData.filter((rel) => {
      const isAnime =
        rel.anime &&
        ["tv", "movie", "ova", "ona", "special"].includes(rel.anime.kind);
      const isSequelType = [
        "Sequel",
        "Prequel",
        "Spin-off",
        "Side story",
      ].includes(rel.relation);
      const isFutureRelease = isFutureAnime(rel.anime || rel);
      return isAnime && isSequelType && isFutureRelease;
    });

    if (animeSequels.length > 0) {
      if (!window.announcements[animeId]) {
        window.announcements[animeId] = {
          originalId: anime.id,
          originalTitle: anime.title || anime.russian,
          cachedAt: new Date().toISOString(),
          lastChecked: new Date().toISOString(),
          announcements: [],
        };
      }

      animeSequels.forEach((seq) => {
        const sequelId = seq.anime?.id || seq.id;
        const sequelTitle =
          seq.anime?.russian ||
          seq.anime?.name ||
          seq.russian ||
          seq.name;
        const relation = seq.relation || "Unknown";

        if (sequelId && sequelTitle) {
          // Проверяем, что этого анонса еще нет
          const alreadyExists = window.announcements[animeId].announcements.some(
            (ann) => ann.id === sequelId
          );

          if (!alreadyExists) {
            window.announcements[animeId].announcements.push({
              id: sequelId,
              title: sequelTitle,
              relation: relation,
              addedAt: new Date().toISOString(),
              cachedAt: new Date().toISOString(),
              animeData: seq.anime || seq,
            });

            console.log(`✅ Найден новый анонс: ${sequelTitle}`);
          }
        }
      });

      // Обновляем кэш
      checkCacheData[animeId] = {
        timestamp: Date.now(),
        lastChecked: new Date().toISOString(),
        title: anime.title,
        foundAnnouncements: animeSequels.length,
      };

      localStorage.setItem(
        "tsundoku-announcement-checks",
        JSON.stringify(checkCacheData)
      );
      saveAnnouncements();

      // Обновляем отображение
      if (window.renderAnnouncements) {
        window.renderAnnouncements();
      }

      showNotification(
        `Найдены анонсы для "${anime.title}"!`,
        "success"
      );
    }
  } catch (error) {
    console.error("Ошибка при проверке анонсов для аниме:", error);
    showNotification("Ошибка при проверке анонсов", "error");
  }
}

// Функция для очистки анонсов, которые уже в библиотеке
function cleanupAnnouncements() {
  console.log("Автоматическая очистка анонсов...");

  if (!window.announcements || !window.library) {
    console.log("Нет данных для очистки");
    return 0;
  }

  let removedCount = 0;
  const announcementsCopy = { ...window.announcements };

  // Проверяем каждый список анонсов
  for (const [originalId, entry] of Object.entries(announcementsCopy)) {
    // Фильтруем анонсы, которых нет в библиотеке
    const filteredAnnouncements = entry.announcements.filter((ann) => {
      const isInLibrary = window.library[ann.id];
      if (isInLibrary) {
        console.log(
          `Автоматически удаляем анонс "${ann.title}" - уже в библиотеке`
        );
        removedCount++;
        return false; // Исключаем из списка
      }
      return true; // Оставляем в списке
    });

    // Если остались анонсы - обновляем, если нет - удаляем запись
    if (filteredAnnouncements.length > 0) {
      window.announcements[originalId].announcements = filteredAnnouncements;
    } else {
      delete window.announcements[originalId];
      console.log(
        `Удалена запись для "${entry.originalTitle}" - все анонсы уже в библиотеке`
      );
    }
  }

  if (removedCount > 0) {
    saveAnnouncements();
    console.log(
      `Автоматически удалено ${removedCount} анонсов, которые уже в библиотеке`
    );
  }

  return removedCount;
}

export function cleanupOldAnnouncements() {
  console.log("Очистка устаревших анонсов...");

  if (!window.announcements || Object.keys(window.announcements).length === 0) {
    console.log("Нет анонсов для очистки");
    return 0;
  }

  let removedCount = 0;
  const announcementsCopy = { ...window.announcements };

  for (const [originalId, entry] of Object.entries(announcementsCopy)) {
    // Фильтруем только БУДУЩИЕ анонсы
    const futureAnnouncements = entry.announcements.filter((ann) => {
      // Проверяем, является ли это будущим релизом
      const isFuture = isFutureAnime(ann.animeData);

      if (!isFuture) {
        console.log(`🗑️ Удаляем устаревший анонс: "${ann.title}"`);
        removedCount++;
        return false;
      }

      return true;
    });

    // Если остались анонсы - обновляем, если нет - удаляем запись
    if (futureAnnouncements.length > 0) {
      window.announcements[originalId].announcements = futureAnnouncements;
    } else {
      delete window.announcements[originalId];
      console.log(`🗑️ Удалена вся запись для "${entry.originalTitle}"`);
    }
  }

  if (removedCount > 0) {
    saveAnnouncements();
    console.log(`✅ Удалено ${removedCount} устаревших анонсов`);

    // Обновляем отображение
    if (window.renderAnnouncements) {
      window.renderAnnouncements();
    }
  }

  return removedCount;
}

export function showAnnouncementGroupDetails(originalTitle) {
  const modal = document.getElementById("announcementGroupModal");
  const title = document.getElementById("announcementGroupTitle");
  const content = document.getElementById("announcementGroupContent");

  if (!modal || !title || !content) {
    console.error("Элементы модального окна группы анонсов не найдены");
    return;
  }

  // Находим запись
  const entry = Object.values(window.announcements).find(
    (e) => e.originalTitle === originalTitle
  );

  if (!entry) {
    content.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle fa-3x"></i>
        <h3>Анонсы не найдены</h3>
        <p>Информация об анонсах для "${escapeHTML(
          originalTitle
        )}" недоступна.</p>
      </div>
    `;
    modal.classList.remove("hidden");
    return;
  }

  title.textContent = `Анонсы для "${escapeHTML(originalTitle)}"`;

  if (entry.announcements.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-bell-slash fa-3x"></i>
        <h3>Нет доступных анонсов</h3>
        <p>Для "${escapeHTML(originalTitle)}" не найдено новых сезонов.</p>
      </div>
    `;
  } else {
    content.innerHTML = `
      <div class="announcement-group-list">
        ${entry.announcements
          .map(
            (ann) => `
          <div class="announcement-group-item" data-id="${ann.id}">
            <div class="group-item-poster">
              <img src="${
                ann.customPosterUrl ||
                ann.animeData?.image?.original ||
                "assets/placeholder-poster.png"
              }" 
                   alt="${escapeHTML(ann.title)}"
                   onerror="this.src='assets/placeholder-poster.png'">
            </div>
            <div class="group-item-info">
              <h4>${escapeHTML(ann.title)}</h4>
              <div class="group-item-meta">
                <span class="relation">${escapeHTML(
                  ann.relation || "Связано"
                )}</span>
                <span class="status">${getAnnouncementStatusText(
                  ann.animeData
                )}</span>
              </div>
              <p class="group-item-description">
                ${escapeHTML(
                  ann.animeData?.description || "Описание отсутствует"
                )}
              </p>
              <button class="btn-primary" onclick="addAnnouncementToLibrary(${
                ann.id
              })">
                <i class="fas fa-plus"></i> Добавить в библиотеку
              </button>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  modal.classList.remove("hidden");

  // Добавить обработчик закрытия
  const closeBtn = document.getElementById("closeAnnouncementGroupModal");
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.classList.add("hidden");
    };
  }

  // Закрытие по клику вне модалки
  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      modal.classList.add("hidden");
    }
  });

  // Закрытие по ESC
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      modal.classList.add("hidden");
    }
  });
}

export function closeAnnouncementGroupModal() {
  const modal = document.getElementById("announcementGroupModal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

// Глобальные экспорты
window.renderAnnouncements = renderAnnouncements;
window.addAnnouncementToLibrary = addAnnouncementToLibrary;
window.checkAnnouncementsWithCache = checkAnnouncementsWithCache;
window.cleanupAnnouncements = cleanupAnnouncements;
window.cleanupOldAnnouncements = cleanupOldAnnouncements;
window.showAnnouncementGroupDetails = showAnnouncementGroupDetails;
window.closeAnnouncementGroupModal = closeAnnouncementGroupModal;

// Модальное окно для редактирования постера анонса
export function showAnnouncementPosterModal(
  animeId,
  animeTitle,
  currentPoster
) {
  // Создаем модальное окно
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal" style="max-width: 500px;">
      <div class="modal-header">
        <h2>Изменить постер для "${animeTitle}"</h2>
        <button class="close-modal">&times;</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 1rem;">
          <p style="margin-bottom: 0.5rem;">Текущий постер:</p>
          <img src="${currentPoster || "assets/placeholder-poster.png"}" 
               style="max-width: 200px; max-height: 200px; border-radius: 8px;"
               onerror="this.src='assets/placeholder-poster.png'">
        </div>
        <div class="form-group">
          <label for="posterUrlInput">URL нового постера:</label>
          <input type="text" id="posterUrlInput" 
                 value="${currentPoster || ""}" 
                 placeholder="https://example.com/poster.jpg"
                 style="width: 100%; padding: 8px; margin-top: 5px;">
          <small style="color: var(--text-secondary);">
            Поддерживаемые форматы: .jpg, .png, .webp
          </small>
        </div>
        <div style="margin-top: 1rem; display: none;" id="previewContainer">
          <p>Предпросмотр:</p>
          <img id="posterPreview" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
        </div>
      </div>
      <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end;">
        <button class="btn-secondary" id="cancelBtn">Отмена</button>
        <button class="btn-primary" id="saveBtn">Сохранить</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Обработчики
  const closeModal = () => {
    document.body.removeChild(modal);
  };

  // Закрытие
  modal.querySelector(".close-modal").addEventListener("click", closeModal);
  modal.querySelector("#cancelBtn").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // Предпросмотр
  const urlInput = modal.querySelector("#posterUrlInput");
  const previewContainer = modal.querySelector("#previewContainer");
  const posterPreview = modal.querySelector("#posterPreview");

  urlInput.addEventListener("input", function () {
    const url = this.value.trim();
    if (url && isValidImageUrl(url)) {
      posterPreview.src = url;
      posterPreview.onerror = () => {
        posterPreview.src = "assets/placeholder-poster.png";
      };
      previewContainer.style.display = "block";
    } else {
      previewContainer.style.display = "none";
    }
  });

  // Сохранение
  modal.querySelector("#saveBtn").addEventListener("click", () => {
    const newPosterUrl = urlInput.value.trim();

    if (!newPosterUrl) {
      showNotification("Введите URL постера", "warning");
      return;
    }

    if (!isValidImageUrl(newPosterUrl)) {
      showNotification(
        "Введите корректный URL изображения (.jpg, .png, .webp)",
        "warning"
      );
      return;
    }

    // Обновляем постер
    const success = updateAnnouncementPoster(animeId, newPosterUrl);
    if (success) {
      // Обновляем отображение анонсов
      if (window.renderAnnouncements) {
        window.renderAnnouncements();
      }
      showNotification("Постер успешно обновлен!", "success");
      closeModal();
    }
  });

  // ESC для закрытия
  document.addEventListener("keydown", function escHandler(e) {
    if (e.key === "Escape") {
      closeModal();
      document.removeEventListener("keydown", escHandler);
    }
  });
}

// Проверка валидности URL изображения
function isValidImageUrl(url) {
  if (!url) return false;
  try {
    new URL(url);
  } catch {
    return false;
  }
  const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some((ext) => lowerUrl.endsWith(ext));
}

// Обновление постера в кэше анонсов
export function updateAnnouncementPoster(animeId, newPosterUrl) {
  if (!window.announcements) {
    return false;
  }

  const animeIdNum = parseInt(animeId);
  let updated = false;

  // Ищем анонс во всех записях
  for (const [originalId, entry] of Object.entries(window.announcements)) {
    const announcementIndex = entry.announcements.findIndex(
      (ann) => ann.id === animeIdNum
    );

    if (announcementIndex !== -1) {
      const announcement = entry.announcements[announcementIndex];

      // Обновляем URL постера
      announcement.customPoster = true;
      announcement.customPosterUrl = newPosterUrl;
      announcement.posterUpdatedAt = new Date().toISOString();

      // Также обновляем в animeData если оно есть
      if (announcement.animeData) {
        if (!announcement.animeData.image) {
          announcement.animeData.image = {};
        }
        announcement.animeData.image.original = newPosterUrl;
      }

      updated = true;

      // Сохраняем изменения
      saveAnnouncements();

      // Также обновляем в localStorage для надежности
      try {
        localStorage.setItem(
          "tsundoku-announcements",
          JSON.stringify(window.announcements)
        );
      } catch (error) {
        console.error("Ошибка сохранения в localStorage:", error);
      }

      break;
    }
  }

  return updated;
}

// Закрытие модального окна
export function closeAnnouncementPosterModal() {
  const modal = document.getElementById("announcementPosterModal");
  if (modal) {
    modal.remove();
  }
}

// Инициализация всех обработчиков для анонсов
export function initAnnouncementHandlers() {
  // Обработчик для кнопок редактирования постера
  document.addEventListener("click", function (e) {
    const editBtn = e.target.closest(".edit-poster-btn");
    if (editBtn) {
      e.preventDefault();
      e.stopPropagation();

      const animeId = editBtn.dataset.id;
      const animeTitle = editBtn.dataset.title || "Анонс";
      const currentPoster = editBtn.dataset.currentPoster;

      if (animeId && window.showAnnouncementPosterModal) {
        window.showAnnouncementPosterModal(animeId, animeTitle, currentPoster);
      }
      return;
    }

    // Остальные обработчики...
  });

  // Запускаем сразу
  attachAnnouncementCardListeners();
}

// Вызови инициализацию при загрузке
setTimeout(() => {
  initAnnouncementHandlers();
}, 1000);

// Глобальные экспорты
window.showAnnouncementPosterModal = showAnnouncementPosterModal;
window.closeAnnouncementPosterModal = closeAnnouncementPosterModal;
window.closeAnnouncementGroupModal = closeAnnouncementGroupModal;
window.updateAnnouncementPoster = updateAnnouncementPoster;
window.initAnnouncementHandlers = initAnnouncementHandlers;
window.restoreMissingPosters = restoreMissingPosters;
window.checkAnnouncementsForAnime = checkAnnouncementsForAnime;

// Инициализация обработчиков
// setupAnnouncementPosterButtonListeners();
