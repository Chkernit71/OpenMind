import axios from 'axios';

const getBaseURL = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

    // In production (served by backend), use the current window origin
    if (window.location.port === '8080' || !window.location.port) {
        return window.location.origin;
    }

    // Default to the network IP for development
    return 'http://192.168.1.21:8000';
};

const client = axios.create({
    baseURL: getBaseURL(),
});

// Add a request interceptor to include the auth token
client.interceptors.request.use((config) => {
    const token = localStorage.getItem('om_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default client;
