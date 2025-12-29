const fs = require("fs");
const path = require("path");

const requiredFiles = [
  "js/main.js",
  "js/constants.js",
  "js/core/app.js",
  "js/core/events.js",
  "js/core/utils.js",
  "js/modules/api.js",
  "js/modules/library.js",
  "js/modules/ui.js",
  "js/modules/search.js",
  "js/modules/modals.js",
  "js/modules/notifications.js",
  "js/modules/counters.js",
  "js/modules/announcements.js",
  "js/components/navigation.js",
  "js/components/profile.js",
  "js/components/cards.js",
  "index.html",
];

console.log("🔍 Проверка структуры проекта...\n");

let allFilesExist = true;

requiredFiles.forEach((file) => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - ОТСУТСТВУЕТ!`);
    allFilesExist = false;
  }
});

if (allFilesExist) {
  console.log("\n✅ Все файлы на месте!");
} else {
  console.log("\n⚠️  Некоторые файлы отсутствуют. Создайте недостающие файлы.");
}
