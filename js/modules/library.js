import { updateUI } from "./ui.js";
import { showNotification } from "./notifications.js";
import { ANNOUNCEMENT_DEBOUNCE_DELAY } from "../constants.js";
import { normalizePosterUrl } from "../core/utils.js";

import { ANNOUNCEMENT_CACHE_TTL } from "../constants.js";

export function loadLibrary() {
  try {
    if (window.appStorage && window.appStorage.getLibrary) {
      window.library = window.appStorage.getLibrary();
    } else {
      // Fallback для совместимости
      const saved = localStorage.getItem("tsundoku-library");
      window.library = saved ? JSON.parse(saved) : {};
    }
  } catch (error) {
    window.library = {};
  }
}

export function saveAnimeToLibrary(id, animeData) {
  try {
    if (!animeData.addedAt) {
      animeData.addedAt = new Date().toISOString();
    }

    animeData.updatedAt = new Date().toISOString();

    // ВАЖНО: Исправляем URL постера с ПРИОРИТЕТОМ кастомных постеров
    let finalPosterUrl = "assets/placeholder-poster.png";

    // ПРИОРИТЕТ 1: Кастомный постер из анонсов или библиотеки
    if (
      animeData.customPosterUrl &&
      animeData.customPosterUrl !== "assets/placeholder-poster.png"
    ) {
      finalPosterUrl = animeData.customPosterUrl;
    }
    // ПРИОРИТЕТ 2: Постер из данных API
    else if (
      animeData.poster &&
      animeData.poster !== "assets/placeholder-poster.png"
    ) {
      finalPosterUrl = animeData.poster;
    }
    // ПРИОРИТЕТ 3: Изображение из API данных
    else if (
      animeData.image?.original &&
      !animeData.image.original.includes("missing_original.jpg")
    ) {
      if (animeData.image.original.startsWith("http")) {
        finalPosterUrl = animeData.image.original;
      } else {
        finalPosterUrl = `https://shikimori.one${animeData.image.original}`;
      }
    }

    // Нормализуем URL
    finalPosterUrl = normalizePosterUrl(finalPosterUrl);

    // Сохраняем исправленный постер
    animeData.poster = finalPosterUrl;

    // ВАЖНО: Если был кастомный постер, сохраняем это
    if (
      animeData.customPosterUrl &&
      animeData.customPosterUrl !== finalPosterUrl
    ) {
      animeData.originalCustomPosterUrl = animeData.customPosterUrl;
      animeData.customPoster = true; // Устанавливаем флаг
    }

    // Добавляем длительность эпизода если есть в данных API
    if (animeData.duration) {
      animeData.episodeDuration = animeData.duration;
    }

    window.library[id] = animeData;
    if (window.appStorage && window.appStorage.setLibrary) {
      window.appStorage.setLibrary(window.library);
    } else {
      // Fallback
      localStorage.setItem("tsundoku-library", JSON.stringify(window.library));
    }

    // Проверяем анонсы для завершенных аниме сразу после добавления
    if (animeData.status === "completed") {
      checkAnnouncementsForAnime(id);
    }
  } catch (error) {
    showNotification("Ошибка сохранения в библиотеку", "error");
  }
}

// Добавить резервное копирование
// Добавить резервное копирование
function backupLibrary() {
  try {
    if (window.appStorage) {
      const backupKey = "library_backup";
      const currentBackup = window.appStorage.get(backupKey, {});

      // Сохраняем текущую библиотеку
      currentBackup.lastBackup = {
        timestamp: Date.now(),
        library: window.library,
      };

      // Ограничиваем количество резервных копий
      const backupKeys = Object.keys(currentBackup)
        .filter((key) => key.startsWith("backup_"))
        .sort();

      if (backupKeys.length >= 3) {
        const oldestBackup = backupKeys[0];
        delete currentBackup[oldestBackup];
      }

      window.appStorage.set(backupKey, currentBackup);
      console.log("✅ Резервная копия библиотеки создана");
    }
  } catch (e) {
    console.error("Backup failed:", e);
  }
}

// Вызывать после каждого успешного сохранения
if (window.library && Object.keys(window.library).length > 0) {
  backupLibrary();
}

