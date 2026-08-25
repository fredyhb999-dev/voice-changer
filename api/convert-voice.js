const fetch = require('node-fetch');
const FormData = require('form-data');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
        const { audio, voiceId } = req.body;

        if (!audio || !voiceId) {
            return res.status(400).json({ error: 'audio and voiceId are required' });
        }

        const audioBuffer = Buffer.from(audio, 'base64');

        const form = new FormData();
        form.append('audio', audioBuffer, { filename: 'recording.webm', contentType: 'audio/webm' });
        form.append('model_id', 'eleven_multilingual_sts_v2');

        const response = await fetch(
            `https://api.elevenlabs.io/v1/speech-to-speech/${voiceId}`,
            {
                method: 'POST',
                headers: {
                    'xi-api-key': apiKey,
                    ...form.getHeaders()
                },
                body: form
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs error:', errorText);
            return res.status(response.status).json({ error: errorText });
        }

        const resultBuffer = await response.buffer();

        res.setHeader('Content-Type', 'audio/mpeg');
        res.send(resultBuffer);
    } catch (error) {
        console.error('Function error:', error);
        return res.status(500).json({ error: error.message });
    }
};
