// Vercel Serverless Function for Anthropic API proxy
// This file should be in /api/anthropic.js for Vercel Functions

// Vercel Functions use Node.js runtime
// For Node.js 18+, fetch is built-in

export default async function handler(req, res) {
    console.log('API request received:', {
        method: req.method,
        url: req.url,
        hasBody: !!req.body,
        envKeyExists: !!process.env.ANTHROPIC_API_KEY
    });

    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const apiKey = process.env.ANTHROPIC_API_KEY;

        if (!apiKey) {
            console.error('ANTHROPIC_API_KEY is not set!');
            console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('ANTHROPIC')));
            console.error('All env vars (first 20):', Object.keys(process.env).slice(0, 20));
            return res.status(500).json({
                error: 'ANTHROPIC_API_KEY is not set in server environment',
                hint: 'Please set ANTHROPIC_API_KEY in Vercel environment variables and redeploy',
                debug: {
                    availableEnvVars: Object.keys(process.env).filter(k => k.includes('ANTHROPIC')),
                    nodeEnv: process.env.NODE_ENV,
                    vercelEnv: process.env.VERCEL_ENV
                }
            });
        }

        console.log('Making request to Anthropic API...');

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify(req.body),
        });

        // Check if response is ok before parsing
        if (!response.ok) {
            const errorData = await response.text();
            console.error('Anthropic API error:', response.status, errorData);
            return res.status(response.status).json({
                error: 'Anthropic API request failed',
                status: response.status,
                details: errorData
            });
        }

        const data = await response.json();

        // Ensure response has the expected structure
        if (!data || !data.content) {
            console.error('Unexpected response format:', data);
            return res.status(500).json({
                error: 'Unexpected response format from Anthropic API',
                data: data
            });
        }

        res.json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({
            error: error.message || 'Internal server error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
