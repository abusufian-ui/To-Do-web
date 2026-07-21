const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Converts a .docx / .doc file to a 100% pixel-perfect PDF (including all logos, charts, tables, graphs, and headers).
 * Uses native Microsoft Word COM Automation on Windows, with LibreOffice and ConvertAPI fallbacks.
 */
const convertToPdf = async (inputPath, outputDir) => {
  const ext = path.extname(inputPath).toLowerCase();
  if (ext === '.pdf') return inputPath;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const inputBasename = path.basename(inputPath, ext);
  const expectedPdfPath = path.join(outputDir, `${inputBasename}.pdf`);

  // 1. Primary Windows Converter: Microsoft Word Native COM Engine (Pixel-Perfect, Includes Logos, Charts, Tables)
  if (process.platform === 'win32') {
    try {
      console.log(`[DOC_CONVERTER] Attempting Microsoft Word Native COM conversion for: ${inputBasename}`);
      
      const psScriptPath = path.join(outputDir, `convert_${Date.now()}_${Math.random().toString(36).substring(7)}.ps1`);
      const psContent = `
$InputPath = "${inputPath.replace(/\\/g, '\\\\').replace(/"/g, '`"')}"
$OutputPath = "${expectedPdfPath.replace(/\\/g, '\\\\').replace(/"/g, '`"')}"

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

try {
    $doc = $word.Documents.Open($InputPath, $false, $true)
    $doc.SaveAs([ref]$OutputPath, [ref]17)
    $doc.Close([ref]$false)
    Write-Host "WORD_COM_SUCCESS"
} catch {
    Write-Error $_.Exception.Message
} finally {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
`;
      fs.writeFileSync(psScriptPath, psContent, 'utf8');

      execSync(`powershell -ExecutionPolicy Bypass -File "${psScriptPath}"`, { timeout: 60000 });

      try { fs.unlinkSync(psScriptPath); } catch (_) {}

      if (fs.existsSync(expectedPdfPath) && fs.statSync(expectedPdfPath).size > 1000) {
        console.log(`[DOC_CONVERTER] Native Word COM successful: ${expectedPdfPath} (${fs.statSync(expectedPdfPath).size} bytes)`);
        return expectedPdfPath;
      }
    } catch (wordErr) {
      console.warn(`[DOC_CONVERTER] Native Word COM conversion failed:`, wordErr.message);
    }
  }

  // 2. Secondary Converter: LibreOffice headless
  let sofficePath = 'soffice';
  if (process.platform === 'win32') {
    const winPaths = [
      'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
      'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe'
    ];
    for (const p of winPaths) {
      if (fs.existsSync(p)) { sofficePath = p; break; }
    }
  }

  try {
    const args = ['--headless', '--convert-to', 'pdf', '--outdir', `"${outputDir}"`, `"${inputPath}"`];
    console.log(`[DOC_CONVERTER] Attempting LibreOffice conversion for: ${inputBasename}`);
    execSync(`"${sofficePath}" ${args.join(' ')}`, { timeout: 60000 });
    if (fs.existsSync(expectedPdfPath) && fs.statSync(expectedPdfPath).size > 1000) {
      console.log(`[DOC_CONVERTER] LibreOffice successful: ${expectedPdfPath}`);
      return expectedPdfPath;
    }
  } catch (soErr) {
    console.warn(`[DOC_CONVERTER] LibreOffice conversion failed:`, soErr.message);
  }

  // 3. Fallback Converter: ConvertAPI if secret configured in env
  const convertApiSecret = process.env.CONVERT_API_SECRET;
  if (convertApiSecret) {
    try {
      console.log(`[DOC_CONVERTER] Attempting ConvertAPI fallback for: ${inputBasename}`);
      const fileFormat = ext.substring(1);
      const url = `https://api.convertapi.com/v1/convert/${fileFormat}/to/pdf?Secret=${convertApiSecret}`;
      const fileData = fs.readFileSync(inputPath);
      const blob = new Blob([fileData]);
      const formData = new FormData();
      formData.append('File', blob, path.basename(inputPath));
      const response = await fetch(url, { method: 'POST', body: formData });
      if (response.ok) {
        const result = await response.json();
        if (result.Files && result.Files.length > 0) {
          const downloadRes = await fetch(result.Files[0].Url);
          const pdfBuffer = await downloadRes.arrayBuffer();
          fs.writeFileSync(expectedPdfPath, Buffer.from(pdfBuffer));
          console.log(`[DOC_CONVERTER] ConvertAPI fallback successful: ${expectedPdfPath}`);
          return expectedPdfPath;
        }
      }
    } catch (apiErr) {
      console.error(`[DOC_CONVERTER] ConvertAPI fallback failed:`, apiErr.message);
    }
  }

  throw new Error(`Document conversion failed for ${inputBasename}. Please ensure Microsoft Word or LibreOffice is installed.`);
};

module.exports = { convertToPdf };