// Функция для миграции данных при обновлении
export function migrateLibraryData() {
  try {
    // Проверяем текущую версию данных
    const currentVersion = localStorage.getItem("tsundoku-data-version");

    // Если версия не установлена или старая, выполняем миграцию
    if (!currentVersion || currentVersion < "1.0.1") {
      console.log("🔄 Выполняем миграцию данных библиотеки...");

      // 1. Переносим данные из старого формата в новый
      const oldLibrary = localStorage.getItem("animeLibrary");
      if (oldLibrary) {
        try {
          const parsedLibrary = JSON.parse(oldLibrary);
          if (Object.keys(parsedLibrary).length > 0) {
            // Сохраняем в новом формате
            localStorage.setItem("tsundoku-library", oldLibrary);
            localStorage.removeItem("animeLibrary");
            console.log("✅ Данные библиотеки перенесены в новый формат");
          }
        } catch (e) {
          console.error("Ошибка парсинга старой библиотеки:", e);
        }
      }

      // 2. Переносим анонсы
      const oldAnnouncements = localStorage.getItem("announcements");
      if (oldAnnouncements) {
        try {
          localStorage.setItem("tsundoku-announcements", oldAnnouncements);
          localStorage.removeItem("announcements");
          console.log("✅ Данные анонсов перенесены в новый формат");
        } catch (e) {
          console.error("Ошибка переноса анонсов:", e);
        }
      }

      // 3. Устанавливаем новую версию данных
      localStorage.setItem("tsundoku-data-version", "1.0.1");
      console.log("✅ Миграция данных завершена");
    }
  } catch (error) {
    console.error("Ошибка миграции данных:", error);
  }
}

// Вызываем миграцию при загрузке модуля
migrateLibraryData();

export function updateAnimeStatus(id, status) {
  if (window.library[id]) {
    window.library[id].status = status;
    window.library[id].updatedAt = new Date().toISOString();
    if (window.appStorage && window.appStorage.setLibrary) {
      window.appStorage.setLibrary(window.library);
    } else {
      // Fallback
      localStorage.setItem("tsundoku-library", JSON.stringify(window.library));
    }
    updateUI();
  }
}

export function deleteAnime(id) {
  delete window.library[id];
  if (window.appStorage && window.appStorage.setLibrary) {
    window.appStorage.setLibrary(window.library);
  } else {
    // Fallback
    localStorage.setItem("tsundoku-library", JSON.stringify(window.library));
  }
  updateUI();
}

export function loadAnnouncements() {
  try {
    const saved = localStorage.getItem("tsundoku-announcements");

    // Если библиотека пустая - не загружаем старые анонсы
    if (!window.library || Object.keys(window.library).length === 0) {
      console.log("📚 Библиотека пуста, сбрасываем анонсы");
      window.announcements = {};

      // Удаляем старые данные анонсов
      localStorage.removeItem("tsundoku-announcements");
      localStorage.removeItem("tsundoku-announcement-checks");
      return;
    }

    window.announcements = saved ? JSON.parse(saved) : {};

    // Проверяем, что анонсы принадлежат существующим аниме в библиотеке
    const validAnnouncements = {};

    for (const [originalId, entry] of Object.entries(window.announcements)) {
      // Проверяем, есть ли оригинальное аниме в библиотеке
      if (window.library[originalId]) {
        validAnnouncements[originalId] = entry;
      } else {
        console.log(
          `🗑️ Удаляем анонсы для несуществующего аниме: ${originalId}`
        );
      }
    }

    window.announcements = validAnnouncements;

    // Сохраняем очищенные данные
    if (Object.keys(validAnnouncements).length > 0) {
      localStorage.setItem(
        "tsundoku-announcements",
        JSON.stringify(validAnnouncements)
      );
    } else {
      localStorage.removeItem("tsundoku-announcements");
    }
  } catch (error) {
    console.error("Ошибка загрузки анонсов:", error);
    window.announcements = {};
  }
}

