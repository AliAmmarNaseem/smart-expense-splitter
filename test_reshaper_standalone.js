
// Paste urduReshaper logic here for testing

const FORMS = {
    'ا': ['ا', 'ا', 'ا', 'ا'],
    'آ': ['آ', 'آ', 'آ', 'آ'],
    'ب': ['ب', 'ـب', 'بـ', 'ـبـ'],
    'پ': ['پ', 'ـپ', 'پـ', 'ـپـ'],
    'ت': ['ت', 'ـت', 'تـ', 'ـتـ'],
    'ٹ': ['ٹ', 'ـٹ', 'ٹـ', 'ـٹـ'],
    'ث': ['ث', 'ـث', 'ثـ', 'ـثـ'],
    'ج': ['ج', 'ـج', 'جـ', 'ـجـ'],
    'چ': ['چ', 'ـچ', 'چـ', 'ـچـ'],
    'ح': ['ح', 'ـح', 'حـ', 'ـحـ'],
    'خ': ['خ', 'ـخ', 'خـ', 'ـخـ'],
    'د': ['د', 'ـد', 'د', 'ـد'],
    'ڈ': ['ڈ', 'ـڈ', 'ڈ', 'ـڈ'],
    'ذ': ['ذ', 'ـذ', 'ذ', 'ـذ'],
    'ر': ['ر', 'ـر', 'ر', 'ـر'],
    'ڑ': ['ڑ', 'ـڑ', 'ڑ', 'ـڑ'],
    'ز': ['ز', 'ـز', 'ز', 'ـز'],
    'ژ': ['ژ', 'ـژ', 'ژ', 'ـژ'],
    'س': ['س', 'ـس', 'سـ', 'ـسـ'],
    'ش': ['ش', 'ـش', 'شـ', 'ـشـ'],
    'ص': ['ص', 'ـص', 'صـ', 'ـصـ'],
    'ض': ['ض', 'ـض', 'ضـ', 'ـضـ'],
    'ط': ['ط', 'ـط', 'طـ', 'ـطـ'],
    'ظ': ['ظ', 'ـظ', 'ظـ', 'ـظـ'],
    'ع': ['ع', 'ـع', 'عـ', 'ـعـ'],
    'غ': ['غ', 'ـغ', 'غـ', 'ـغـ'],
    'ف': ['ف', 'ـف', 'فـ', 'ـفـ'],
    'ق': ['ق', 'ـق', 'قـ', 'ـقـ'],
    'ک': ['ک', 'ـک', 'کـ', 'ـکـ'],
    'گ': ['گ', 'ـگ', 'گـ', 'ـگـ'],
    'ل': ['ل', 'ـل', 'لـ', 'ـلـ'],
    'م': ['م', 'ـم', 'مـ', 'ـمـ'],
    'ن': ['ن', 'ـن', 'نـ', 'ـنـ'],
    'و': ['و', 'ـو', 'و', 'ـو'],
    'ہ': ['ہ', 'ـہ', 'ہـ', 'ـہـ'],
    'ھ': ['ھ', 'ـھ', 'ھـ', 'ـھـ'],
    'ی': ['ی', 'ـی', 'یـ', 'ـیـ'],
    'ے': ['ے', 'ـے', 'ے', 'ـے'],
    'ئ': ['ئ', 'ـئ', 'ئـ', 'ـئـ'],
};

const NON_CONNECTING_AFTER = new Set([
    'ا', 'آ', 'د', 'ڈ', 'ذ', 'ر', 'ڑ', 'ز', 'ژ', 'و', 'ے'
]);

const isUrduChar = (char) => {
    return FORMS[char] !== undefined;
};

const getPresentationForm = (char, formIndex) => {
    const map = {
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

    if (map[char] && map[char][formIndex]) {
        return map[char][formIndex];
    }
    return char;
};

const reshapeUrdu = (text) => {
    if (!text) return '';

    let res = '';
    const chars = text.split('');

    for (let i = 0; i < chars.length; i++) {
        const prev = i > 0 ? chars[i - 1] : null;
        const curr = chars[i];
        const next = i < chars.length - 1 ? chars[i + 1] : null;

        if (!isUrduChar(curr)) {
            res += curr;
            continue;
        }

        const prevConnects = prev && isUrduChar(prev) && !NON_CONNECTING_AFTER.has(prev);
        const nextConnects = next && isUrduChar(next);

        let formIndex = 0;

        if (prevConnects && nextConnects) {
            formIndex = 3; // Medial
        } else if (prevConnects && !nextConnects) {
            formIndex = 1; // Final
        } else if (!prevConnects && nextConnects) {
            formIndex = 2; // Initial
        } else {
            formIndex = 0; // Isolated
        }

        if (curr === 'ل' && next === 'ا') {
            if (prevConnects) {
                res += '\uFEFC';
            } else {
                res += '\uFEFB';
            }
            i++;
            continue;
        }

        res += getPresentationForm(curr, formIndex);
    }

    return res.split('').reverse().join('');
};

const samples = [
    "خرچ",
    "تصفیہ",
    "ٹرپ"
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
