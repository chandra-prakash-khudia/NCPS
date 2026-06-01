// Convert HTML report to PDF using Puppeteer
const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const htmlPath = path.resolve(__dirname, 'NCPS_FINAL_PROJECT_REPORT.html');
    const pdfPath = path.resolve(__dirname, 'NCPS_FINAL_PROJECT_REPORT.pdf');
    
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    console.log('Loading HTML...');
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0', timeout: 60000 });
    
    console.log('Generating PDF...');
    await page.pdf({
        path: pdfPath,
        format: 'A4',
        margin: { top: '25mm', bottom: '25mm', left: '20mm', right: '20mm' },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `
            <div style="font-size:8px; color:#555; width:100%; text-align:center; font-family:Helvetica,Arial,sans-serif; border-bottom:0.5px solid #2c3e50; padding-bottom:5px; margin:0 20mm;">
                NETWORK-AWARE CREDIBILITY AND PROPAGATION SYSTEM | 2026
            </div>`,
        footerTemplate: `
            <div style="font-size:8px; color:#555; width:100%; text-align:center; font-family:Helvetica,Arial,sans-serif; border-top:0.5px solid #2c3e50; padding-top:5px; margin:0 20mm;">
                <span class="pageNumber"></span> — Dept. of CSE, National Institute of Technology Srinagar
            </div>`,
    });
    
    await browser.close();
    
    const fs = require('fs');
    const stats = fs.statSync(pdfPath);
    console.log(`\n✅ PDF generated successfully!`);
    console.log(`   File: ${pdfPath}`);
    console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
})();