export async function checkAndUpdateCompletedStatus() {
  // Если уже проверяется - выходим
  if (window.isCheckingStatus) {
    return;
  }

  window.isCheckingStatus = true;
  let changes = false;
  let checkedCount = 0;
  let errorCount = 0;

  try {
    // Получаем аниме для проверки (только planned и postponed)
    const animeToCheck = Object.values(window.library).filter(
      (anime) => anime.status === "planned" // ТОЛЬКО planned
    );

    if (animeToCheck.length === 0) {
      console.log("Нет аниме для проверки статусов");
      return;
    }

    // Настраиваем батчи для избежания 429
    const BATCH_SIZE = 2; // Максимум 2 аниме в батче
    const DELAY_BETWEEN_REQUESTS = 3000; // 3 секунды между запросами
    const DELAY_BETWEEN_BATCHES = 10000; // 10 секунд между батчами
    const MAX_RETRIES = 2; // Максимум 2 попытки при ошибке

    for (let i = 0; i < animeToCheck.length; i += BATCH_SIZE) {
      const batch = animeToCheck.slice(i, i + BATCH_SIZE);

      // Обрабатываем каждый аниме в батче
      for (let j = 0; j < batch.length; j++) {
        const anime = batch[j];
        checkedCount++;

        let retryCount = 0;
        let success = false;

        // Попытки с ретраями
        while (retryCount <= MAX_RETRIES && !success) {
          try {
            // Увеличиваем задержку при ретраях
            if (retryCount > 0) {
              const retryDelay = 5000 * retryCount; // 5, 10 секунд;
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
            }

            // Задержка между запросами внутри батча
            if (j > 0) {
              await new Promise((resolve) =>
                setTimeout(resolve, DELAY_BETWEEN_REQUESTS)
              );
            }

            const details = await window.ShikimoriAPI.getAnimeDetails(anime.id);
            success = true;

            const episodes = details.episodes || 0;
            const episodesAired = details.episodes_aired || 0;

            if (episodes > 0 && episodesAired >= episodes) {
              // Оригинальная логика
            } else if (
              shikimoriStatus === "released" ||
              shikimoriStatus === "finished_airing"
            ) {
              // Если статус на Shikimori "released" - тоже считаем завершенным
              console.log(
                `✓ "${anime.title}" завершено (по статусу Shikimori: ${shikimoriStatus})`
              );

              if (!anime.history) anime.history = [];
              anime.history.push({
                status: anime.status,
                changedAt: new Date().toISOString(),
                reason: `Статус на Shikimori: ${shikimoriStatus}`,
              });

              anime.status = "completed";
              anime.updatedAt = new Date().toISOString();
              anime.lastStatusCheck = new Date().toISOString();
              changes = true;
            } else {
              // Обновляем информацию об эпизодах даже если не завершено
              anime.episodes = episodes;
              anime.episodesAired = episodesAired;
              anime.lastStatusCheck = new Date().toISOString();

              if (details.next_episode_at) {
                anime.nextEpisodeAt = details.next_episode_at;
              }

              // Обновляем кэш
              if (window.apiCache?.details) {
                window.apiCache.details.set(anime.id, {
                  data: details,
                  timestamp: Date.now(),
                });
              }
            }
          } catch (error) {
            retryCount++;

            if (error.message.includes("429")) {
              errorCount++;

              // Для 429 ошибок делаем более длинные паузы
              if (retryCount <= MAX_RETRIES) {
                const longDelay = 15000; // 15 секунд для 429
                await new Promise((resolve) => setTimeout(resolve, longDelay));
                continue;
              }
            }

            if (retryCount > MAX_RETRIES) {
              console.error(
                `❌ Не удалось проверить "${anime.title}":`,
                error.message
              );
              errorCount++;

              // Сохраняем информацию об ошибке
              anime.lastCheckError = {
                message: error.message,
                timestamp: new Date().toISOString(),
              };
            }
          }
        }

        // Сохраняем прогресс каждые 5 аниме
        if (checkedCount % 5 === 0 && changes) {
          localStorage.setItem(
            "tsundoku-library",
            JSON.stringify(window.library)
          );
        }
      }

      // Задержка между батчами
      if (i + BATCH_SIZE < animeToCheck.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, DELAY_BETWEEN_BATCHES)
        );
      }
    }

    // Финальное сохранение если были изменения
    if (changes) {
      if (window.appStorage && window.appStorage.setLibrary) {
        window.appStorage.setLibrary(window.library);
      } else {
        // Fallback
        localStorage.setItem(
          "tsundoku-library",
          JSON.stringify(window.library)
        );
      }

      // Обновляем UI
      if (window.updateUI) {
        window.updateUI();
      }
    }

    // Показываем итоговое уведомление
    if (window.showNotification) {
      const message = `Проверка статусов завершена. Проверено: ${checkedCount}, Ошибок: ${errorCount}`;
      window.showNotification(message, errorCount > 0 ? "warning" : "info");
    }
  } catch (error) {
    if (window.showNotification) {
      window.showNotification("Ошибка при проверке статусов аниме", "error");
    }
  } finally {
    window.isCheckingStatus = false;
  }
}

