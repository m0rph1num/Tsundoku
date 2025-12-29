// Компонент профиля пользователя

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let currentAvatarUrl = "assets/default-avatar.png";

// ========== ОСНОВНЫЕ ФУНКЦИИ ПРОФИЛЯ ==========

export function handleProfileClick(e) {
  e.stopPropagation();
  e.preventDefault();

  const profileModal = document.getElementById("profileModal");
  const btn = document.getElementById("profileBtn");

  if (!profileModal || !btn) return;

  // Переключаем класс show
  if (profileModal.classList.contains("show")) {
    profileModal.classList.remove("show");
    btn.classList.remove("active");
  } else {
    profileModal.classList.add("show");
    btn.classList.add("active");
  }
}

export function openProfileModal() {
  const modal = document.getElementById("profileModal");
  const btn = document.getElementById("profileBtn");

  if (modal && btn) {
    modal.classList.add("show");
    btn.classList.add("active");
  }
}

export function closeProfileModal() {
  const modal = document.getElementById("profileModal");
  const btn = document.getElementById("profileBtn");

  if (modal && btn) {
    modal.classList.remove("show");
    btn.classList.remove("active");
  }
}

// Показ страницы профиля
export function showProfilePage() {
  closeProfileModal();

  // Скрываем все секции кроме профиля
  document
    .querySelectorAll(".content-area > section:not(#profileSection)")
    .forEach((section) => {
      section.classList.add("hidden");
      section.style.display = "none";
    });

  // Убираем активный класс со ВСЕХ табов
  document.querySelectorAll(".nav-tab").forEach((tab) => {
    tab.classList.remove("active");
  });

  // Закрываем все модальные окна перед открытием профиля
  if (window.closeAllModals) {
    window.closeAllModals();
  }

  // Показываем профиль
  const profileSection = document.getElementById("profileSection");
  if (profileSection) {
    profileSection.classList.remove("hidden");
    profileSection.style.display = "block";
    loadProfileData();
  }

  // Добавляем обработчики для табов в профиле
  setupProfileTabListeners();
}

// Обработчики для табов когда открыт профиль
function setupProfileTabListeners() {
  const tabs = document.querySelectorAll(".nav-tab");

  if (tabs.length === 0) return;

  // Просто добавляем дополнительные обработчики
  tabs.forEach((tab) => {
    // Сохраняем оригинальный обработчик
    const originalHandler = tab.onclick;

    tab.addEventListener("click", function (e) {
      // Проверяем, открыта ли страница настроек
      const settingsSection = document.getElementById("settingsSection");
      if (settingsSection && !settingsSection.classList.contains("hidden")) {
        // Скрываем страницу настроек
        hideSettingsPage();

        // Ждем немного и переключаемся на таб
        setTimeout(() => {
          const status = this.dataset.status;
          switchToTab(status);
        }, 100);

        e.preventDefault();
        e.stopPropagation();
      }
      // Если настройки не открыты, оригинальный обработчик сработает
    });

    tab.addEventListener("click", function (e) {
      // Проверяем, открыт ли профиль
      const profileSection = document.getElementById("profileSection");
      if (profileSection && !profileSection.classList.contains("hidden")) {
        e.preventDefault();
        e.stopPropagation();

        const status = this.dataset.status;

        // Закрываем профиль
        hideProfilePage();

        // Даем время на скрытие профиля
        setTimeout(() => {
          switchToTab(status);
        }, 100);
      }
      // Если профиль не открыт, оригинальный обработчик сработает
    });
  });
}

// Функция переключения на таб
function switchToTab(status) {
  const tab = document.querySelector(`.nav-tab[data-status="${status}"]`);
  if (!tab) {
    return;
  }

  // Обновляем активный класс
  document.querySelectorAll(".nav-tab").forEach((t) => {
    t.classList.remove("active");
  });
  tab.classList.add("active");

  // Устанавливаем фильтр
  window.currentFilter = status;

  // Принудительно обновляем UI
  if (window.updateUI) {
    window.updateUI();
  }
}

// Скрытие страницы профиля
export function hideProfilePage() {
  const profileSection = document.getElementById("profileSection");
  if (profileSection) {
    profileSection.classList.add("hidden");
  }

  // Возвращаемся к главной
  window.currentFilter = "all";

  // Показываем главные секции
  const mainSections = [
    "readyToWatchSection",
    "waitingEpisodesSection",
    "announcementsSection",
  ];
  mainSections.forEach((sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) section.classList.remove("hidden");
  });

  // Скрываем секции фильтров
  const filterSections = [
    "plannedSection",
    "watchingSection",
    "completedSection",
    "postponedSection",
  ];
  filterSections.forEach((sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) section.style.display = "none";
  });

  // Активируем таб "Главная"
  const allTab = document.querySelector('.nav-tab[data-status="all"]');
  if (allTab) {
    document.querySelectorAll(".nav-tab").forEach((t) => {
      t.classList.remove("active");
    });
    allTab.classList.add("active");
  }

  if (window.updateUI) {
    window.updateUI();
  }
}

