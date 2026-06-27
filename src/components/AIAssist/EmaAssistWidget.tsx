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
  type UIEvent,
  type WheelEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { API_BASE_URL } from "../../config/api";
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
  isChatStarted?: boolean;
  lastActivityAt?: number;
  expiresAt: number;
};

type EmaAssistWidgetProps = {
  /**
   * TopNavbar renders its own AI button. When this is false, only the panel is rendered
   * after the global `ema-ai-assist-open` event is fired.
   */
  showFloatingLauncher?: boolean;
};

const TOKEN_STORAGE_KEYS = [
  "ema-access-token",
  "accessToken",
  "token",
  "ema-auth-token",
];

const AI_SESSION_CACHE_KEY = "ema-ai-assist-session";
const AI_SESSION_TTL_MS = 5 * 60 * 1000;
const AI_SESSION_IDLE_MS = 2 * 60 * 1000;
const AUTH_SYNC_INTERVAL_MS = 1000;
const FRIDAY_LOGOUT_EVENTS = [
  "ema-auth-logout",
  "ema-logout",
  "auth:logout",
  "logout",
];

const FRIDAY_INTRO_MESSAGE =
  "Hi, I am Friday, your secure EMA operations assistant. I can help with approved operational summaries such as endpoint health, risk review, patch summary, and recent settings changes. Ask me a question to begin.";

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

function isAuthPageRoute() {
  if (typeof window === "undefined") return false;

  const path = window.location.pathname.toLowerCase();
  return path.includes("login") || path.includes("sign-in") || path.includes("signin");
}

function hasAuthenticatedSession() {
  if (typeof window === "undefined") return false;
  if (isAuthPageRoute()) return false;
  return Boolean(getStoredToken());
}

function clearFridaySessionCache() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AI_SESSION_CACHE_KEY);
}

function createMessage(
  role: AiMessage["role"],
  content: string,
  status?: AiStatus,
): AiMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    status,
  };
}

function createFridayIntroMessage(): AiMessage {
  return createMessage("assistant", FRIDAY_INTRO_MESSAGE, "ready");
}

