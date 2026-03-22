const crypto = require('crypto');

function generatePhrase() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = crypto.randomBytes(32);
    return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}

function generateEncryptedClinicId(clinicKey, phrase) {
    const concatenated = phrase + clinicKey;
    const hash = crypto.createHash('sha512').update(Buffer.from(concatenated, 'utf8')).digest();
    let hashB64 = hash.toString('base64');
    if (hashB64.endsWith('==')) {
        hashB64 = hashB64.slice(0, -2);
    }
    const finalString = phrase + hashB64;
    return encodeURIComponent(finalString);
}

function generateEncryptedUserId(userId, clinicKey, phrase) {
    const phrase22 = phrase.slice(0, 22);
    const concatenated = userId + phrase22 + clinicKey;
    const hash = crypto.createHash('sha512').update(Buffer.from(concatenated, 'utf8')).digest();
    let hashB64 = hash.toString('base64');
    if (hashB64.endsWith('==')) {
        hashB64 = hashB64.slice(0, -2);
    }
    return encodeURIComponent(hashB64);
}

function generateSSOUrl(params) {
    const clinicId = (process.env.DOSESPOT_CLINIC_ID || '1007159').trim();
    const clinicKey = (process.env.DOSESPOT_CLINIC_KEY || 'HPHH63FJA79VHFQQ5S4UR2K9JMVTF2N9').trim();
    const baseUrl = (process.env.DOSESPOT_BASE_URL || 'https://my.staging.dosespot.com').trim();

    const phrase = generatePhrase();

    const ssoCode = decodeURIComponent(generateEncryptedClinicId(clinicKey, phrase));
    const ssoUserVerify = decodeURIComponent(generateEncryptedUserId(
        params.clinicianDoseSpotId.toString(),
        clinicKey,
        phrase
    ));

    const urlParams = new URLSearchParams({
        SingleSignOnClinicId: clinicId,
        SingleSignOnUserId: params.clinicianDoseSpotId.toString(),
        SingleSignOnPhraseLength: '32',
        SingleSignOnCode: ssoCode,
        SingleSignOnUserIdVerify: ssoUserVerify,
    });

    if (params.patientDoseSpotId) {
        urlParams.set('PatientId', params.patientDoseSpotId.toString());
    }

    if (params.refillsErrors) {
        urlParams.set('RefillsErrors', '1');
        urlParams.delete('PatientId'); // mutually exclusive per DoseSpot spec
    }

    return `${baseUrl}/LoginSingleSignOn.aspx?${urlParams.toString()}`;
}

module.exports = {
    generateSSOUrl
};
