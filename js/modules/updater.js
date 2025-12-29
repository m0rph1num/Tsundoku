// js/modules/updater.js
import { LoadingScreen } from "../components/loading-screen.js";

// Упрощенный класс для проверки обновлений
export class AppUpdater {
  constructor() {
    // Используем версию из глобальной переменной или версию по умолчанию
    this.currentVersion = window.appVersion || "1.0.0";
    this.githubRepo = "m0rph1num/Tsundoku";
    this.updateAvailable = false;
    this.latestVersion = null;
    this.releaseNotes = null;
    this.githubReleasesUrl = "https://github.com/m0rph1num/Tsundoku/releases";
  }

  // Проверка доступных обновлений через GitHub API
  async checkForUpdates() {
    if (window.loadingScreen) {
      window.loadingScreen.updateStatus("Проверка обновлений...");
    }

    try {
      // В режиме разработки пропускаем проверку обновлений
      if (process.env.NODE_ENV === "development") {
        if (window.loadingScreen) {
          window.loadingScreen.updateStatus(
            "Режим разработки - проверка обновлений пропущена"
          );
        }
        return false;
      }

      // Получаем информацию о последней версии с GitHub
      const response = await fetch(
        `https://api.github.com/repos/${this.githubRepo}/releases/latest`,
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API вернул ошибку: ${response.status}`);
      }

      const latestRelease = await response.json();

      // Логирование для отладки
      console.log("GitHub API Response:", latestRelease);

      // Сравниваем версии
      const releaseVersion = latestRelease.tag_name.startsWith("v")
        ? latestRelease.tag_name.substring(1)
        : latestRelease.tag_name;

      console.log("Current version:", this.currentVersion);
      console.log("Release version:", releaseVersion);

      if (releaseVersion !== this.currentVersion) {
        this.updateAvailable = true;
        this.latestVersion = latestRelease.tag_name;
        this.releaseNotes = latestRelease.body;

        if (window.loadingScreen) {
          window.loadingScreen.updateStatus(
            `Найдено обновление: ${this.latestVersion}`
          );
        }
        return true;
      } else {
        if (window.loadingScreen) {
          window.loadingScreen.updateStatus("У вас последняя версия");
        }
        return false;
      }
    } catch (error) {
      console.warn("Не удалось проверить обновления:", error.message);
      if (window.loadingScreen) {
        window.loadingScreen.updateStatus("Проверка обновлений (офлайн режим)");
      }
      return false;
    }
  }

  // Показ уведомления об обновлении
  showUpdateNotification() {
    if (!this.updateAvailable) return;

    const notification = document.createElement("div");
    notification.className = "update-notification";
    notification.innerHTML = `
      <div class="update-content">
        <h3>Доступно обновление ${this.latestVersion}</h3>
        <div class="update-notes">${this.formatReleaseNotes()}</div>
        <div class="update-actions">
          <button class="btn-primary update-now">Скачать обновление</button>
          <button class="btn-secondary update-later">Напомнить позже</button>
        </div>
      </div>
      <button class="close-update">&times;</button>
    `;

    document.body.appendChild(notification);

    // Обработчики кнопок
    notification.querySelector(".update-now").addEventListener("click", () => {
      this.openGitHubReleases();
      notification.remove();
    });

    notification
      .querySelector(".update-later")
      .addEventListener("click", () => {
        notification.remove();
      });

    notification
      .querySelector(".close-update")
      .addEventListener("click", () => {
        notification.remove();
      });
  }

  // Открытие страницы релизов на GitHub
  openGitHubReleases() {
    showNotification("Открытие страницы загрузки обновлений...", "info");
    window.open(this.githubReleasesUrl, "_blank");
  }

  // Форматирование заметок о выпуске
  formatReleaseNotes() {
    if (!this.releaseNotes) return "Новые функции и исправления ошибок.";
    return this.releaseNotes.split("\n").slice(0, 3).join("<br>");
  }

  // Периодическая проверка обновлений
  startPeriodicCheck(interval = 24 * 60 * 60 * 1000) {
    // Не запускаем периодическую проверку в режиме разработки
    if (process.env.NODE_ENV === "development") {
      return;
    }

    this.checkForUpdates();

    setInterval(async () => {
      const updateAvailable = await this.checkForUpdates();
      if (updateAvailable) {
        this.showUpdateNotification();
      }
    }, interval);
  }
}

// Создаем глобальный экземпляр
window.appUpdater = new AppUpdater();
