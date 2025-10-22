const fs = require('fs');
const {
  DATA_FILE,
} = require('../config');

function loadProjects() {
  if (!fs.existsSync(DATA_FILE)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error('Failed to load projects from disk:', error);
    return {};
  }
}

function saveProjects(projects) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2));
}

function createProjectStore() {
  let projects = loadProjects();

  return {
    listProjects() {
      return Object.values(projects);
    },

    getProject(projectId) {
      return projects[projectId];
    },

    setProject(project) {
      projects[project.id] = project;
      this.persist();
      return project;
    },

    updateProject(projectId, updater) {
      const project = projects[projectId];
      if (!project) {
        return undefined;
      }
      updater(project);
      this.persist();
      return project;
    },

    removeProject(projectId) {
      delete projects[projectId];
      this.persist();
    },

    persist() {
      saveProjects(projects);
    },
  };
}

module.exports = {
  createProjectStore,
};
