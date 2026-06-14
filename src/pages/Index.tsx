import { useState, useEffect, useRef, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

// ─── URLs ───────────────────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = '332839074516-c68qp93a0metrimt9kg2f9b42hevea66.apps.googleusercontent.com';
const AUTH_URL   = 'https://functions.poehali.dev/b3ab24d0-9d31-476a-aca8-b665ade6d462';
const PROFILE_URL = 'https://functions.poehali.dev/986efe63-5208-479f-8c21-84a1f639d774';
const MSG_URL    = 'https://functions.poehali.dev/89f9e147-6e28-4aca-ba89-d523c94ea4ac';

// ─── Types ──────────────────────────────────────────────────────────────────
type Screen = 'login' | 'setup' | 'app';

interface User {
  id: number;
  google_id: string;
  email: string;
  name: string;
  username: string | null;
  bio: string;
  avatar_url: string;
}

interface ChatItem {
  id: number;
  partner: { id: number; name: string; username: string | null; avatar_url: string };
  last_message: string | null;
  last_time: string | null;
  last_message_id: number | null;
}

interface Message {
  id: number;
  sender_id: number;
  text: string;
  created_at: string;
  sender_name: string;
  sender_avatar: string;
}

interface AllUser {
  id: number;
  name: string;
  username: string | null;
  avatar_url: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function decodeJwt(token: string) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
  } catch { return null; }
}

function fmtTime(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('ru', { day: '2-digit', month: '2-digit' });
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

declare global {
  interface Window {
    google?: {
      accounts: { id: { initialize: (c: Record<string, unknown>) => void; renderButton: (el: HTMLElement, o: Record<string, unknown>) => void } };
    };
  }
}

// ─── Avatar ──────────────────────────────────────────────────────────────────
const Avatar = ({ name, url, size = 'md', online }: { name: string; url?: string; size?: 'sm' | 'md' | 'lg'; online?: boolean }) => {
  const sz = size === 'lg' ? 'w-20 h-20 text-2xl' : size === 'md' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm';
  return (
    <div className="relative shrink-0">
      {url ? (
        <img src={url} alt={name} className={`${sz} rounded-full object-cover`} />
      ) : (
        <div className={`${sz} rounded-full bg-black text-white flex items-center justify-center font-display font-medium tracking-wide`}>
          {initials(name)}
        </div>
      )}
      {online !== undefined && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-white rounded-full flex items-center justify-center">
          <span className={`w-2 h-2 rounded-full ${online ? 'bg-black' : 'bg-gray-300'}`} />
        </span>
      )}
    </div>
  );
};

// ─── Login Screen ─────────────────────────────────────────────────────────────
const LoginScreen = ({ onLogin }: { onLogin: (u: User) => void }) => {
  const btnRef = useRef<HTMLDivElement>(null);

  const handleCredential = async (resp: { credential: string }) => {
    const profile = decodeJwt(resp.credential);
    if (!profile) { toast({ title: 'Ошибка входа' }); return; }
    const res = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ google_id: profile.sub, email: profile.email, name: profile.name, picture: profile.picture }),
    });
    const user: User = await res.json();
    onLogin(user);
  };

  useEffect(() => {
    const init = () => {
      if (!window.google || !btnRef.current) return;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleCredential });
      window.google.accounts.id.renderButton(btnRef.current, { type: 'standard', theme: 'filled_black', size: 'large', shape: 'pill', text: 'signin_with', width: 280 });
    };
    if (window.google) init();
    else { const t = setInterval(() => { if (window.google) { clearInterval(t); init(); } }, 200); return () => clearInterval(t); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      <div className="relative animate-scale-in text-center">
        <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-black flex items-center justify-center">
          <Icon name="MessageCircle" size={40} className="text-white" />
        </div>
        <h1 className="font-display text-7xl font-bold tracking-tight text-black mb-3">ЛСПА</h1>
        <p className="text-muted-foreground mb-12 text-lg font-light">Сообщения без лишнего шума</p>
        <div className="flex justify-center">
          <div ref={btnRef} className="animate-fade-in" style={{ opacity: 0 }} />
        </div>
        <p className="text-xs text-muted-foreground mt-10 max-w-xs mx-auto leading-relaxed">
          Продолжая, вы соглашаетесь с правилами сервиса и политикой конфиденциальности
        </p>
      </div>
    </div>
  );
};

