import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  Maximize2,
  Minimize2,
  SendHorizontal,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./ema-assist-widget.css";

type AiStatus = "idle" | "loading" | "ready" | "error";

type AiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  status?: AiStatus;
};

type CachedAiSession = {
  messages: AiMessage[];
  input: string;
  isOpen: boolean;
  isExpanded: boolean;
  isHidden: boolean;
  expiresAt: number;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001";

const TOKEN_STORAGE_KEYS = [
  "ema-access-token",
  "accessToken",
  "token",
  "ema-auth-token",
];

const AI_SESSION_CACHE_KEY = "ema-ai-assist-session";
const AI_SESSION_TTL_MS = 5 * 60 * 1000;

const quickPrompts = [
  {
    title: "Endpoint health",
    text: "Show endpoint health summary",
    desc: "Asset and connectivity overview",
  },
  {
    title: "Settings changes",
    text: "Summarize latest settings changes",
    desc: "Recent updates, approvals and policy changes",
  },
  {
    title: "Risk review",
    text: "How many devices are at risk right now?",
    desc: "Lifecycle and exposure insight",
  },
  {
    title: "Patch risks",
    text: "Show patch risks",
    desc: "Patch and security visibility",
  },
];

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function getStoredToken() {
  if (typeof window === "undefined") return "";

  for (const key of TOKEN_STORAGE_KEYS) {
    const value = localStorage.getItem(key);
    if (value && value.trim()) {
      return value.trim();
    }
  }

  const authRecord = safeParseJson<{
    token?: string;
    accessToken?: string;
    data?: { token?: string; accessToken?: string };
  }>(localStorage.getItem("ema-auth"));

  return (
    authRecord?.accessToken ||
    authRecord?.token ||
    authRecord?.data?.accessToken ||
    authRecord?.data?.token ||
    ""
  );
}

function createMessage(
  role: AiMessage["role"],
  content: string,
  status?: AiStatus,
): AiMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    status,
    createdAt: new Date().toISOString(),
  };
}

function readCachedSession(): CachedAiSession | null {
  if (typeof window === "undefined") return null;

  try {
    const rawValue = sessionStorage.getItem(AI_SESSION_CACHE_KEY);
    if (!rawValue) return null;

    const cached = JSON.parse(rawValue) as CachedAiSession;

    if (!cached.expiresAt || Date.now() > cached.expiresAt) {
      sessionStorage.removeItem(AI_SESSION_CACHE_KEY);
      return null;
    }

    return cached;
  } catch {
    sessionStorage.removeItem(AI_SESSION_CACHE_KEY);
    return null;
  }
}

function writeCachedSession(session: Omit<CachedAiSession, "expiresAt">) {
  if (typeof window === "undefined") return;

  const cached: CachedAiSession = {
    ...session,
    expiresAt: Date.now() + AI_SESSION_TTL_MS,
  };

  sessionStorage.setItem(AI_SESSION_CACHE_KEY, JSON.stringify(cached));
}

function clearCachedSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(AI_SESSION_CACHE_KEY);
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InlineFormattedText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
        }

        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </>
  );
}

function cleanMarkdownLine(line: string) {
  return line
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\*\s*/, "")
    .replace(/^-+\s*/, "")
    .replace(/^\d+\.\s*/, "")
    .trim();
}

function MessageContent({ content }: { content: string }) {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks: Array<
    | { type: "h3"; text: string }
    | { type: "h4"; text: string }
    | { type: "p"; text: string }
    | { type: "ul"; items: string[] }
    | { type: "ol"; items: string[] }
  > = [];

  let currentBullets: string[] = [];
  let currentNumbers: string[] = [];

  const flushBullets = () => {
    if (currentBullets.length) {
      blocks.push({ type: "ul", items: [...currentBullets] });
      currentBullets = [];
    }
  };

  const flushNumbers = () => {
    if (currentNumbers.length) {
      blocks.push({ type: "ol", items: [...currentNumbers] });
      currentNumbers = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith("### ")) {
      flushBullets();
      flushNumbers();
      blocks.push({ type: "h3", text: cleanMarkdownLine(line) });
      continue;
    }

    if (line.startsWith("#### ") || line.startsWith("## ")) {
      flushBullets();
      flushNumbers();
      blocks.push({ type: "h4", text: cleanMarkdownLine(line) });
      continue;
    }

    if (line.startsWith("* ") || line.startsWith("- ")) {
      flushNumbers();
      currentBullets.push(cleanMarkdownLine(line));
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      flushBullets();
      currentNumbers.push(cleanMarkdownLine(line));
      continue;
    }

    flushBullets();
    flushNumbers();
    blocks.push({ type: "p", text: line });
  }

  flushBullets();
  flushNumbers();

  return (
    <div className="ema-ai-markdown">
      {blocks.map((block, index) => {
        if (block.type === "h3") {
          return (
            <h3 key={index}>
              <InlineFormattedText text={block.text} />
            </h3>
          );
        }

        if (block.type === "h4") {
          return (
            <h4 key={index}>
              <InlineFormattedText text={block.text} />
            </h4>
          );
        }

        if (block.type === "ul") {
          return (
            <ul key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <InlineFormattedText text={item} />
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "ol") {
          return (
            <ol key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <InlineFormattedText text={item} />
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={index}>
            <InlineFormattedText text={block.text} />
          </p>
        );
      })}
    </div>
  );
}

async function callEmaAiApi(message: string, history: AiMessage[]) {
  const token = getStoredToken();

  if (!token) {
    throw new Error("Login token not found. Please login again.");
  }

  const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message,
      history: history
        .filter((item) => item.role === "user" || item.role === "assistant")
        .slice(-12)
        .map((item) => ({
          role: item.role,
          content: item.content,
        })),
    }),
  });

  let data: {
    success?: boolean;
    answer?: string;
    message?: string;
    error?: string;
  } = {};

  try {
    data = await response.json();
  } catch {
    throw new Error("EMA Assistant returned an invalid response.");
  }

  if (!response.ok || !data.success) {
    throw new Error(data.message || data.error || "EMA Assist failed to respond.");
  }

  if (!data.answer || typeof data.answer !== "string") {
    throw new Error("EMA Assistant did not return an answer.");
  }

  return data.answer;
}

