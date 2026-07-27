const fs = require('fs');
let code = fs.readFileSync('src/pages/Landing/Landing.jsx', 'utf8');

// Add import
const importStr = "import { LiquidGlassCard } from '@/components/ui/liquid-glass';";
code = code.replace(importStr, importStr + '\nimport DashMockup from "./DashMockup";');

// Remove DashMockup function
const start = code.indexOf('/* ── Enhanced Dashboard Mockup');
const end = code.indexOf('/* ── Features');
if(start !== -1 && end !== -1) {
  code = code.substring(0, start) + code.substring(end);
}

fs.writeFileSync('src/pages/Landing/Landing.jsx', code);
console.log('Success');
