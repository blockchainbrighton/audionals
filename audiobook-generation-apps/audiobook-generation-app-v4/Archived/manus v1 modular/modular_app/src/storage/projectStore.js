const fs = require('fs');
const { DATA_FILE } = require('../config');

let projects = loadProjectsFromDisk();
const clients = new Map();

function loadProjectsFromDisk() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(raw);
    } catch (error) {
      console.error('Failed to load projects from disk:', error);
    }
  }
  return {};
}

function saveProjects() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2));
}

function listProjects() {
  return Object.values(projects);
}

function getProjectsMap() {
  return projects;
}

function getProject(projectId) {
  return projects[projectId];
}

function createProject(project) {
  projects[project.id] = project;
  saveProjects();
  return project;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function registerClient(projectId, res) {
  if (!clients.has(projectId)) {
    clients.set(projectId, []);
  }
  clients.get(projectId).push(res);
}

function removeClient(projectId, res) {
  const list = clients.get(projectId);
  if (!list) return;
  const index = list.indexOf(res);
  if (index >= 0) {
    list.splice(index, 1);
  }
  if (list.length === 0) {
    clients.delete(projectId);
  }
}

function sendUpdate(projectId, data) {
  const list = clients.get(projectId);
  if (!list) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of list) {
    try {
      res.write(payload);
    } catch (error) {
      console.error('Failed to send SSE update:', error);
    }
  }
}

module.exports = {
  listProjects,
  getProjectsMap,
  getProject,
  createProject,
  saveProjects,
  generateId,
  registerClient,
  removeClient,
  sendUpdate
};
