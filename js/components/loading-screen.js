// js/components/loading-screen.js

export class LoadingScreen {
  constructor() {
    this.element = document.getElementById("loading-screen");
    this.statusElement = document.getElementById("loading-status");
    this.progressElement = document.getElementById("loading-progress");
    this.versionElement = document.getElementById("app-version");

    // Советы дня
    this.tips = [
      "Используйте горячие клавиши для быстрого доступа к функциям",
      "Добавляйте аниме в библиотеку для отслеживания прогресса",
      "Настраивайте уведомления о новых сериях в настройках",
      "Используйте поиск для быстрого добавления аниме",
      "Проверяйте раздел 'Анонсы' для новых сезонов ваших любимых аниме",
      "Настраивайте профиль для персонализации опыта",
      "Используйте фильтры для быстрой навигации по библиотеке",
    ];

    // Добавляем анимацию появления
    this.animateAppearance();
  }

  animateAppearance() {
    if (this.element) {
      // Делаем экран видимым сразу
      this.element.classList.remove("hidden");

      // Добавляем анимацию появления
      setTimeout(() => {
        if (this.element) {
          this.element.classList.add("fade-in");
        }
      }, 100);
    }
  }

  updateStatus(text) {
    if (this.statusElement) {
      this.statusElement.textContent = text;
    }
  }

  updateProgress(percent) {
    if (this.progressElement) {
      this.progressElement.style.width = `${Math.min(
        100,
        Math.max(0, percent)
      )}%`;

      // Обновляем проценты
      const percentElement = document.getElementById("loading-percent");
      if (percentElement) {
        percentElement.textContent = `${Math.min(100, Math.max(0, percent))}%`;
      }
    }
  }

  setVersion(version) {
    if (this.versionElement) {
      this.versionElement.textContent = version;
    }
  }

  hide() {
    if (this.element) {
      // Добавляем класс для анимации исчезновения
      this.element.classList.add("fade-out");

      // Удаляем через 1 секунду (вместо 2)
      setTimeout(() => {
        if (this.element && this.element.parentNode) {
          this.element.parentNode.removeChild(this.element);
        }
      }, 1000);
    }
  }

  // Новый метод для плавного перехода
  async smoothTransition() {
    return new Promise((resolve) => {
      if (this.element) {
        // Добавляем класс для начала анимации перехода
        this.element.classList.add("smooth-transition");

        // Ждем завершения анимации
        setTimeout(() => {
          resolve();
        }, 1500); // Время анимации
      } else {
        resolve();
      }
    });
  }

  // Новый метод для ожидания завершения загрузки
  waitForCompleteLoad() {
    return new Promise((resolve) => {
      // Проверяем, что все критические компоненты загружены
      const checkLoaded = () => {
        if (window.library && window.announcements && window.ShikimoriAPI) {
          resolve();
        } else {
          setTimeout(checkLoaded, 100);
        }
      };

      checkLoaded();
    });
  }
}
