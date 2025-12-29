// js/storage.js
class AppStorage {
  constructor() {
    // Проверяем окружение
    this.isElectron =
      typeof window !== "undefined" &&
      window.process &&
      window.process.versions &&
      window.process.versions.electron;

    if (this.isElectron) {
      console.log("🔌 Electron режим - инициализируем electron-store");
      try {
        // В Electron renderer мы можем напрямую использовать require
        const Store = require("electron-store");
        this.store = new Store();
        this.useLocalStorage = false;

        // МИГРАЦИЯ: переносим данные из localStorage если есть
        this.migrateFromLocalStorage();
      } catch (error) {
        console.warn("⚠️ Не удалось инициализировать electron-store:", error);
        console.warn("⚠️ Используем localStorage как fallback");
        this.useLocalStorage = true;
      }
    } else {
      console.log("🌐 Браузерный режим - используем localStorage");
      this.useLocalStorage = true;
    }
  }

  // Миграция данных из localStorage в electron-store
  migrateFromLocalStorage() {
    if (!this.isElectron || this.useLocalStorage) return;

    const migrationKeys = [
      "userAvatar",
      "userUsername",
      "animeLibrary",
      "tsundoku_settings",
      "watchHistory",
      "announcementsCache",
      "libraryCreated",
      "tsundoku-library",
    ];

    let migrated = 0;
    migrationKeys.forEach((key) => {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          // ПРОБЛЕМА: userAvatar и userUsername - обычные строки, не JSON
          // userAvatar: "data:image/png;base64,..." или URL
          // userUsername: "morphine" (простая строка)

          let parsedValue;

          // Пробуем распарсить как JSON
          try {
            parsedValue = JSON.parse(value);
          } catch (jsonError) {
            // Если не JSON, оставляем как строку
            parsedValue = value;
          }

          this.store.set(key, parsedValue);
          localStorage.removeItem(key);
          migrated++;
          console.log(`✅ Мигрировано: ${key}`);
        }
      } catch (e) {
        console.warn(`⚠️ Ошибка миграции ${key}:`, e.message);
      }
    });

    if (migrated > 0) {
      console.log(`🔄 Мигрировано ${migrated} записей из localStorage`);
    }
  }

  // Основные методы
  set(key, value) {
    if (this.useLocalStorage) {
      // В localStorage храним как строку
      localStorage.setItem(key, JSON.stringify(value));
    } else if (this.store) {
      // В electron-store сохраняем как есть
      this.store.set(key, value);
    }
  }

  get(key, defaultValue = null) {
    if (this.useLocalStorage) {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;

      try {
        // Пробуем распарсить JSON
        return JSON.parse(item);
      } catch (e) {
        // Если не JSON, возвращаем как строку
        return item;
      }
    } else if (this.store) {
      return this.store.get(key, defaultValue);
    }
    return defaultValue;
  }

  delete(key) {
    if (this.useLocalStorage) {
      localStorage.removeItem(key);
    } else if (this.store) {
      this.store.delete(key);
    }
  }

  clear() {
    if (this.useLocalStorage) {
      localStorage.clear();
    } else if (this.store) {
      this.store.clear();
    }
  }

  // Специфичные методы для Tsundoku
  getUserAvatar() {
    return this.get("userAvatar", "assets/default-avatar.png");
  }

  setUserAvatar(url) {
    this.set("userAvatar", url);
  }

  getUsername() {
    return this.get("userUsername", "Аниме-энтузиаст");
  }

  setUsername(username) {
    this.set("userUsername", username);
  }

  getLibrary() {
    return this.get("animeLibrary", {});
  }

  setLibrary(library) {
    this.set("animeLibrary", library);
  }

  getSettings() {
    return this.get("tsundoku_settings", {
      notifications: true,
      autoStatusCheck: true,
      autoAnnouncements: true,
    });
  }

  setSettings(settings) {
    this.set("tsundoku_settings", settings);
  }

  // Метод для восстановления из резервной копии
  restoreFromBackup() {
    try {
      const backupKey = "library_backup";
      const currentBackup = this.get(backupKey, {});

      if (currentBackup.lastBackup) {
        console.log("🔄 Восстановление библиотеки из резервной копии");
        this.setLibrary(currentBackup.lastBackup.library);
        return true;
      }
      return false;
    } catch (e) {
      console.error("❌ Ошибка восстановления из резервной копии:", e);
      return false;
    }
  }
}

// Создаем глобальный экземпляр
window.appStorage = new AppStorage();

// Для отладки
console.log("✅ AppStorage инициализирован");
console.log("📊 Режим:", window.appStorage.isElectron ? "Electron" : "Браузер");
console.log(
  "💾 Хранилище:",
  window.appStorage.useLocalStorage ? "localStorage" : "electron-store"
);
