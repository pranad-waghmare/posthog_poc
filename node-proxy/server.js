require('dotenv').config();
const express = require('express');
const axios = require('axios');
const https = require('https');
const cors = require('cors');
const compression = require('compression');
const { CLIENT_RENEG_LIMIT } = require('tls');

const app = express();

// Middleware sequence
app.use(cors());
app.use(compression());

// Body parsing middleware - only need one express.json()
app.use((req, res, next) => {
    if (req.headers['content-encoding'] === 'gzip') {
        const gunzip = zlib.createGunzip();
        req.pipe(gunzip).pipe(express.json({ limit: '20mb' })(req, res, next));
    } else {
        express.json({ limit: '20mb' })(req, res, next);
    }
});

app.use(express.urlencoded({ extended: true, limit: '20mb' }));


const POSTHOG_KEY="phc_8voyvBCO9Zd6RaE5cWvUh4chkTux9j2TnsRfWHU95Qe"
const POSTHOG_UI_HOST="http://localhost:8080" // For EU PostHog API endpoints



const axiosInstance = axios.create({
    httpsAgent: new https.Agent({  
        rejectUnauthorized: false
    }),
    // Add compression support
    decompress: true,
    headers: {
        'Accept-Encoding': 'gzip, deflate, br'
    }
});


// Add this error handling middleware at the end of your proxy server
app.use((err, req, res, next) => {
    console.error('Proxy Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});



// Common headers required for PostHog proxy
const getProxyHeaders = (req) => ({
    'Content-Type': 'application/json',
    'X-Forwarded-For': req.headers['x-forwarded-for'] || req.ip,
    'X-Forwarded-Proto': req.protocol,
    'Host': POSTHOG_UI_HOST,
    'Accept-Encoding': 'gzip, deflate, br'
});


// Required public endpoints as per PostHog docs
// Helper function to handle query parameters
const appendQueryParams = (url, query) => {
    const urlObj = new URL(url);
    Object.entries(query).forEach(([key, value]) => {
        urlObj.searchParams.append(key, value);
    });
    return urlObj.toString();
};

// Batch events endpoint
app.post('/batch', async (req, res) => {
    try {
        const url = appendQueryParams(`${POSTHOG_UI_HOST}/batch`, req.query);
        const response = await axiosInstance.post(url, {
            api_key: POSTHOG_KEY,
            batch: req.body.batch,
        }, {
            headers: getProxyHeaders(req)
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error forwarding batch events:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to send batch events to PostHog' });
    }
});

// Decide endpoint
app.post('/decide', async (req, res) => {
    try {
        const url = appendQueryParams(`${POSTHOG_UI_HOST}/decide`, req.query);
        const response = await axiosInstance.post(url, {
            ...req.body,
            api_key: POSTHOG_KEY,
            distinct_id: req.body.distinct_id || 'default_distinct_id' // Add distinct_id
        }, {
            headers: getProxyHeaders(req)
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error forwarding decide request:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch decide response from PostHog' });
    }
});

// Single events endpoint
app.post('/e', async (req, res) => {
    try {
        // Log the raw request body for debugging
        console.log('Raw Request Body:', JSON.stringify(req.body, null, 2));

        const payload = {
            api_key: POSTHOG_KEY,
            ...req.body
        };

        // Ensure event and distinct_id are present
        if (!payload.event) {
            payload.event = payload.properties?.event || 'default_event';
        }
        if (!payload.distinct_id) {
            payload.distinct_id = payload.properties?.distinct_id || 'unknown_user';
        }

        const response = await axiosInstance.post(`${POSTHOG_UI_HOST}/e`, payload, {
            headers: {
                ...getProxyHeaders(req),
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip, deflate, br'
            },
            // Force json serialization
            transformRequest: [data => JSON.stringify(data)]
        });

        res.json(response.data);
    } catch (error) {
        console.error('Detailed Error:', {
            response: error.response?.data,
            message: error.message,
            config: error.config,
            // requestBody: req.body
        });

        res.status(500).json({ 
            error: 'Failed to send event to PostHog',
            details: error.response?.data || error.message,
            requestBody: req.body
        });
    }
});



// Session recording endpoint
app.post('/s', async (req, res) => {
    try {
        const payload = {
            api_key: POSTHOG_KEY,
            ...req.body,
            type: '$snapshot'
        };

        // Ensure session_id and distinct_id are present
        if (!payload.$session_id) {
            payload.$session_id = payload.properties?.$session_id || `session_${Date.now()}`;
        }
        if (!payload.distinct_id) {
            payload.distinct_id = payload.properties?.distinct_id || 'unknown_user';
        }

        const response = await axiosInstance.post(`${POSTHOG_UI_HOST}/s`, payload, {
            headers: {
                ...getProxyHeaders(req),
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip, deflate, br'
            },
            // Force json serialization
            transformRequest: [data => JSON.stringify(data)]
        });

        res.json(response.data);
    } catch (error) {
        // console.error('Session Recording Error:', {
        //     response: error.response?.data,
        //     message: error.message,
        //     config: error.config,
        //     requestBody: req.body
        // });

        // res.status(500).json({ 
        //     error: 'Failed to send session recording to PostHog',
        //     details: error.response?.data || error.message,
        //     requestBody: req.body
        // });
    }
});


// Static file endpoints
const handleStaticFile = async (req, res, filename) => {
    try {
        const url = appendQueryParams(`${POSTHOG_UI_HOST}/static/${filename}`, req.query);
        const response = await axiosInstance.get(url, {
            headers: getProxyHeaders(req),
            responseType: 'text'
        });
        res.set('Content-Type', 'application/javascript');
        res.send(response.data);
    } catch (error) {
        console.error(`Error serving ${filename}:`, error.response?.data || error.message);
        res.status(500).send(`Failed to load PostHog ${filename}`);
    }
};

app.get('/static/:project_id/array.js', (req, res) => handleStaticFile(req, res, 'array.js'));
app.get('/static/recorder.js', (req, res) => handleStaticFile(req, res, 'recorder.js'));
app.get('/static/recorder-v2.js', (req, res) => handleStaticFile(req, res, 'recorder-v2.js'));
app.get('/static/surveys.js', (req, res) => handleStaticFile(req, res, 'surveys.js'));

// Config endpoint
app.get('/array/:project_id/config.js', async (req, res) => {
    try {
        const url = appendQueryParams(
            `${POSTHOG_UI_HOST}/array/${req.params.project_id}/config.js`,
            req.query
        );
        const response = await axiosInstance.get(url, {
            headers: getProxyHeaders(req),
            responseType: 'text'
        });
        res.set('Content-Type', 'application/javascript');
        res.send(response.data);
    } catch (error) {
        console.error('Error serving config.js:', error.response?.data || error.message);
        res.status(500).send('Failed to load PostHog config');
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));