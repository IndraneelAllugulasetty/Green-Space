// src/api/router.js
// Lightweight, zero-dependency REST HTTP Router with route parameter matching

class Router {
  constructor() {
    this.routes = [];
  }

  add(method, pathPattern, ...handlers) {
    // Convert pathPattern like '/api/v1/parcels/:parcelId' to regex
    const paramNames = [];
    const regexPath = pathPattern.replace(/:([a-zA-Z0-9_]+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });

    const regex = new RegExp(`^${regexPath}$`);

    this.routes.push({
      method: method.toUpperCase(),
      pattern: pathPattern,
      regex,
      paramNames,
      handlers
    });
  }

  get(path, ...handlers) {
    this.add('GET', path, ...handlers);
  }

  post(path, ...handlers) {
    this.add('POST', path, ...handlers);
  }

  options(path, ...handlers) {
    this.add('OPTIONS', path, ...handlers);
  }

  match(method, pathname) {
    for (const route of this.routes) {
      if (route.method !== method.toUpperCase()) continue;

      const match = pathname.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, index) => {
          params[name] = decodeURIComponent(match[index + 1]);
        });
        return {
          handlers: route.handlers,
          params
        };
      }
    }
    return null;
  }
}

module.exports = Router;
