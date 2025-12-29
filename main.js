// main.js - исправленный
const { app, BrowserWindow, Menu, ipcMain, dialog } = require("electron");
const path = require("path");
const Store = require("electron-store");
const fs = require("fs");
const isDev = process.env.NODE_ENV === "development";

const store = new Store({
  defaults: {
    settings: {
      notifications: true,
      autoStatusCheck: true,
      autoAnnouncements: true,
    },
  },
});

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, "assets", "icon.ico"),
    title: "Tsundoku - Трекер аниме",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      enableRemoteModule: true,
    },
    frame: true,
    autoHideMenuBar: true,
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Убираем стандартное меню
  Menu.setApplicationMenu(null);

  if (isDev) {
    // Включаем стандартные горячие клавиши браузера
    mainWindow.webContents.on("before-input-event", (event, input) => {
      // Ctrl+R или F5 для перезагрузки
      if (input.control && input.key.toLowerCase() === "r") {
        mainWindow.reload();
      }
      // F5 для перезагрузки
      if (input.key === "F5") {
        mainWindow.reload();
      }
      // Ctrl+Shift+I для открытия DevTools
      if (input.control && input.shift && input.key.toLowerCase() === "i") {
        mainWindow.webContents.openDevTools();
      }
      // F12 для открытия DevTools
      if (input.key === "F12") {
        mainWindow.webContents.openDevTools();
      }
    });
  }

  // Добавьте отладку загрузки
  mainWindow.webContents.on("did-finish-load", () => {
    console.log("✅ HTML успешно загружен");
  });

  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription) => {
      console.error("❌ Ошибка загрузки HTML:", errorCode, errorDescription);

      // Показываем ошибку в окне
      mainWindow.loadURL(`data:text/html;charset=utf-8,
      <html>
        <body style="background:#1a1a1a;color:#fff;font-family:Arial;padding:40px;text-align:center;">
          <h1>Ошибка загрузки Tsundoku</h1>
          <p>Код ошибки: ${errorCode}</p>
          <p>Описание: ${errorDescription}</p>
          <p>Проверьте что файл index.html существует в папке приложения.</p>
        </body>
      </html>
    `);
    }
  );

  // Загружаем с проверкой
  let indexPath = path.join(__dirname, "index.html");
  console.log("Пытаюсь загрузить:", indexPath);

  // Проверяем текущую директорию и альтернативные пути
  const possiblePaths = [
    indexPath,
    path.join(process.cwd(), "index.html"),
    "index.html",
    path.join(process.resourcesPath, "app.asar.unpacked", "index.html"),
    path.join(process.resourcesPath, "app", "index.html"),
  ];

  let fileFound = false;

  for (const checkPath of possiblePaths) {
    console.log("Проверяю путь:", checkPath);
    if (fs.existsSync(checkPath)) {
      console.log("Файл index.html найден по пути:", checkPath);
      mainWindow.loadFile(checkPath);
      fileFound = true;
      break;
    }
  }

  if (!fileFound) {
    console.error("Файл index.html НЕ найден ни по одному из путей");

    // Если файл не найден нигде, показываем ошибку
    mainWindow.loadURL(`data:text/html;charset=utf-8,
      <html>
        <body style="background:#1a1a1a;color:#fff;font-family:Arial;padding:40px;text-align:center;">
          <h1>Tsundoku</h1>
          <p>Файл index.html не найден.</p>
          <p>Проверенные пути: ${possiblePaths.join(", ")}</p>
        </body>
      </html>
    `);
  }

  // Настройка autoUpdater (только если не в режиме разработки)
  if (!isDev) {
    try {
      const { autoUpdater } = require("electron-updater");

      // Настройка autoUpdater
      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = true;

      // Настройка feed URL
      autoUpdater.setFeedURL({
        provider: "github",
        owner: "yourusername",
        repo: "tsundoku",
        private: false,
      });

      // Обработчик для показа диалога обновления
      ipcMain.on("show-update-downloaded-dialog", (event, version) => {
        dialog
          .showMessageBox({
            type: "info",
            title: "Обновление готово",
            message: `Версия ${version} готова к установке`,
            buttons: ["Установить и перезапустить", "Позже"],
          })
          .then((result) => {
            if (result.response === 0) {
              autoUpdater.quitAndInstall();
            }
          });
      });

      // Обработчики событий
      autoUpdater.on("error", (error) => {
        console.error("Ошибка autoUpdater:", error);
        if (mainWindow) {
          mainWindow.webContents.send("update-error", error.message);
        }
      });

      // Проверка обновлений при запуске
      setTimeout(() => {
        autoUpdater.checkForUpdates();
      }, 5000);
    } catch (error) {
      console.warn("Не удалось загрузить electron-updater:", error.message);
    }
  }
}

app.whenReady().then(() => {
  // Устанавливаем глобальную переменную с версией из package.json
  global.appVersion = app.getVersion();

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Логи в файл для production
if (!isDev) {
  // Создаем папку для логов в AppData
  const logDir = path.join(app.getPath("appData"), "Tsundoku", "logs");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFile = path.join(logDir, "tsundoku.log");

  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = function (...args) {
    const message =
      new Date().toISOString() + " [INFO] " + args.join(" ") + "\n";
    try {
      fs.appendFileSync(logFile, message);
    } catch (e) {}
    originalLog.apply(console, args);
  };

  console.error = function (...args) {
    const message =
      new Date().toISOString() + " [ERROR] " + args.join(" ") + "\n";
    try {
      fs.appendFileSync(logFile, message);
    } catch (e) {}
    originalError.apply(console, args);
  };

  console.warn = function (...args) {
    const message =
      new Date().toISOString() + " [WARN] " + args.join(" ") + "\n";
    try {
      fs.appendFileSync(logFile, message);
    } catch (e) {}
    originalWarn.apply(console, args);
  };

  console.log("=== Tsundoku запущен ===");
  console.log("Версия Node:", process.version);
  console.log("Версия Electron:", process.versions.electron);
  console.log("Платформа:", process.platform);
  console.log("Путь к данным:", app.getPath("userData"));
}
