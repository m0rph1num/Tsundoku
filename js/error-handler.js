// error-handler.js
export const ERROR_TYPES = {
  NETWORK: "network",
  API: "api",
  VALIDATION: "validation",
  STORAGE: "storage",
  UNKNOWN: "unknown",
};

export const ERROR_SEVERITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

class ErrorHandler {
  static config = {
    logToConsole: true,
    showNotifications: true,
    trackErrors: true,
    maxStoredErrors: 100,
  };

  static errorLog = [];

  // Ограничить размер лога ошибок
  static trimErrorLog() {
    if (this.errorLog.length > this.config.maxStoredErrors) {
      this.errorLog = this.errorLog.slice(0, this.config.maxStoredErrors);
    }
  }

  /**
   * Обработка API ошибок
   */
  static handleAPIError(error, context = {}) {
    const errorData = {
      type: ERROR_TYPES.API,
      severity: this.getAPISeverity(error),
      message: error.message,
      timestamp: new Date().toISOString(),
      context: context,
      stack: error.stack,
    };

    this.processError(errorData);

    // Специфичная обработка для разных типов ошибок API
    if (error.message.includes("429")) {
      this.handleRateLimitError(context);
    } else if (error.message.includes("404")) {
      this.handleNotFoundError(context);
    } else if (error.message.includes("Network Error")) {
      this.handleNetworkError(context);
    }

    return errorData;
  }

  /**
   * Обработка сетевых ошибок
   */
  static handleNetworkError(context = {}) {
    const errorData = {
      type: ERROR_TYPES.NETWORK,
      severity: ERROR_SEVERITY.HIGH,
      message: "Ошибка сети. Проверьте подключение к интернету.",
      timestamp: new Date().toISOString(),
      context: context,
    };

    this.processError(errorData);
    return errorData;
  }

  /**
   * Обработка ошибок валидации
   */
  static handleValidationError(message, data) {
    const errorData = {
      type: ERROR_TYPES.VALIDATION,
      severity: ERROR_SEVERITY.MEDIUM,
      message: message,
      timestamp: new Date().toISOString(),
      context: { data },
    };

    this.processError(errorData);
    return errorData;
  }

  /**
   * Обработка ошибок хранилища
   */
  static handleStorageError(error, operation) {
    const errorData = {
      type: ERROR_TYPES.STORAGE,
      severity:
        error.name === "QuotaExceededError"
          ? ERROR_SEVERITY.HIGH
          : ERROR_SEVERITY.MEDIUM,
      message: error.message,
      timestamp: new Date().toISOString(),
      context: { operation },
      stack: error.stack,
    };

    this.processError(errorData);

    // Если закончилось место - предлагаем очистку
    if (error.name === "QuotaExceededError") {
      this.suggestStorageCleanup();
    }

    return errorData;
  }

  /**
   * Обработка неизвестных ошибок
   */
  static handleUnknownError(error, context = {}) {
    const errorData = {
      type: ERROR_TYPES.UNKNOWN,
      severity: ERROR_SEVERITY.CRITICAL,
      message: "Произошла неизвестная ошибка",
      timestamp: new Date().toISOString(),
      context: context,
      originalError: error,
      stack: error.stack,
    };

    this.processError(errorData);
    return errorData;
  }

  /**
   * Основная обработка ошибки
   */
  static processError(errorData) {
    // Логируем в консоль
    if (this.config.logToConsole) {
      this.logToConsole(errorData);
    }

    // Сохраняем в историю ошибок
    if (this.config.trackErrors) {
      this.saveToErrorLog(errorData);
    }

    // Показываем уведомление пользователю
    if (
      this.config.showNotifications &&
      errorData.severity !== ERROR_SEVERITY.LOW
    ) {
      this.showUserNotification(errorData);
    }

    // Отправляем в аналитику (если подключена)
    this.sendToAnalytics(errorData);
  }

  /**
   * Определение серьезности API ошибки
   */
  static getAPISeverity(error) {
    if (error.message.includes("429")) return ERROR_SEVERITY.MEDIUM; // Rate limit
    if (error.message.includes("404")) return ERROR_SEVERITY.LOW; // Not found
    if (error.message.includes("5")) return ERROR_SEVERITY.HIGH; // Server errors
    if (error.message.includes("Network Error")) return ERROR_SEVERITY.HIGH;
    return ERROR_SEVERITY.MEDIUM;
  }

  /**
   * Обработка лимита запросов
   */
  static handleRateLimitError(context) {
    console.warn("[Rate Limit] Превышен лимит запросов к API. Подождите...");

    // Можно показать специальное уведомление
    if (window.showNotification) {
      window.showNotification(
        "Слишком много запросов. Подождите 1-2 минуты.",
        "warning"
      );
    }
  }

  /**
   * Обработка 404 ошибок
   */
  static handleNotFoundError(context) {
    console.warn("[Not Found] Ресурс не найден:", context);
  }

