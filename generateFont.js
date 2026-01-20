
const fs = require('fs');
const path = require('path');

const fontPath = path.join(__dirname, 'public', 'fonts', 'Amiri-Regular.ttf');
const outputPath = path.join(__dirname, 'src', 'utils', 'AmiriFont.js');

try {
    console.log(`Reading font from: ${fontPath}`);
    const fontBuffer = fs.readFileSync(fontPath);
    const base64 = fontBuffer.toString('base64');

    const content = `export const amiriFontBase64 = "${base64}";`;

    console.log(`Writing to: ${outputPath}`);
    fs.writeFileSync(outputPath, content);
    console.log('Success!');
} catch (err) {
    console.error('Error:', err);
    process.exit(1);
}
