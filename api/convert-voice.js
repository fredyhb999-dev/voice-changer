const fetch = require('node-fetch');
const FormData = require('form-data');

module.exports = async function handler(req, res) {
    console.log('Function started');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    console.log('API key exists:', !!apiKey);

    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
        const { audio, voiceId } = req.body;
        console.log('Voice ID:', voiceId);
        console.log('Audio exists:', !!audio);

        if (!audio || !voiceId) {
            return res.status(400).json({ error: 'audio and voiceId are required' });
        }

        const audioBuffer = Buffer.from(audio, 'base64');
        console.log('Audio buffer size:', audioBuffer.length);

        const form = new FormData();
        form.append('audio', audioBuffer, { filename: 'recording.webm', contentType: 'audio/webm' });
        form.append('model_id', 'eleven_multilingual_sts_v2');

        console.log('Calling ElevenLabs API...');

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

        console.log('ElevenLabs response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs error:', errorText);
            return res.status(response.status).json({ error: errorText });
        }

        const resultBuffer = await response.buffer();
        console.log('Result buffer size:', resultBuffer.length);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.send(resultBuffer);
    } catch (error) {
        console.error('Function error:', error.message);
        console.error('Error stack:', error.stack);
        return res.status(500).json({ error: error.message });
    }
};