// Обновление статистики профиля
export function updateProfileStats() {
  if (!window.library) return;

  const stats = {
    total: Object.keys(window.library).length,
    watching: Object.values(window.library).filter(
      (a) => a.status === "watching"
    ).length,
    planned: Object.values(window.library).filter((a) => a.status === "planned")
      .length,
    completed: Object.values(window.library).filter(
      (a) => a.status === "completed"
    ).length,
    postponed: Object.values(window.library).filter(
      (a) => a.status === "postponed"
    ).length,
  };

  // Обновляем все элементы статистики
  const elements = [
    { id: "statTotal", value: stats.total },
    { id: "statWatching", value: stats.watching },
    { id: "statPlanned", value: stats.planned },
    { id: "statCompleted", value: stats.completed },
    { id: "statPostponed", value: stats.postponed },
  ];

  elements.forEach(({ id, value }) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });
}

// ========== ФУНКЦИИ ДЛЯ СМЕНЫ АВАТАРА ==========

// Открытие модального окна смены аватара
window.openAvatarModal = function () {
  const modal = document.getElementById("avatarModal");
  if (modal) {
    modal.classList.remove("hidden");
    // Сбрасываем предпросмотр
    document.getElementById("avatarUrl").value = "";
    document.getElementById("urlPreview").classList.add("hidden");
    document.getElementById("filePreview").classList.add("hidden");
    document.getElementById("saveAvatarBtn").disabled = true;
  }
};

// Закрытие модального окна
window.closeAvatarModal = function () {
  const modal = document.getElementById("avatarModal");
  if (modal) {
    modal.classList.add("hidden");
  }
};

// Предпросмотр аватара по URL
window.previewAvatar = function () {
  const urlInput = document.getElementById("avatarUrl");
  const previewDiv = document.getElementById("urlPreview");
  const previewImg = document.getElementById("urlPreviewImage");
  const saveBtn = document.getElementById("saveAvatarBtn");

  if (!urlInput.value.trim()) {
    showNotification("Введите URL изображения", "warning");
    return;
  }

  // Валидация URL
  if (!isValidImageUrl(urlInput.value)) {
    showNotification(
      "Неверный URL изображения. Разрешены только trusted домены",
      "error"
    );
    return;
  }

  // Показываем загрузку
  previewImg.src = "";
  previewDiv.classList.remove("hidden");
  previewImg.style.opacity = "0.5";

  // Пробуем загрузить изображение
  const testImage = new Image();
  testImage.onload = function () {
    previewImg.src = urlInput.value;
    previewImg.style.opacity = "1";
    saveBtn.disabled = false;
    showNotification("Изображение загружено успешно", "success");
  };

  testImage.onerror = function () {
    previewDiv.classList.add("hidden");
    showNotification(
      "Не удалось загрузить изображение. Проверьте URL.",
      "error"
    );
    saveBtn.disabled = true;
  };

  testImage.src = urlInput.value;
};

// Добавить функцию валидации URL
function isValidImageUrl(url) {
  try {
    const parsed = new URL(url);
    const validDomains = [
      "i.imgur.com",
      "i.ibb.co",
      "shikimori.one",
      "cdn.discordapp.com",
      "localhost",
      "127.0.0.1",
    ];
    return validDomains.some((domain) => parsed.hostname.includes(domain));
  } catch (e) {
    return false;
  }
}

// Обработка Drag & Drop
function setupDragAndDrop() {
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const filePreview = document.getElementById("filePreview");
  const filePreviewImage = document.getElementById("filePreviewImage");
  const saveBtn = document.getElementById("saveAvatarBtn");

  if (!dropZone) return;

  // Обработка выбора файла через кнопку
  fileInput.addEventListener("change", function (e) {
    handleFileSelect(e.target.files[0]);
  });

  // Обработка drag & drop
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, highlight, false);
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, unhighlight, false);
  });

  function highlight() {
    dropZone.classList.add("drag-over");
  }

  function unhighlight() {
    dropZone.classList.remove("drag-over");
  }

  // Обработка сброса файла
  dropZone.addEventListener("drop", handleDrop, false);

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }

  function handleFileSelect(file) {
    // Проверяем тип файла
    if (!file.type.match("image.*")) {
      showNotification("Пожалуйста, выберите изображение", "warning");
      return;
    }

    // Проверяем размер файла (максимум 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showNotification(
        "Файл слишком большой. Максимальный размер: 2MB",
        "warning"
      );
      return;
    }

    // Читаем файл
    const reader = new FileReader();
    reader.onload = function (e) {
      filePreviewImage.src = e.target.result;
      filePreview.classList.remove("hidden");
      saveBtn.disabled = false;
      showNotification("Изображение загружено успешно", "success");
    };
    reader.readAsDataURL(file);
  }
}

