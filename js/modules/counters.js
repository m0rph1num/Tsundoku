// Обновление счетчиков
import {
  getReadyToWatchAnime,
  getWaitingEpisodesAnime,
} from "../components/cards.js";

export function updateCounters() {
  const plannedCount = Object.values(window.library).filter(
    (a) => a.status === "planned"
  ).length;
  const watchingCount = Object.values(window.library).filter(
    (a) => a.status === "watching"
  ).length;
  const completedCount = Object.values(window.library).filter(
    (a) => a.status === "completed"
  ).length;
  const postponedCount = Object.values(window.library).filter(
    (a) => a.status === "postponed"
  ).length;

  updateTabCounter("planned", plannedCount);
  updateTabCounter("watching", watchingCount);
  updateTabCounter("completed", completedCount);
  updateTabCounter("postponed", postponedCount);

  updateSectionCounter("plannedSection", plannedCount);
  updateSectionCounter("watchingSection", watchingCount);
  updateSectionCounter("completedSection", completedCount);
  updateSectionCounter("postponedSection", postponedCount);

  const readyToWatch = getReadyToWatchAnime();
  const waitingEpisodes = getWaitingEpisodesAnime();

  const readyCountElement = document.querySelector(
    "#readyToWatchSection .section-count"
  );
  const waitingCountElement = document.querySelector(
    "#waitingEpisodesSection .section-count"
  );
  const announcementsCountElement = document.querySelector(
    "#announcementsSection .section-count"
  );

  if (readyCountElement) {
    readyCountElement.textContent = `(${readyToWatch.length})`;
  }
  if (waitingCountElement) {
    waitingCountElement.textContent = `(${waitingEpisodes.length})`;
  }
  if (announcementsCountElement) {
    announcementsCountElement.textContent = `(${
      Object.keys(window.announcements).length
    })`;
  }
}

function updateTabCounter(tabStatus, count) {
  const tab = document.querySelector(`.nav-tab[data-status="${tabStatus}"]`);
  if (!tab) return;

  let counterBadge = tab.querySelector(".tab-counter");
  if (!counterBadge) {
    counterBadge = document.createElement("span");
    counterBadge.className = "tab-counter";
    tab.appendChild(counterBadge);
  }

  counterBadge.textContent = count > 0 ? count : "";
  counterBadge.style.display = count > 0 ? "flex" : "none";
}

function updateSectionCounter(sectionId, count) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const counter = section.querySelector(".section-count");
  if (counter) {
    counter.textContent = `(${count})`;
  }
}

// Глобальный экспорт
window.updateCounters = updateCounters;
