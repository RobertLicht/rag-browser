// tour.js — Onboarding tour using driver.js (ES module import from CDN)

import { t } from "./i18n.js";
import { driver } from "https://cdn.jsdelivr.net/npm/driver.js@1.6.0/dist/driver.js.mjs";

// Tour steps covering the main workflow
const steps = [
  {
    element: "#app-container",
    popover: {
      title: t("tour.step1.title"),
      description: t("tour.step1.description"),
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "#status-bar",
    popover: {
      title: t("tour.step2.title"),
      description: t("tour.step2.description"),
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "#load-models-btn",
    popover: {
      title: t("tour.step3.title"),
      description: t("tour.step3.description"),
      side: "right",
      align: "center",
    },
  },
  {
    element: "#file-input-wrapper",
    popover: {
      title: t("tour.step4.title"),
      description: t("tour.step4.description"),
      side: "right",
      align: "start",
    },
  },
  {
    element: "#document-list",
    popover: {
      title: t("tour.step5.title"),
      description: t("tour.step5.description"),
      side: "right",
      align: "start",
    },
  },
  {
    element: "#db-actions",
    popover: {
      title: t("tour.step6.title"),
      description: t("tour.step6.description"),
      side: "right",
      align: "center",
    },
  },
  {
    element: "#input-area",
    popover: {
      title: t("tour.step7.title"),
      description: t("tour.step7.description"),
      side: "left",
      align: "center",
    },
  },
  {
    element: "#search-settings",
    popover: {
      title: t("tour.step8.title"),
      description: t("tour.step8.description"),
      side: "right",
      align: "start",
    },
  },
];

/**
 * Initialize the tour button click handler.
 */
export function initTour() {
  const btn = document.getElementById("start-tour-btn");
  if (btn) {
    btn.addEventListener("click", () => {
      startTour();
    });
  }
}

/**
 * Start the onboarding tour.
 */
export function startTour() {
  const driverObj = driver({
    showProgress: true,
    showButtons: ["next", "previous"],
    nextLabel: t("tour.btn.next"),
    prevLabel: t("tour.btn.prev"),
    doneLabel: t("tour.btn.done"),
    closeLabel: t("tour.btn.close"),
    onHighlighted: (step) => {
      // Ensure the target element is visible in its parent scroll container
      const el = document.querySelector(step.element);
      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
      }
    },
    onHighlightedDone: () => {
      // Reset sidebar scroll after popover is positioned
      const sidebar = document.getElementById("sidebar");
      if (sidebar) {
        sidebar.scrollTop = 0;
      }
    },
    onDestroyed: () => {
      markTourCompleted();
    },
    steps,
  });

  driverObj.drive();
}

/**
 * Check if the user has already completed the tour.
 */
export function hasCompletedTour() {
  return localStorage.getItem("rag-tour-completed") === "1";
}

/**
 * Mark the tour as completed.
 */
export function markTourCompleted() {
  localStorage.setItem("rag-tour-completed", "1");
}
