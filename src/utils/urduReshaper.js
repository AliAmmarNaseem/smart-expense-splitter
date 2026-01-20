/**
 * Urdu/Arabic Text Reshaper
 * Converts disconnected characters to their correct connected forms (Initial, Medial, Final, Isolated)
 * Using Unicode Escape Sequences for keys to avoid encoding issues.
 */

// Mapping of characters to their forms: [Isolated, Final, Initial, Medial]
const FORMS = {
    '\u0627': ['\uFE8D', '\uFE8E', '\uFE8D', '\uFE8E'], // Alif
    '\u0622': ['\uFE81', '\uFE82', '\uFE81', '\uFE82'], // Alif Madda
    '\u0628': ['\uFE8F', '\uFE90', '\uFE91', '\uFE92'], // Be
    '\u067E': ['\uFB56', '\uFB57', '\uFB58', '\uFB59'], // Pe
    '\u062A': ['\uFE95', '\uFE96', '\uFE97', '\uFE98'], // Te
    '\u0679': ['\uFB66', '\uFB67', '\uFB68', '\uFB69'], // Tte
    '\u062B': ['\uFE99', '\uFE9A', '\uFE9B', '\uFE9C'], // Se
    '\u062C': ['\uFE9D', '\uFE9E', '\uFE9F', '\uFEA0'], // Jeem
    '\u0686': ['\uFB7A', '\uFB7B', '\uFB7C', '\uFB7D'], // Che
    '\u062D': ['\uFEA1', '\uFEA2', '\uFEA3', '\uFEA4'], // Hah
    '\u062E': ['\uFEA5', '\uFEA6', '\uFEA7', '\uFEA8'], // Khah
    '\u062F': ['\uFEA9', '\uFEAA', '\uFEA9', '\uFEAA'], // Dal
    '\u0688': ['\uFB88', '\uFB89', '\uFB88', '\uFB89'], // Ddal
    '\u0630': ['\uFEAB', '\uFEAC', '\uFEAB', '\uFEAC'], // Zal
    '\u0631': ['\uFEAD', '\uFEAE', '\uFEAD', '\uFEAE'], // Re
    '\u0691': ['\uFB8C', '\uFB8D', '\uFB8C', '\uFB8D'], // Rre
    '\u0632': ['\uFEAF', '\uFEB0', '\uFEAF', '\uFEB0'], // Ze
    '\u0698': ['\uFB8A', '\uFB8B', '\uFB8A', '\uFB8B'], // Zhe
    '\u0633': ['\uFEB1', '\uFEB2', '\uFEB3', '\uFEB4'], // Seen
    '\u0634': ['\uFEB5', '\uFEB6', '\uFEB7', '\uFEB8'], // Sheen
    '\u0635': ['\uFEB9', '\uFEBA', '\uFEBB', '\uFEBC'], // Sad
    '\u0636': ['\uFEBD', '\uFEBE', '\uFEBF', '\uFEC0'], // Dad
    '\u0637': ['\uFEC1', '\uFEC2', '\uFEC3', '\uFEC4'], // Tah
    '\u0638': ['\uFEC5', '\uFEC6', '\uFEC7', '\uFEC8'], // Zah
    '\u0639': ['\uFEC9', '\uFECA', '\uFECB', '\uFECC'], // Ain
    '\u063A': ['\uFECD', '\uFECE', '\uFECF', '\uFED0'], // Ghain
    '\u0641': ['\uFED1', '\uFED2', '\uFED3', '\uFED4'], // Fe
    '\u0642': ['\uFED5', '\uFED6', '\uFED7', '\uFED8'], // Qaf
    '\u06A9': ['\uFED9', '\uFEDA', '\uFEDB', '\uFEDC'], // Keheh (Urdu Kaf)
    '\u0643': ['\uFED9', '\uFEDA', '\uFEDB', '\uFEDC'], // Arabic Kaf (Mapped to Keheh forms)
    '\u06AF': ['\uFB92', '\uFB93', '\uFB94', '\uFB95'], // Gaf
    '\u0644': ['\uFEDD', '\uFEDE', '\uFEDF', '\uFEE0'], // Lam
    '\u0645': ['\uFEE1', '\uFEE2', '\uFEE3', '\uFEE4'], // Meem
    '\u0646': ['\uFEE5', '\uFEE6', '\uFEE7', '\uFEE8'], // Noon
    '\u06BA': ['\uFEE5', '\uFEE6', '\uFEE7', '\uFEE8'], // Noon Ghunna (Treat as Noon for connection?) Usually Isolated \uFB9E, Final \uFB9F. But often connects like Noon. Let's map to Noon forms for now or specific if available.
    '\u0648': ['\uFEE9', '\uFEEA', '\uFEE9', '\uFEEA'], // Waw
    '\u06C1': ['\uFBA6', '\uFBA7', '\uFBA8', '\uFBA9'], // He Goal (Urdu)
    '\u0647': ['\uFEE9', '\uFEEA', '\uFEEB', '\uFEEC'], // Arabic He
    '\u06BE': ['\uFBEA', '\uFBEB', '\uFBEC', '\uFBED'], // He Doachashmee
    '\u06CC': ['\uFBFC', '\uFBFD', '\uFBFE', '\uFBFF'], // Farsi Yeh (Urdu)
    '\u064A': ['\uFEF1', '\uFEF2', '\uFEF3', '\uFEF4'], // Arabic Yeh
    '\u06D2': ['\uFBA2', '\uFBA3', '\uFBA2', '\uFBA3'], // Bari Ye
    '\u0626': ['\uFE89', '\uFE8A', '\uFE8B', '\uFE8C'], // Yeh with Hamza
    '\u0629': ['\uFE93', '\uFE94', '\uFE93', '\uFE94'], // Teh Marbuta
    '\u0649': ['\uFEEF', '\uFEF0', '\uFEEF', '\uFEF0'], // Alif Maksura
};

