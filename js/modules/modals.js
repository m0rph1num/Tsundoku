// Модальные окна
import { escapeHTML, sanitizeHTML, isValidUrl } from "../core/utils.js";
import { saveAnimeToLibrary, deleteAnime } from "./library.js";
import { updateUI } from "./ui.js";
import { showNotification } from "./notifications.js";
import { normalizePosterUrl } from "../core/utils.js";

// Закрытие всех модальных окон
export function closeAllModals() {
  console.log("Закрытие всех модальных окон");

  const modals = document.querySelectorAll(".modal-overlay:not(.hidden)");
  modals.forEach((modal) => {
    modal.classList.add("hidden");
  });

  // Также скрываем профильное меню если открыто
  const profileModal = document.getElementById("profileModal");
  if (profileModal && profileModal.classList.contains("show")) {
    profileModal.classList.remove("show");
  }
}

export function closeModal(modal) {
  modal.classList.add("hidden");

  document.querySelectorAll(".status-option").forEach((option) => {
    option.classList.remove("active");
  });

  const episodeInput = document.getElementById("episodeInput");
  const episodeNumber = document.getElementById("episodeNumber");
  const confirmBtn = document.getElementById("confirmStatusBtn");

  if (episodeInput) episodeInput.classList.add("hidden");
  if (episodeNumber) episodeNumber.value = "";
  if (confirmBtn) confirmBtn.disabled = true;

  delete window.currentAnimeToAdd;
}

export function closeEditModal(modal) {
  modal.classList.add("hidden");
  delete window.currentAnimeToEdit;
}

// Добавление аниме из поиска
window.addAnimeFromSearch = async function (animeId) {
  try {
    console.log("Добавление аниме ID:", animeId);

    const animeDetails = await window.ShikimoriAPI.getAnimeDetails(animeId);

    if (!animeDetails.id || !animeDetails.name) {
      throw new Error("Недостаточно данных об аниме");
    }

    showStatusModal(animeDetails);
  } catch (error) {
    console.error("Ошибка добавления аниме:", error);

    if (error.message.includes("429")) {
      showNotification("Слишком много запросов. Подождите немного.", "error");
    } else {
      showNotification(
        "Не удалось добавить аниме. Попробуйте еще раз.",
        "error"
      );
    }
  }
};

