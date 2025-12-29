class AppLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
    this.enableDebug = false; // По умолчано выключено
  }

  log(message, data = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      message,
      data,
      type: "log",
    };

    this.logs.push(entry);

    // Ограничиваем размер
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // В development показываем в консоль
    if (process.env.NODE_ENV !== "production") {
      console.log(message, data || "");
    }

    return entry;
  }

  error(message, error = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      message,
      error: error?.message || error,
      stack: error?.stack,
      type: "error",
    };

    this.logs.push(entry);

    // В development
    if (process.env.NODE_ENV !== "production") {
      console.error(message, error || "");
    } else {
      // В production показываем уведомление пользователю
      showNotification(`Ошибка: ${message}`, "error");
    }

    return entry;
  }

  warn(message, data = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      message,
      data,
      type: "warn",
    };

    this.logs.push(entry);

    if (process.env.NODE_ENV !== "production") {
      console.warn(message, data || "");
    }

    return entry;
  }

  // Получить логи
  getLogs(limit = 50) {
    return this.logs.slice(-limit);
  }

  // Очистить логи
  clearLogs() {
    this.logs = [];
  }

  // Экспорт логов
  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }

  // Сохранить логи в хранилище
  saveToStorage() {
    try {
      if (window.appStorage) {
        // Фильтруем чувствительные данные перед сохранением
        const safeLogs = this.logs.map((log) => {
          const safeLog = { ...log };
          if (safeLog.data && typeof safeLog.data === "object") {
            Object.keys(safeLog.data).forEach((key) => {
              if (
                key.toLowerCase().includes("token") ||
                key.toLowerCase().includes("password") ||
                key.toLowerCase().includes("key")
              ) {
                safeLog.data[key] = "[REDACTED]";
              }
            });
          }
          return safeLog;
        });

        window.appStorage.set("app_logs", safeLogs);
      }
    } catch (e) {
      console.error("Logger storage error:", e);
      // Если electron-store не доступен, пытаемся использовать localStorage
      if (
        e.name === "QuotaExceededError" &&
        typeof localStorage !== "undefined"
      ) {
        try {
          localStorage.setItem(
            "app_logs_fallback",
            JSON.stringify(this.logs.slice(-50))
          );
        } catch (fallbackError) {
          console.error("Fallback logger failed:", fallbackError);
        }
      }
    }
  }

  // Загрузить логи из хранилища
  loadFromStorage() {
    try {
      if (window.appStorage) {
        const saved = window.appStorage.get("app_logs", []);
        this.logs = saved;
      }
    } catch (e) {
      // Игнорируем ошибки загрузки
    }
  }
}

// Глобальный логгер
window.appLogger = new AppLogger();

// Переопределяем console для development
if (process.env.NODE_ENV !== "production") {
  // В development оставляем обычный console
  window.debug = console;
} else {
  // В production заменяем на наш логгер
  window.debug = {
    log: (msg, data) => window.appLogger.log(msg, data),
    error: (msg, err) => window.appLogger.error(msg, err),
    warn: (msg, data) => window.appLogger.warn(msg, data),
    info: (msg, data) => window.appLogger.log(`[INFO] ${msg}`, data),
  };
}

// Сокращенные алиасы
window.log = window.appLogger.log.bind(window.appLogger);
window.error = window.appLogger.error.bind(window.appLogger);
window.warn = window.appLogger.warn.bind(window.appLogger);