// Characters that do NOT connect to the next character (Left side non-connecting)
const NON_CONNECTING_AFTER = new Set([
    '\u0627', '\u0622', // Alif, Alif Madda
    '\u062F', '\u0688', '\u0630', // Dal, Ddal, Zal
    '\u0631', '\u0691', '\u0632', '\u0698', // Re, Rre, Ze, Zhe
    '\u0648', // Waw
    '\u06D2', // Bari Ye (Usually non-connecting after)
    '\u0629', // Teh Marbuta
    '\u0649', // Alif Maksura
]);

const isUrduChar = (char) => {
    return FORMS[char] !== undefined;
};

export const reshapeUrdu = (text) => {
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

        // Determine connection status
        const prevConnects = prev && isUrduChar(prev) && !NON_CONNECTING_AFTER.has(prev);
        const nextConnects = next && isUrduChar(next);

        let formIndex = 0; // 0: Isolated

        if (prevConnects && nextConnects) {
            formIndex = 3; // Medial
        } else if (prevConnects && !nextConnects) {
            formIndex = 1; // Final
        } else if (!prevConnects && nextConnects) {
            formIndex = 2; // Initial
        } else {
            formIndex = 0; // Isolated
        }

        // Special handling for Lam-Aleph (لا)
        // Lam: \u0644, Alif: \u0627, Alif Madda: \u0622
        if (curr === '\u0644' && (next === '\u0627' || next === '\u0622')) {
            if (prevConnects) {
                res += '\uFEFC'; // Final Lam-Aleph
            } else {
                res += '\uFEFB'; // Isolated Lam-Aleph
            }
            i++; // Skip the Aleph
            continue;
        }

        // Get the character form
        const forms = FORMS[curr];
        if (forms && forms[formIndex]) {
            res += forms[formIndex];
        } else {
            res += curr;
        }
    }

    // Reverse for RTL rendering in jsPDF (LTR mode)
    return res.split('').reverse().join('');
};
