// Устанавливаем базовый путь для импортов в Electron
const baseUrl =
  window.location.protocol === "file:"
    ? window.location.pathname.substring(
        0,
        window.location.pathname.lastIndexOf("/") + 1
      ) + "js/"
    : "";

// Импортируем компонент загрузочного экрана
import { LoadingScreen } from "./components/loading-screen.js";

// Создаем загрузочный экран сразу
window.loadingScreen = new LoadingScreen();
window.loadingScreen.setVersion(window.appVersion || "1.0.0");
window.loadingScreen.updateStatus("Загрузка основных модулей...");

// Устанавливаем минимальное время загрузки (5 секунд)
const startTime = Date.now();
window.loadingScreen.updateProgress(10);

// Импортируем апдейтер
import { AppUpdater } from "./modules/updater.js";
window.appUpdater = new AppUpdater();
window.appUpdater.currentVersion = window.appVersion || "1.0.0";

// Главный файл для инициализации приложения
import { initApp } from "./core/app.js";
import { initSearchModule } from "./modules/search.js";
import { setupEventListeners } from "./core/events.js";
import { ShikimoriAPI } from "./modules/api.js";
import "./modules/announcements.js";
import "./core/logger.js";
import { handleProfileClick, showProfilePage } from "./components/profile.js";

// Делаем API глобально доступным
window.ShikimoriAPI = ShikimoriAPI;
window.initSearchModule = initSearchModule;

// ВАЖНО: Создаем алиас для совместимости
window.saveLibrary = function () {
  console.warn("saveLibrary вызвана, используем saveAnimeToLibrary");
  // Если есть конкретное аниме для сохранения
  if (window.currentSavingAnimeId && window.library) {
    const anime = window.library[window.currentSavingAnimeId];
    if (anime && window.saveAnimeToLibrary) {
      window.saveAnimeToLibrary(window.currentSavingAnimeId, anime);
    }
  }

  // Или просто сохраняем всю библиотеку
  try {
    if (window.appStorage && window.appStorage.setLibrary) {
      window.appStorage.setLibrary(window.library || {});
    } else {
      localStorage.setItem(
        "animeLibrary",
        JSON.stringify(window.library || {})
      );
    }
  } catch (e) {}
};

// Основная функция инициализации
async function initializeApp() {
  try {
    // Создаем систему отслеживания загрузки
    const loadingTracker = {
      totalTasks: 7,
      completedTasks: 0,
      updateProgress: function () {
        this.completedTasks++;
        const progress = Math.round(
          (this.completedTasks / this.totalTasks) * 100
        );
        window.loadingScreen.updateProgress(progress);
      },
    };

    // 1. Проверяем обновления
    window.loadingScreen.updateStatus("Проверка обновлений...");
    const updateAvailable = await window.appUpdater.checkForUpdates();
    loadingTracker.updateProgress();

    // 2. Инициализируем основные модули
    window.loadingScreen.updateStatus("Загрузка библиотеки...");
    await initApp();
    loadingTracker.updateProgress();

    // 3. Настройка интерфейса
    window.loadingScreen.updateStatus("Настройка интерфейса...");
    setupEventListeners();
    loadingTracker.updateProgress();

    // 4. Проверка анонсов
    window.loadingScreen.updateStatus("Проверка анонсов...");
    await window.checkAnnouncementsWithCache();
    loadingTracker.updateProgress();

    // 5. Инициализация поиска
    window.loadingScreen.updateStatus("Инициализация поиска...");
    try {
      await initSearchModule();
    } catch (error) {
      console.error("Ошибка инициализации поиска:", error);
    }
    loadingTracker.updateProgress();

    // 6. Финальная настройка
    window.loadingScreen.updateStatus("Финальная настройка...");
    setupEditModalHandler();
    loadingTracker.updateProgress();

    // 7. Дополнительная загрузка компонентов
    window.loadingScreen.updateStatus("Загрузка дополнительных компонентов...");
    await loadAdditionalComponents();
    loadingTracker.updateProgress();

    // Завершение
    window.loadingScreen.updateStatus("Готово!");
    window.loadingScreen.updateProgress(100);

    // Ожидаем полной загрузки всех компонентов
    await window.loadingScreen.waitForCompleteLoad();

    // Обеспечиваем минимальное время загрузки (5 секунд)
    const currentTime = Date.now();
    const elapsedTime = currentTime - startTime;
    const remainingTime = Math.max(0, 5000 - elapsedTime);

    if (remainingTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingTime));
    }

    // Плавный переход с загрузочного экрана
    await window.loadingScreen.smoothTransition();

    // Скрываем загрузочный экран и показываем контент
    window.loadingScreen.hide();
    const container = document.querySelector(".container");
    container.classList.remove("hidden");
    container.classList.add("visible");

    // Восстанавливаем обработчики событий после загрузки
    setTimeout(() => {
      setupEventListeners();
    }, 100);

    // Показываем уведомление об обновлении если есть
    if (updateAvailable) {
      setTimeout(() => {
        window.appUpdater.showUpdateNotification();
      }, 1000);
    }

    // Проверяем и показываем changelog после обновления
    const changelog = localStorage.getItem("updateChangelog");
    const updatedVersion = localStorage.getItem("updatedVersion");
    if (changelog && updatedVersion) {
      setTimeout(() => {
        showUpdateChangelog(updatedVersion, changelog);
        localStorage.removeItem("updateChangelog");
        localStorage.removeItem("updatedVersion");
      }, 2000);
    }
  } catch (error) {
    console.error("Ошибка инициализации:", error);
    window.loadingScreen.updateStatus("Ошибка загрузки");
    showNotification("Не удалось загрузить приложение", "error");
    window.loadingScreen.hide();
  }
}