function AssistantAvatar() {
  return (
    <span className="ema-ai-avatar" aria-hidden="true">
      <span className="ema-ai-avatar-core">
        <span className="ema-ai-avatar-face">
          <span className="ema-ai-avatar-eye" />
          <span className="ema-ai-avatar-eye" />
        </span>
        <span className="ema-ai-avatar-ring" />
      </span>
      <span className="ema-ai-avatar-status" />
    </span>
  );
}

export default function EmaAssistWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [status, setStatus] = useState<AiStatus>("idle");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const hasMessages = messages.length > 0;

  const statusLabel = useMemo(() => {
    if (status === "loading") return "Thinking";
    if (status === "error") return "Offline";
    return "Ready";
  }, [status]);

  const activeSummary = useMemo(() => {
    if (status === "loading") return "Analyzing your request";
    if (status === "error") return "Connection needs attention";
    if (hasMessages) return "Conversation active";
    return "Ready for operational questions";
  }, [hasMessages, status]);

  useEffect(() => {
    const cached = readCachedSession();

    if (!cached) return;

    setMessages(Array.isArray(cached.messages) ? cached.messages : []);
    setInput(cached.input || "");
    setIsOpen(Boolean(cached.isOpen));
    setIsExpanded(Boolean(cached.isExpanded));
    setIsHidden(Boolean(cached.isHidden));

    if (cached.messages?.length) {
      setStatus(cached.messages[cached.messages.length - 1]?.status || "ready");
    }
  }, []);

  useEffect(() => {
    writeCachedSession({
      messages,
      input,
      isOpen,
      isExpanded,
      isHidden,
    });
  }, [messages, input, isOpen, isExpanded, isHidden]);

  useEffect(() => {
    if (!hasMessages) return undefined;

    const timer = window.setTimeout(() => {
      clearCachedSession();
      setMessages([]);
      setInput("");
      setStatus("idle");
      setIsOpen(false);
    }, AI_SESSION_TTL_MS);

    return () => window.clearTimeout(timer);
  }, [hasMessages, messages]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isOpen]);

  useEffect(() => {
    function handleExternalOpen() {
      setIsHidden(false);
      setIsOpen(true);
    }

    function handleExternalAsk(event: Event) {
      const customEvent = event as CustomEvent<{ query?: string }>;
      const query = customEvent.detail?.query?.trim();

      setIsHidden(false);
      setIsOpen(true);

      if (query) {
        void submitMessage(query);
      }
    }

    window.addEventListener("ema-ai-assist-open", handleExternalOpen);
    window.addEventListener("ema-ai-assist-ask", handleExternalAsk as EventListener);

    return () => {
      window.removeEventListener("ema-ai-assist-open", handleExternalOpen);
      window.removeEventListener("ema-ai-assist-ask", handleExternalAsk as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, status]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [input]);

  const submitMessage = async (nextInput = input) => {
    const cleanInput = nextInput.trim();
    if (!cleanInput || status === "loading") return;

    const userMessage = createMessage("user", cleanInput);
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setIsOpen(true);
    setIsHidden(false);
    setStatus("loading");

    try {
      const answer = await callEmaAiApi(cleanInput, nextMessages);
      const assistantMessage = createMessage("assistant", answer, "ready");

      setMessages([...nextMessages, assistantMessage]);
      setStatus("ready");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "EMA Assistant could not return a response. Please check the assistant connection or try again.";

      const assistantMessage = createMessage("assistant", message, "error");

      setMessages([...nextMessages, assistantMessage]);
      setStatus("error");
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;

    event.preventDefault();
    void submitMessage();
  };

  const handleClearChat = () => {
    clearCachedSession();
    setMessages([]);
    setInput("");
    setStatus("idle");
  };

  const handleHideWidget = () => {
    setIsHidden(true);
    setIsOpen(false);
  };

  if (isHidden) return null;

  return (
    <div
      className={`ema-assist-widget ema-ai-command-widget ${isOpen ? "is-open" : ""} ${
        isExpanded ? "is-expanded" : ""
      }`}
    >
      {!isOpen && (
        <div className="ema-ai-launcher-shell">
          <button
            type="button"
            className="ema-ai-launcher"
            onClick={() => setIsOpen(true)}
            aria-label="Open EMA Assistant"
            title="EMA Assistant"
          >
            <AssistantAvatar />
            <span>
              <strong>EMA Assistant</strong>
              <small>AI command support</small>
            </span>
          </button>

          <button
            type="button"
            className="ema-ai-launcher-dismiss"
            onClick={handleHideWidget}
            aria-label="Hide EMA Assistant"
            title="Hide EMA Assistant"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {isOpen && (
        <section className="ema-ai-command-panel" aria-label="EMA Assistant chat">
          <div className="ema-ai-panel-top">
            <div className="ema-ai-brand">
              <AssistantAvatar />
              <div>
                <span className="ema-ai-kicker">EMA INTELLIGENCE</span>
                <strong>Assistant Console</strong>
                <small>{activeSummary}</small>
              </div>
            </div>

            <div className="ema-ai-top-actions">
              <span className={`ema-ai-status-pill is-${status}`}>
                {status === "loading" && <Loader2 size={13} className="ema-ai-spin" />}
                {status === "ready" && <CheckCircle2 size={13} />}
                {status === "idle" && <CheckCircle2 size={13} />}
                {status === "error" && <AlertTriangle size={13} />}
                {statusLabel}
              </span>

              <button
                type="button"
                onClick={() => setIsExpanded((current) => !current)}
                aria-label={isExpanded ? "Minimize EMA Assistant" : "Expand EMA Assistant"}
                title={isExpanded ? "Minimize" : "Expand"}
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close EMA Assistant"
                title="Close panel"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          <div className="ema-ai-panel-body">
            <aside className="ema-ai-sidecar">
              <div className="ema-ai-sidecar-card">
                <span className="ema-ai-kicker">FAST START</span>
                <h3>Ask from operations context</h3>
                <p>
                  Use focused prompts to review endpoint health, settings changes,
                  risk signals and report summaries.
                </p>
              </div>

              <div className="ema-ai-prompt-stack">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt.text}
                    type="button"
                    onClick={() => void submitMessage(prompt.text)}
                    disabled={status === "loading"}
                  >
                    <span>{prompt.title}</span>
                    <small>{prompt.desc}</small>
                  </button>
                ))}
              </div>
            </aside>

            <main className="ema-ai-chat-stage">
              {!hasMessages && (
                <div className="ema-ai-empty-state">
                  <div className="ema-ai-empty-orb">
                    <Sparkles size={26} />
                  </div>
                  <span className="ema-ai-kicker">READY TO ASSIST</span>
                  <h2>What do you want to investigate?</h2>
                  <p>
                    Ask about settings changes, endpoint health, device risk,
                    asset records, activity history or system configuration.
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`ema-ai-message is-${message.role} ${
                    message.status === "error" ? "is-error" : ""
                  }`}
                >
                  <div className="ema-ai-message-meta">
                    <span>{message.role === "user" ? "You" : "EMA Assistant"}</span>
                    <small>
                      <Clock3 size={11} />
                      {formatTime(message.createdAt)}
                    </small>
                  </div>

                  <MessageContent content={message.content} />
                </article>
              ))}

              {status === "loading" && (
                <article className="ema-ai-message is-assistant is-loading">
                  <div className="ema-ai-message-meta">
                    <span>EMA Assistant</span>
                  </div>

                  <div className="ema-ai-loading-block">
                    <i />
                    <i />
                    <i />
                  </div>
                </article>
              )}

              <div ref={messagesEndRef} />
            </main>
          </div>

          <footer className="ema-ai-composer">
            {hasMessages && (
              <button
                type="button"
                className="ema-ai-clear-btn"
                onClick={handleClearChat}
                title="Clear chat"
                aria-label="Clear EMA Assistant chat"
              >
                <Trash2 size={15} />
              </button>
            )}

            <div className="ema-ai-input-shell">
              <span>
                <Zap size={14} />
              </span>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Ask EMA Assistant..."
                rows={1}
                disabled={status === "loading"}
              />
            </div>

            <button
              type="button"
              className="ema-ai-send-btn"
              onClick={() => void submitMessage()}
              disabled={!input.trim() || status === "loading"}
              aria-label="Send message"
              title="Send"
            >
              {status === "loading" ? (
                <Loader2 size={18} className="ema-ai-spin" />
              ) : (
                <SendHorizontal size={18} />
              )}
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}
