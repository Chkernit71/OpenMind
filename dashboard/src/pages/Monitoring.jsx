import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import { ChevronLeft, User, Bot, Circle, History, MessageSquare, Activity, Loader2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Monitoring() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [wsStatus, setWsStatus] = useState('connecting');
    const [stats, setStats] = useState({ active: 0, total: 0 });
    const scrollRef = useRef(null);
    const ws = useRef(null);

    const { data: site, isLoading: siteLoading } = useQuery({
        queryKey: ['site', id],
        queryFn: async () => {
            const { data } = await client.get(`/sites/${id}`);
            return data;
        },
    });

    // Initial load of conversations
    useEffect(() => {
        const fetchConvs = async () => {
            try {
                const { data } = await client.get(`/sites/${id}/conversations/active`);
                setConversations(data);
                if (data.length > 0 && !selectedId) {
                    setSelectedId(data[0].id);
                }
            } catch (err) {
                console.error("Failed to fetch active conversations:", err);
            }
        };
        fetchConvs();
    }, [id]);

    // WebSocket Logic
    useEffect(() => {
        const connectWs = () => {
            const token = localStorage.getItem('om_token');
            if (!token || token === 'null') {
                console.warn("Monitoring: No valid token found in localStorage, waiting...");
                setWsStatus('missing_token');
                return;
            }

            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            // In production, we connect to the same host that served the app
            const host = window.location.port === '5173' ? '192.168.1.21:8000' : window.location.host;
            const wsUrl = `${protocol}//${host}/ws/monitor/${id}?token=${token}`;

            console.log("Monitoring: Connecting to WebSocket...", wsUrl.split('?')[0]);
            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                setWsStatus('connected');
                console.log("Monitoring: WebSocket connected successfully");
            };

            ws.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'new_message') {
                    setConversations(prev => {
                        const exists = prev.find(c => c.id === data.conversation_id);

                        // Check if we already have these messages to prevent duplicates
                        const isDuplicate = exists && exists.messages.some(m =>
                            m.content === data.bot_reply && m.created_at === data.timestamp
                        );

                        if (isDuplicate) return prev;

                        const newMsg = {
                            role: 'assistant',
                            content: data.bot_reply,
                            created_at: data.timestamp
                        };
                        const userMsg = {
                            role: 'user',
                            content: data.user_message,
                            created_at: data.timestamp
                        };

                        if (exists) {
                            return prev.map(c => {
                                if (c.id === data.conversation_id) {
                                    const updatedMessages = [...(c.messages || [])];

                                    if (!updatedMessages.some(m => m.content === userMsg.content && m.role === 'user')) {
                                        updatedMessages.push(userMsg);
                                    }
                                    if (!updatedMessages.some(m => m.content === newMsg.content && m.role === 'assistant')) {
                                        updatedMessages.push(newMsg);
                                    }

                                    return {
                                        ...c,
                                        updated_at: data.timestamp,
                                        messages: updatedMessages,
                                        unread: c.id !== selectedId
                                    };
                                }
                                return c;
                            }).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
                        } else {
                            return [{
                                id: data.conversation_id,
                                visitor_id: data.visitor_id,
                                updated_at: data.timestamp,
                                created_at: data.timestamp,
                                messages: [userMsg, newMsg],
                                unread: true
                            }, ...prev];
                        }
                    });
                }
            };

            ws.current.onclose = () => {
                setWsStatus('disconnected');
                console.log("WebSocket disconnected, retrying...");
                setTimeout(connectWs, 3000);
            };

            ws.current.onerror = (err) => {
                console.error("WebSocket error:", err);
                ws.current.close();
            };
        };

        connectWs();
        return () => {
            if (ws.current) {
                ws.current.onclose = null; // Prevent reconnect on cleanup
                ws.current.close();
            }
        };
    }, [id]); // REMOVED selectedId: only reconnect if site ID changes

    // Auto-scroll detail view
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [selectedId, conversations]);

    const selectedConv = conversations.find(c => c.id === selectedId);

    if (siteLoading) return (
        <div className="h-screen flex items-center justify-center bg-gray-50">
            <Loader2 className="animate-spin text-indigo-600" size={40} />
        </div>
    );

    return (
        <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
            {/* Top Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full transition">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            Live Monitor <Activity size={18} className="text-green-500 animate-pulse" />
                        </h1>
                        <p className="text-sm text-gray-500">{site?.url}</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex gap-4">
                        <div className="text-center">
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Active Now</p>
                            <p className="text-lg font-bold text-indigo-600">
                                {conversations.filter(c => new Date() - new Date(c.updated_at) < 300000).length}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total Today</p>
                            <p className="text-lg font-bold text-gray-900">{conversations.length}</p>
                        </div>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${wsStatus === 'connected' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                        <Circle size={8} fill="currentColor" className={wsStatus === 'connected' ? 'animate-pulse' : ''} />
                        {wsStatus === 'connected' ? 'Connected' : 'Disconnected'}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Conversations Sidebar */}
                <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <MessageSquare size={14} /> Recent Conversations
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {conversations.length === 0 ? (
                            <div className="p-8 text-center">
                                <History size={40} className="mx-auto text-gray-300 mb-3" />
                                <p className="text-sm text-gray-500 font-medium">No live chats yet.</p>
                                <p className="text-[10px] text-gray-400 mt-1">Visitors will appear here as they chat.</p>
                            </div>
                        ) : (
                            conversations.map(conv => (
                                <button
                                    key={conv.id}
                                    onClick={() => setSelectedId(conv.id)}
                                    className={`w-full text-left p-4 border-b border-gray-50 transition-all hover:bg-gray-50 relative ${selectedId === conv.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''
                                        }`}
                                >
                                    {conv.unread && (
                                        <div className="absolute top-4 right-4 w-2 h-2 bg-green-500 rounded-full"></div>
                                    )}
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-sm font-bold text-gray-900 truncate pr-4">
                                            {conv.visitor_id.startsWith('preview_') ? '🛠️ Playground' : '👤 Visitor ' + conv.visitor_id.substring(0, 5)}
                                        </span>
                                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                            {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate italic">
                                        {conv.messages?.[conv.messages.length - 1]?.content || 'Starting...'}
                                    </p>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Detail Area */}
                <div className="flex-1 bg-white flex flex-col relative">
                    {selectedConv ? (
                        <>
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900">
                                            {selectedConv.visitor_id.startsWith('preview_') ? 'Chat Playground Session' : 'Visitor ' + selectedConv.visitor_id}
                                        </h3>
                                        <p className="text-[10px] text-gray-400">Session ID: {selectedConv.id}</p>
                                    </div>
                                </div>
                            </div>

                            <div
                                ref={scrollRef}
                                className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30"
                            >
                                {selectedConv.messages?.map((msg, idx) => (
                                    <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-start' : 'items-end'}`}>
                                        <div className={`flex items-center gap-2 mb-1.5 ${msg.role === 'user' ? 'flex-row' : 'flex-row-reverse'}`}>
                                            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
                                                {msg.role === 'user' ? 'Visitor' : site?.bot_name || 'AI Assistant'}
                                            </span>
                                            <span className="text-[10px] text-gray-300 font-medium">
                                                • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className={`p-3.5 rounded-2xl max-w-xl shadow-sm text-sm leading-relaxed ${msg.role === 'user'
                                            ? 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                            : 'bg-indigo-600 text-white rounded-tr-none'
                                            }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <div className="bg-gray-100 p-6 rounded-full mb-4">
                                <AlertCircle size={48} className="text-gray-300" />
                            </div>
                            <h3 className="text-lg font-medium">Select a conversation</h3>
                            <p className="text-sm">Click on a chat in the sidebar to view it live.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
