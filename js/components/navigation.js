// Навигация и табы
import { updateUI } from "../modules/ui.js";
import { closeSearchResults } from "../modules/search.js";
import { hideProfilePage } from "./profile.js";

export function handleTabClick(tab) {
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
}

export function handleLogoClick(e) {
  e.preventDefault();
  closeSearchResults();

  // Закрываем результаты поиска если открыты
  if (window.closeSearchResults) {
    closeSearchResults();
  }

  // Если открыт профиль - закрываем его
  const profileSection = document.getElementById("profileSection");
  if (profileSection && !profileSection.classList.contains("hidden")) {
    hideProfilePage();
    return;
  }

  const homeTab = document.querySelector('.nav-tab[data-status="all"]');
  if (homeTab) {
    document
      .querySelectorAll(".nav-tab")
      .forEach((tab) => tab.classList.remove("active"));
    homeTab.classList.add("active");
    window.currentFilter = "all";
    updateUI();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

// Глобальная функция для логотипа
window.handleLogoClick = handleLogoClick;
