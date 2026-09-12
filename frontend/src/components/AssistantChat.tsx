import { useEffect, useRef, useState } from "react";
import { assistantApi } from "../api";
import { apiError } from "../api/client";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const GREETING: Message = {
  role: "assistant",
  text: "Здравствуйте! Я Роберт ИИчкин, колбасный консультант. Чем помочь?",
};

export default function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [quick, setQuick] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionId = useRef<string>(`session-${Math.random().toString(36).slice(2)}`);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && quick.length === 0) {
      assistantApi
        .quickReplies()
        .then(({ data }) => setQuick(data))
        .catch(() => setQuick([]));
    }
  }, [open, quick.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setBusy(true);
    try {
      const { data } = await assistantApi.chat(sessionId.current, trimmed);
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", text: `Ошибка: ${apiError(error)}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-meat-700 px-4 py-3 text-sm font-semibold text-white shadow-card hover:bg-meat-600"
        aria-label="Чат с ИИ-ассистентом"
      >
        <span className="text-lg">🤖</span>
        <span className="hidden sm:inline">{open ? "Свернуть чат" : "Роберт ИИчкин"}</span>
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex h-[520px] w-[min(92vw,380px)] flex-col overflow-hidden rounded-3xl border border-meat-100 bg-white shadow-card">
          <header className="flex items-center gap-3 bg-meat-800 px-4 py-3 text-white">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gold-400 text-xl">🤖</span>
            <div>
              <p className="font-semibold leading-tight">Роберт ИИчкин</p>
              <p className="text-xs text-meat-100">ИИ-ассистент колбасного цеха</p>
            </div>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto bg-cream/60 p-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "ml-auto bg-meat-700 text-white"
                    : "bg-white text-ink shadow-sm"
                }`}
              >
                {message.text}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="border-t border-meat-100 bg-white p-3">
            <div className="mb-2 flex flex-wrap gap-1">
              {quick.slice(0, 3).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => void send(item)}
                  className="rounded-full bg-meat-50 px-2.5 py-1 text-[11px] font-medium text-meat-700 hover:bg-meat-100"
                >
                  {item}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void send(input);
              }}
            >
              <input
                className="input"
                placeholder="Спросите про торты, баллы, акции…"
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
              <button type="submit" className="btn-primary px-4" disabled={busy}>
                ➤
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