  /**
   * Логирование в консоль
   */
  static logToConsole(errorData) {
    const styles = {
      [ERROR_SEVERITY.LOW]: "color: #666;",
      [ERROR_SEVERITY.MEDIUM]: "color: #f39c12;",
      [ERROR_SEVERITY.HIGH]: "color: #e74c3c; font-weight: bold;",
      [ERROR_SEVERITY.CRITICAL]:
        "color: #c0392b; font-weight: bold; background: #f2dede;",
    };

    const style = styles[errorData.severity] || styles.MEDIUM;

    console.groupCollapsed(
      `%c[${errorData.type.toUpperCase()}] ${errorData.message}`,
      style
    );
    console.log("Severity:", errorData.severity);
    console.log("Timestamp:", errorData.timestamp);
    console.log("Context:", errorData.context);
    if (errorData.stack) console.log("Stack:", errorData.stack);
    console.groupEnd();
  }

  /**
   * Сохранение в историю ошибок
   */
  static saveToErrorLog(errorData) {
    this.errorLog.unshift(errorData);
    this.trimErrorLog();

    try {
      // Сохраняем только последние 20 ошибок
      localStorage.setItem(
        "tsundoku_error_log",
        JSON.stringify(this.errorLog.slice(0, 20))
      );
    } catch (e) {
      console.error("Failed to save error log:", e);
      // Если localStorage полон, пытаемся очистить старые данные
      if (e.name === "QuotaExceededError") {
        this.clearOldErrorLog();
      }
    }
  }

  static clearOldErrorLog() {
    try {
      localStorage.removeItem("tsundoku_error_log");
    } catch (e) {
      console.error("Failed to clear error log:", e);
    }
  }

  /**
   * Показ уведомления пользователю
   */
  static showUserNotification(errorData) {
    if (!window.showNotification) return;

    let message = errorData.message;
    let type = "error";

    // Адаптируем сообщение для пользователя
    switch (errorData.type) {
      case ERROR_TYPES.API:
        if (errorData.message.includes("429")) {
          message = "Слишком много запросов к Shikimori. Подождите немного.";
          type = "warning";
        } else if (errorData.message.includes("404")) {
          message = "Информация об аниме не найдена.";
          type = "warning";
        } else {
          message =
            "Ошибка при загрузке данных. Проверьте интернет-соединение.";
        }
        break;

      case ERROR_TYPES.NETWORK:
        message = "Ошибка сети. Проверьте подключение к интернету.";
        break;

      case ERROR_TYPES.STORAGE:
        if (errorData.severity === ERROR_SEVERITY.HIGH) {
          message =
            "Недостаточно места для сохранения. Очистите кэш в настройках.";
        } else {
          message = "Ошибка при сохранении данных.";
        }
        break;
    }

    window.showNotification(message, type);
  }

  /**
   * Предложение очистки хранилища
   */
  static suggestStorageCleanup() {
    // Можно показать модальное окно с предложением очистки
    console.log("[Storage] Рекомендуется очистить кэш и историю");
  }

  /**
   * Отправка в аналитику
   */
  static sendToAnalytics(errorData) {
    // Здесь можно подключить Google Analytics, Yandex.Metrica и т.д.
    // Например:
    // if (window.gtag) {
    //   gtag('event', 'exception', {
    //     description: errorData.message,
    //     fatal: errorData.severity === ERROR_SEVERITY.CRITICAL
    //   });
    // }
  }

  /**
   * Получение статистики ошибок
   */
  static getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      byType: {},
      bySeverity: {},
      last24h: 0,
      last7d: 0,
    };

    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    this.errorLog.forEach((error) => {
      const timestamp = new Date(error.timestamp).getTime();

      // По типам
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;

      // По серьезности
      stats.bySeverity[error.severity] =
        (stats.bySeverity[error.severity] || 0) + 1;

      // За последние 24 часа
      if (timestamp > dayAgo) stats.last24h++;

      // За последние 7 дней
      if (timestamp > weekAgo) stats.last7d++;
    });

    return stats;
  }

  /**
   * Очистка лога ошибок
   */
  static clearErrorLog() {
    this.errorLog = [];
    localStorage.removeItem("tsundoku_error_log");
  }

  /**
   * Инициализация глобального обработчика ошибок
   */
  static initGlobalHandlers() {
    // Обработчик необработанных ошибок
    window.addEventListener("error", (event) => {
      this.handleUnknownError(event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Обработчик необработанных промисов
    window.addEventListener("unhandledrejection", (event) => {
      this.handleUnknownError(event.reason, {
        type: "unhandled_promise",
      });
    });

    console.log("✅ ErrorHandler инициализирован");
  }
}

// Делаем глобально доступным
window.ErrorHandler = ErrorHandler;

// Автоматическая инициализация при загрузке
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    ErrorHandler.initGlobalHandlers();
  });
} else {
  ErrorHandler.initGlobalHandlers();
}
