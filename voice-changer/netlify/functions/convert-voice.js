const fetch = require('node-fetch');
const Busboy = require('busboy');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'API key not configured. Set ELEVENLABS_API_KEY in Netlify environment variables.' })
        };
    }

    return new Promise((resolve) => {
        const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
        const busboy = new Busboy({ headers: { 'content-type': contentType } });

        let voiceId = null;
        let audioBuffer = null;
        let audioFilename = 'recording.webm';

        busboy.on('field', (name, value) => {
            if (name === 'voiceId') {
                voiceId = value;
            }
        });

        busboy.on('file', (fieldname, file, info) => {
            audioFilename = info.filename || 'recording.webm';
            const chunks = [];
            file.on('data', (data) => chunks.push(data));
            file.on('end', () => {
                audioBuffer = Buffer.concat(chunks);
            });
        });

        busboy.on('finish', async () => {
            if (!voiceId) {
                resolve({
                    statusCode: 400,
                    body: JSON.stringify({ error: 'voiceId is required' })
                });
                return;
            }

            if (!audioBuffer) {
                resolve({
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Audio file is required' })
                });
                return;
            }

            try {
                const response = await fetch(
                    `https://api.elevenlabs.io/v1/speech-to-speech/${voiceId}`,
                    {
                        method: 'POST',
                        headers: {
                            'xi-api-key': apiKey
                        },
                        body: audioBuffer,
                        duplex: 'half'
                    }
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('ElevenLabs error:', errorText);
                    resolve({
                        statusCode: response.status,
                        body: JSON.stringify({ error: errorText })
                    });
                    return;
                }

                const resultBuffer = await response.buffer();

                resolve({
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'audio/mpeg',
                        'Content-Disposition': 'attachment; filename="converted-voice.mp3"'
                    },
                    body: resultBuffer.toString('base64'),
                    isBase64Encoded: true
                });
            } catch (error) {
                console.error('Error:', error);
                resolve({
                    statusCode: 500,
                    body: JSON.stringify({ error: error.message })
                });
            }
        });

        if (event.isBase64Encoded) {
            busboy.end(Buffer.from(event.body, 'base64'));
        } else {
            busboy.end(Buffer.from(event.body));
        }
    });
};