// Функция для загрузки дополнительных компонентов
async function loadAdditionalComponents() {
  return new Promise((resolve) => {
    // Загружаем все необходимые компоненты
    const componentsToLoad = [
      import("./components/cards.js"),
      import("./components/navigation.js"),
      import("./modules/ui.js"),
      import("./modules/notifications.js"),
      import("./modules/counters.js"),
    ];

    Promise.all(componentsToLoad)
      .then(() => {
        console.log("Все дополнительные компоненты загружены");
        resolve();
      })
      .catch((error) => {
        console.error("Ошибка загрузки дополнительных компонентов:", error);
        resolve(); // Продолжаем даже если есть ошибки
      });
  });
}

// Запускаем инициализацию при загрузке DOM
document.addEventListener("DOMContentLoaded", () => {
  // Запускаем периодическую проверку обновлений
  window.appUpdater.startPeriodicCheck();

  // Запускаем основную инициализацию
  initializeApp();
});

// ========== ОБРАБОТЧИК МОДАЛЬНОГО ОКНА РЕДАКТИРОВАНИЯ ==========
function setupEditModalHandler() {
  const confirmEditBtn = document.getElementById("confirmEditBtn");

  if (!confirmEditBtn) {
    return;
  }

  // Удаляем старые обработчики
  const newBtn = confirmEditBtn.cloneNode(true);
  confirmEditBtn.parentNode.replaceChild(newBtn, confirmEditBtn);

  // Добавляем новый обработчик
  document
    .getElementById("confirmEditBtn")
    .addEventListener("click", function () {
      // Получаем ID редактируемого аниме
      const animeId = window.currentEditingAnimeId;

      if (!animeId) {
        showNotification("Ошибка: ID аниме не найден", "error");
        return;
      }

      // Получаем старые данные
      const oldData = window.library?.[animeId] || {};

      // Получаем новые данные из формы
      const activeStatusBtn = document.querySelector(
        ".edit-status-option.active"
      );
      const newStatus =
        activeStatusBtn?.dataset.status || oldData.status || "planned";

      const episodeInput = document.getElementById("editEpisodeNumber");
      const currentEpisode =
        episodeInput && !isNaN(parseInt(episodeInput.value))
          ? parseInt(episodeInput.value)
          : oldData.currentEpisode || 0;

      const posterUrlInput = document.getElementById("editPosterUrl");
      const posterUrl =
        posterUrlInput?.value?.trim() || oldData.imageUrl || oldData.poster;

      const newData = {
        ...oldData,
        status: newStatus,
        currentEpisode: currentEpisode,
        imageUrl: posterUrl || oldData.imageUrl,
        poster: posterUrl || oldData.poster,
        updatedAt: new Date().toISOString(),
      };

      // Если это завершено и нет текущего эпизода, ставим равным общему количеству
      if (
        newStatus === "completed" &&
        (!newData.currentEpisode || newData.currentEpisode === 0)
      ) {
        newData.currentEpisode = newData.episodes || 1;
      }

      // Сохраняем в библиотеку
      if (window.library) {
        window.library[animeId] = newData;
      }

      // ВАЖНО: Отслеживаем изменения для статистики просмотра
      if (window.trackAnimeChanges) {
        window.trackAnimeChanges(animeId, oldData, newData);
      } else {
      }

      // Сохраняем библиотеку
      if (window.saveAnimeToLibrary) {
        window.saveAnimeToLibrary(animeId, newData);
      } else {
        // Сохраняем в localStorage напрямую
        try {
          if (window.appStorage && window.appStorage.setLibrary) {
            window.appStorage.setLibrary(window.library || {});
          } else {
            localStorage.setItem(
              "animeLibrary",
              JSON.stringify(window.library || {})
            );
          }
        } catch (e) {
          showNotification("Ошибка сохранения", "error");
        }
      }

      // Обновляем UI
      if (window.updateUI) {
        window.updateUI();
      }

      // Закрываем модалку
      const editModal = document.getElementById("editAnimeModal");
      if (editModal) {
        editModal.classList.add("hidden");
      }

      showNotification("Изменения сохранены", "success");

      // Обновляем статистику профиля если профиль открыт
      const profileSection = document.getElementById("profileSection");
      if (profileSection && !profileSection.classList.contains("hidden")) {
        if (window.updateProfileStats) {
          window.updateProfileStats();
        }
        if (window.loadProfileData) {
          window.loadProfileData();
        }
        if (window.updateDynamicsChart) {
          window.updateDynamicsChart();
        }
      }
    });
}