// Удаление предпросмотра файла
window.removeFilePreview = function () {
  const filePreview = document.getElementById("filePreview");
  const fileInput = document.getElementById("fileInput");
  const saveBtn = document.getElementById("saveAvatarBtn");

  filePreview.classList.add("hidden");
  fileInput.value = "";
  saveBtn.disabled = true;
};

// Сохранение аватара
window.saveAvatar = function () {
  const urlInput = document.getElementById("avatarUrl");
  const filePreview = document.getElementById("filePreview");
  const filePreviewImage = document.getElementById("filePreviewImage");
  const profileAvatar = document.getElementById("profileAvatar");
  const modalAvatar = document.querySelector("#profileModal .avatar");

  let newAvatarUrl = "";

  // Проверяем, что выбран способ загрузки
  if (
    urlInput.value.trim() &&
    !document.getElementById("urlPreview").classList.contains("hidden")
  ) {
    newAvatarUrl = urlInput.value;
  } else if (!filePreview.classList.contains("hidden")) {
    newAvatarUrl = filePreviewImage.src;
  } else {
    showNotification("Пожалуйста, загрузите изображение", "warning");
    return;
  }

  try {
    window.appStorage.setUserAvatar(newAvatarUrl);
    currentAvatarUrl = newAvatarUrl;

    // Обновляем аватар на странице
    if (profileAvatar) {
      profileAvatar.src = newAvatarUrl;
    }

    // Обновляем аватар в модальном окне
    if (modalAvatar) {
      modalAvatar.src = newAvatarUrl;
    }

    showNotification("Аватар успешно обновлён!", "success");
    closeAvatarModal();
  } catch (e) {
    showNotification("Ошибка при сохранении аватара", "error");
  }
};

// Загрузка сохраненного аватара
function loadSavedAvatar() {
  const savedAvatar = window.appStorage.getUserAvatar();
  if (savedAvatar) {
    currentAvatarUrl = savedAvatar;
    const profileAvatar = document.getElementById("profileAvatar");
    const modalAvatar = document.querySelector("#profileModal .avatar");

    if (profileAvatar) {
      profileAvatar.src = savedAvatar;
    }

    if (modalAvatar) {
      modalAvatar.src = savedAvatar;
    }
  }
}

// ========== ОСНОВНАЯ ЗАГРУЗКА ДАННЫХ ПРОФИЛЯ ==========

