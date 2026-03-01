import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import { ChevronLeft, MessageCircle, User, Bot, Calendar } from 'lucide-react';

export default function Conversations() {
    const { siteId } = useParams();
    const [selectedConvId, setSelectedConvId] = useState(null);

    const { data: conversations, isLoading: loadConvs } = useQuery({
        queryKey: ['conversations', siteId],
        queryFn: async () => {
            const { data } = await client.get(`/sites/${siteId}/conversations`);
            return data;
        },
    });

    const { data: messages, isLoading: loadMsgs } = useQuery({
        queryKey: ['messages', siteId, selectedConvId],
        queryFn: async () => {
            if (!selectedConvId) return null;
            const { data } = await client.get(`/sites/${siteId}/conversations/${selectedConvId}`);
            return data.messages;
        },
        enabled: !!selectedConvId,
    });

    return (
        <div className="flex h-[calc(100-64px)] overflow-hidden">
            {/* Sidebar: List of Conversations */}
            <div className="w-1/3 border-r border-gray-200 bg-white overflow-y-auto">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                    <Link to="/" className="text-gray-500 hover:text-indigo-600">
                        <ChevronLeft size={20} />
                    </Link>
                    <h2 className="font-semibold text-gray-900">Conversations</h2>
                </div>

                {loadConvs ? (
                    <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
                ) : conversations?.length === 0 ? (
                    <div className="p-8 text-center text-sm text-gray-500">No conversations yet.</div>
                ) : (
                    conversations?.map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => setSelectedConvId(conv.id)}
                            className={`w-full text-left p-4 border-b border-gray-50 hover:bg-indigo-50 transition ${selectedConvId === conv.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''
                                }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-900">Visitor {conv.visitor_id?.substring(0, 6) || 'Anon'}</span>
                                <span className="text-xs text-gray-400">
                                    {new Date(conv.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate italic">Started a new chat</p>
                        </button>
                    ))
                )}
            </div>

            {/* Main Content: Messages */}
            <div className="flex-1 bg-gray-50 overflow-y-auto flex flex-col">
                {!selectedConvId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-10 text-center">
                        <MessageCircle size={48} className="mb-4 opacity-20" />
                        <p>Select a conversation to view the message history.</p>
                    </div>
                ) : loadMsgs ? (
                    <div className="flex-1 flex items-center justify-center text-indigo-600">Loading messages...</div>
                ) : (
                    <div className="flex-1 p-6 space-y-4">
                        {messages?.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                <div className={`p-2 rounded-full h-10 w-10 flex items-center justify-center ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-gray-700 shadow-sm border'
                                    }`}>
                                    {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                                </div>
                                <div className={`max-w-[70%] p-4 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                                    }`}>
                                    <p className="text-sm leading-relaxed">{msg.content}</p>
                                    <p className={`text-[10px] mt-2 opacity-60 text-right`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
