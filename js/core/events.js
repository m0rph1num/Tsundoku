// Обработчики событий
import {
  handleProfileClick,
  closeProfileModal,
} from "../components/profile.js";
import { handleTabClick } from "../components/navigation.js";
import { closeAllModals } from "../modules/modals.js";
import { handleLogoClick } from "../components/navigation.js";
import { hideProfilePage } from "../components/profile.js";

// Функция для обработки кликов по карточкам анонсов
function setupAnnouncementCardListeners() {
  // Используем делегирование событий для динамически создаваемых карточек
  document.addEventListener("click", (e) => {
    // 1. Клик по карточке анонса
    const announcementCard = e.target.closest(".announcement-card");
    if (announcementCard) {
      // Если клик по кнопке добавления - пропускаем
      if (e.target.closest(".btn-add-announcement")) {
        return;
      }

      // Клик по самой карточке - показываем детали
      const animeId = announcementCard.dataset.id;
      if (animeId && window.showAnimeDetails) {
        e.preventDefault();
        e.stopPropagation();
        window.showAnimeDetails(animeId);
      }
      return;
    }

    // 2. Клик по кнопке добавления анонса (на случай, если карточка еще не существует)
    const addButton = e.target.closest(".btn-add-announcement");
    if (addButton && !addButton.closest(".announcement-card")) {
      e.preventDefault();
      e.stopPropagation();

      // Получаем ID аниме из атрибута onclick
      const onclickAttr = addButton.getAttribute("onclick");
      if (onclickAttr && onclickAttr.includes("addAnnouncementToLibrary")) {
        // Извлекаем ID из строки
        const match = onclickAttr.match(/addAnnouncementToLibrary\((\d+)\)/);
        if (match && match[1]) {
          const animeId = parseInt(match[1]);
          if (window.addAnnouncementToLibrary) {
            window.addAnnouncementToLibrary(animeId);
          }
        }
      }
      return;
    }
  });
}

export function setupEventListeners() {
  // Добавляем обработчики для карточек анонсов
  setupAnnouncementCardListeners();

  // Закрытие модальных окон
  document.querySelectorAll(".close-modal").forEach((btn) => {
    btn.addEventListener("click", closeAllModals);
  });

  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeAllModals();
    });
  });

  // ESC для закрытия всех модалок
  document.addEventListener("keydown", handleEscapeKey);

  // Инициализация табов навигации - ВЫЗЫВАЕМ ГЛОБАЛЬНУЮ ФУНКЦИЮ
  if (window.setupTabListeners) {
    window.setupTabListeners();
  }

  // Клик по логотипу
  const logo = document.querySelector(".logo");
  if (logo) {
    logo.addEventListener("click", handleLogoClick);
  }

  // Клик по документу для закрытия профиля
  document.addEventListener("click", handleDocumentClick);

  // Кнопка проверки анонсов
  const checkAnnouncementsBtn = document.getElementById(
    "checkAnnouncementsBtn"
  );
  if (checkAnnouncementsBtn) {
    checkAnnouncementsBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (window.isCheckingAnnouncements) {
        showNotification("Проверка уже выполняется", "info");
        return;
      }

      checkAnnouncementsBtn.classList.add("loading");
      checkAnnouncementsBtn.disabled = true;

      try {
        await window.checkAnnouncementsWithCache();
      } finally {
        checkAnnouncementsBtn.classList.remove("loading");
        checkAnnouncementsBtn.disabled = false;
      }
    });
  }
}

function handleEscapeKey(e) {
  if (e.key === "Escape") {
    const detailModal = document.getElementById("detailModal");
    const statusModal = document.getElementById("statusModal");
    const editModal = document.getElementById("editAnimeModal");

    if (detailModal && !detailModal.classList.contains("hidden")) {
      closeAllModals();
      e.preventDefault();
      return;
    }

    if (statusModal && !statusModal.classList.contains("hidden")) {
      import("../modules/modals.js").then((module) => {
        module.closeModal(statusModal);
      });
      e.preventDefault();
      return;
    }

    if (editModal && !editModal.classList.contains("hidden")) {
      import("../modules/modals.js").then((module) => {
        module.closeEditModal(editModal);
      });
      e.preventDefault();
      return;
    }

    const searchSection = document.getElementById("searchResultsSection");
    if (searchSection && !searchSection.classList.contains("hidden")) {
      if (window.closeSearchResults) {
        window.closeSearchResults();
      }
      e.preventDefault();
    }

    // Закрываем профиль если открыт
    const profileSection = document.getElementById("profileSection");
    if (profileSection && !profileSection.classList.contains("hidden")) {
      hideProfilePage();
      e.preventDefault();
    }

    closeProfileModal();
  }
}

function handleDocumentClick(e) {
  const profileModal = document.getElementById("profileModal");
  const profileBtn = document.getElementById("profileBtn");

  if (
    profileModal &&
    profileBtn &&
    !profileBtn.contains(e.target) &&
    !profileModal.contains(e.target) &&
    profileModal.classList.contains("show")
  ) {
    profileModal.classList.remove("show");
    profileBtn.classList.remove("active");
  }
}
