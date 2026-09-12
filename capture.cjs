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
  
  const docsPath = path.join(process.cwd(), 'docs', 'screenshots', 'after_moe_aligned_matched.png');
  const artifactPath = '/Users/yuntao/.gemini/antigravity-cli/brain/84684cf6-e539-4da2-9c3d-d1655979527c/after_moe_aligned_matched.png';
  
  console.log('Taking screenshot...');
  await page.screenshot({ path: docsPath });
  await page.screenshot({ path: artifactPath });
  console.log(`Saved to ${docsPath}`);
  console.log(`Saved to ${artifactPath}`);
  
  await browser.close();
  server.kill();
  console.log('Done.');
}

run().catch(console.error);
