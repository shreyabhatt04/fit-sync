import { useState, useRef, useEffect } from 'react'
import CustomerLayout from '../../components/customer/CustomerLayout'
import { useAuth } from '../../hooks/useAuth'
import './customer.css'

// ─── Helpers ──────────────────────────────────────────────────────
//
// formatTime: clock-style timestamp shown next to each bubble.
const formatTime = () =>
    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

// Initial conversation seeded the first time a user opens this page.
// Personalised with the user's first name so it doesn't read "Hello
// Rahul" for every customer the way the previous hardcoded version did.
const buildInitialMessages = (firstName) => [
    {
        id: 1,
        from: 'admin',
        text: `Hello ${firstName || 'there'}! Welcome to FitSync. How can I help you today?`,
        time: '10:00 AM',
    },
    {
        id: 2,
        from: 'admin',
        text: 'Feel free to ask about your subscription, payments, attendance, or anything else. Our team is here Monday to Saturday, 6 AM to 10 PM.',
        time: '10:00 AM',
    },
]

// Pool of plausible auto-replies. The reply picker rotates through these
// rather than always returning the same canned message — makes the demo
// feel less scripted when the user sends a few messages in a row.
//
// Note: this is purely client-side simulation. Real human-to-human
// support chat would need a Message backend + WebSockets/polling, which
// is out of scope for this build. Documented for honesty.
const AUTO_REPLIES = [
    'Thanks for your message! Our team has been notified and will get back to you shortly.',
    'Got it — let me check on that for you. Someone from the team will follow up within a few hours.',
    'Thanks for reaching out! For urgent queries, you can also call us at +91 90333 20453 during business hours.',
    'Noted! We typically respond to messages within 2–4 hours during business hours.',
    'Thanks! If your question is about subscription or payments, you can also check the relevant page in your dashboard for instant info.',
    'Appreciate the message — we\'re a small team and read every one. We\'ll be in touch soon!',
]

// localStorage key per user so different customers don't see each
// other's chat history when they share a browser. The user's _id makes
// it unique, falls back to email if _id isn't available yet.
const storageKeyFor = (user) => {
    const ident = user?._id || user?.email || 'anon'
    return `fitsync_messages_${ident}`
}

function Messages() {
    const { user } = useAuth()
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)   // shows "typing…" indicator while auto-reply pending
    const bottomRef = useRef(null)
    const replyIndexRef = useRef(0)                    // round-robin through AUTO_REPLIES

    // On mount (or when the user changes), load saved messages from
    // localStorage if any. Otherwise seed with the personalised intro.
    useEffect(() => {
        if (!user) return
        const key = storageKeyFor(user)
        try {
            const saved = localStorage.getItem(key)
            if (saved) {
                const parsed = JSON.parse(saved)
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setMessages(parsed)
                    return
                }
            }
        } catch {
            // Corrupted JSON — fall through to the seeded intro
        }
        setMessages(buildInitialMessages(user.firstName))
    }, [user])

    // Persist on every change. Cheap (localStorage is fast) and means
    // the conversation survives a page refresh during the demo.
    useEffect(() => {
        if (!user || messages.length === 0) return
        try {
            localStorage.setItem(storageKeyFor(user), JSON.stringify(messages))
        } catch {
            // Quota exceeded or storage disabled — silently ignore,
            // page still works in-memory.
        }
    }, [messages, user])

    // Smooth-scroll to the latest message whenever the list grows or
    // the typing indicator toggles.
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isTyping])

    const sendMessage = () => {
        const trimmed = input.trim()
        if (!trimmed) return

        const customerMsg = {
            id: Date.now(),
            from: 'customer',
            text: trimmed,
            time: formatTime(),
        }
        setMessages(prev => [...prev, customerMsg])
        setInput('')

        // Simulated admin reply — show typing indicator first, then
        // post a varied reply. Slight delay (~1.4s) so it feels like
        // a real person is typing, not an auto-responder.
        setIsTyping(true)
        setTimeout(() => {
            const replyText = AUTO_REPLIES[replyIndexRef.current % AUTO_REPLIES.length]
            replyIndexRef.current += 1
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                from: 'admin',
                text: replyText,
                time: formatTime(),
            }])
            setIsTyping(false)
        }, 1400)
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    // Clear-conversation handler — useful during demos so the chat
    // doesn't accumulate test messages between sessions.
    const clearConversation = () => {
        if (!user) return
        try {
            localStorage.removeItem(storageKeyFor(user))
        } catch { /* ignore */ }
        setMessages(buildInitialMessages(user?.firstName))
    }

    return (
        <CustomerLayout>
            <div className="customer-page">
                <div style={{ marginBottom: 4 }}>
                    <h1 className="page-title">Messages</h1>
                    <p className="page-subtitle">Chat with FitSync support</p>
                </div>

                <div className="messages-layout">
                    {/* Sidebar */}
                    <div className="messages-sidebar">
                        <div className="messages-sidebar-header">Conversations</div>
                        <div className="message-contact active">
                            <div className="avatar" style={{ background: '#111111', color: '#ffffff' }}>FS</div>
                            <div className="message-contact-info">
                                <p className="message-contact-name">FitSync Support</p>
                                <p className="message-contact-last">
                                    {messages.length > 0
                                        ? messages[messages.length - 1].text.slice(0, 40) + (messages[messages.length - 1].text.length > 40 ? '…' : '')
                                        : 'Start a conversation'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Chat */}
                    <div className="messages-chat">
                        {/* Header */}
                        <div className="chat-header">
                            <div className="avatar" style={{ background: '#111111', color: '#ffffff' }}>FS</div>
                            <div style={{ flex: 1 }}>
                                <p className="chat-header-name">FitSync Support</p>
                                <p className="chat-header-status">● Online</p>
                            </div>
                            <button
                                onClick={clearConversation}
                                title="Clear conversation"
                                style={{
                                    background: 'transparent',
                                    border: '1px solid var(--border, #e5e5e5)',
                                    borderRadius: 6,
                                    padding: '4px 10px',
                                    fontSize: 12,
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                }}
                            >
                                Clear
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="chat-messages">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`chat-bubble-row ${msg.from === 'customer' ? 'sent' : 'received'}`}>
                                    <div className="chat-bubble">{msg.text}</div>
                                    <span className="chat-time">{msg.time}</span>
                                </div>
                            ))}

                            {/* Typing indicator — three dots animation while
                                the simulated admin reply is pending. */}
                            {isTyping && (
                                <div className="chat-bubble-row received">
                                    <div className="chat-bubble" style={{ display: 'inline-flex', gap: 4, padding: '10px 14px' }}>
                                        <span className="typing-dot" />
                                        <span className="typing-dot" />
                                        <span className="typing-dot" />
                                    </div>
                                </div>
                            )}

                            <div ref={bottomRef} />
                        </div>

                        {/* Input */}
                        <div className="chat-input-row">
                            <input
                                className="chat-input"
                                placeholder="Type a message..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <button
                                className="chat-send-btn"
                                onClick={sendMessage}
                                disabled={!input.trim() || isTyping}
                                aria-label="Send message"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="22" y1="2" x2="11" y2="13" />
                                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </CustomerLayout>
    )
}

export default Messages
