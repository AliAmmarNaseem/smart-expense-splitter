
import { reshapeUrdu } from './src/utils/urduReshaper.js';

const samples = [
    "خرچ", // Expense
    "تصفیہ", // Settlement
    "ٹرپ", // Trip
    "ہیلو", // Hello
    "پاکستان" // Pakistan
];

console.log("Testing Urdu Reshaper:");
samples.forEach(text => {
    const reshaped = reshapeUrdu(text);
    console.log(`\nOriginal: ${text}`);
    console.log(`Reshaped (Visual): ${reshaped}`);
    console.log(`Codepoints:`);
    for (let i = 0; i < reshaped.length; i++) {
        const code = reshaped.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0');
        console.log(`  ${reshaped[i]}: U+${code}`);
    }
});