// Модальное окно выбора статуса
export function showStatusModal(animeDetails) {
  const modal = document.getElementById("statusModal");
  const episodeInput = document.getElementById("episodeInput");
  const episodeNumber = document.getElementById("episodeNumber");
  const confirmBtn = document.getElementById("confirmStatusBtn");

  if (!modal || !episodeInput || !episodeNumber || !confirmBtn) {
    console.error("Элементы модального окна не найдены");
    return;
  }

  window.currentAnimeToAdd = animeDetails;

  // Закрываем все модальные окна перед открытием нового
  closeAllModals();

  modal.classList.remove("hidden");
  episodeInput.classList.add("hidden");
  episodeNumber.value = "";
  confirmBtn.disabled = true;

  document.querySelectorAll(".status-option").forEach((option) => {
    option.classList.remove("active");
  });

  document.querySelectorAll(".status-option").forEach((option) => {
    option.onclick = () => {
      document.querySelectorAll(".status-option").forEach((opt) => {
        opt.classList.remove("active");
      });

      option.classList.add("active");

      if (option.dataset.status === "watching") {
        episodeInput.classList.remove("hidden");
        episodeNumber.focus();
      } else {
        episodeInput.classList.add("hidden");
      }

      confirmBtn.disabled = false;
    };
  });

  confirmBtn.onclick = () => {
    const selectedStatus = document.querySelector(".status-option.active")
      ?.dataset.status;

    if (!selectedStatus) {
      showNotification("Пожалуйста, выберите статус", "warning");
      return;
    }

    let currentEpisode = 0;
    if (selectedStatus === "watching") {
      const episodeValue = parseInt(episodeNumber.value);
      if (!episodeValue || episodeValue < 1) {
        showNotification("Введите корректный номер эпизода", "warning");
        return;
      }
      currentEpisode = episodeValue;
    }

    const animeData = {
      id: animeDetails.id,
      shikimoriId: animeDetails.id,
      title: animeDetails.russian || animeDetails.name,
      originalTitle: animeDetails.name,
      poster: animeDetails.image
        ? `https://shikimori.one${animeDetails.image.original}`
        : "",
      posterPreview: animeDetails.image
        ? `https://shikimori.one${animeDetails.image.preview}`
        : "",
      kind: animeDetails.kind || "unknown",
      episodes: animeDetails.episodes || 0,
      episodesAired: animeDetails.episodes_aired || 0,
      status: selectedStatus,
      score: animeDetails.score || 0,
      rating: animeDetails.rating || "none",
      genres: (animeDetails.genres || []).map((g) => g.russian || g.name),
      airedOn: animeDetails.aired_on || "",
      releasedOn: animeDetails.released_on || "",
      description: animeDetails.description || "Описание отсутствует",
      descriptionHtml: animeDetails.description_html || "",
      shikimoriStatus: animeDetails.status || "",
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentEpisode: currentEpisode,
      duration: animeDetails.duration || 24, // Длительность эпизода в минутах
    };

    saveAnimeToLibrary(animeData.id, animeData);
    updateUI();
    closeModal(modal);

    const searchSection = document.getElementById("searchResultsSection");
    if (searchSection && !searchSection.classList.contains("hidden")) {
      if (window.closeSearchResults) {
        window.closeSearchResults();
      }
    }

    const statusText = getStatusTextFromStatus(selectedStatus);
    showNotification(
      `"${animeData.title}" добавлено в библиотеку как "${statusText}"!`,
      "success"
    );
  };

  const cancelBtn = document.getElementById("cancelStatusBtn");
  if (cancelBtn) {
    cancelBtn.onclick = () => {
      closeModal(modal);
    };
  }

  document.addEventListener("keydown", function closeOnEsc(e) {
    if (e.key === "Escape") {
      closeModal(modal);
      document.removeEventListener("keydown", closeOnEsc);
    }
  });

  modal.addEventListener("click", function closeOnOutsideClick(e) {
    if (e.target === modal) {
      closeModal(modal);
      modal.removeEventListener("click", closeOnOutsideClick);
    }
  });
}

