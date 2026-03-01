import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { LogOut, Globe, Zap } from 'lucide-react';
import client from '../api/client';

export default function Navbar() {
    const { user, logout } = useAuth();

    const handleUpgrade = async () => {
        try {
            // price_123 would be replaced with a real Stripe price ID
            const { data } = await client.post('/billing/create-checkout-session?price_id=price_123');
            window.location.href = data.url;
        } catch (err) {
            alert('Failed to start checkout session. Ensure Stripe keys are set.');
        }
    };

    return (
        <nav className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/" className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
                            <Globe /> OpenMind
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleUpgrade}
                            className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-amber-200 transition"
                        >
                            <Zap size={16} /> Upgrade
                        </button>
                        <span className="text-sm text-gray-500">{user?.email}</span>
                        <button
                            onClick={logout}
                            className="flex items-center gap-1 text-sm text-gray-700 hover:text-indigo-600 transition"
                        >
                            <LogOut size={18} /> Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
