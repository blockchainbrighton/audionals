function createSseHub() {
  const clients = new Map();

  function registerClient(projectId, res) {
    if (!clients.has(projectId)) {
      clients.set(projectId, []);
    }

    const clientList = clients.get(projectId);
    clientList.push(res);

    return () => removeClient(projectId, res);
  }

  function removeClient(projectId, res) {
    const clientList = clients.get(projectId);
    if (!clientList) {
      return;
    }

    const index = clientList.indexOf(res);
    if (index >= 0) {
      clientList.splice(index, 1);
    }

    if (clientList.length === 0) {
      clients.delete(projectId);
    }
  }

  function broadcast(projectId, payload) {
    const clientList = clients.get(projectId);
    if (!clientList) {
      return;
    }

    const message = `data: ${JSON.stringify(payload)}\n\n`;
    clientList.forEach((res) => {
      try {
        res.write(message);
      } catch (error) {
        console.error('Failed to write SSE payload:', error);
      }
    });
  }

  return {
    registerClient,
    removeClient,
    broadcast,
  };
}

module.exports = {
  createSseHub,
};