// Редактирование аниме
export function showEditAnimeModal(animeId) {
  const anime = window.library[animeId];
  if (!anime) return;

  const modal = document.getElementById("editAnimeModal");
  const episodeInput = document.getElementById("editEpisodeInput");
  const episodeNumber = document.getElementById("editEpisodeNumber");
  const currentEpisode = document.getElementById("editCurrentEpisode");
  const posterUrlInput = document.getElementById("editPosterUrl");
  const posterPreview = document.getElementById("posterPreview");
  const currentPosterPreview = document.getElementById("currentPosterPreview");
  const confirmBtn = document.getElementById("confirmEditBtn");
  const deleteBtn = document.getElementById("deleteAnimeBtn");

  if (!modal || !episodeInput || !episodeNumber || !confirmBtn || !deleteBtn) {
    console.error("Элементы модального окна редактирования не найдены");
    return;
  }

  window.currentAnimeToEdit = animeId;

  document.getElementById("editAnimeTitle").textContent = anime.title;

  // Закрываем все модальные окна перед открытием нового
  closeAllModals();

  modal.classList.remove("hidden");
  episodeInput.classList.add("hidden");
  episodeNumber.value = anime.currentEpisode || 0;

  if (posterUrlInput) {
    posterUrlInput.value = anime.poster || "";
  }

  if (currentPosterPreview) {
    currentPosterPreview.src =
      anime.poster || anime.posterPreview || "assets/placeholder-poster.png";
    currentPosterPreview.onerror = function () {
      this.src = "assets/placeholder-poster.png";
    };
  }

  if (posterUrlInput && posterPreview) {
    posterUrlInput.addEventListener("input", function () {
      if (this.value.trim()) {
        posterPreview.src = this.value;
        posterPreview.style.display = "block";
      } else {
        posterPreview.style.display = "none";
      }
    });

    if (posterUrlInput.value.trim()) {
      posterPreview.src = posterUrlInput.value;
      posterPreview.style.display = "block";
    } else {
      posterPreview.style.display = "none";
    }

    posterPreview.onerror = function () {
      this.src = "assets/placeholder-poster.png";
      showNotification(
        "Не удалось загрузить изображение. Проверьте URL.",
        "warning"
      );
    };
  }

  if (currentEpisode) {
    currentEpisode.textContent = anime.currentEpisode || 0;
  }

  document.querySelectorAll(".edit-status-option").forEach((option) => {
    option.classList.remove("active");
    if (option.dataset.status === anime.status) {
      option.classList.add("active");
    }
  });

  if (anime.status === "watching") {
    episodeInput.classList.remove("hidden");
  }

  document.querySelectorAll(".edit-status-option").forEach((option) => {
    option.onclick = () => {
      document.querySelectorAll(".edit-status-option").forEach((opt) => {
        opt.classList.remove("active");
      });
      option.classList.add("active");

      if (option.dataset.status === "watching") {
        episodeInput.classList.remove("hidden");
        episodeNumber.focus();
      } else {
        episodeInput.classList.add("hidden");
      }
    };
  });

  confirmBtn.onclick = () => {
    const selectedStatus = document.querySelector(".edit-status-option.active")
      ?.dataset.status;

    if (!selectedStatus) {
      showNotification("Пожалуйста, выберите статус", "warning");
      return;
    }

    let currentEpisode = 0;
    if (selectedStatus === "watching") {
      const episodeValue = parseInt(episodeNumber.value);
      if (!episodeValue || episodeValue < 0) {
        showNotification("Введите корректный номер эпизода", "warning");
        return;
      }
      currentEpisode = episodeValue;
    }

    let newPosterUrl = "";
    if (posterUrlInput) {
      newPosterUrl = posterUrlInput.value.trim();

      if (newPosterUrl && !isValidUrl(newPosterUrl)) {
        showNotification("Введите корректный URL изображения", "warning");
        return;
      }
    }

    anime.status = selectedStatus;
    anime.currentEpisode = currentEpisode;

    if (newPosterUrl) {
      anime.poster = newPosterUrl;
    }

    anime.updatedAt = new Date().toISOString();

    window.library[animeId] = anime;
    localStorage.setItem("tsundoku-library", JSON.stringify(window.library));

    updateUI();
    closeEditModal(modal);

    const statusText = getStatusTextFromStatus(selectedStatus);
    showNotification(`"${anime.title}" обновлено!`, "success");
  };

  deleteBtn.onclick = () => {
    if (
      confirm(`Вы уверены, что хотите удалить "${anime.title}" из библиотеки?`)
    ) {
      deleteAnime(animeId);
      closeEditModal(modal);
      showNotification(`"${anime.title}" удалено из библиотеки`, "success");
    }
  };

  const cancelBtn = document.getElementById("cancelEditBtn");
  if (cancelBtn) {
    cancelBtn.onclick = () => {
      closeEditModal(modal);
    };
  }

  document.addEventListener("keydown", function closeOnEsc(e) {
    if (e.key === "Escape") {
      closeEditModal(modal);
      document.removeEventListener("keydown", closeOnEsc);
    }
  });

  modal.addEventListener("click", function closeOnOutsideClick(e) {
    if (e.target === modal) {
      closeEditModal(modal);
      modal.removeEventListener("click", closeOnOutsideClick);
    }
  });
}

