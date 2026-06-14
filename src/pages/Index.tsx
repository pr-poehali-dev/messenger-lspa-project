import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/icon';
import { toast } from '@/hooks/use-toast';

type Screen = 'login' | 'app';
type Tab = 'chats' | 'contacts';

const GOOGLE_CLIENT_ID = '332839074516-c68qp93a0metrimt9kg2f9b42hevea66.apps.googleusercontent.com';
const NOTIFY_URL = 'https://functions.poehali.dev/9640014f-d57f-46e9-9060-67fb871de37e';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
        };
      };
    };
  }
}

function decodeJwt(token: string) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const CHATS = [
  { id: 1, name: 'Анна Кротова', last: 'Окей, до встречи завтра!', time: '14:32', unread: 2, online: true, initials: 'АК' },
  { id: 2, name: 'Дизайн-команда', last: 'Максим: скинул новые макеты', time: '13:05', unread: 5, online: false, initials: 'ДК' },
  { id: 3, name: 'Игорь Петров', last: 'Спасибо, получил 🙌', time: '11:48', unread: 0, online: true, initials: 'ИП' },
  { id: 4, name: 'Мама', last: 'Позвони, как сможешь', time: 'Вчера', unread: 0, online: false, initials: 'М' },
  { id: 5, name: 'Лена Соколова', last: 'Голосовое сообщение', time: 'Вчера', unread: 0, online: false, initials: 'ЛС' },
];

const CONTACTS = [
  { id: 1, name: 'Анна Кротова', status: 'в сети', online: true, initials: 'АК' },
  { id: 2, name: 'Игорь Петров', status: 'в сети', online: true, initials: 'ИП' },
  { id: 3, name: 'Лена Соколова', status: 'была 2 ч назад', online: false, initials: 'ЛС' },
  { id: 4, name: 'Максим Орлов', status: 'был вчера', online: false, initials: 'МО' },
  { id: 5, name: 'Мама', status: 'была 5 мин назад', online: false, initials: 'М' },
  { id: 6, name: 'Дмитрий Власов', status: 'давно', online: false, initials: 'ДВ' },
];

const MESSAGES = [
  { id: 1, mine: false, text: 'Привет! Как продвигается проект?', time: '14:20' },
  { id: 2, mine: true, text: 'Привет! Почти закончил, осталось пара правок', time: '14:24' },
  { id: 3, mine: false, text: 'Отлично! Когда сможем созвониться?', time: '14:28' },
  { id: 4, mine: true, text: 'Давай завтра в 11?', time: '14:30' },
  { id: 5, mine: false, text: 'Окей, до встречи завтра!', time: '14:32' },
];

const Avatar = ({ initials, online, size = 'md' }: { initials: string; online?: boolean; size?: 'sm' | 'md' }) => (
  <div className="relative shrink-0">
    <div
      className={`${size === 'md' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm'} rounded-full bg-black text-white flex items-center justify-center font-display font-medium tracking-wide`}
    >
      {initials}
    </div>
    {online && (
      <span className="absolute bottom-0 right-0 w-3 h-3 bg-white rounded-full flex items-center justify-center">
        <span className="w-2 h-2 bg-black rounded-full" />
      </span>
    )}
  </div>
);

const LoginScreen = ({ onLogin }: { onLogin: () => void }) => {
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const handleCredential = async (response: { credential: string }) => {
    const profile = decodeJwt(response.credential);
    if (!profile) {
      toast({ title: 'Не удалось войти', description: 'Попробуйте ещё раз' });
      return;
    }
    try {
      await fetch(NOTIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          picture: profile.picture,
          provider: 'Google',
        }),
      });
    } catch {
      /* письмо не критично для входа */
    }
    onLogin();
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const init = () => {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredential,
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        width: 320,
        logo_alignment: 'left',
      });
    };
    if (window.google) init();
    else {
      const t = setInterval(() => {
        if (window.google) {
          clearInterval(t);
          init();
        }
      }, 200);
      return () => clearInterval(t);
    }
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

        <div className="flex flex-col gap-3 w-full max-w-xs mx-auto items-center">
          {GOOGLE_CLIENT_ID ? (
            <div
              ref={googleBtnRef}
              className="animate-fade-in w-full overflow-hidden rounded-full"
              style={{ opacity: 0, colorScheme: 'light' }}
            />
          ) : (
            <button
              onClick={onLogin}
              style={{ opacity: 0 }}
              className="animate-fade-in flex items-center justify-center gap-3 w-full py-4 rounded-full bg-black text-white font-medium transition-all hover:opacity-80 active:scale-[0.98]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#ffffff"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#ffffff"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#ffffff"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#ffffff"/>
              </svg>
              <span>Войти через Google</span>
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-10 max-w-xs mx-auto leading-relaxed">
          Продолжая, вы соглашаетесь с правилами сервиса и политикой конфиденциальности
        </p>
      </div>
    </div>
  );
};

