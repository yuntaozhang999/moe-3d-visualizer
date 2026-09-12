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

  // MoE Overview Focus
  console.log('Setting MoE Shared Experts Front view...');
  await page.evaluate(() => {
    if (window.__threeCamera && window.__threeControls) {
      window.__threeCamera.position.set(24.0, 12.0, 14.0);
      window.__threeControls.target.set(24.0, 2.0, 0);
      window.__threeControls.update();
    }
  });
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const docsPath = path.join(docsDir, 'after_shared_experts_front.png');
  const artifactPath = path.join(artifactDir, 'after_shared_experts_front.png');
  await page.screenshot({ path: docsPath });
  await page.screenshot({ path: artifactPath });
  console.log(`Saved screenshot.`);

  await browser.close();
  server.kill();
  console.log('Done.');
}

run().catch(console.error);