// Показ деталей аниме
window.showAnimeDetails = async function (animeId) {
  try {
    console.log("Загрузка деталей аниме ID:", animeId);

    const detailModal = document.getElementById("detailModal");
    const content = document.getElementById("animeDetailContent");
    const title = document.getElementById("animeDetailTitle");

    if (!detailModal || !content || !title) {
      if (window.showNotification) {
        window.showNotification("Ошибка отображения деталей", "error");
      }
      return;
    }

    title.textContent = "Загрузка...";
    content.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin fa-2x"></i>
                <p>Загрузка информации об аниме...</p>
            </div>
        `;

    // Закрываем все модальные окна перед открытием нового
    closeAllModals();

    detailModal.classList.remove("hidden");

    // Добавляем задержку перед запросом для избежания 429 ошибки
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const animeDetails = await window.ShikimoriAPI.getAnimeDetails(animeId);

    if (window.showAnimeDetailModal) {
      window.showAnimeDetailModal(animeDetails);
    } else {
      console.error("Функция showAnimeDetailModal не найдена");
      showNotification("Ошибка отображения деталей", "error");
    }
  } catch (error) {
    console.error("Ошибка загрузки деталей:", error);

    const content = document.getElementById("animeDetailContent");
    const title = document.getElementById("animeDetailTitle");

    let errorMessage = "Не удалось загрузить информацию";
    let errorDetails = "";

    if (
      error.message.includes("429") ||
      error.message.includes("Too Many Requests")
    ) {
      errorMessage = "Слишком много запросов к Shikimori";
      errorDetails =
        "API Shikimori временно ограничил количество запросов. Подождите 1-2 минуты и попробуйте снова.";
    } else if (
      error.message.includes("404") ||
      error.message.includes("Not Found")
    ) {
      errorMessage = "Аниме не найдено";
      errorDetails = "Информация об этом аниме недоступна или была удалена.";
    } else if (
      error.message.includes("Network Error") ||
      error.message.includes("Failed to fetch")
    ) {
      errorMessage = "Ошибка сети";
      errorDetails = "Проверьте подключение к интернету.";
    } else {
      errorDetails = error.message || "Неизвестная ошибка";
    }

    if (content) {
      content.innerHTML = `
        <div class="error-state" style="text-align: center; padding: 3rem; color: var(--text-color);">
          <i class="fas fa-exclamation-triangle fa-3x" style="color: var(--warning); margin-bottom: 1.5rem;"></i>
          <h3 style="font-size: var(--text-20); font-weight: 600; margin-bottom: 1rem;">${escapeHTML(
            errorMessage
          )}</h3>
          <p style="color: var(--text-secondary); margin-bottom: 2rem; line-height: 1.5;">
            ${escapeHTML(errorDetails)}
          </p>
          <div style="display: flex; gap: 1rem; justify-content: center;">
            <button class="btn-primary" onclick="window.showAnimeDetails(${animeId})" style="min-width: 140px;">
              <i class="fas fa-redo"></i> Попробовать снова
            </button>
            <button class="btn-secondary" onclick="window.closeAllModals && window.closeAllModals()" style="min-width: 140px;">
              <i class="fas fa-times"></i> Закрыть
            </button>
          </div>
        </div>
      `;
    }

    if (title) {
      title.textContent = "Ошибка загрузки";
    }

    // Показываем уведомление только для не-429 ошибок (чтобы не спамить)
    if (!error.message.includes("429") && window.showNotification) {
      window.showNotification(errorMessage, "error");
    }
  }
};

function showAnimeDetailModal(animeDetails) {
  const modal = document.getElementById("detailModal");
  const modalBody = document.querySelector("#detailModal .modal-body");
  const title = document.getElementById("animeDetailTitle");
  const content = document.getElementById("animeDetailContent");

  if (!modal || !modalBody || !title || !content) return;

  const safeTitle = escapeHTML(animeDetails.russian || animeDetails.name);
  const safeOriginalTitle = escapeHTML(animeDetails.name);
  const safeKind = escapeHTML(animeDetails.kind || "Неизвестно");
  const safeEpisodes = animeDetails.episodes || "?";
  const safeStatus = getStatusText(animeDetails.status);
  const safeScore = animeDetails.score || "N/A";
  const safeAiredOn = escapeHTML(animeDetails.aired_on || "Неизвестно");

  // ВАЖНО: Единая логика определения постера
  let posterUrl = "assets/placeholder-poster.png";

  // 1. Проверяем кастомный постер из библиотеки
  if (window.library && window.library[animeDetails.id]) {
    const libraryAnime = window.library[animeDetails.id];
    if (
      libraryAnime.customPosterUrl &&
      libraryAnime.customPosterUrl !== "assets/placeholder-poster.png"
    ) {
      posterUrl = libraryAnime.customPosterUrl;
    } else if (
      libraryAnime.poster &&
      libraryAnime.poster !== "assets/placeholder-poster.png"
    ) {
      posterUrl = libraryAnime.poster;
    }
  }

  // 2. Если нет в библиотеке, проверяем кастомный постер из анонсов
  if (
    posterUrl === "assets/placeholder-poster.png" &&
    animeDetails.customPosterUrl
  ) {
    posterUrl = animeDetails.customPosterUrl;
  }

  // 3. Если нет кастомного, берем из данных API
  if (posterUrl === "assets/placeholder-poster.png") {
    if (animeDetails.image?.original) {
      // Проверяем, это полный URL или относительный
      if (animeDetails.image.original.startsWith("http")) {
        posterUrl = animeDetails.image.original;
      } else {
        posterUrl = `https://shikimori.one${animeDetails.image.original}`;
      }
    } else if (animeDetails.image?.preview) {
      if (animeDetails.image.preview.startsWith("http")) {
        posterUrl = animeDetails.image.preview;
      } else {
        posterUrl = `https://shikimori.one${animeDetails.image.preview}`;
      }
    } else if (
      animeDetails.poster &&
      animeDetails.poster !== "assets/placeholder-poster.png"
    ) {
      posterUrl = animeDetails.poster;
    }
  }

  // Нормализуем URL если нужно
  posterUrl = normalizePosterUrl(posterUrl);

  let description = "Описание отсутствует";
  if (animeDetails.description) {
    description = cleanShikimoriDescription(animeDetails.description);
  } else if (animeDetails.description_html) {
    description = cleanShikimoriHTML(animeDetails.description_html);
  }

  let genresHTML = "";
  if (animeDetails.genres && animeDetails.genres.length > 0) {
    genresHTML = animeDetails.genres
      .map(
        (genre) =>
          `<span class="genre-tag">${escapeHTML(
            genre.russian || genre.name
          )}</span>`
      )
      .join("");
  }

  title.textContent = safeTitle;

  content.innerHTML = `
        <div class="anime-detail">
            <div class="detail-header">
                <img src="${posterUrl}" 
                     alt="${safeTitle}"
                     class="detail-poster"
                     onerror="this.src='assets/placeholder-poster.png'">
                <div class="detail-info">
                    <h2>${safeTitle}</h2>
                    <p class="detail-original">${safeOriginalTitle}</p>
                    
                    <div class="detail-stats">
                        <div class="stat">
                            <span class="stat-label">Тип:</span>
                            <span class="stat-value">${safeKind}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Эпизоды:</span>
                            <span class="stat-value">${safeEpisodes}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Статус:</span>
                            <span class="stat-value">${safeStatus}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Рейтинг:</span>
                            <span class="stat-value">${safeScore}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Дата выхода:</span>
                            <span class="stat-value">${safeAiredOn}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            ${
              genresHTML
                ? `<div class="detail-genres-section">
                    <h3>Жанры</h3>
                    <div class="detail-genres">${genresHTML}</div>
                    </div>`
                : ""
            }
            
            <div class="detail-description">
                <h3>Описание</h3>
                <div class="description-text">
                    ${description}
                </div>
            </div>
        </div>
    `;

  // Закрываем все модальные окна перед открытием нового
  closeAllModals();

  modal.classList.remove("hidden");
  modalBody.style.overflowY = "auto";

  setTimeout(() => {
    adjustModalHeight();
    handleLongDescriptions();
  }, 50);
}

