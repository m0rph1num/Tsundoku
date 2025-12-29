const API_BASE = "https://shikimori.one/api";

// Константы кэширования
const CACHE_CONFIG = {
  SEARCH: {
    TTL: 30 * 60 * 1000, // 30 минут
    KEY_PREFIX: "search",
  },
  DETAILS: {
    TTL: 7 * 24 * 60 * 60 * 1000, // 7 дней
    KEY_PREFIX: "details",
  },
  RELATED: {
    TTL: 24 * 60 * 60 * 1000, // 1 день
    KEY_PREFIX: "related",
  },
};

// Кэш в памяти для быстрого доступа
let memoryCache = {
  search: new Map(),
  details: new Map(),
  related: new Map(),
};

// Добавить ограничение размера кэша
const MAX_CACHE_SIZE = 100;

function cleanupMemoryCache() {
  if (memoryCache.search.size > MAX_CACHE_SIZE) {
    const keys = Array.from(memoryCache.search.keys());
    keys.slice(0, 20).forEach((key) => memoryCache.search.delete(key));
  }
  if (memoryCache.details.size > MAX_CACHE_SIZE) {
    const keys = Array.from(memoryCache.details.keys());
    keys.slice(0, 20).forEach((key) => memoryCache.details.delete(key));
  }
}