export function debounceCheckAnnouncements() {
  if (window.announcementCheckTimer) {
    clearTimeout(window.announcementCheckTimer);
  }

  window.announcementCheckTimer = setTimeout(() => {
    if (!window.isCheckingAnnouncements) {
      // Эта функция будет в отдельном модуле announcements.js
      if (window.checkAnnouncementsWithCache) {
        window.checkAnnouncementsWithCache();
      }
    }
  }, ANNOUNCEMENT_DEBOUNCE_DELAY);
}

// Очистить анонсы для аниме, которые уже в библиотеке
export function cleanupAnnouncements() {
  if (!window.announcements || !window.library) return;

  let removedCount = 0;
  const announcementsCopy = { ...window.announcements };

  // Проверяем каждый список анонсов
  for (const [originalId, entry] of Object.entries(announcementsCopy)) {
    // Фильтруем анонсы, которых нет в библиотеке
    const filteredAnnouncements = entry.announcements.filter((ann) => {
      const isInLibrary = window.library[ann.id];
      if (isInLibrary) {
        removedCount++;
      }
      return !isInLibrary;
    });

    // Если остались анонсы - обновляем, если нет - удаляем запись
    if (filteredAnnouncements.length > 0) {
      window.announcements[originalId].announcements = filteredAnnouncements;
    } else {
      delete window.announcements[originalId];
    }
  }

  if (removedCount > 0) {
    saveAnnouncements();

    // Обновляем отображение
    if (window.renderAnnouncements) {
      window.renderAnnouncements();
    }
  }

  return removedCount;
}

export async function updateAnimeEpisodeInfo(animeId) {
  try {
    const anime = window.library[animeId];
    if (!anime) return;

    // Получаем свежие данные с Shikimori
    const freshData = await window.ShikimoriAPI.getAnimeDetails(animeId);

    if (freshData) {
      // Обновляем информацию об эпизодах
      anime.episodes = freshData.episodes || 0;
      anime.episodesAired = freshData.episodes_aired || 0;
      anime.shikimoriStatus = freshData.status || "";

      if (freshData.next_episode_at) {
        anime.nextEpisodeAt = freshData.next_episode_at;
      }

      if (freshData.aired_on) {
        anime.airedOn = freshData.aired_on;
      }

      anime.updatedAt = new Date().toISOString();

      // Сохраняем изменения
      if (window.appStorage && window.appStorage.setLibrary) {
        window.appStorage.setLibrary(window.library);
      } else {
        // Fallback
        localStorage.setItem(
          "tsundoku-library",
          JSON.stringify(window.library)
        );
      }

      return true;
    }
  } catch (error) {}

  return false;
}

export async function checkAndMoveToReadyToWatch() {
  let updatedCount = 0;

  // Просто обновляем UI - логика фильтрации уже в getReadyToWatchAnime()
  if (window.updateUI) {
    window.updateUI();
    updatedCount = 1; // флаг, что обновление было
  }

  return updatedCount;
}

export function clearAnnouncementsData() {
  try {
    // Очищаем все данные об анонсах
    localStorage.removeItem("tsundoku-announcements");
    localStorage.removeItem("tsundoku-announcement-checks");
    localStorage.removeItem("announcementsCache");

    // Сбрасываем глобальные переменные
    window.announcements = {};

    console.log("✅ Данные анонсов очищены");
    return true;
  } catch (error) {
    console.error("❌ Ошибка очистки анонсов:", error);
    return false;
  }
}

// Экспортируем глобальные функции
window.loadLibrary = loadLibrary;
window.saveAnimeToLibrary = saveAnimeToLibrary;
window.updateAnimeStatus = updateAnimeStatus;
window.deleteAnime = deleteAnime;
window.cleanupAnnouncements = cleanupAnnouncements;
window.clearAnnouncementsData = clearAnnouncementsData;
window.migrateLibraryData = migrateLibraryData;
