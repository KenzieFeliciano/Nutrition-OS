import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { askSol } from '../lib/apiClient.js';

export default function AssistantChat({ contextSummary, assistantName, onThinkingChange }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    onThinkingChange?.(isWaiting);
  }, [isWaiting, onThinkingChange]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isWaiting]);

  async function handleSend(event) {
    event.preventDefault();
    const question = input.trim();
    if (!question || isWaiting) return;

    const nextMessages = [...messages, { role: 'user', content: question }];
    setMessages(nextMessages);
    setInput('');
    setIsWaiting(true);

    try {
      const { reply } = await askSol({ messages: nextMessages, context: contextSummary, assistantName });
      setMessages((current) => [...current, { role: 'assistant', content: reply }]);
    } catch (chatError) {
      setMessages((current) => [...current, { role: 'assistant', content: chatError.message, isError: true }]);
    } finally {
      setIsWaiting(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-col">
      {(messages.length > 0 || isWaiting) && (
        <div ref={scrollRef} className="mb-2 max-h-36 space-y-2 overflow-y-auto pr-1">
          {messages.slice(-6).map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <p
                className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  message.role === 'user'
                    ? 'bg-ink text-cream'
                    : message.isError
                      ? 'bg-clay/15 text-clay'
                      : 'bg-butter/70 text-ink'
                }`}
              >
                {message.content}
              </p>
            </div>
          ))}
          {isWaiting && (
            <div className="flex items-center gap-1.5 px-1 py-1">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-gold" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-gold" style={{ animationDelay: '0.15s' }} />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-gold" style={{ animationDelay: '0.3s' }} />
            </div>
          )}
        </div>
      )}
      <form className="flex items-center gap-2" onSubmit={handleSend}>
        <input
          className="w-full rounded-full border border-ink/10 bg-cream px-4 py-2.5 text-xs text-ink outline-none transition placeholder:text-ink/40 focus:border-gold/60"
          type="text"
          placeholder={`Ask ${assistantName} anything…`}
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <button
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-cream transition hover:bg-ink/85 disabled:opacity-40"
          type="submit"
          disabled={!input.trim() || isWaiting}
          aria-label="Send"
        >
          <ArrowUp size={15} />
        </button>
      </form>
    </div>
  );
}
