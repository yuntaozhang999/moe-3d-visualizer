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

  // 1. Stage 2 Attn node_v Focus
  console.log('Setting Attn focus view...');
  await page.evaluate(() => {
    if (window.__threeCamera && window.__threeControls) {
      window.__threeCamera.position.set(2.0, 3.0, 6.0);
      window.__threeControls.target.set(2.0, 1.0, -2.0);
      window.__threeControls.update();
    }
  });
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const attnDocs = path.join(docsDir, 'after_elevation_attn_v.png');
  const attnArtifact = path.join(artifactDir, 'after_elevation_attn_v.png');
  await page.screenshot({ path: attnDocs });
  await page.screenshot({ path: attnArtifact });
  console.log(`Saved Attn view.`);

  // 2. Stage 3 MoE Latent RMSNorm Focus
  console.log('Setting MoE focus view...');
  await page.evaluate(() => {
    if (window.__threeCamera && window.__threeControls) {
      window.__threeCamera.position.set(25.5, 3.0, 6.0);
      window.__threeControls.target.set(25.5, 1.0, -2.5);
      window.__threeControls.update();
    }
  });
  await new Promise(resolve => setTimeout(resolve, 1000));

  const moeDocs = path.join(docsDir, 'after_elevation_moe_ground.png');
  const moeArtifact = path.join(artifactDir, 'after_elevation_moe_ground.png');
  await page.screenshot({ path: moeDocs });
  await page.screenshot({ path: moeArtifact });
  console.log(`Saved MoE view.`);

  await browser.close();
  server.kill();
  console.log('Done.');
}

run().catch(console.error);