function cleanShikimoriDescription(text) {
  if (!text) return "Описание отсутствует";

  let cleaned = text;
  cleaned = cleaned.replace(/\[character=\d+\](.*?)\[\/character\]/g, "$1");
  cleaned = cleaned.replace(/\[.*?\]/g, "");
  cleaned = cleaned.replace(/\n/g, "<br>");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  cleaned = sanitizeHTML(cleaned);

  return cleaned || "Описание отсутствует";
}

function cleanShikimoriHTML(html) {
  if (!html) return "Описание отсутствует";

  let cleaned = html;
  cleaned = cleaned.replace(/<a[^>]*class="b-link"[^>]*>.*?<\/a>/g, "");
  cleaned = cleaned.replace(/<div[^>]*class="b-spoiler"[^>]*>.*?<\/div>/gs, "");
  cleaned = cleaned.replace(/<div[^>]*class="b-quote"[^>]*>.*?<\/div>/gs, "");
  cleaned = cleaned.replace(/<br\s*\/?>/g, "<br>");
  cleaned = cleaned.replace(/<p>/g, "");
  cleaned = cleaned.replace(/<\/p>/g, "<br><br>");
  cleaned = cleaned.replace(/<b>/g, "<strong>");
  cleaned = cleaned.replace(/<\/b>/g, "</strong>");
  cleaned = cleaned.replace(/<i>/g, "<em>");
  cleaned = cleaned.replace(/<\/i>/g, "</em>");

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = cleaned;
  cleaned = tempDiv.textContent || tempDiv.innerText || "";

  if (cleaned.length > 1500) {
    cleaned = cleaned.substring(0, 1500) + "...";
  }

  cleaned = cleaned.replace(/\n/g, "<br>");

  return cleaned || "Описание отсутствует";
}

