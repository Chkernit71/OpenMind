import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

export default function ConnectSite() {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [botName, setBotName] = useState('Assistant');
    const [botGreeting, setBotGreeting] = useState('Hello! How can I help you today?');
    const [manualContent, setManualContent] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await client.post('/sites/', {
                name,
                url,
                bot_name: botName,
                bot_greeting: botGreeting,
                manual_content: manualContent
            });
            navigate('/');
        } catch (err) {
            alert('Failed to connect site.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Connect Your Website</h1>
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Website Name</label>
                            <input
                                type="text"
                                required
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="My Awesome Shop"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Website URL</label>
                            <input
                                type="url"
                                required
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="https://example.com"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Bot Name</label>
                            <input
                                type="text"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                value={botName}
                                onChange={(e) => setBotName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Bot Greeting</label>
                            <input
                                type="text"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                value={botGreeting}
                                onChange={(e) => setBotGreeting(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Add FAQ or extra content (optional)</label>
                        <textarea
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            rows={4}
                            placeholder="Our shipping usually takes 3-5 days..."
                            value={manualContent}
                            onChange={(e) => setManualContent(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition disabled:opacity-50"
                        >
                            {loading ? 'Connecting...' : 'Start Crawling'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
