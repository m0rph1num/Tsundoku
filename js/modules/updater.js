// js/modules/updater.js

// Добавляем экспорт класса
export class AppUpdater {
  constructor() {
    this.currentVersion = "1.0.0";
    this.githubRepo = "yourusername/tsundoku"; // Замените на ваш репозиторий
    this.updateAvailable = false;
    this.latestVersion = null;
    this.releaseNotes = null;
    this.downloadUrl = null;
  }

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

      // Сравниваем версии
      if (latestRelease.tag_name !== this.currentVersion) {
        this.updateAvailable = true;
        this.latestVersion = latestRelease.tag_name;
        this.releaseNotes = latestRelease.body;
        this.downloadUrl = latestRelease.assets[0]?.browser_download_url || "";

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

  showUpdateNotification() {
    if (!this.updateAvailable) return;

    const notification = document.createElement("div");
    notification.className = "update-notification";
    notification.innerHTML = `
      <div class="update-content">
        <h3>Доступно обновление ${this.latestVersion}</h3>
        <div class="update-notes">${this.formatReleaseNotes()}</div>
        <div class="update-actions">
          <button class="btn-primary update-now">Установить сейчас</button>
          <button class="btn-secondary update-later">Напомнить позже</button>
        </div>
      </div>
      <button class="close-update">&times;</button>
    `;

    document.body.appendChild(notification);

    // Обработчики кнопок
    notification.querySelector(".update-now").addEventListener("click", () => {
      this.startUpdateWithLoadingScreen();
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

  formatReleaseNotes() {
    if (!this.releaseNotes) return "Новые функции и исправления ошибок.";
    return this.releaseNotes.split("\n").slice(0, 3).join("<br>");
  }

  startUpdate() {
    if (window.loadingScreen) {
      window.loadingScreen.updateStatus("Подготовка к обновлению...");
      window.loadingScreen.updateProgress(0);
      document.getElementById("loading-screen").classList.remove("hidden");
    }

    if (window.require) {
      try {
        // Используем встроенный autoUpdater от Electron
        const { autoUpdater } = window.require("electron").autoUpdater;
        const { ipcRenderer } = window.require("electron");

        // Настраиваем autoUpdater
        autoUpdater.on("checking-for-update", () => {
          if (window.loadingScreen) {
            window.loadingScreen.updateStatus("Проверка обновлений...");
          }
        });

        autoUpdater.on("update-available", () => {
          if (window.loadingScreen) {
            window.loadingScreen.updateStatus("Обновление доступно");
          }
        });

        autoUpdater.on("update-not-available", () => {
          if (window.loadingScreen) {
            window.loadingScreen.updateStatus("Обновления не найдены");
            window.loadingScreen.hide();
          }
          showNotification("Обновления не найдены", "info");
        });

        autoUpdater.on("download-progress", (progress) => {
          if (window.loadingScreen) {
            window.loadingScreen.updateStatus(
              `Загрузка: ${Math.round(progress.percent)}%`
            );
            window.loadingScreen.updateProgress(progress.percent);
          }
        });

        autoUpdater.on("update-downloaded", () => {
          if (window.loadingScreen) {
            window.loadingScreen.updateStatus("Обновление загружено!");
            window.loadingScreen.updateProgress(100);
          }

          // Сохраняем changelog для показа после перезапуска
          if (this.releaseNotes) {
            localStorage.setItem("updateChangelog", this.releaseNotes);
            localStorage.setItem("updatedVersion", this.latestVersion);
          }

          // Используем ipcRenderer для показа диалога
          ipcRenderer.send("show-update-downloaded-dialog", this.latestVersion);
        });

        autoUpdater.on("error", (error) => {
          console.error("Ошибка обновления:", error);
          if (window.loadingScreen) {
            window.loadingScreen.updateStatus("Ошибка обновления");
            window.loadingScreen.hide();
          }
          showNotification("Не удалось обновить приложение", "error");
        });

        // Настраиваем feed URL
        autoUpdater.setFeedURL({
          provider: "github",
          owner: "m0rph1num",
          repo: "Tsundoku",
          private: false,
        });

        // Запускаем проверку
        autoUpdater.checkForUpdates();
      } catch (error) {
        console.error("Ошибка инициализации autoUpdater:", error);
        if (window.loadingScreen) {
          window.loadingScreen.updateStatus("Ошибка инициализации обновления");
          window.loadingScreen.hide();
        }
        showNotification(
          "Не удалось инициализировать систему обновлений",
          "error"
        );
      }
    } else {
      // Для веб-версии (если нужно)
      if (window.loadingScreen) {
        window.loadingScreen.updateStatus(
          "Обновление доступно только в десктоп версии"
        );
        window.loadingScreen.hide();
      }
    }
  }

  // Новый метод для обновления с экраном загрузки
  startUpdateWithLoadingScreen() {
    // Показываем экран загрузки
    if (window.loadingScreen) {
      window.loadingScreen.updateStatus("Подготовка к обновлению...");
      window.loadingScreen.updateProgress(0);
      document.getElementById("loading-screen").classList.remove("hidden");
    }

    // Запускаем процесс обновления
    this.startUpdate();
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