function getStatusText(status) {
  const statusMap = {
    anons: "Анонсировано",
    ongoing: "Онгоинг",
    released: "Вышло",
  };
  return statusMap[status] || status || "Неизвестно";
}

function handleLongDescriptions() {
  const descriptionText = document.querySelector(
    "#detailModal .description-text"
  );
  if (!descriptionText) return;

  const text = descriptionText.textContent || descriptionText.innerText;

  if (
    text.length > 2000 &&
    !descriptionText.classList.contains("long-handled")
  ) {
    descriptionText.classList.add("long-handled");

    const originalHTML = descriptionText.innerHTML;
    const truncated = text.substring(0, 1500) + "...";

    descriptionText.innerHTML = truncated;

    const readMoreBtn = document.createElement("button");
    readMoreBtn.className = "read-more-btn";
    readMoreBtn.innerHTML =
      '<i class="fas fa-chevron-down"></i> Показать полностью';
    readMoreBtn.onclick = function () {
      descriptionText.innerHTML = originalHTML;
      this.style.display = "none";

      setTimeout(() => {
        adjustModalHeight();
      }, 10);
    };

    const descriptionSection = descriptionText.closest(".detail-description");
    if (descriptionSection) {
      descriptionSection.appendChild(readMoreBtn);
    }
  }
}

function adjustModalHeight() {
  const modal = document.getElementById("detailModal");
  const modalElement = modal?.querySelector(".modal");
  const modalBody = modal?.querySelector(".modal-body");

  if (!modal || !modalElement || !modalBody) return;

  const windowHeight = window.innerHeight;
  const maxModalHeight = windowHeight - 100;

  modalElement.style.maxHeight = maxModalHeight + "px";
  modalBody.style.maxHeight = maxModalHeight - 120 + "px";
}

