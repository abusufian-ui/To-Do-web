const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');


const convertToPdf = (inputPath, outputDir) => {
  return new Promise(async (resolve, reject) => {
    const ext = path.extname(inputPath).toLowerCase();
    if (ext === '.pdf') {
      return resolve(inputPath); 
    }

    
    let sofficePath = 'soffice'; 
    
    if (process.platform === 'win32') {
      const winPaths = [
        'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
        'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe'
      ];
      for (const p of winPaths) {
        if (fs.existsSync(p)) {
          sofficePath = `"${p}"`;
          break;
        }
      }
    }

    
    if (process.env.LIBREOFFICE_PATH) {
      sofficePath = `"${process.env.LIBREOFFICE_PATH}"`;
    }

    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const command = `${sofficePath} --headless --convert-to pdf --outdir "${outputDir}" "${inputPath}"`;
    
    console.log(`[DOC_CONVERTER] Attempting local LibreOffice conversion: ${command}`);
    
    exec(command, async (error, stdout, stderr) => {
      const inputBasename = path.basename(inputPath, ext);
      const expectedPdfPath = path.join(outputDir, `${inputBasename}.pdf`);

      if (!error && fs.existsSync(expectedPdfPath)) {
        console.log(`[DOC_CONVERTER] Local conversion successful: ${expectedPdfPath}`);
        return resolve(expectedPdfPath);
      }
      
      console.warn(`[DOC_CONVERTER] Local LibreOffice conversion failed or not found. Output:`, stdout, stderr);
      
      
      const convertApiSecret = process.env.CONVERT_API_SECRET;
      if (convertApiSecret) {
        console.log(`[DOC_CONVERTER] Attempting ConvertAPI fallback for: ${inputPath}`);
        try {
          const fileFormat = ext.substring(1); 
          const url = `https://api.convertapi.com/v1/convert/${fileFormat}/to/pdf?Secret=${convertApiSecret}`;
          
          const fileData = fs.readFileSync(inputPath);
          
          const blob = new Blob([fileData]);
          const formData = new FormData();
          formData.append('File', blob, path.basename(inputPath));
          
          const response = await fetch(url, {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`ConvertAPI response status ${response.status}: ${errText}`);
          }
          
          const result = await response.json();
          if (!result.Files || result.Files.length === 0) {
            throw new Error('ConvertAPI returned no files.');
          }
          
          const downloadUrl = result.Files[0].Url;
          const downloadRes = await fetch(downloadUrl);
          if (!downloadRes.ok) {
            throw new Error(`Failed to download converted PDF from ConvertAPI: ${downloadRes.statusText}`);
          }
          
          const pdfBuffer = await downloadRes.arrayBuffer();
          fs.writeFileSync(expectedPdfPath, Buffer.from(pdfBuffer));
          
          console.log(`[DOC_CONVERTER] ConvertAPI fallback successful: ${expectedPdfPath}`);
          return resolve(expectedPdfPath);
        } catch (apiErr) {
          console.error(`[DOC_CONVERTER] ConvertAPI fallback failed:`, apiErr);
          return reject(new Error(`Document conversion failed. LibreOffice is not installed, and ConvertAPI request failed: ${apiErr.message}`));
        }
      } else {
        return reject(new Error('Document conversion failed. LibreOffice is not installed and CONVERT_API_SECRET is not configured in .env.'));
      }
    });
  });
};

module.exports = { convertToPdf };
