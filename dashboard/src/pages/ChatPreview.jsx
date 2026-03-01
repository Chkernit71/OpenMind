import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import { ChevronLeft, Send, Bot, User, RefreshCw, Copy, Check, Loader2, Globe, Sparkles, CheckCircle2 } from 'lucide-react';

const getBackendURL = (site) => {
    // If backend provided a specific URL, use it
    if (site?.backend_url) return site.backend_url;

    // Fallback logic
    if (window.location.port === '8080' || !window.location.port) {
        return window.location.origin;
    }
    return 'http://192.168.1.21:8000';
};

export default function ChatPreview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [copied, setCopied] = useState(false);
    const scrollRef = useRef(null);

    const { data: site, isLoading } = useQuery({
        queryKey: ['site', id],
        queryFn: async () => {
            const { data } = await client.get(`/sites/${id}`);
            return data;
        },
    });

    // Initialize chat with bot greeting
    useEffect(() => {
        if (site && messages.length === 0) {
            setMessages([
                {
                    id: 'greeting',
                    role: 'assistant',
                    content: site.bot_greeting,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);
        }
    }, [site, messages.length]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || isTyping) return;

        const userMsg = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const { data } = await client.post('/chat/message',
                {
                    message: input,
                    visitor_id: `preview_${id}`
                },
                {
                    headers: { 'X-Api-Key': site.api_key }
                }
            );

            const botMsg = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.content,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (err) {
            console.error('Chat error:', err);
            const errorMsg = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I'm sorry, I'm having trouble connecting to my brain right now. Please try again.",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const clearChat = () => {
        setMessages([
            {
                id: 'greeting',
                role: 'assistant',
                content: site.bot_greeting,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
        ]);
    };

    const copyEmbedCode = () => {
        const backendUrl = getBackendURL(site);
        const code = `<script \n  src="${backendUrl}/widget.js"\n  data-key="${site?.api_key}"\n  async>\n</script>`;

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } else {
            // Fallback for non-secure contexts (HTTP over IP)
            const textArea = document.createElement("textarea");
            textArea.value = code;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Fallback copy failed', err);
            }
            document.body.removeChild(textArea);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading playground...</div>;
    if (!site) return <div className="p-8 text-center text-red-500">Site not found.</div>;

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full transition">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            Chat Playground <Sparkles size={18} className="text-indigo-500" />
                        </h1>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Globe size={14} /> {site.url}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${site.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        {site.status === 'ready' ? <CheckCircle2 size={12} /> : <RefreshCw size={12} className="animate-spin" />}
                        {site.status.charAt(0).toUpperCase() + site.status.slice(1)}
                    </span>
                    <button
                        onClick={clearChat}
                        className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                    >
                        Clear Chat
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Site Info */}
                <div className="w-80 border-r border-gray-200 bg-white overflow-y-auto p-6 space-y-8">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Bot Configuration</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Bot Name</label>
                                <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded">{site.bot_name}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Status</label>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                        <div className={`w-2 h-2 rounded-full ${site.crawled_content ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        Crawled: {site.crawled_content ? '✅ Yes' : '❌ No'}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                        <div className={`w-2 h-2 rounded-full ${site.manual_content ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                        Manual FAQ: {site.manual_content ? '✅ Yes' : 'Empty'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Embed Instructions</h3>
                        <p className="text-xs text-gray-500 mb-3">Add this script to your website's <code>&lt;head&gt;</code> tag:</p>
                        <div className="relative group">
                            <pre className="bg-gray-900 text-indigo-300 p-4 rounded-lg text-[10px] items-center overflow-x-auto font-mono">
                                {`<script \n  src="${getBackendURL(site)}/widget.js"\n  data-key="${site.api_key}"\n  async>\n</script>`}
                            </pre>
                            <button
                                onClick={copyEmbedCode}
                                className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 rounded text-white transition backdrop-blur-sm"
                            >
                                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                            </button>
                            {copied && (
                                <span className="absolute -top-8 right-0 bg-green-500 text-white text-[10px] px-2 py-1 rounded shadow-lg">
                                    Copied!
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <Link
                            to="/"
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                        >
                            Return to Dashboard
                        </Link>
                    </div>
                </div>

                {/* Right Panel: Chat Interface */}
                <div className="flex-1 flex flex-col bg-gray-50">
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-6 space-y-4"
                    >
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[80%] group`}>
                                    <div className={`flex items-center gap-2 mb-1 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`p-1 rounded-full ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-600'}`}>
                                            {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                                        </div>
                                        <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {msg.timestamp}
                                        </span>
                                    </div>
                                    <div className={`p-3 rounded-2xl shadow-sm ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-tr-none'
                                        : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                                        }`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-tl-none shadow-sm">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Chat Input */}
                    <div className="p-6 bg-white border-t border-gray-200">
                        <form
                            onSubmit={handleSendMessage}
                            className="flex gap-2"
                        >
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type a message to test your AI..."
                                className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                                disabled={isTyping}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isTyping}
                                className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 shadow-lg shadow-indigo-200"
                            >
                                <Send size={20} />
                            </button>
                        </form>
                        <p className="text-[10px] text-center text-gray-400 mt-3">
                            This is a preview of how your AI will behave on your website.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

