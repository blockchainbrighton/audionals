/**
 * @fileoverview Mock Resolver for testing purposes.
 */

export class MockResolver {
  constructor() {
    this.resolvedPaths = new Map();
  }

  /**
   * Mocks the resolve method.
   * @param {string} path
   * @returns {string}
   */
  resolve(path) {
    return this.resolvedPaths.get(path) || path; // Return path itself if not explicitly set
  }

  /**
   * Sets a resolved path.
   * @param {string} originalPath
   * @param {string} resolvedPath
   */
  setResolvedPath(originalPath, resolvedPath) {
    this.resolvedPaths.set(originalPath, resolvedPath);
  }
}