// ─── Setup Screen ─────────────────────────────────────────────────────────────
const SetupScreen = ({ user, onDone }: { user: User; onDone: (u: User) => void }) => {
  const [name, setName] = useState(user.name || '');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(user.avatar_url || '');
  const [avatarB64, setAvatarB64] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'ok' | 'taken' | 'invalid'>('idle');
  const [loading, setLoading] = useState(false);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      setAvatarPreview(result);
      setAvatarB64(result.split(',')[1]);
    };
    reader.readAsDataURL(file);
  };

  const onUsernameChange = (val: string) => {
    setUsername(val);
    if (checkTimer.current) clearTimeout(checkTimer.current);
    if (!val) { setUsernameStatus('idle'); return; }
    setUsernameStatus('checking');
    checkTimer.current = setTimeout(async () => {
      const res = await fetch(`${PROFILE_URL}/check-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: val }),
      });
      const data = await res.json();
      if (data.error) setUsernameStatus('invalid');
      else setUsernameStatus(data.available ? 'ok' : 'taken');
    }, 500);
  };

  const onSubmit = async () => {
    if (!name.trim()) { toast({ title: 'Введи имя' }); return; }
    if (usernameStatus !== 'ok') { toast({ title: 'Выбери доступный username' }); return; }
    setLoading(true);
    const res = await fetch(`${PROFILE_URL}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, name, username, bio, avatar_b64: avatarB64 || null }),
    });
    const updated: User = await res.json();
    setLoading(false);
    onDone(updated);
  };

  const statusColor = { idle: '', checking: 'text-muted-foreground', ok: 'text-green-600', taken: 'text-red-500', invalid: 'text-red-500' }[usernameStatus];
  const statusText = { idle: '', checking: 'Проверяем...', ok: '✓ Доступен', taken: '✗ Занят', invalid: '✗ 3–20 символов: a-z, 0-9, _' }[usernameStatus];

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm animate-scale-in">
        <h1 className="font-display text-4xl font-bold mb-2">Настрой профиль</h1>
        <p className="text-muted-foreground mb-8">Это увидят другие пользователи</p>

        {/* Avatar */}
        <div className="flex justify-center mb-8">
          <label className="cursor-pointer group relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-secondary flex items-center justify-center border-2 border-dashed border-border group-hover:border-black transition-colors">
              {avatarPreview
                ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                : <Icon name="Camera" size={28} className="text-muted-foreground" />
              }
            </div>
            <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Icon name="Camera" size={20} className="text-white" />
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Имя</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Как тебя зовут?" className="w-full px-4 py-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-black text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <input value={username} onChange={e => onUsernameChange(e.target.value)} placeholder="твой_юз" className="w-full pl-8 pr-4 py-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-black text-sm" />
            </div>
            {statusText && <p className={`text-xs mt-1 ${statusColor}`}>{statusText}</p>}
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">О себе</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Пару слов о себе..." rows={3} className="w-full px-4 py-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-black text-sm resize-none" />
          </div>
        </div>

        <button onClick={onSubmit} disabled={loading} className="mt-6 w-full py-4 rounded-full bg-black text-white font-medium hover:opacity-80 active:scale-[0.98] transition-all disabled:opacity-50">
          {loading ? 'Сохраняем...' : 'Войти в мессенджер'}
        </button>
      </div>
    </div>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────