// Кэш в localStorage для persistence
class PersistentCache {
  static get(key) {
    try {
      const item = localStorage.getItem(`api_cache_${key}`);
      if (!item) return null;

      const { data, timestamp } = JSON.parse(item);

      // Проверяем TTL
      if (
        Date.now() - timestamp >
        CACHE_CONFIG[key.split("_")[0].toUpperCase()]?.TTL
      ) {
        this.remove(key);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Cache read error:", error);
      return null;
    }
  }

  static set(key, data) {
    try {
      const item = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(`api_cache_${key}`, JSON.stringify(item));

      // Очистка старых записей (не чаще чем раз в день)
      this.cleanup();
    } catch (error) {
      console.error("Cache write error:", error);
      // Если localStorage полон, очищаем старый кэш
      if (error.name === "QuotaExceededError") {
        this.clearOld();
      }
    }
  }

  static remove(key) {
    localStorage.removeItem(`api_cache_${key}`);
  }

  static cleanup() {
    const lastCleanup = localStorage.getItem("last_cache_cleanup");
    const now = Date.now();

    // Чистим не чаще раза в день
    if (!lastCleanup || now - parseInt(lastCleanup) > 24 * 60 * 60 * 1000) {
      this.clearOld();
      localStorage.setItem("last_cache_cleanup", now.toString());
    }
  }

  static clearOld() {
    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("api_cache_")) {
        try {
          const item = JSON.parse(localStorage.getItem(key));
          const cacheType = key
            .replace("api_cache_", "")
            .split("_")[0]
            .toUpperCase();
          const ttl = CACHE_CONFIG[cacheType]?.TTL || CACHE_CONFIG.SEARCH.TTL;

          if (Date.now() - item.timestamp > ttl) {
            keysToRemove.push(key);
          }
        } catch (e) {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  static clearAll() {
    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("api_cache_")) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }
}

class ShikimoriAPI {
  /**
   * Поиск аниме с кэшированием
   */
  static async searchAnime(query, limit = 20) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const cacheKey = `search_${query}_${limit}`;

    // 1. Проверяем кэш в памяти
    if (memoryCache.search.has(cacheKey)) {
      const cached = memoryCache.search.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_CONFIG.SEARCH.TTL) {
        console.log(`[Cache] Используем memory cache для поиска: "${query}"`);
        return cached.data;
      }
      memoryCache.search.delete(cacheKey);
    }

    // 2. Проверяем persistent кэш
    const persistentData = PersistentCache.get(cacheKey);
    if (persistentData) {
      console.log(`[Cache] Используем persistent cache для поиска: "${query}"`);
      // Сохраняем в memory cache для быстрого доступа
      memoryCache.search.set(cacheKey, {
        data: persistentData,
        timestamp: Date.now(),
      });
      return persistentData;
    }

    try {
      document.querySelector(".search-box")?.classList.add("loading");

      const url = `${API_BASE}/animes?search=${encodeURIComponent(
        query
      )}&limit=${limit}&order=popularity`;

      console.log(`[API] Запрос к Shikimori: ${url}`);

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Tsundoku/1.0",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Проверяем, что ответ содержит валидный JSON
      let data;
      try {
        const text = await response.text();
        // Проверяем, что это JSON, а не HTML или другой контент
        if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
          data = JSON.parse(text);
        } else {
          throw new Error(
            `Invalid JSON response: ${text.substring(0, 100)}...`
          );
        }
      } catch (parseError) {
        throw new Error(`Failed to parse JSON: ${parseError.message}`);
      }

      // Сохраняем в кэши
      memoryCache.search.set(cacheKey, {
        data: data,
        timestamp: Date.now(),
      });

      PersistentCache.set(cacheKey, data);

      console.log(
        `[Cache] Сохранено в кэш: "${query}" (${data.length} результатов)`
      );

      return data;
    } catch (error) {
      ErrorHandler.handleAPIError(error, { type: "search", query });
      throw error;
    } finally {
      document.querySelector(".search-box")?.classList.remove("loading");
    }
  }

  /**
   * Получение деталей аниме с кэшированием
   */
  static async getAnimeDetails(id) {
    const cacheKey = `details_${id}`;

    // 1. Memory cache
    if (memoryCache.details.has(cacheKey)) {
      const cached = memoryCache.details.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_CONFIG.DETAILS.TTL) {
        console.log(`[Cache] Используем memory cache для деталей ID: ${id}`);
        return cached.data;
      }
      memoryCache.details.delete(cacheKey);
    }

    // 2. Persistent cache
    const persistentData = PersistentCache.get(cacheKey);
    if (persistentData) {
      console.log(`[Cache] Используем persistent cache для деталей ID: ${id}`);
      memoryCache.details.set(cacheKey, {
        data: persistentData,
        timestamp: Date.now(),
      });
      return persistentData;
    }

    try {
      const response = await fetch(`${API_BASE}/animes/${id}`, {
        headers: {
          "User-Agent": "Tsundoku/1.0",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Проверяем, что ответ содержит валидный JSON
      let data;
      try {
        const text = await response.text();
        // Проверяем, что это JSON, а не HTML или другой контент
        if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
          data = JSON.parse(text);
        } else {
          throw new Error(
            `Invalid JSON response: ${text.substring(0, 100)}...`
          );
        }
      } catch (parseError) {
        throw new Error(`Failed to parse JSON: ${parseError.message}`);
      }

      // Сохраняем в кэши
      memoryCache.details.set(cacheKey, {
        data: data,
        timestamp: Date.now(),
      });

      PersistentCache.set(cacheKey, data);

      console.log(`[Cache] Сохранено в кэш: детали ID ${id}`);

      return data;
    } catch (error) {
      ErrorHandler.handleAPIError(error, { type: "details", id });
      throw error;
    }
  }

  /**
   * Получение связанных аниме с кэшированием
   */
  static async getAnimeRelated(id) {
    const cacheKey = `related_${id}`;

    // 1. Memory cache
    if (memoryCache.related.has(cacheKey)) {
      const cached = memoryCache.related.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_CONFIG.RELATED.TTL) {
        console.log(`[Cache] Используем memory cache для related ID: ${id}`);
        return cached.data;
      }
      memoryCache.related.delete(cacheKey);
    }

    // 2. Persistent cache
    const persistentData = PersistentCache.get(cacheKey);
    if (persistentData) {
      console.log(`[Cache] Используем persistent cache для related ID: ${id}`);
      memoryCache.related.set(cacheKey, {
        data: persistentData,
        timestamp: Date.now(),
      });
      return persistentData;
    }

    try {
      const url = `${API_BASE}/animes/${id}/related`;
      console.log(`[API] Запрос related к Shikimori: ${url}`);

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Tsundoku/1.0 (Your App)",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Проверяем, что ответ содержит валидный JSON
      let data;
      try {
        const text = await response.text();
        // Проверяем, что это JSON, а не HTML или другой контент
        if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
          data = JSON.parse(text);
        } else {
          throw new Error(
            `Invalid JSON response: ${text.substring(0, 100)}...`
          );
        }
      } catch (parseError) {
        throw new Error(`Failed to parse JSON: ${parseError.message}`);
      }

      // Сохраняем в кэши
      memoryCache.related.set(cacheKey, {
        data: data,
        timestamp: Date.now(),
      });

      PersistentCache.set(cacheKey, data);

      console.log(
        `[Cache] Сохранено в кэш: related ID ${id} (${data.length} записей)`
      );

      return data;
    } catch (error) {
      ErrorHandler.handleAPIError(error, { type: "related", id });
      return [];
    }
  }

  /**
   * Очистка кэша
   */
  static clearCache(type = "all") {
    if (type === "all" || type === "memory") {
      memoryCache.search.clear();
      memoryCache.details.clear();
      memoryCache.related.clear();
    }

    if (type === "all" || type === "persistent") {
      PersistentCache.clearAll();
    }

    console.log(`[Cache] Очищен ${type} кэш`);
  }

  /**
   * Статистика кэша
   */
  static getCacheStats() {
    const stats = {
      memory: {
        search: memoryCache.search.size,
        details: memoryCache.details.size,
        related: memoryCache.related.size,
        total:
          memoryCache.search.size +
          memoryCache.details.size +
          memoryCache.related.size,
      },
      persistent: {
        total: 0,
        search: 0,
        details: 0,
        related: 0,
      },
    };

    // Считаем persistent cache
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("api_cache_")) {
        stats.persistent.total++;
        if (key.includes("search_")) stats.persistent.search++;
        if (key.includes("details_")) stats.persistent.details++;
        if (key.includes("related_")) stats.persistent.related++;
      }
    }

    return stats;
  }
}

// Экспортируем как именованный экспорт
export { ShikimoriAPI };

// И также делаем глобально доступным для совместимости
window.ShikimoriAPI = ShikimoriAPI;
window.PersistentCache = PersistentCache; // Для отладки
