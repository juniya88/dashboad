import { filterProjects, getAllTags, getPublicProjects } from "./project-utils.js";

const FALLBACK_THUMBNAIL = "assets/projects/codex-gallery/thumbnail.svg";

const state = {
  projects: [],
  query: "",
  tag: "all"
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "short",
  day: "numeric"
});

const elements = {
  grid: document.querySelector("[data-project-grid]"),
  statusMessage: document.querySelector("[data-status-message]"),
  resultCount: document.querySelector("[data-result-count]"),
  searchInput: document.querySelector("[data-search-input]"),
  tagFilter: document.querySelector("[data-tag-filter]")
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
  elements.resultCount.textContent = `${count}\uac1c \ud504\ub85c\uc81d\ud2b8`;
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

function createProjectCard(project) {
  const title = project.title || "Untitled project";
  const summary = project.summary || "No summary available yet.";

  const article = document.createElement("article");
  article.className = "project-card";

  const thumbnail = document.createElement("img");
  thumbnail.src = project.thumbnail || FALLBACK_THUMBNAIL;
  thumbnail.alt = `${title} thumbnail`;
  thumbnail.loading = "lazy";
  thumbnail.addEventListener("error", () => {
    thumbnail.src = FALLBACK_THUMBNAIL;
  }, { once: true });
  article.append(thumbnail);

  const body = document.createElement("div");
  body.className = "project-body";

  const meta = document.createElement("div");
  meta.className = "project-meta";

  const dateText = formatDate(project.updatedAt || project.createdAt);
  if (dateText) meta.append(createTextElement("span", "", dateText));
  if (project.status) meta.append(createTextElement("span", "", project.status));

  body.append(meta);
  body.append(createTextElement("h3", "", title));
  body.append(createTextElement("p", "", summary));

  const tags = document.createElement("ul");
  tags.className = "tag-list";
  for (const tag of project.tags || []) {
    const tagItem = document.createElement("li");
    tagItem.className = "tag";
    tagItem.textContent = tag;
    tags.append(tagItem);
  }
  body.append(tags);

  const links = document.createElement("div");
  links.className = "project-links";

  const demoLink = createProjectLink(project.links?.demo, "Demo");
  if (demoLink) links.append(demoLink);

  const githubLink = createProjectLink(project.links?.github, "GitHub", "secondary");
  if (githubLink) links.append(githubLink);

  if (!links.children.length) {
    links.append(createTextElement("span", "project-links-empty", "\uacf5\uac1c \ub9c1\ud06c\uac00 \uc5c6\uc2b5\ub2c8\ub2e4."));
  }

  body.append(links);
  article.append(body);
  return article;
}

function renderTagOptions() {
  const tags = getAllTags(state.projects);

  elements.tagFilter.replaceChildren();

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "\uc804\uccb4";
  elements.tagFilter.append(allOption);

  for (const tag of tags) {
    const option = document.createElement("option");
    option.value = tag;
    option.textContent = tag;
    elements.tagFilter.append(option);
  }

  elements.tagFilter.value = state.tag;
}

function renderProjects() {
  const filteredProjects = filterProjects(state.projects, {
    query: state.query,
    tag: state.tag
  });

  elements.grid.replaceChildren();
  setResultCount(filteredProjects.length);

  if (!filteredProjects.length) {
    setStatus("\uc870\uac74\uc5d0 \ub9de\ub294 \ud504\ub85c\uc81d\ud2b8\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.");
    return;
  }

  setStatus("", false);
  elements.grid.append(...filteredProjects.map(createProjectCard));
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderProjects();
  });

  elements.tagFilter.addEventListener("change", (event) => {
    state.tag = event.target.value;
    renderProjects();
  });
}

async function loadProjects() {
  setStatus("\ud504\ub85c\uc81d\ud2b8\ub97c \ubd88\ub7ec\uc624\ub294 \uc911\uc785\ub2c8\ub2e4.");

  try {
    const response = await fetch("projects.json");
    if (!response.ok) {
      throw new Error(`Unable to load projects.json: ${response.status}`);
    }

    const allProjects = await response.json();
    state.projects = getPublicProjects(allProjects);
    renderTagOptions();
    renderProjects();
  } catch (error) {
    console.error(error);
    elements.grid.replaceChildren();
    elements.resultCount.textContent = "\ubd88\ub7ec\uc624\uae30 \uc2e4\ud328";
    setStatus(
      "\ud504\ub85c\uc81d\ud2b8 \ub370\uc774\ud130\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \ub85c\uceec \ud30c\uc77c\ub85c \uc5f4\uc5c8\ub2e4\uba74 \uc791\uc740 \ubbf8\ub9ac\ubcf4\uae30 \uc11c\ubc84\ub85c \ub2e4\uc2dc \uc5f4\uc5b4\uc8fc\uc138\uc694."
    );
  }
}

bindEvents();
loadProjects();
