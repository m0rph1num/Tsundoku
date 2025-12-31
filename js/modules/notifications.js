// Система уведомлений
import { escapeHTML } from "../core/utils.js";

export function showNotification(message, type = "info", options = {}) {
  // Удаляем старые уведомления
  document.querySelectorAll(".notification").forEach((n) => n.remove());

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;

  // Настройки по умолчанию
  const defaultOptions = {
    duration: 3000,
    icon: true,
    progressBar: true,
    closeButton: true,
    position: "top-right",
    animation: "slide-in",
  };

  const config = { ...defaultOptions, ...options };

  // Определяем иконку
  const iconClass =
    type === "success"
      ? "fa-check-circle"
      : type === "error"
      ? "fa-exclamation-circle"
      : type === "warning"
      ? "fa-exclamation-triangle"
      : "fa-info-circle";

  // Определяем цветовую схему
  const typeColors = {
    success: { bg: "#4CAF50", text: "#ffffff" },
    error: { bg: "#F44336", text: "#ffffff" },
    warning: { bg: "#FF9800", text: "#ffffff" },
    info: { bg: "#2196F3", text: "#ffffff" },
  };

  const colors = typeColors[type] || typeColors.info;

  // Создаем HTML уведомления
  notification.innerHTML = `
    <div class="notification-container">
      <div class="notification-header">
        ${
          config.icon
            ? `<i class="fas ${iconClass} notification-icon"></i>`
            : ""
        }
        <span class="notification-title">${getNotificationTitle(type)}</span>
        ${
          config.closeButton
            ? `<button class="notification-close">&times;</button>`
            : ""
        }
      </div>
      <div class="notification-message">${escapeHTML(message)}</div>
      ${config.progressBar ? `<div class="notification-progress"></div>` : ""}
    </div>
  `;

  // Применяем стили
  notification.style.backgroundColor = colors.bg;
  notification.style.color = colors.text;

  // Добавляем уведомление на страницу
  document.body.appendChild(notification);

  // Обработчик закрытия
  const closeBtn = notification.querySelector(".notification-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      hideNotification(notification);
    });
  }

  // Клик по уведомлению для закрытия
  notification.addEventListener("click", () => {
    if (config.closeOnClick) {
      hideNotification(notification);
    }
  });

  // Анимация прогресс-бара
  if (config.progressBar) {
    const progressBar = notification.querySelector(".notification-progress");
    progressBar.style.transition = `width ${config.duration}ms linear`;
    progressBar.style.width = "100%";
  }

  // Автоматическое скрытие
  setTimeout(() => {
    hideNotification(notification);
  }, config.duration);
}

// Вспомогательная функция для скрытия уведомления
function hideNotification(notification) {
  notification.style.opacity = "0";
  notification.style.transform = "translateX(100%)";
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 300);
}

// Вспомогательная функция для получения заголовка уведомления
function getNotificationTitle(type) {
  const titles = {
    success: "Успех",
    error: "Ошибка",
    warning: "Предупреждение",
    info: "Информация",
  };
  return titles[type] || "Информация";
}

// Расширенная функция для показа уведомлений с действиями
export function showActionNotification(message, type, actions) {
  const notification = document.createElement("div");
  notification.className = `notification ${type} action-notification`;

  const typeColors = {
    success: { bg: "#4CAF50", text: "#ffffff" },
    error: { bg: "#F44336", text: "#ffffff" },
    warning: { bg: "#FF9800", text: "#ffffff" },
    info: { bg: "#2196F3", text: "#ffffff" },
  };

  const colors = typeColors[type] || typeColors.info;

  notification.innerHTML = `
    <div class="notification-container">
      <div class="notification-header">
        <i class="fas fa-info-circle notification-icon"></i>
        <span class="notification-title">${getNotificationTitle(type)}</span>
        <button class="notification-close">&times;</button>
      </div>
      <div class="notification-message">${escapeHTML(message)}</div>
      <div class="notification-actions">
        ${actions
          .map(
            (action) => `
          <button class="notification-action-btn ${action.class || ""}"
                  onclick="${action.onClick}">
            ${action.text}
          </button>
        `
          )
          .join("")}
      </div>
    </div>
  `;

  notification.style.backgroundColor = colors.bg;
  notification.style.color = colors.text;

  document.body.appendChild(notification);

  // Обработчик закрытия
  notification
    .querySelector(".notification-close")
    .addEventListener("click", () => {
      hideNotification(notification);
    });
}

// Функция для показа уведомления с изображением
export function showImageNotification(message, imageUrl, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification ${type} image-notification`;

  const typeColors = {
    success: { bg: "#4CAF50", text: "#ffffff" },
    error: { bg: "#F44336", text: "#ffffff" },
    warning: { bg: "#FF9800", text: "#ffffff" },
    info: { bg: "#2196F3", text: "#ffffff" },
  };

  const colors = typeColors[type] || typeColors.info;

  notification.innerHTML = `
    <div class="notification-container">
      <div class="notification-image">
        <img src="${imageUrl}" alt="Notification image" onerror="this.style.display='none'">
      </div>
      <div class="notification-content">
        <div class="notification-header">
          <i class="fas fa-info-circle notification-icon"></i>
          <span class="notification-title">${getNotificationTitle(type)}</span>
          <button class="notification-close">&times;</button>
        </div>
        <div class="notification-message">${escapeHTML(message)}</div>
      </div>
    </div>
  `;

  notification.style.backgroundColor = colors.bg;
  notification.style.color = colors.text;

  document.body.appendChild(notification);

  // Обработчик закрытия
  notification
    .querySelector(".notification-close")
    .addEventListener("click", () => {
      hideNotification(notification);
    });
}

// Глобальный экспорт
window.showNotification = showNotification;
window.showActionNotification = showActionNotification;
window.showImageNotification = showImageNotification;
