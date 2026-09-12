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

  // MoE Focus Z-Projection Twin Vise
  console.log('Setting Focus Twin Vise view...');
  await page.evaluate(() => {
    if (window.__threeCamera && window.__threeControls) {
      window.__threeCamera.position.set(23.0, 10.0, 14.0);
      window.__threeControls.target.set(23.0, 2.0, -2.5);
      window.__threeControls.update();
    }
  });
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const focusDocs = path.join(docsDir, 'after_depth_projection_focus.png');
  const focusArtifact = path.join(artifactDir, 'after_depth_projection_focus.png');
  await page.screenshot({ path: focusDocs });
  await page.screenshot({ path: focusArtifact });
  console.log(`Saved focus view.`);

  // Top-Down View
  console.log('Setting top-down view...');
  await page.evaluate(() => {
    if (window.__threeCamera && window.__threeControls) {
      window.__threeCamera.position.set(25.0, 25.0, -0.01);
      window.__threeControls.target.set(25.0, 0, 0);
      window.__threeControls.update();
    }
  });
  await new Promise(resolve => setTimeout(resolve, 1000));

  const topdownDocs = path.join(docsDir, 'after_depth_projection_topdown.png');
  const topdownArtifact = path.join(artifactDir, 'after_depth_projection_topdown.png');
  await page.screenshot({ path: topdownDocs });
  await page.screenshot({ path: topdownArtifact });
  console.log(`Saved top-down view.`);

  await browser.close();
  server.kill();
  console.log('Done.');
}

run().catch(console.error);