// ========== ПРЯМОЕ СОЗДАНИЕ ФУНКЦИЙ ДЛЯ ГРАФИКА ==========

// Создаем функции если они не существуют
setTimeout(() => {
  if (!window.updateDynamicsChart) {
    window.updateDynamicsChart = function () {
      const chartContainer = document.getElementById("episodeChart");
      if (!chartContainer) {
        return;
      }

      // Получаем данные
      let weekData;
      try {
        const saved = localStorage.getItem("watchHistory");
        weekData = saved ? JSON.parse(saved) : { currentWeek: 0, weeks: {} };
      } catch (e) {
        weekData = { currentWeek: 0, weeks: {} };
      }

      // Текущая неделя
      const today = new Date();
      const year = today.getFullYear();
      const firstDayOfYear = new Date(year, 0, 1);
      const pastDaysOfYear = (today - firstDayOfYear) / 86400000;
      const weekNumber = Math.ceil(
        (pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7
      );
      const weekKey = `${year}-W${weekNumber.toString().padStart(2, "0")}`;

      // Тестовые данные
      const weekStats = weekData.weeks?.[weekKey] || [3, 7, 2, 5, 9, 4, 6];

      // Обновляем заголовок
      const weekRangeElement = document.getElementById("currentWeekRange");
      if (weekRangeElement) {
        weekRangeElement.textContent = `Неделя ${weekNumber}`;
      }

      // Обновляем бары
      const bars = document.querySelectorAll("#episodeChart .bar");

      if (bars.length === 0) {
        return;
      }

      const maxEpisodes = Math.max(...weekStats, 10);

      bars.forEach((bar, index) => {
        const episodes = weekStats[index] || 0;
        const height = (episodes / maxEpisodes) * 100;
        bar.style.height = `${height}%`;
        bar.setAttribute("data-value", episodes);

        // Цвет в зависимости от высоты
        if (height > 70) {
          bar.style.background = "linear-gradient(to top, #10b981, #34d399)";
        } else if (height > 40) {
          bar.style.background =
            "linear-gradient(to top, var(--primary-color), var(--accent-color))";
        } else {
          bar.style.background = "linear-gradient(to top, #3b82f6, #60a5fa)";
        }
      });

      // Обновляем статистику
      const totalWeekEpisodes = weekStats.reduce((a, b) => a + b, 0);
      const maxDayIndex = weekStats.indexOf(Math.max(...weekStats));
      const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

      document.getElementById("weekEpisodes") &&
        (document.getElementById("weekEpisodes").textContent =
          totalWeekEpisodes);
      document.getElementById("bestDay") &&
        (document.getElementById("bestDay").textContent =
          dayNames[maxDayIndex]);
      document.getElementById("weekTrend") &&
        (document.getElementById("weekTrend").textContent = "+15%");
    };
  }

  // Запускаем тест
  setTimeout(() => {
    if (window.updateDynamicsChart) {
      window.updateDynamicsChart();
    }
  }, 1000);
}, 1000);

window.handleProfileClick = handleProfileClick;
window.showProfilePage = showProfilePage;

// Функция для отображения changelog после обновления
window.showUpdateChangelog = function (version, changelog) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal" style="max-width: 600px;">
      <div class="modal-header">
        <h2>Обновление до версии ${version}</h2>
        <button class="close-modal">&times;</button>
      </div>
      <div class="modal-body">
        <h3>Что нового:</h3>
        <div class="changelog-content" style="max-height: 400px; overflow-y: auto; padding: 10px; background: #f5f5f5; border-radius: 5px;">
          ${changelog.replace(/\n/g, "<br>")}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-primary" id="closeChangelogBtn">Хорошо</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => document.body.removeChild(modal);
  modal.querySelector(".close-modal").addEventListener("click", closeModal);
  modal
    .querySelector("#closeChangelogBtn")
    .addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => e.target === modal && closeModal());
};
