import { filterProjects, getPublicProjects } from "./project-utils.js";

const categoryFilters = [
  { id: "all", label: "전체" },
  { id: "web", label: "웹앱" },
  { id: "desktop", label: "데스크톱" },
  { id: "tool", label: "관리도구" }
];

const projectVisuals = {
  "subscription-keeper": { icon: "□", className: "project-icon--green" },
  "dinner-recommander": { icon: "○", className: "project-icon--orange" },
  "codex-gallery": { icon: "▦", className: "project-icon--blue" }
};

const state = {
  projects: [],
  category: "all"
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric"
});

const elements = {
  grid: document.querySelector("[data-project-grid]"),
  statusMessage: document.querySelector("[data-status-message]"),
  resultCount: document.querySelector("[data-result-count]"),
  filterChips: document.querySelector("[data-filter-chips]"),
  statProjects: document.querySelector("[data-stat-projects]"),
  statLinks: document.querySelector("[data-stat-links]"),
  statUpdated: document.querySelector("[data-stat-updated]")
};

const missingElements = Object.entries(elements)
  .filter(([, element]) => !element)
  .map(([name]) => name);

if (missingElements.length) {
  throw new Error(`Gallery initialization failed. Missing DOM hooks: ${missingElements.join(", ")}`);
}

function setStatus(message, isVisible = Boolean(message)) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.hidden = !isVisible;
}

function setResultCount(count) {
  elements.resultCount.textContent = `${count}개 프로젝트`;
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : dateFormatter.format(date);
}

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function getSafeUrl(value) {
  if (!value) return "";

  try {
    const url = new URL(value, window.location.href);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function createProjectLink(href, label, className = "") {
  const safeHref = getSafeUrl(href);
  if (!safeHref) return null;

  const link = document.createElement("a");
  link.href = safeHref;
  link.textContent = label;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  if (className) link.className = className;
  return link;
}

function getStatusLabel(status) {
  if (status === "archived") return "ARCHIVE";
  if (status === "draft") return "WIP";
  return "LIVE";
}

function projectMatchesCategory(project, category) {
  const tags = project.tags || [];

  if (category === "all") return true;
  if (category === "web") return tags.includes("Web") || tags.includes("Next.js") || tags.includes("Portfolio");
  if (category === "desktop") return tags.includes("Desktop") || tags.includes("PySide6");
  if (category === "tool") return tags.includes("SQLite") || tags.includes("Portfolio") || tags.includes("Codex");

  return true;
}

function createProjectIcon(project) {
  const visual = projectVisuals[project.id] || { icon: "□", className: "project-icon--gray" };
  const icon = document.createElement("span");
  icon.className = `project-icon ${visual.className}`;
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = visual.icon;
  return icon;
}

function createProjectCard(project) {
  const title = project.title || "Untitled project";
  const summary = project.summary || "No summary available yet.";

  const article = document.createElement("article");
  article.className = "project-card";

  const header = document.createElement("div");
  header.className = "project-card-header";
  header.append(createProjectIcon(project));
  header.append(createTextElement("span", "status-badge", getStatusLabel(project.status)));

  const body = document.createElement("div");
  body.className = "project-body";

  body.append(createTextElement("h3", "", title));
  body.append(createTextElement("p", "", summary));

  const meta = document.createElement("div");
  meta.className = "project-meta";
  const dateText = formatDate(project.updatedAt || project.createdAt);
  if (dateText) meta.append(createTextElement("span", "", dateText));
  if (project.id) meta.append(createTextElement("span", "", `/${project.id}`));
  body.append(meta);

  const tags = document.createElement("ul");
  tags.className = "tag-list";
  for (const tag of (project.tags || []).slice(0, 3)) {
    const tagItem = document.createElement("li");
    tagItem.className = "tag";
    tagItem.textContent = tag;
    tags.append(tagItem);
  }
  body.append(tags);

  const links = document.createElement("div");
  links.className = "project-links";

  const demoLink = createProjectLink(project.links?.demo, "열기");
  if (demoLink) links.append(demoLink);

  const githubLink = createProjectLink(project.links?.github, "GitHub", demoLink ? "secondary" : "");
  if (githubLink) links.append(githubLink);

  if (!links.children.length) {
    links.append(createTextElement("span", "project-links-empty", "공개 링크가 없습니다."));
  }

  body.append(links);
  article.append(header, body);
  return article;
}

function getVisibleProjects() {
  return filterProjects(state.projects).filter((project) => projectMatchesCategory(project, state.category));
}

function renderFilterChips() {
  elements.filterChips.replaceChildren();

  for (const filter of categoryFilters) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-chip";
    button.dataset.category = filter.id;
    button.textContent = filter.label;
    button.setAttribute("aria-pressed", String(filter.id === state.category));
    elements.filterChips.append(button);
  }
}

function renderSummary() {
  const linkCount = state.projects.reduce((count, project) => {
    return count + [project.links?.demo, project.links?.github].filter(getSafeUrl).length;
  }, 0);

  const latestDate = state.projects
    .map((project) => project.updatedAt || project.createdAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  elements.statProjects.textContent = state.projects.length;
  elements.statLinks.textContent = linkCount;
  elements.statUpdated.textContent = formatDate(latestDate) || "-";
}

function renderProjects() {
  const filteredProjects = getVisibleProjects();

  elements.grid.replaceChildren();
  setResultCount(filteredProjects.length);

  if (!filteredProjects.length) {
    setStatus("조건에 맞는 프로젝트가 없습니다.");
    return;
  }

  setStatus("", false);
  elements.grid.append(...filteredProjects.map(createProjectCard));
}

function bindEvents() {
  elements.filterChips.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-category]");
    if (!button) return;

    state.category = button.dataset.category;
    renderFilterChips();
    renderProjects();
  });
}

async function loadProjects() {
  setStatus("프로젝트를 불러오는 중입니다.");

  try {
    const response = await fetch("projects.json?v=20260703-dashboard-ui");
    if (!response.ok) {
      throw new Error(`Unable to load projects.json: ${response.status}`);
    }

    const allProjects = await response.json();
    state.projects = getPublicProjects(allProjects);
    renderSummary();
    renderFilterChips();
    renderProjects();
  } catch (error) {
    console.error(error);
    elements.grid.replaceChildren();
    elements.resultCount.textContent = "불러오기 실패";
    setStatus("프로젝트 데이터를 불러오지 못했습니다. 로컬 파일로 열었다면 작은 미리보기 서버로 다시 열어주세요.");
  }
}

bindEvents();
loadProjects();