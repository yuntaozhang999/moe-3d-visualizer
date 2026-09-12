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
  const artifactDir = '/Users/yuntao/.gemini/antigravity-cli/brain/f58b6c8e-4b6a-42fd-8d0a-5323ccd9efae';

  // 1. Focus MoE 透视视角
  console.log('Setting Focus MoE view...');
  await page.evaluate(() => {
    if (window.__threeCamera && window.__threeControls) {
      window.__threeCamera.position.set(28.0, 10.0, 16.0);
      window.__threeControls.target.set(28.0, 2.0, -1.0);
      window.__threeControls.update();
    }
  });
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const focusDocs = path.join(docsDir, 'after_shared_front_focus_clean.png');
  const focusArtifact = path.join(artifactDir, 'after_shared_front_focus_clean.png');
  await page.screenshot({ path: focusDocs });
  
  // Save to brain directory (using current conversation ID)
  const currentArtifactDir = '/Users/yuntao/.gemini/antigravity-cli/brain/84684cf6-e539-4da2-9c3d-d1655979527c';
  await page.screenshot({ path: path.join(currentArtifactDir, 'after_shared_front_focus_clean.png') });
  console.log(`Saved focus view.`);

  // 2. Top-Down 俯视视角
  console.log('Setting top-down view...');
  await page.evaluate(() => {
    if (window.__threeCamera && window.__threeControls) {
      window.__threeCamera.position.set(28.0, 25.0, -0.01);
      window.__threeControls.target.set(28.0, 0, 0);
      window.__threeControls.update();
    }
  });
  await new Promise(resolve => setTimeout(resolve, 1000));

  const topdownDocs = path.join(docsDir, 'after_router_neg_z_topdown.png');
  await page.screenshot({ path: topdownDocs });
  await page.screenshot({ path: path.join(currentArtifactDir, 'after_router_neg_z_topdown.png') });
  console.log(`Saved top-down view.`);

  await browser.close();
  server.kill();
  console.log('Done.');
}

run().catch(console.error);
