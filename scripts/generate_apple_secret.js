const jwt = require('jsonwebtoken');
const fs = require('fs');

// CONFIGURATION
const TEAM_ID = 'PGL4J99RS6'; // Found in your screenshot
const KEY_ID = '39FD8J662Y'; // From your .p8 filename
const CLIENT_ID = 'com.tryweeve.app'; // Your Bundle ID
const PRIVATE_KEY_PATH = '/Users/jamie/Downloads/AuthKey_39FD8J662Y.p8'; // Path to your downloaded .p8 file

// Generate the JWT
const generateSecret = () => {
    try {
        const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

        const token = jwt.sign({}, privateKey, {
            algorithm: 'ES256',
            expiresIn: '180d', // 6 months
            audience: 'https://appleid.apple.com',
            issuer: TEAM_ID,
            subject: CLIENT_ID,
            keyid: KEY_ID,
        });

        console.log('\n✅ Your Apple Client Secret JWT is:\n');
        console.log(token);
        console.log('\n⚠️  Copy the above token and paste it into the "Secret Key" field in Supabase.\n');
    } catch (err) {
        console.error('Error generating token:', err.message);
    }
};

generateSecret();
