const fs = require('fs');
const path = require('path');

const appTsxPath = path.join(__dirname, 'apps/web/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// 1. Add import statement at the top after React import
if (!content.includes("import { API_BASE_URL, getWsUrl } from './config/api';")) {
  content = content.replace(
    "import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';",
    "import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';\nimport { API_BASE_URL, getWsUrl } from './config/api';"
  );
}

// 2. Replace 'http://localhost:5001 with `${API_BASE_URL}`
// Case A: Single quotes (e.g. 'http://localhost:5001/api/v1/notifications')
content = content.replace(/'http:\/\/localhost:5001([^']*)'/g, "`${API_BASE_URL}$1`");

// Case B: Backticks (e.g. `http://localhost:5001/api/v1/patients/${patientId}`)
content = content.replace(/`http:\/\/localhost:5001([^`]*)`/g, "`${API_BASE_URL}$1`");

// 3. Fix websocket URL
// Original: const wsUrl = `ws://${host}:5001/ws`;
// New: const wsUrl = getWsUrl();
content = content.replace(/const wsUrl = `ws:\/\/\$\{host\}:5001\/ws`;/g, "const wsUrl = getWsUrl();");

fs.writeFileSync(appTsxPath, content);
console.log("App.tsx updated successfully!");
