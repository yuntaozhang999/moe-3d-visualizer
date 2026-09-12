const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const path = require('path');

async function run() {
  console.log('Starting Vite preview server...');
  const server = spawn('npm', ['run', 'preview'], { cwd: process.cwd(), shell: true });
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('Launching Puppeteer...');
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  console.log('Navigating to local server...');
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
  
  await new Promise(resolve => setTimeout(resolve, 3000));

  const docsDir = path.join(process.cwd(), 'docs', 'screenshots');
  const artifactDir = '/Users/yuntao/.gemini/antigravity-cli/brain/84684cf6-e539-4da2-9c3d-d1655979527c';

  // 1. Perspective 45° View
  console.log('Setting perspective view...');
  await page.evaluate(() => {
    if (window.__threeCamera && window.__threeControls) {
      window.__threeCamera.position.set(18, 18, 16);
      window.__threeControls.target.set(26, 0, 0);
      window.__threeControls.update();
    }
  });
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const perspectiveDocs = path.join(docsDir, 'after_moe_spread_perspective.png');
  const perspectiveArtifact = path.join(artifactDir, 'after_moe_spread_perspective.png');
  await page.screenshot({ path: perspectiveDocs });
  await page.screenshot({ path: perspectiveArtifact });
  console.log(`Saved perspective view.`);

  // 2. Top-Down View
  console.log('Setting top-down view...');
  await page.evaluate(() => {
    if (window.__threeCamera && window.__threeControls) {
      window.__threeCamera.position.set(26, 22, 0.1); // slight offset to prevent gimbal lock
      window.__threeControls.target.set(26, 0, 0);
      window.__threeControls.update();
    }
  });
  await new Promise(resolve => setTimeout(resolve, 1000));

  const topdownDocs = path.join(docsDir, 'after_moe_spread_topdown.png');
  const topdownArtifact = path.join(artifactDir, 'after_moe_spread_topdown.png');
  await page.screenshot({ path: topdownDocs });
  await page.screenshot({ path: topdownArtifact });
  console.log(`Saved top-down view.`);

  await browser.close();
  server.kill();
  console.log('Done.');
}

run().catch(console.error);