export function loadProfileData() {
  if (!window.library) return;

  // Основная статистика
  const stats = {
    total: Object.keys(window.library).length,
    watching: Object.values(window.library).filter(
      (a) => a.status === "watching"
    ).length,
    planned: Object.values(window.library).filter((a) => a.status === "planned")
      .length,
    completed: Object.values(window.library).filter(
      (a) => a.status === "completed"
    ).length,
    postponed: Object.values(window.library).filter(
      (a) => a.status === "postponed"
    ).length,
  };

  // Обновляем основную статистику
  updateProfileStats();

  // ========== ТОЧНЫЙ РАСЧЕТ ВРЕМЕНИ ПРОСМОТРА ==========

  // Считаем только для завершенных аниме
  let totalWatchMinutes = 0;
  let totalWatchedEpisodes = 0;
  let completedCount = 0;

  Object.values(window.library).forEach((anime) => {
    if (anime.status === "completed") {
      completedCount++;

      // 1. Определяем количество просмотренных эпизодов
      let watchedEpisodes = 0;
      if (anime.currentEpisode && anime.currentEpisode > 0) {
        watchedEpisodes = anime.currentEpisode;
      } else if (anime.episodes && anime.episodes > 0) {
        watchedEpisodes = anime.episodes;
      }

      // 2. Определяем длительность одного эпизода
      let episodeDuration = 24; // Стандартная длительность по умолчанию

      // Приоритет 1: сохраненная длительность
      if (anime.episodeDuration && anime.episodeDuration > 0) {
        episodeDuration = anime.episodeDuration;
      }
      // Приоритет 2: длительность из данных API
      else if (anime.duration && anime.duration > 0) {
        episodeDuration = anime.duration;
      }
      // Приоритет 3: определяем по типу аниме
      else {
        switch (anime.kind) {
          case "movie":
            episodeDuration = 90;
            break;
          case "special":
            episodeDuration = 45;
            break;
          case "ona":
          case "ova":
            episodeDuration = 30;
            break;
          default:
            episodeDuration = 24; // TV серии
        }
      }

      // 3. Добавляем к общей статистике
      totalWatchedEpisodes += watchedEpisodes;
      totalWatchMinutes += watchedEpisodes * episodeDuration;
    }
  });

  // Рассчитываем часы и дни
  const totalHours = Math.floor(totalWatchMinutes / 60);
  const remainingMinutes = totalWatchMinutes % 60;
  const totalDays = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;

  // Средняя оценка
  const scoredAnime = Object.values(window.library).filter(
    (a) => a.score && a.score > 0
  );
  const avgScore =
    scoredAnime.length > 0
      ? (
          scoredAnime.reduce((sum, a) => sum + a.score, 0) / scoredAnime.length
        ).toFixed(1)
      : "0.0";

  // Процент завершенных
  const completionPercent =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  // ========== ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ==========

  // Обновляем личную статистику
  const hoursElement = document.getElementById("statHours");
  const episodesElement = document.getElementById("statEpisodes");
  const scoreElement = document.getElementById("statScore");
  const completionElement = document.getElementById("completionPercent");

  // Форматируем время просмотра - ТОЛЬКО ЧАСЫ
  if (hoursElement) {
    // Показываем общее количество часов (целое число)
    hoursElement.textContent = `${totalHours}`;
  }

  if (episodesElement) {
    episodesElement.textContent = totalWatchedEpisodes;
  }

  if (scoreElement) {
    scoreElement.textContent = avgScore;
  }

  if (completionElement) {
    completionElement.textContent = `${completionPercent}%`;
  }

  // Обновляем никнейм
  const savedUsername = window.appStorage.getUsername();
  const profileUsernameElement = document.getElementById("profileUsername");

  if (
    profileUsernameElement &&
    !profileUsernameElement.classList.contains("editing")
  ) {
    profileUsernameElement.innerHTML = `
      ${savedUsername} 
      <button class="edit-username-btn" onclick="startEditingUsername()">
        <i class="fas fa-pencil-alt"></i>
      </button>
    `;
  }

  // Обновляем username в модальном окне профиля
  const modalUsername = document.querySelector(".user-info .username");
  if (modalUsername) {
    modalUsername.textContent = savedUsername;
  }

  // Определяем любимый жанр
  const genreCount = {};
  Object.values(window.library).forEach((anime) => {
    if (anime.genres) {
      anime.genres.forEach((genre) => {
        // Исключаем демографические жанры
        if (!genre.includes("ён") && !genre.includes("ёдз")) {
          genreCount[genre] = (genreCount[genre] || 0) + 1;
        }
      });
    }
  });

  let favGenre = "Не указан";
  if (Object.keys(genreCount).length > 0) {
    const topGenre = Object.entries(genreCount).sort((a, b) => b[1] - a[1])[0];
    favGenre = topGenre[0];
  }

  const favGenreElement = document.getElementById("favGenre");
  if (favGenreElement) {
    favGenreElement.textContent = favGenre;
  }

  // Обновляем дату присоединения
  const joinDateElement = document.getElementById("joinDate");
  if (joinDateElement) {
    const libraryCreated = window.appStorage.get("libraryCreated");
    if (libraryCreated) {
      const date = new Date(parseInt(libraryCreated));
      joinDateElement.textContent = date.toLocaleDateString("ru-RU", {
        month: "long",
        year: "numeric",
      });
    } else {
      joinDateElement.textContent = new Date().getFullYear().toString();
    }
  }
}