export function showAnnouncementPosterModal(
  animeId,
  animeTitle,
  currentPoster
) {
  // Используем существующее модальное окно редактирования
  const modal = document.getElementById("editAnimeModal");
  const editPosterUrl = document.getElementById("editPosterUrl");
  const posterPreview = document.getElementById("posterPreview");
  const currentPosterPreview = document.getElementById("currentPosterPreview");
  const confirmBtn = document.getElementById("confirmEditBtn");
  const deleteBtn = document.getElementById("deleteAnimeBtn");

  if (!modal) {
    console.error("Модальное окно редактирования не найдено");
    return;
  }

  // Настраиваем для работы с анонсом
  document.getElementById(
    "editAnimeTitle"
  ).textContent = `Редактировать постер: ${animeTitle}`;

  // Скрываем ненужные элементы для анонсов
  document
    .querySelectorAll(".edit-status-options, .edit-episode-input")
    .forEach((el) => {
      el.style.display = "none";
    });

  // Показываем только поле для постера
  const editPosterInput = document.getElementById("editPosterInput");
  if (editPosterInput) {
    editPosterInput.style.display = "block";
  }

  // Заполняем поле текущим постером
  if (editPosterUrl) {
    editPosterUrl.value = currentPoster || "";
  }

  // Обновляем превью
  if (currentPosterPreview) {
    currentPosterPreview.src = currentPoster || "assets/placeholder-poster.png";
    currentPosterPreview.onerror = function () {
      this.src = "assets/placeholder-poster.png";
    };
  }

  // Настраиваем превью при вводе
  if (editPosterUrl && posterPreview) {
    editPosterUrl.addEventListener("input", function () {
      if (this.value.trim()) {
        posterPreview.src = this.value;
        posterPreview.style.display = "block";
      } else {
        posterPreview.style.display = "none";
      }
    });

    if (editPosterUrl.value.trim()) {
      posterPreview.src = editPosterUrl.value;
      posterPreview.style.display = "block";
    }
  }

  // Переопределяем кнопку сохранения для анонсов
  const originalClick = confirmBtn.onclick;
  confirmBtn.onclick = function () {
    const newPosterUrl = editPosterUrl ? editPosterUrl.value.trim() : "";

    if (newPosterUrl) {
      // Используем существующую функцию обновления
      if (window.updateAnnouncementPoster) {
        const success = window.updateAnnouncementPoster(animeId, newPosterUrl);
        if (success) {
          // Обновляем отображение анонсов
          if (window.renderAnnouncements) {
            window.renderAnnouncements();
          }

          // Показываем уведомление
          if (window.showNotification) {
            window.showNotification("Постер успешно обновлен!", "success");
          }

          // Закрываем модальное окно
          closeEditModal(modal);
        }
      }
    } else {
      if (window.showNotification) {
        window.showNotification("Введите URL постера", "warning");
      }
    }
  };

  // Скрываем кнопку удаления для анонсов
  if (deleteBtn) {
    deleteBtn.style.display = "none";
  }

  // Закрываем все модальные окна перед открытием нового
  closeAllModals();

  // Показываем модальное окно
  modal.classList.remove("hidden");

  // Восстанавливаем оригинальный обработчик при закрытии
  const closeHandler = () => {
    confirmBtn.onclick = originalClick;
    if (deleteBtn) deleteBtn.style.display = "block";
    document
      .querySelectorAll(".edit-status-options, .edit-episode-input")
      .forEach((el) => {
        el.style.display = "";
      });
  };

  // Добавляем обработчики закрытия
  const closeBtn = document.getElementById("closeEditModal");
  const cancelBtn = document.getElementById("cancelEditBtn");

  if (closeBtn) {
    const originalCloseHandler = closeBtn.onclick;
    closeBtn.onclick = () => {
      closeHandler();
      if (originalCloseHandler) originalCloseHandler();
    };
  }

  if (cancelBtn) {
    const originalCancelHandler = cancelBtn.onclick;
    cancelBtn.onclick = () => {
      closeHandler();
      if (originalCancelHandler) originalCancelHandler();
    };
  }

  // Закрытие по клику вне модалки
  modal.addEventListener("click", function closeOnOutside(e) {
    if (e.target === modal) {
      closeHandler();
      closeEditModal(modal);
      modal.removeEventListener("click", closeOnOutside);
    }
  });

  // Закрытие по ESC
  document.addEventListener("keydown", function closeOnEsc(e) {
    if (e.key === "Escape") {
      closeHandler();
      closeEditModal(modal);
      document.removeEventListener("keydown", closeOnEsc);
    }
  });
}

// Экспортируем глобальные функции
window.addAnimeFromSearch = addAnimeFromSearch;
window.showAnimeDetailModal = showAnimeDetailModal;
window.showStatusModal = showStatusModal;
window.showEditAnimeModal = showEditAnimeModal;
window.closeAllModals = closeAllModals;
