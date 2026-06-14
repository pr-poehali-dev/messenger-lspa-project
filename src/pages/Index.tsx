import { useState } from 'react';
import Icon from '@/components/ui/icon';

type Screen = 'login' | 'app';
type Tab = 'chats' | 'contacts';

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
  const providers = [
    { name: 'Instagram', icon: 'Instagram' },
    { name: 'Telegram', icon: 'Send' },
    { name: 'Google', icon: 'Chrome' },
  ];
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      <div className="relative animate-scale-in text-center">
        <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-black flex items-center justify-center">
          <Icon name="MessageСircle" fallback="MessageCircle" size={40} className="text-white" />
        </div>
        <h1 className="font-display text-7xl font-bold tracking-tight text-black mb-3">ЛСПА</h1>
        <p className="text-muted-foreground mb-12 text-lg font-light">Сообщения без лишнего шума</p>

        <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
          {providers.map((p, i) => (
            <button
              key={p.name}
              onClick={onLogin}
              style={{ animationDelay: `${i * 80}ms`, opacity: 0 }}
              className="animate-fade-in group flex items-center justify-center gap-3 w-full py-4 rounded-full border border-black bg-white text-black font-medium transition-all hover:bg-black hover:text-white active:scale-[0.98]"
            >
              <Icon name={p.icon} size={20} />
              <span>Войти через {p.name}</span>
            </button>
          ))}
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
