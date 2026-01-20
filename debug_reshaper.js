
const FORMS = {
    'ا': ['\uFE8D', '\uFE8E', '\uFE8D', '\uFE8E'],
    'آ': ['\uFE81', '\uFE82', '\uFE81', '\uFE82'],
    'ب': ['\uFE8F', '\uFE90', '\uFE91', '\uFE92'],
    'پ': ['\uFB56', '\uFB57', '\uFB58', '\uFB59'],
    'ت': ['\uFE95', '\uFE96', '\uFE97', '\uFE98'],
    'ٹ': ['\uFB66', '\uFB67', '\uFB68', '\uFB69'],
    'ث': ['\uFE99', '\uFE9A', '\uFE9B', '\uFE9C'],
    'ج': ['\uFE9D', '\uFE9E', '\uFE9F', '\uFEA0'],
    'چ': ['\uFB7A', '\uFB7B', '\uFB7C', '\uFB7D'],
    'ح': ['\uFEA1', '\uFEA2', '\uFEA3', '\uFEA4'],
    'خ': ['\uFEA5', '\uFEA6', '\uFEA7', '\uFEA8'],
    'د': ['\uFEA9', '\uFEAA', '\uFEA9', '\uFEAA'],
    'ڈ': ['\uFB88', '\uFB89', '\uFB88', '\uFB89'],
    'ذ': ['\uFEAB', '\uFEAC', '\uFEAB', '\uFEAC'],
    'ر': ['\uFEAD', '\uFEAE', '\uFEAD', '\uFEAE'],
    'ڑ': ['\uFB8C', '\uFB8D', '\uFB8C', '\uFB8D'],
    'ز': ['\uFEAF', '\uFEB0', '\uFEAF', '\uFEB0'],
    'ژ': ['\uFB8A', '\uFB8B', '\uFB8A', '\uFB8B'],
    'س': ['\uFEB1', '\uFEB2', '\uFEB3', '\uFEB4'],
    'ش': ['\uFEB5', '\uFEB6', '\uFEB7', '\uFEB8'],
    'ص': ['\uFEB9', '\uFEBA', '\uFEBB', '\uFEBC'],
    'ض': ['\uFEBD', '\uFEBE', '\uFEBF', '\uFEC0'],
    'ط': ['\uFEC1', '\uFEC2', '\uFEC3', '\uFEC4'],
    'ظ': ['\uFEC5', '\uFEC6', '\uFEC7', '\uFEC8'],
    'ع': ['\uFEC9', '\uFECA', '\uFECB', '\uFECC'],
    'غ': ['\uFECD', '\uFECE', '\uFECF', '\uFED0'],
    'ف': ['\uFED1', '\uFED2', '\uFED3', '\uFED4'],
    'ق': ['\uFED5', '\uFED6', '\uFED7', '\uFED8'],
    'ک': ['\uFED9', '\uFEDA', '\uFEDB', '\uFEDC'],
    'گ': ['\uFB92', '\uFB93', '\uFB94', '\uFB95'],
    'ل': ['\uFEDD', '\uFEDE', '\uFEDF', '\uFEE0'],
    'م': ['\uFEE1', '\uFEE2', '\uFEE3', '\uFEE4'],
    'ن': ['\uFEE5', '\uFEE6', '\uFEE7', '\uFEE8'],
    'و': ['\uFEE9', '\uFEEA', '\uFEE9', '\uFEEA'],
    'ہ': ['\uFBA6', '\uFBA7', '\uFBA8', '\uFBA9'],
    'ھ': ['\uFBEA', '\uFBEB', '\uFBEC', '\uFBED'],
    'ی': ['\uFBFC', '\uFBFD', '\uFBFE', '\uFBFF'],
    'ے': ['\uFBA2', '\uFBA3', '\uFBA2', '\uFBA3'],
    'ئ': ['\uFE89', '\uFE8A', '\uFE8B', '\uFE8C'],
};

const text = "خرچ";
console.log(`Testing text: ${text}`);

for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
    const isUrdu = FORMS[char] !== undefined;
    console.log(`Char: ${char}, Code: U+${code}, isUrdu: ${isUrdu}`);
    if (isUrdu) {
        console.log(`  Forms: ${JSON.stringify(FORMS[char])}`);
    }
}
