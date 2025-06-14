"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/tools/index.ts
var tools_exports = {};
__export(tools_exports, {
  builtInTools: () => builtInTools,
  calculatorTool: () => calculatorTool,
  createTool: () => createTool,
  httpRequestTool: () => httpRequestTool,
  timestampTool: () => timestampTool
});
module.exports = __toCommonJS(tools_exports);

// src/tools/built-in.ts
var httpRequestTool = {
  name: "http_request",
  description: "Make HTTP requests to external APIs",
  parameters: {
    url: {
      type: "string",
      description: "The URL to make the request to",
      required: true
    },
    method: {
      type: "string",
      description: "HTTP method (GET, POST, PUT, DELETE, etc.)",
      required: false,
      enum: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]
    },
    headers: {
      type: "object",
      description: "HTTP headers to include in the request",
      required: false
    },
    body: {
      type: "string",
      description: "Request body (for POST, PUT, PATCH requests)",
      required: false
    }
  },
  execute: async (params) => {
    const { url, method = "GET", headers = {}, body } = params;
    const requestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers
      }
    };
    if (body) {
      requestInit.body = JSON.stringify(body);
    }
    const response = await fetch(url, requestInit);
    const data = await response.text();
    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: (() => {
        try {
          return JSON.parse(data);
        } catch {
          return data;
        }
      })()
    };
  },
  costEstimate: 1e-3
};
var calculatorTool = {
  name: "calculator",
  description: "Perform mathematical calculations",
  parameters: {
    expression: {
      type: "string",
      description: 'Mathematical expression to evaluate (e.g., "2 + 2", "Math.sqrt(16)")',
      required: true
    }
  },
  execute: async (params) => {
    const { expression } = params;
    const safeExpression = expression.replace(/[^0-9+\-*/.()Math.sqrtpowabsfloorceilminmax ]/g, "");
    try {
      const result = new Function("Math", `return ${safeExpression}`)(Math);
      return { result, expression: safeExpression };
    } catch (error) {
      throw new Error(`Invalid mathematical expression: ${expression}`);
    }
  },
  costEstimate: 0
};
var timestampTool = {
  name: "timestamp",
  description: "Get current timestamp and date information",
  parameters: {
    format: {
      type: "string",
      description: "Format for the timestamp (iso, unix, human)",
      required: false,
      enum: ["iso", "unix", "human"]
    },
    timezone: {
      type: "string",
      description: 'Timezone for the timestamp (e.g., "UTC", "America/New_York")',
      required: false
    }
  },
  execute: async (params) => {
    const { format = "iso", timezone } = params;
    const now = /* @__PURE__ */ new Date();
    switch (format) {
      case "unix":
        return { timestamp: Math.floor(now.getTime() / 1e3), format: "unix" };
      case "human":
        return {
          timestamp: timezone ? now.toLocaleString("en-US", { timeZone: timezone }) : now.toLocaleString(),
          format: "human",
          timezone: timezone || "local"
        };
      default:
        return {
          timestamp: timezone ? new Date(now.toLocaleString("en-US", { timeZone: timezone })).toISOString() : now.toISOString(),
          format: "iso",
          timezone: timezone || "UTC"
        };
    }
  },
  costEstimate: 0
};
var builtInTools = [
  httpRequestTool,
  calculatorTool,
  timestampTool
];

// src/tools/factory.ts
function createTool(factory) {
  return {
    name: factory.name,
    description: factory.description,
    parameters: factory.parameters,
    execute: factory.execute,
    costEstimate: factory.costEstimate || 0
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  builtInTools,
  calculatorTool,
  createTool,
  httpRequestTool,
  timestampTool
});
//# sourceMappingURL=index.js.map