function formatTime(value: string) {
  try {
    return new Intl.DateTimeFormat("en-MY", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "now";
  }
}

function AiAvatar() {
  return (
    <span className="ema-ai-avatar" aria-hidden="true">
      <span className="ema-ai-avatar-core">
        <span className="ema-ai-avatar-ring" />
        <span className="ema-ai-avatar-face">
          <span className="ema-ai-avatar-eye" />
          <span className="ema-ai-avatar-eye" />
        </span>
      </span>
      <span className="ema-ai-avatar-status" />
    </span>
  );
}

export default function EmaAssistWidget({ showFloatingLauncher = true }: EmaAssistWidgetProps) {
  const restored = useMemo(() => {
    if (typeof window === "undefined") return null;

    if (!hasAuthenticatedSession()) {
      clearFridaySessionCache();
      return null;
    }

    const cached = safeParseJson<CachedAiSession>(localStorage.getItem(AI_SESSION_CACHE_KEY));
    if (!cached || cached.expiresAt < Date.now()) return null;

    const lastActivityAt = Number(cached.lastActivityAt || 0);
    const idleExpired = lastActivityAt > 0 && Date.now() - lastActivityAt >= AI_SESSION_IDLE_MS;

    if (idleExpired) {
      return {
        ...cached,
        messages: [],
        input: "",
        isOpen: false,
        isChatStarted: false,
        lastActivityAt: Date.now(),
      };
    }

    return cached;
  }, []);

  const initialChatStarted = restored?.isChatStarted ?? Boolean(restored?.messages?.length);

  const [messages, setMessages] = useState<AiMessage[]>(restored?.messages || []);
  const [input, setInput] = useState(restored?.input || "");
  const [isOpen, setIsOpen] = useState(restored?.isOpen ?? false);
  const [isExpanded, setIsExpanded] = useState(restored?.isExpanded ?? false);
  const [isHidden, setIsHidden] = useState(restored?.isHidden ?? false);
  const [isChatStarted, setIsChatStarted] = useState(initialChatStarted);
  const [lastActivityAt, setLastActivityAt] = useState(restored?.lastActivityAt || Date.now());
  const [status, setStatus] = useState<AiStatus>(initialChatStarted ? "ready" : "idle");
  const [isAuthenticated, setIsAuthenticated] = useState(() => hasAuthenticatedSession());

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatStageRef = useRef<HTMLElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const isAuthenticatedRef = useRef(isAuthenticated);

  const markSessionActivity = useCallback(() => {
    if (!isChatStarted) return;
    setLastActivityAt(Date.now());
  }, [isChatStarted]);

  const closeChatSession = useCallback(() => {
    shouldAutoScrollRef.current = true;
    setIsOpen(false);
    setIsChatStarted(false);
    setMessages([]);
    setInput("");
    setStatus("idle");
    setLastActivityAt(Date.now());
  }, []);

  const resetFridayAfterLogout = useCallback(() => {
    shouldAutoScrollRef.current = true;
    clearFridaySessionCache();
    setIsOpen(false);
    setIsChatStarted(false);
    setMessages([]);
    setInput("");
    setStatus("idle");
    setLastActivityAt(Date.now());
  }, []);

  const syncAuthenticationState = useCallback(() => {
    const hasSession = hasAuthenticatedSession();

    if (!hasSession && isAuthenticatedRef.current) {
      resetFridayAfterLogout();
    }

    if (hasSession !== isAuthenticatedRef.current) {
      isAuthenticatedRef.current = hasSession;
      setIsAuthenticated(hasSession);
    }
  }, [resetFridayAfterLogout]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearFridaySessionCache();
      return;
    }

    localStorage.setItem(
      AI_SESSION_CACHE_KEY,
      JSON.stringify({
        messages,
        input,
        isOpen,
        isExpanded,
        isHidden,
        isChatStarted,
        lastActivityAt,
        expiresAt: Date.now() + AI_SESSION_TTL_MS,
      }),
    );
  }, [messages, input, isOpen, isExpanded, isHidden, isChatStarted, lastActivityAt, isAuthenticated]);

  useEffect(() => {
    syncAuthenticationState();

    const handleLogout = () => {
      resetFridayAfterLogout();
      isAuthenticatedRef.current = false;
      setIsAuthenticated(false);
    };

    const handleStorage = (event: StorageEvent) => {
      if (
        !event.key ||
        event.key === "ema-auth" ||
        event.key === AI_SESSION_CACHE_KEY ||
        TOKEN_STORAGE_KEYS.includes(event.key)
      ) {
        syncAuthenticationState();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") syncAuthenticationState();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", syncAuthenticationState);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    FRIDAY_LOGOUT_EVENTS.forEach((eventName) => window.addEventListener(eventName, handleLogout));

    const authTimer = window.setInterval(syncAuthenticationState, AUTH_SYNC_INTERVAL_MS);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", syncAuthenticationState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      FRIDAY_LOGOUT_EVENTS.forEach((eventName) => window.removeEventListener(eventName, handleLogout));
      window.clearInterval(authTimer);
    };
  }, [resetFridayAfterLogout, syncAuthenticationState]);

  useEffect(() => {
    const openAssistant = () => {
      setIsHidden(false);
      setIsOpen(true);
    };

    window.addEventListener("ema-ai-assist-open", openAssistant);
    return () => window.removeEventListener("ema-ai-assist-open", openAssistant);
  }, []);

  useEffect(() => {
    if (!isOpen || !isChatStarted) return undefined;

    const elapsedMs = Date.now() - lastActivityAt;
    const remainingMs = AI_SESSION_IDLE_MS - elapsedMs;

    if (remainingMs <= 0) {
      closeChatSession();
      return undefined;
    }

    const timer = window.setTimeout(() => closeChatSession(), remainingMs);
    return () => window.clearTimeout(timer);
  }, [closeChatSession, isChatStarted, isOpen, lastActivityAt]);

  const scrollChatToBottom = (behavior: ScrollBehavior = "smooth") => {
    const chatStage = chatStageRef.current;

    if (!chatStage) {
      messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
      return;
    }

    chatStage.scrollTo({
      top: chatStage.scrollHeight,
      behavior,
    });
  };

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    window.requestAnimationFrame(() => scrollChatToBottom("smooth"));
  }, [messages]);

  useEffect(() => {
    if (!isOpen) return;
    shouldAutoScrollRef.current = true;
    window.requestAnimationFrame(() => scrollChatToBottom("auto"));
  }, [isOpen, isExpanded]);

  const startChatSession = () => {
    shouldAutoScrollRef.current = true;
    setIsChatStarted(true);
    setStatus("ready");
    setLastActivityAt(Date.now());
    setMessages((current) => {
      if (current.length > 0) return current;
      return [createFridayIntroMessage()];
    });
    window.requestAnimationFrame(() => scrollChatToBottom("smooth"));
  };

  const handleChatScroll = (event: UIEvent<HTMLElement>) => {
    const target = event.currentTarget;
    const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 96;
    markSessionActivity();
  };

  const stopChatScrollPropagation = (event: WheelEvent<HTMLElement>) => {
    event.stopPropagation();
    markSessionActivity();
  };

  const sendPrompt = async (promptText = input.trim()) => {
    const content = promptText.trim();
    if (!content || status === "loading") return;

    if (!isChatStarted) {
      startChatSession();
      return;
    }

    shouldAutoScrollRef.current = true;
    setLastActivityAt(Date.now());

    const userMessage = createMessage("user", content);
    const loadingMessage = createMessage("assistant", "Thinking...", "loading");
    setMessages((current) => [...current, userMessage, loadingMessage]);
    setInput("");
    setStatus("loading");

    try {
      const token = getStoredToken();
      const response = await fetch(`${API_BASE_URL}/api/ai-assist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ message: content }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || payload?.error || "Friday request failed");

      const answer = String(payload?.answer || payload?.message || payload?.data?.answer || "No answer returned.");
      setMessages((current) => current.map((message) => message.id === loadingMessage.id ? { ...message, content: answer, status: "ready" } : message));
      setStatus("ready");
      setLastActivityAt(Date.now());
    } catch (error) {
      const answer = error instanceof Error ? error.message : "Friday request failed.";
      setMessages((current) => current.map((message) => message.id === loadingMessage.id ? { ...message, content: answer, status: "error" } : message));
      setStatus("error");
      setLastActivityAt(Date.now());
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    markSessionActivity();
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendPrompt();
    }
  };

  const clearSession = () => {
    shouldAutoScrollRef.current = true;
    setMessages([createFridayIntroMessage()]);
    setInput("");
    setStatus("ready");
    setLastActivityAt(Date.now());
  };

  if (!isAuthenticated) return null;
  if (isHidden) return null;
  if (!isOpen && !showFloatingLauncher) return null;

  return (
    <div className={`ema-assist-widget ${isOpen ? "is-open" : ""} ${isExpanded ? "is-expanded" : ""}`}>
      {isOpen ? (
        <section className="ema-ai-command-panel" role="dialog" aria-label="Friday Assistant">
          <header className="ema-ai-panel-top">
            <div className="ema-ai-brand">
              <AiAvatar />
              <div>
                <span className="ema-ai-kicker">EMA Intelligence</span>
                <strong>Friday</strong>
                <small>Your secure EMA operations assistant.</small>
              </div>
            </div>
            <div className="ema-ai-top-actions">
              <span className={`ema-ai-session-pill ${isChatStarted ? "is-active" : "is-standby"}`}>
                <CheckCircle2 size={14} />
                {isChatStarted ? "Session active" : "Not started"}
              </span>
              <span className={`ema-ai-status-pill is-${status}`}>
                {status === "loading" ? <Loader2 size={14} className="spin" /> : status === "error" ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                {status === "loading" ? "Thinking" : status === "error" ? "Needs attention" : "Ready"}
              </span>
              <button type="button" onClick={() => setIsExpanded((value) => !value)} title={isExpanded ? "Minimize" : "Expand"}>
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button type="button" onClick={() => setIsOpen(false)} title="Close"><X size={16} /></button>
            </div>
          </header>

          <div className="ema-ai-panel-body">
            <aside className="ema-ai-sidecar">
              <div className="ema-ai-sidecar-card">
                <Zap size={20} />
                <h3>Quick prompts</h3>
                <p>{isChatStarted ? "Start with common operational questions." : "Start the chat session first."}</p>
              </div>
              <div className="ema-ai-prompt-stack">
                {quickPrompts.map((prompt) => (
                  <button type="button" key={prompt.title} onClick={() => sendPrompt(prompt.text)} disabled={!isChatStarted || status === "loading"}>
                    <span>{prompt.title}</span>
                    <small>{prompt.desc}</small>
                  </button>
                ))}
              </div>
            </aside>

            <main
              ref={chatStageRef}
              className={`ema-ai-chat-stage ${!isChatStarted ? "is-before-start" : ""}`}
              onScroll={handleChatScroll}
              onWheel={stopChatScrollPropagation}
            >
              {!messages.length && (
                <div className="ema-ai-empty-state ema-ai-welcome-state">
                  <span className="ema-ai-empty-orb"><Sparkles size={26} /></span>
                  <h2>Meet Friday</h2>
                  <p>Start a secure chat session first. Friday will introduce itself before you ask any operational question.</p>
                </div>
              )}

              {messages.map((message) => (
                <article key={message.id} className={`ema-ai-message is-${message.role} ${message.status === "error" ? "is-error" : ""}`}>
                  <div className="ema-ai-message-meta">
                    <span>{message.role === "user" ? "You" : "Friday"}</span>
                    <small>
                      {message.status === "loading" && <Loader2 size={13} className="spin" />}
                      {message.status === "ready" && <CheckCircle2 size={13} />}
                      {message.status === "error" && <AlertTriangle size={13} />}
                      {!message.status && <Clock3 size={13} />}
                      {formatTime(message.createdAt)}
                    </small>
                  </div>
                  {message.status === "loading" ? (
                    <div className="ema-ai-loading-block"><i /><i /><i /></div>
                  ) : (
                    <div className="ema-ai-markdown"><p>{message.content}</p></div>
                  )}
                </article>
              ))}
              <div ref={messagesEndRef} />
            </main>
          </div>

          {isChatStarted ? (
            <footer className="ema-ai-composer">
              <div className="ema-ai-input-shell">
                <span><Sparkles size={17} /></span>
                <textarea
                  value={input}
                  onChange={(event) => {
                    setInput(event.target.value);
                    markSessionActivity();
                  }}
                  onFocus={markSessionActivity}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Friday..."
                />
              </div>
              <button type="button" className="ema-ai-clear-btn" onClick={clearSession} title="Clear chat">
                <Trash2 size={18} />
              </button>
              <button type="button" className="ema-ai-send-btn" onClick={() => sendPrompt()} disabled={!input.trim() || status === "loading"} title="Send">
                {status === "loading" ? <Loader2 size={18} className="spin" /> : <SendHorizontal size={18} />}
              </button>
            </footer>
          ) : (
            <footer className="ema-ai-start-footer">
              <button type="button" className="ema-ai-start-chat-btn" onClick={startChatSession}>
                <Sparkles size={18} />
                Start Chat With AI
              </button>
              <small>Session closes automatically after 2 minutes of inactivity.</small>
            </footer>
          )}
        </section>
      ) : (
        <div className="ema-ai-launcher-shell">
          <button type="button" className="ema-ai-launcher" onClick={() => setIsOpen(true)}>
            <AiAvatar />
            <span>
              <strong>Friday</strong>
              <small>Open secure assistant</small>
            </span>
          </button>
          <button type="button" className="ema-ai-launcher-dismiss" onClick={() => setIsHidden(true)} title="Hide Friday"><Trash2 size={14} /></button>
        </div>
      )}
    </div>
  );
}