const Index = () => {
  const [screen, setScreen] = useState<Screen>('login');
  const [tab, setTab] = useState<Tab>('chats');
  const [activeChat, setActiveChat] = useState<number | null>(1);
  const [search, setSearch] = useState('');

  if (screen === 'login') return <LoginScreen onLogin={() => setScreen('app')} />;

  const filteredChats = CHATS.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const filteredContacts = CONTACTS.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const current = CHATS.find((c) => c.id === activeChat);

  return (
    <div className="min-h-screen bg-white flex text-black font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-[400px] border-r border-border flex flex-col h-screen">
        {/* Header */}
        <div className="px-5 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-5">
            <h1 className="font-display text-3xl font-bold tracking-tight">ЛСПА</h1>
            <button onClick={() => setScreen('login')} className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-black hover:text-white transition-colors">
              <Icon name="LogOut" size={18} />
            </button>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-secondary rounded-full">
            {(['chats', 'contacts'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${tab === t ? 'bg-black text-white' : 'text-muted-foreground hover:text-black'}`}
              >
                {t === 'chats' ? 'Чаты' : 'Контакты'}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative mt-3">
            <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск"
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-secondary text-sm outline-none focus:ring-1 focus:ring-black placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'chats' &&
            filteredChats.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveChat(c.id)}
                className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors border-b border-border/50 ${activeChat === c.id ? 'bg-secondary' : 'hover:bg-secondary/60'}`}
              >
                <Avatar initials={c.initials} online={c.online} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span className="font-medium truncate">{c.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">{c.time}</span>
                  </div>
                  <div className="flex justify-between items-center mt-0.5">
                    <span className="text-sm text-muted-foreground truncate">{c.last}</span>
                    {c.unread > 0 && (
                      <span className="ml-2 shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-black text-white text-xs flex items-center justify-center font-medium">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}

          {tab === 'contacts' &&
            filteredContacts.map((c) => (
              <button key={c.id} className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-secondary/60 transition-colors border-b border-border/50">
                <Avatar initials={c.initials} online={c.online} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{c.name}</div>
                  <div className="text-sm text-muted-foreground">{c.status}</div>
                </div>
                <Icon name="MessageCircle" size={18} className="text-muted-foreground" />
              </button>
            ))}
        </div>
      </aside>

      {/* Chat window */}
      <main className="hidden md:flex flex-1 flex-col h-screen bg-secondary/30">
        {current ? (
          <>
            <div className="px-6 py-4 border-b border-border bg-white flex items-center gap-3">
              <Avatar initials={current.initials} online={current.online} size="sm" />
              <div className="flex-1">
                <div className="font-medium">{current.name}</div>
                <div className="text-xs text-muted-foreground">{current.online ? 'в сети' : 'не в сети'}</div>
              </div>
              <button className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
                <Icon name="Phone" size={18} />
              </button>
              <button className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
                <Icon name="MoreVertical" size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
              {MESSAGES.map((m) => (
                <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${m.mine ? 'bg-black text-white rounded-br-md' : 'bg-white border border-border rounded-bl-md'}`}>
                    <p className="text-sm leading-relaxed">{m.text}</p>
                    <span className={`text-[10px] block mt-1 ${m.mine ? 'text-white/60 text-right' : 'text-muted-foreground'}`}>{m.time}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-border bg-white flex items-center gap-3">
              <button className="w-10 h-10 rounded-full hover:bg-secondary flex items-center justify-center transition-colors shrink-0">
                <Icon name="Paperclip" size={20} />
              </button>
              <input placeholder="Сообщение..." className="flex-1 px-4 py-2.5 rounded-full bg-secondary outline-none text-sm focus:ring-1 focus:ring-black" />
              <button className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-transform">
                <Icon name="Send" size={18} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">Выберите чат</div>
        )}
      </main>
    </div>
  );
};

export default Index;