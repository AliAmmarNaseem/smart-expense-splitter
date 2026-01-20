/**
 * Simple English to Urdu transliteration utility
 * Maps English phonemes to Urdu characters
 */

const charMap = {
    // Vowels
    'a': 'ا',
    'i': 'ی',
    'u': 'و',
    'o': 'و',
    'e': 'ے',

    // Consonants
    'b': 'ب',
    'p': 'پ',
    't': 'ت',
    'j': 'ج',
    'ch': 'چ',
    'h': 'ہ',
    'kh': 'خ',
    'd': 'د',
    'r': 'ر',
    'z': 'ز',
    's': 'س',
    'sh': 'ش',
    'f': 'ف',
    'k': 'ک',
    'g': 'گ',
    'l': 'ل',
    'm': 'م',
    'n': 'ن',
    'v': 'و',
    'w': 'و',
    'y': 'ی',

    // Special combinations
    'th': 'تھ',
    'ph': 'پھ',
    'bh': 'بھ',
    'dh': 'دھ',
    'gh': 'غ',
    'zh': 'ژ',
    'aa': 'آ',
    'ee': 'ی',
    'oo': 'و',
    'au': 'و',
    'ai': 'ے',
};

export const transliterateToUrdu = (text) => {
    if (!text) return '';

    let lowerText = text.toLowerCase();
    let result = '';
    let i = 0;

    while (i < lowerText.length) {
        // Check for 2-character combinations first
        if (i + 1 < lowerText.length) {
            const twoChar = lowerText.substr(i, 2);
            if (charMap[twoChar]) {
                result += charMap[twoChar];
                i += 2;
                continue;
            }
        }

        // Single character mapping
        const char = lowerText[i];
        if (charMap[char]) {
            result += charMap[char];
        } else {
            // Keep original if no mapping found (e.g. numbers, punctuation)
            result += text[i];
        }
        i++;
    }

    return result;
};
