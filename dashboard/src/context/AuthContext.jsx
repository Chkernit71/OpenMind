import { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('om_token');
            if (token) {
                try {
                    const { data } = await client.get('/auth/me');
                    setUser(data);
                } catch (error) {
                    localStorage.removeItem('om_token');
                    setUser(null);
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    const login = async (email, password) => {
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);
        const { data } = await client.post('/auth/login', formData);
        localStorage.setItem('om_token', data.access_token);
        const userRes = await client.get('/auth/me');
        setUser(userRes.data);
    };

    const register = async (email, password) => {
        await client.post('/auth/register', { email, password });
        await login(email, password);
    };

    const logout = () => {
        localStorage.removeItem('om_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
