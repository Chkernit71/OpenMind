import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { Link } from 'react-router-dom';
import { Plus, Globe, MessageSquare, RefreshCw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

function SiteCard({ site }) {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState(site.status);

    // Polling logic for crawling status
    const { data: updatedSite } = useQuery({
        queryKey: ['site', site.id],
        queryFn: async () => {
            const { data } = await client.get(`/sites/${site.id}`);
            return data;
        },
        enabled: status === 'crawling',
        refetchInterval: status === 'crawling' ? 3000 : false,
    });

    useEffect(() => {
        if (updatedSite) {
            if (updatedSite.status !== status) {
                setStatus(updatedSite.status);
                if (updatedSite.status === 'ready') {
                    // Notify parent or show local toast
                    window.dispatchEvent(new CustomEvent('site-ready', { detail: site.name }));
                    queryClient.invalidateQueries(['sites']);
                }
            }
        }
    }, [updatedSite, status, site.name, queryClient]);

    const recrawlMutation = useMutation({
        mutationFn: async () => {
            const { data } = await client.post(`/sites/${site.id}/recrawl`);
            return data;
        },
        onSuccess: (data) => {
            setStatus('crawling');
            queryClient.invalidateQueries(['site', site.id]);
        },
    });

    const getStatusBadge = () => {
        switch (status) {
            case 'crawling':
                return (
                    <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        <Loader2 size={12} className="animate-spin" /> Crawling...
                    </span>
                );
            case 'ready':
                return (
                    <span className="flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        <CheckCircle2 size={12} /> Ready
                    </span>
                );
            case 'error':
                return (
                    <span className="flex items-center gap-1 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                        <AlertCircle size={12} /> Error
                    </span>
                );
            default:
                return <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">Pending</span>;
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
            <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-lg text-gray-900">{site.name}</h3>
                {getStatusBadge()}
            </div>
            <p className="text-sm text-gray-500 mb-4 truncate">{site.url}</p>
            <div className="flex gap-4 items-center">
                <Link
                    to={`/conversations/${site.id}`}
                    className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-500"
                >
                    <MessageSquare size={16} /> Chats
                </Link>
                <Link
                    to={`/sites/${site.id}/preview`}
                    className="flex items-center gap-1 text-sm text-green-600 hover:text-green-500"
                    title="Preview AI Chat"
                >
                    <Globe size={16} /> Preview
                </Link>
                <button
                    onClick={() => recrawlMutation.mutate()}
                    disabled={status === 'crawling' || recrawlMutation.isPending}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-indigo-600 disabled:opacity-50"
                    title="Recrawl Website"
                >
                    <RefreshCw size={16} className={recrawlMutation.isPending ? 'animate-spin' : ''} />
                    Recrawl
                </button>
                <div className="flex-1"></div>
                <code className="text-xs bg-gray-100 p-1 rounded font-mono text-gray-400">
                    {site.api_key.substring(0, 8)}...
                </code>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [toast, setToast] = useState(null);

    useEffect(() => {
        const handleReady = (e) => {
            setToast(`✅ Site "${e.detail}" crawled successfully!`);
            setTimeout(() => setToast(null), 5000);
        };
        window.addEventListener('site-ready', handleReady);
        return () => window.removeEventListener('site-ready', handleReady);
    }, []);

    const { data: sites, isLoading } = useQuery({
        queryKey: ['sites'],
        queryFn: async () => {
            const { data } = await client.get('/sites/');
            return data;
        },
    });

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading your sites...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {toast && (
                <div className="fixed bottom-8 right-8 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-2xl z-50 animate-bounce">
                    {toast}
                </div>
            )}

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Websites</h1>
                    <p className="text-gray-500 text-sm">Manage your connected sites and chat history</p>
                </div>
                <Link
                    to="/connect"
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-sm transition-all active:scale-95"
                >
                    <Plus size={20} /> Connect New Site
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sites?.length === 0 ? (
                    <div className="col-span-full text-center py-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl">
                        <Globe className="mx-auto h-12 w-12 text-gray-300" />
                        <p className="mt-4 text-gray-500">No websites connected yet.</p>
                        <Link to="/connect" className="text-indigo-600 text-sm font-medium hover:underline mt-2 inline-block">
                            Connect your first site
                        </Link>
                    </div>
                ) : (
                    sites?.map((site) => (
                        <SiteCard key={site.id} site={site} />
                    ))
                )}
            </div>
        </div>
    );
}
