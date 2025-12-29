import {
  loadLibrary,
  loadAnnouncements, // ДОБАВЬТЕ ЭТУ СТРОКУ
  checkAndUpdateCompletedStatus,
  debounceCheckAnnouncements,
  checkAndMoveToReadyToWatch,
} from "../modules/library.js";

// Глобальные переменные (уже есть в main.js, но оставляем для совместимости)
if (!window.currentFilter) window.currentFilter = "all";
if (!window.library) window.library = {};
if (!window.announcements) window.announcements = {};
if (!window.isCheckingAnnouncements) window.isCheckingAnnouncements = false;
if (!window.announcementCheckTimer) window.announcementCheckTimer = null;

export async function initApp() {
  return new Promise((resolve) => {
    // Загружаем библиотеку
    loadLibrary();

    // Загружаем анонсы
    loadAnnouncements();

    // Обновляем UI
    updateUI();

    // Проверка анонсов при запуске
    setTimeout(() => {
      if (window.checkAnnouncementsWithCache) {
        window.checkAnnouncementsWithCache();
      }
    }, 1000);

    // Автоматическая проверка при запуске
    setTimeout(() => {
      if (Object.keys(window.library).length > 0) {
        checkAndUpdateCompletedStatus();

        // Изменено: используем checkAndMoveToReadyToWatch вместо checkAndMoveAnimeAutomatically
        if (checkAndMoveToReadyToWatch) {
          checkAndMoveToReadyToWatch();
        }
      }
    }, 3000);

    // Проверяем, существует ли функция в глобальной области
    if (window.checkAndMoveToReadyToWatch) {
      window.checkAndMoveToReadyToWatch();
    }

    // Автоматическое восстановление постеров
    setTimeout(() => {
      if (
        Object.keys(window.library).length > 0 &&
        Object.keys(window.announcements).length > 0
      ) {
        // Проверяем, существует ли функция
        if (window.restoreMissingPosters) {
          window.restoreMissingPosters();
        }
      }
    }, 2000);

    // Дебаг информация
    setTimeout(() => {
      const stats = {};
      Object.values(window.library).forEach((anime) => {
        stats[anime.status] = (stats[anime.status] || 0) + 1;
      });

      // Подробная информация о planned аниме
      const plannedAnime = Object.values(window.library).filter(
        (a) => a.status === "planned"
      );
      plannedAnime.forEach((anime, i) => {});
    }, 5000);

    // Разрешаем промис после завершения основной загрузки
    resolve();
  });
}