window.updateAnimeDurations = async function () {
  if (!window.library) return;

  const animeToUpdate = Object.values(window.library).filter(
    (anime) => anime.status === "completed" && !anime.episodeDuration
  );

  if (animeToUpdate.length === 0) {
    showNotification("Все данные актуальны", "success");
    return;
  }

  showNotification(
    `Обновление данных для ${animeToUpdate.length} аниме...`,
    "info"
  );

  let updatedCount = 0;

  for (const anime of animeToUpdate.slice(0, 5)) {
    // Ограничиваем 5 запросами
    try {
      const details = await window.ShikimoriAPI.getAnimeDetails(anime.id);

      if (details && details.duration) {
        anime.episodeDuration = details.duration;
        anime.updatedAt = new Date().toISOString();
        updatedCount++;
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch (error) {
      console.error(`Ошибка обновления "${anime.title}":`, error);
    }
  }

  if (updatedCount > 0) {
    window.appStorage.setLibrary(window.library);
    showNotification(`Обновлены данные для ${updatedCount} аниме`, "success");
    loadProfileData(); // Пересчитываем статистику
  }
};

// ========== ГЛОБАЛЬНЫЕ ЭКСПОРТЫ ==========

window.handleProfileClick = handleProfileClick;
window.showProfilePage = showProfilePage;
window.hideProfilePage = hideProfilePage;
window.updateProfileStats = updateProfileStats;

// Заглушки для остальных функций
window.showSettingsPage = function () {
  showNotification("Раздел настроек в разработке", "info");
};

window.showAboutModal = function () {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal" style="max-width: 500px;">
      <div class="modal-header">
        <h2>О приложении Tsundoku</h2>
        <button class="close-modal">&times;</button>
      </div>
      <div class="modal-body">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <img src="assets/logo.svg" alt="Tsundoku" style="width: 450px; height: 110px;">
        </div>
        
        <div style="margin-bottom: 1.5rem;">
          <p><strong>Версия:</strong> ${window.appVersion || "0.9.9"}</p>
          <p><strong>Разработчик:</strong> morphine</p>
        </div>
        
        <p>Приложение для отслеживания просмотренных и планируемых аниме.</p>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => document.body.removeChild(modal);
  modal.querySelector(".close-modal").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => e.target === modal && closeModal());
};

window.changeAvatar = openAvatarModal; // Перенаправляем на новую функцию

window.checkAllAnnouncements = function () {
  if (window.checkAnnouncementsWithCache) {
    window.checkAnnouncementsWithCache();
    showNotification("Проверка анонсов запущена", "info");
  }
};

window.cleanupLibrary = function () {
  showNotification("Очистка дубликатов в разработке", "info");
};

window.refreshAllStatuses = function () {
  if (window.checkAndUpdateCompletedStatus) {
    window.checkAndUpdateCompletedStatus();
    showNotification("Обновление статусов запущено", "info");
  }
};

// Функция для перехода из профиля на другие страницы
window.switchFromProfile = function (status) {
  hideProfilePage();

  setTimeout(() => {
    const tab = document.querySelector(`.nav-tab[data-status="${status}"]`);
    if (tab) {
      const clickEvent = new MouseEvent("click", {
        view: window,
        bubbles: true,
        cancelable: true,
      });
      tab.dispatchEvent(clickEvent);

      document
        .querySelectorAll(".nav-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
    }
  }, 100);
};

// ========== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ==========

// Инициализация при загрузке модуля
document.addEventListener("DOMContentLoaded", function () {
  // Загружаем сохраненный аватар
  loadSavedAvatar();

  // Настраиваем Drag & Drop
  setTimeout(() => {
    setupDragAndDrop();
  }, 100);

  // Инициализируем нормальные обработчики табов
  setTimeout(() => {
    if (window.setupTabListeners) {
      window.setupTabListeners();
    }
  }, 500);

  // Добавляем обработчик для ESC в модальном окне аватара
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      const avatarModal = document.getElementById("avatarModal");
      if (avatarModal && !avatarModal.classList.contains("hidden")) {
        closeAvatarModal();
      }
    }
  });

  // Обработчик клика вне модального окна аватара
  document.addEventListener("click", function (e) {
    const avatarModal = document.getElementById("avatarModal");
    if (
      avatarModal &&
      !avatarModal.classList.contains("hidden") &&
      e.target === avatarModal
    ) {
      closeAvatarModal();
    }
  });
});

window.startEditingUsername = function () {
  const usernameElement = document.getElementById("profileUsername");
  const currentName = usernameElement.textContent.trim();

  // Создаем input для редактирования
  const input = document.createElement("input");
  input.type = "text";
  input.value = currentName;
  input.className = "username-input";
  input.maxLength = 30;

  // Заменяем содержимое на input
  usernameElement.innerHTML = "";
  usernameElement.appendChild(input);
  usernameElement.classList.add("editing");

  // Фокус и выделение текста
  input.focus();
  input.select();

  // Обработка сохранения по Enter
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      saveUsername(input.value.trim());
    } else if (e.key === "Escape") {
      cancelUsernameEdit();
    }
  });

  // Сохранение при потере фокуса
  input.addEventListener("blur", function () {
    setTimeout(() => {
      if (document.activeElement !== input) {
        saveUsername(input.value.trim());
      }
    }, 100);
  });
};