const AppScreen = ({ user }: { user: User }) => {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [activeChat, setActiveChat] = useState<ChatItem | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [tab, setTab] = useState<'chats' | 'contacts'>('chats');
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const lastMsgId = useRef(0);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const inviteLink = window.location.href;

  // Load chats
  const loadChats = useCallback(async () => {
    const res = await fetch(`${MSG_URL}/chats?user_id=${user.id}`);
    const data: ChatItem[] = await res.json();
    setChats(data);
  }, [user.id]);

  // Load all users for contacts
  const loadUsers = useCallback(async () => {
    const res = await fetch(`${AUTH_URL}/all`);
    const data: AllUser[] = await res.json();
    setAllUsers(data.filter(u => u.id !== user.id));
  }, [user.id]);

  useEffect(() => { loadChats(); loadUsers(); }, [loadChats, loadUsers]);

  // Poll chats every 5s
  useEffect(() => {
    const t = setInterval(loadChats, 5000);
    return () => clearInterval(t);
  }, [loadChats]);

  // Load messages when chat changes
  useEffect(() => {
    if (!activeChat) return;
    lastMsgId.current = 0;
    setMessages([]);
    const load = async () => {
      const res = await fetch(`${MSG_URL}/messages?chat_id=${activeChat.id}&after_id=0`);
      const data: Message[] = await res.json();
      setMessages(data);
      if (data.length) lastMsgId.current = data[data.length - 1].id;
    };
    load();
  }, [activeChat?.id]);

  // Poll new messages every 2s
  useEffect(() => {
    if (!activeChat) return;
    const t = setInterval(async () => {
      const res = await fetch(`${MSG_URL}/messages?chat_id=${activeChat.id}&after_id=${lastMsgId.current}`);
      const data: Message[] = await res.json();
      if (data.length) {
        setMessages(prev => [...prev, ...data]);
        lastMsgId.current = data[data.length - 1].id;
      }
    }, 2000);
    return () => clearInterval(t);
  }, [activeChat]);

  // Scroll to bottom
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const openChat = async (partnerId: number) => {
    const res = await fetch(`${MSG_URL}/chats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, partner_id: partnerId }),
    });
    const { chat_id } = await res.json();
    await loadChats();
    const partner = allUsers.find(u => u.id === partnerId);
    if (partner) {
      setActiveChat({ id: chat_id, partner: { ...partner, username: partner.username }, last_message: null, last_time: null, last_message_id: null });
      setTab('chats');
    }
  };

  const sendMessage = async () => {
    if (!text.trim() || !activeChat) return;
    const t = text;
    setText('');
    await fetch(`${MSG_URL}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: activeChat.id, sender_id: user.id, text: t }),
    });
    loadChats();
  };

  const filteredChats = chats.filter(c => c.partner.name.toLowerCase().includes(search.toLowerCase()));
  const filteredUsers = allUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || (u.username || '').includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-white flex text-black font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-[380px] border-r border-border flex flex-col h-screen shrink-0">
        <div className="px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-display text-3xl font-bold tracking-tight">ЛСПА</h1>
            <div className="flex gap-2">
              <button onClick={() => setShowInvite(true)} className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-black hover:text-white transition-colors" title="Пригласить">
                <Icon name="UserPlus" size={17} />
              </button>
              <div className="w-9 h-9 rounded-full overflow-hidden border border-border">
                <Avatar name={user.name} url={user.avatar_url} size="sm" />
              </div>
            </div>
          </div>
          <div className="flex gap-1 p-1 bg-secondary rounded-full mb-3">
            {(['chats', 'contacts'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${tab === t ? 'bg-black text-white' : 'text-muted-foreground hover:text-black'}`}>
                {t === 'chats' ? 'Чаты' : 'Контакты'}
              </button>
            ))}
          </div>
          <div className="relative">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск" className="w-full pl-9 pr-4 py-2.5 rounded-full bg-secondary text-sm outline-none focus:ring-1 focus:ring-black" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === 'chats' && (
            filteredChats.length === 0
              ? <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
                  <Icon name="MessageCircle" size={40} />
                  <p>Нет чатов — перейди в Контакты</p>
                </div>
              : filteredChats.map(c => (
                <button key={c.id} onClick={() => setActiveChat(c)} className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors border-b border-border/50 ${activeChat?.id === c.id ? 'bg-secondary' : 'hover:bg-secondary/60'}`}>
                  <Avatar name={c.partner.name} url={c.partner.avatar_url} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <span className="font-medium truncate">{c.partner.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">{fmtTime(c.last_time)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{c.last_message || 'Нет сообщений'}</p>
                  </div>
                </button>
              ))
          )}

          {tab === 'contacts' && (
            filteredUsers.length === 0
              ? <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
                  <Icon name="Users" size={40} />
                  <p>Нет пользователей</p>
                </div>
              : filteredUsers.map(u => (
                <button key={u.id} onClick={() => openChat(u.id)} className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-secondary/60 transition-colors border-b border-border/50">
                  <Avatar name={u.name} url={u.avatar_url} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{u.name}</div>
                    {u.username && <div className="text-sm text-muted-foreground">@{u.username}</div>}
                  </div>
                  <Icon name="MessageCircle" size={18} className="text-muted-foreground shrink-0" />
                </button>
              ))
          )}
        </div>
      </aside>

      {/* Chat */}
      <main className="hidden md:flex flex-1 flex-col h-screen">
        {activeChat ? (
          <>
            <div className="px-6 py-4 border-b border-border bg-white flex items-center gap-3 shrink-0">
              <Avatar name={activeChat.partner.name} url={activeChat.partner.avatar_url} size="sm" />
              <div className="flex-1">
                <div className="font-medium">{activeChat.partner.name}</div>
                {activeChat.partner.username && <div className="text-xs text-muted-foreground">@{activeChat.partner.username}</div>}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 bg-secondary/20">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${m.sender_id === user.id ? 'bg-black text-white rounded-br-md' : 'bg-white border border-border rounded-bl-md'}`}>
                    <p className="text-sm leading-relaxed break-words">{m.text}</p>
                    <span className={`text-[10px] block mt-0.5 ${m.sender_id === user.id ? 'text-white/50 text-right' : 'text-muted-foreground'}`}>{fmtTime(m.created_at)}</span>
                  </div>
                </div>
              ))}
              <div ref={messagesEnd} />
            </div>

            <div className="px-6 py-4 border-t border-border bg-white flex items-center gap-3 shrink-0">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                placeholder="Сообщение..."
                className="flex-1 px-4 py-2.5 rounded-full bg-secondary outline-none text-sm focus:ring-1 focus:ring-black"
              />
              <button onClick={sendMessage} className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-transform">
                <Icon name="Send" size={18} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Icon name="MessageCircle" size={48} />
            <p className="text-lg">Выбери чат или напиши кому-нибудь</p>
            <button onClick={() => setTab('contacts')} className="text-sm text-black underline underline-offset-2">Открыть контакты</button>
          </div>
        )}
      </main>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setShowInvite(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="font-display text-2xl font-bold mb-2">Пригласить друга</h2>
            <p className="text-muted-foreground text-sm mb-4">Поделись ссылкой — и друг сможет зарегистрироваться в ЛСПА</p>
            <div className="flex gap-2">
              <input readOnly value={inviteLink} className="flex-1 px-3 py-2.5 rounded-xl border border-border text-sm bg-secondary outline-none" />
              <button onClick={() => { navigator.clipboard.writeText(inviteLink); toast({ title: 'Ссылка скопирована!' }); }} className="px-4 py-2.5 rounded-xl bg-black text-white text-sm font-medium hover:opacity-80 transition-opacity">
                Копировать
              </button>
            </div>
            <button onClick={() => setShowInvite(false)} className="mt-4 w-full py-2.5 rounded-xl border border-border text-sm hover:bg-secondary transition-colors">Закрыть</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Root ────────────────────────────────────────────────────────────────────
const Index = () => {
  const [screen, setScreen] = useState<Screen>('login');
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (u: User) => {
    setUser(u);
    // Если username не заполнен — показываем экран настройки профиля
    setScreen(!u.username ? 'setup' : 'app');
  };

  return (
    <>
      {screen === 'login' && <LoginScreen onLogin={handleLogin} />}
      {screen === 'setup' && user && <SetupScreen user={user} onDone={u => { setUser(u); setScreen('app'); }} />}
      {screen === 'app' && user && <AppScreen user={user} />}
      <Toaster />
    </>
  );
};

export default Index;