function saveUsername(newName) {
  if (!newName) return;

  const usernameElement = document.getElementById("profileUsername");
  const modalUsername = document.querySelector(".user-info .username");

  // Сохраняем в localStorage
  window.appStorage.setUsername(newName);

  // Обновляем на странице
  usernameElement.innerHTML = `${newName} <button class="edit-username-btn" onclick="startEditingUsername()"><i class="fas fa-pencil-alt"></i></button>`;
  usernameElement.classList.remove("editing");

  // Обновляем в модальном окне
  if (modalUsername) {
    modalUsername.textContent = newName;
  }

  showNotification("Имя пользователя обновлено", "success");
}

function cancelUsernameEdit() {
  const savedName = localStorage.getItem("userUsername") || "Аниме-энтузиаст";
  const usernameElement = document.getElementById("profileUsername");

  usernameElement.innerHTML = `${savedName} <button class="edit-username-btn" onclick="startEditingUsername()"><i class="fas fa-pencil-alt"></i></button>`;
  usernameElement.classList.remove("editing");
}

// Глобальные функции для управления табами
window.setupTabListeners = function () {
  const tabs = document.querySelectorAll(".nav-tab");

  if (tabs.length === 0) {
    return;
  }

  tabs.forEach((tab) => {
    // Удаляем все старые обработчики
    const newTab = tab.cloneNode(true);
    tab.parentNode.replaceChild(newTab, tab);
  });

  // Теперь настраиваем новые обработчики
  const updatedTabs = document.querySelectorAll(".nav-tab");

  updatedTabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();

      // Обновляем активный класс
      document.querySelectorAll(".nav-tab").forEach((t) => {
        t.classList.remove("active");
      });
      tab.classList.add("active");

      // Устанавливаем фильтр
      window.currentFilter = tab.dataset.status || "all";

      // Обновляем UI
      if (window.updateUI) {
        window.updateUI();
      }
    });
  });
};

// Функция показа страницы настроек
window.showSettingsPage = function () {
  closeProfileModal();

  // Скрываем ВСЕ секции контента (включая профиль)
  const contentArea = document.querySelector(".content-area");
  if (contentArea) {
    contentArea.querySelectorAll("section").forEach((section) => {
      section.classList.add("hidden");
      section.style.display = "none";
    });
  }

  // Убираем активный класс со всех табов
  document.querySelectorAll(".nav-tab").forEach((tab) => {
    tab.classList.remove("active");
  });

  // Закрываем все модальные окна перед открытием настроек
  if (window.closeAllModals) {
    window.closeAllModals();
  }

  // Показываем секцию настроек
  const settingsSection = document.getElementById("settingsSection");
  if (!settingsSection) {
    createSettingsPage();
  } else {
    settingsSection.classList.remove("hidden");
    settingsSection.style.display = "block";
  }

  // Загружаем текущие настройки
  loadSettings();
};

// Создание страницы настроек
function createSettingsPage() {
  const contentArea = document.querySelector(".content-area");

  const settingsHTML = `
    <section id="settingsSection">
      <div class="profile-header">
        <button class="btn-back" onclick="hideSettingsPage()">
          <i class="fas fa-arrow-left"></i> Назад
        </button>
        <h1>Настройки</h1>
      </div>
      
      <div class="settings-content">
        <!-- Общие настройки -->
        <div class="settings-section">
          <h2><i class="fas fa-cog"></i> Общие настройки</h2>
          
          <div class="setting-item">
            <div class="setting-info">
              <h3>Показывать уведомления</h3>
              <p>Показывать всплывающие уведомления</p>
            </div>
            <div class="setting-control">
              <label class="switch">
                <input type="checkbox" id="notificationsToggle" checked>
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>
        
        <!-- Настройки библиотеки -->
        <div class="settings-section">
          <h2><i class="fas fa-book"></i> Настройки библиотеки</h2>
          <div class="setting-item">
            <div class="setting-info">
              <h3>Автоматическая проверка статусов</h3>
              <p>Автоматически проверять вышедшие эпизоды</p>
            </div>
            <div class="setting-control">
              <label class="switch">
                <input type="checkbox" id="autoStatusCheckToggle" checked>
                <span class="slider"></span>
              </label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <h3>Проверка анонсов</h3>
              <p>Автоматически проверять новые анонсы</p>
            </div>
            <div class="setting-control">
              <label class="switch">
                <input type="checkbox" id="autoAnnouncementsToggle" checked>
                <span class="slider"></span>
              </label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <h3>Сортировка по умолчанию</h3>
              <p>Сортировка аниме в библиотеке</p>
            </div>
            <div class="setting-control">
              <select id="defaultSortSelect" class="setting-select">
                <option value="added">По дате добавления</option>
                <option value="title">По названию</option>
                <option value="updated">По дате обновления</option>
              </select>
            </div>
          </div>
        </div>
        
        <!-- Управление данными -->
                <div class="settings-section">
          <h2><i class="fas fa-database"></i> Управление данными</h2>
          
          <div class="setting-item">
            <div class="setting-info">
              <h3>Кэширование данных</h3>
              <p>Сохранять данные API для офлайн-работы</p>
              <small id="cacheSize">Размер кэша: 0 KB</small>
            </div>
            <div class="setting-control">
              <button class="btn-secondary" onclick="clearAPICache()">
                <i class="fas fa-trash"></i> Очистить кэш
              </button>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h3>Проверка обновлений</h3>
              <p>Проверка доступных обновлений приложения</p>
            </div>
            <div class="setting-control">
              <button class="btn-primary" onclick="checkForUpdatesManually()">
                <i class="fas fa-sync"></i> Проверить обновления
              </button>
            </div>
          </div>
        </div>
        
        <!-- Опасная зона -->
        <div class="settings-section danger-zone">
          <h2><i class="fas fa-exclamation-triangle"></i> Опасная зона</h2>
          
          <div class="setting-item">
            <div class="setting-info">
              <h3>Сброс всех данных</h3>
              <p>Удалить все данные приложения. Это действие нельзя отменить!</p>
            </div>
            <div class="setting-control">
              <button class="btn-danger" onclick="resetAllData()">
                <i class="fas fa-bomb"></i> Сбросить всё
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  contentArea.insertAdjacentHTML("beforeend", settingsHTML);
}

// Функция скрытия страницы настроек
window.hideSettingsPage = function () {
  const settingsSection = document.getElementById("settingsSection");
  if (settingsSection) {
    settingsSection.classList.add("hidden");
    settingsSection.style.display = "none";
  }

  // Скрываем профиль на всякий случай
  const profileSection = document.getElementById("profileSection");
  if (profileSection) {
    profileSection.classList.add("hidden");
    profileSection.style.display = "none";
  }

  // Возвращаемся к главной
  window.currentFilter = "all";

  // Показываем главные секции
  const mainSections = [
    "readyToWatchSection",
    "waitingEpisodesSection",
    "announcementsSection",
  ];

  mainSections.forEach((sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.remove("hidden");
      section.style.display = "block";
    }
  });

  // Скрываем секции фильтров
  const filterSections = [
    "plannedSection",
    "watchingSection",
    "completedSection",
    "postponedSection",
  ];

  filterSections.forEach((sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.add("hidden");
      section.style.display = "none";
    }
  });

  // Активируем таб "Главная"
  const allTab = document.querySelector('.nav-tab[data-status="all"]');
  if (allTab) {
    document.querySelectorAll(".nav-tab").forEach((t) => {
      t.classList.remove("active");
    });
    allTab.classList.add("active");
  }

  if (window.updateUI) {
    window.updateUI();
  }
};

// Функция для скрытия страницы настроек при клике на табы
function setupSettingsTabHandlers() {
  const tabs = document.querySelectorAll(".nav-tab");

  tabs.forEach((tab) => {
    tab.addEventListener("click", function (e) {
      // Проверяем, открыта ли страница настроек
      const settingsSection = document.getElementById("settingsSection");
      if (settingsSection && !settingsSection.classList.contains("hidden")) {
        // Скрываем страницу настроек
        hideSettingsPage();

        // Ждем немного и переключаемся на таб
        setTimeout(() => {
          const status = this.dataset.status;
          switchToTab(status);
        }, 100);

        e.preventDefault();
        e.stopPropagation();
      }
    });
  });
}

// Загрузка настроек
function loadSettings() {
  const settings = window.appStorage.getSettings();

  // Устанавливаем значения из сохраненных настроек
  const notificationsToggle = document.getElementById("notificationsToggle");
  const autoStatusCheckToggle = document.getElementById(
    "autoStatusCheckToggle"
  );
  const autoAnnouncementsToggle = document.getElementById(
    "autoAnnouncementsToggle"
  );

  if (notificationsToggle)
    notificationsToggle.checked = settings.notifications !== false;
  if (autoStatusCheckToggle)
    autoStatusCheckToggle.checked = settings.autoStatusCheck !== false;
  if (autoAnnouncementsToggle)
    autoAnnouncementsToggle.checked = settings.autoAnnouncements !== false;

  // Показываем размер кэша
  updateCacheSize();

  // Добавляем обработчики изменений
  addSettingsEventListeners(); // <-- Только один раз

  // Добавляем обработчики для табов при открытых настройках
  setupSettingsTabHandlers();
}

// Обновление размера кэша
function updateCacheSize() {
  let totalSize = 0;
  let cacheCount = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("api_cache_")) {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          totalSize += key.length * 2; // UTF-16 для ключа
          totalSize += item.length * 2; // UTF-16 для значения
          cacheCount++;
        }
      } catch (e) {
        // Пропускаем ошибки
      }
    }
  }

  const cacheSizeElement = document.getElementById("cacheSize");
  if (cacheSizeElement) {
    const sizeKB = Math.round(totalSize / 1024);
    cacheSizeElement.textContent = `Размер кэша: ${sizeKB} KB (${cacheCount} записей)`;
  }
}

// Добавление обработчиков событий для настроек
function addSettingsEventListeners() {
  // Уведомления
  const notificationsToggle = document.getElementById("notificationsToggle");
  if (notificationsToggle) {
    notificationsToggle.addEventListener("change", function () {
      saveSetting("notifications", this.checked);
      showNotification(
        this.checked ? "Уведомления включены" : "Уведомления отключены",
        "success"
      );
    });
  }

  // Автопроверка статусов
  const autoStatusCheckToggle = document.getElementById(
    "autoStatusCheckToggle"
  );
  if (autoStatusCheckToggle) {
    autoStatusCheckToggle.addEventListener("change", function () {
      saveSetting("autoStatusCheck", this.checked);
      showNotification(
        this.checked
          ? "Автопроверка статусов включена"
          : "Автопроверка статусов отключена",
        "success"
      );
    });
  }

  // Автопроверка анонсов
  const autoAnnouncementsToggle = document.getElementById(
    "autoAnnouncementsToggle"
  );
  if (autoAnnouncementsToggle) {
    autoAnnouncementsToggle.addEventListener("change", function () {
      saveSetting("autoAnnouncements", this.checked);
      showNotification(
        this.checked
          ? "Автопроверка анонсов включена"
          : "Автопроверка анонсов отключена",
        "success"
      );
    });
  }

  // Сортировка
  const defaultSortSelect = document.getElementById("defaultSortSelect");
  if (defaultSortSelect) {
    defaultSortSelect.addEventListener("change", function () {
      saveSetting("defaultSort", this.value);

      const sortNames = {
        added: "По дате добавления",
        title: "По названию",
        updated: "По дате обновления",
      };

      showNotification(
        `Сортировка изменена на: ${sortNames[this.value]}`,
        "success"
      );

      // Если библиотека открыта, применяем новую сортировку
      if (window.updateUI && window.library) {
        setTimeout(() => {
          window.updateUI();
        }, 500);
      }
    });
  }
}

// Сохранение настройки
function saveSetting(key, value) {
  const settings = JSON.parse(
    localStorage.getItem("tsundoku_settings") || "{}"
  );
  settings[key] = value;
  window.appStorage.setSettings(settings);

  // Показываем уведомление об успешном сохранении
  if (window.showNotification) {
    window.showNotification("Настройки сохранены", "success");
  }
}

// Функция для ручной проверки обновлений
window.checkForUpdatesManually = async function () {
  if (window.appUpdater) {
    const updateAvailable = await window.appUpdater.checkForUpdates();
    if (updateAvailable) {
      window.showNotification("Доступно обновление!", "info");
      window.appUpdater.showUpdateNotification();
    } else {
      window.showNotification("У вас последняя версия", "success");
    }
  }
};

// Функция очистки кэша API
window.clearAPICache = function () {
  if (
    confirm(
      "Вы уверены, что хотите очистить кэш API? Это может замедлить загрузку данных."
    )
  ) {
    if (window.ShikimoriAPI && window.ShikimoriAPI.clearCache) {
      window.ShikimoriAPI.clearCache("all");
      updateCacheSize();
      window.showNotification("Кэш API очищен", "success");
    }
  }
};

// Функция сброса всех данных
window.resetAllData = function () {
  if (
    confirm(
      "ВНИМАНИЕ! Это удалит ВСЕ ваши данные: библиотеку, анонсы, настройки. Это действие нельзя отменить!\n\nВы уверены?"
    )
  ) {
    if (
      confirm(
        "Последнее предупреждение: все данные будут потеряны. Продолжить?"
      )
    ) {
      window.appStorage.clear();
      window.location.reload();
    }
  }
};

// Закрытие настроек по ESC
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    const settingsSection = document.getElementById("settingsSection");
    if (settingsSection && !settingsSection.classList.contains("hidden")) {
      hideSettingsPage();
    }
  }
});
