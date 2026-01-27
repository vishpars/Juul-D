
import React, { useMemo } from 'react';
import { ShoppingBag, AlertCircle } from 'lucide-react';

const MARKET_PHRASES = [
    "Торговец ушел за товаром...",
    "Караван ограблен бандитами...",
    "Приходите вчера...",
    "Только пыль на полках...",
    "Учет переучет...",
    "Товар задержан на таможне...",
    "Продавец спит, не будить...",
    "Все продано...",
    "Рынок закрыт на карантин...",
    "Дракон съел все запасы..."
];

const MarketPage: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
    
    const randomPhrase = useMemo(() => {
        return MARKET_PHRASES[Math.floor(Math.random() * MARKET_PHRASES.length)];
    }, []);

    return (
        <div className="h-full flex flex-col bg-[#050b14] overflow-hidden relative items-center justify-center">
            {/* // здесь задний фон (Placeholder for future BG) */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4c1d95 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

            <div className="flex flex-col items-center gap-6 p-8 border-2 border-dashed border-slate-700 rounded-xl bg-slate-900/50 backdrop-blur-sm max-w-md text-center">
                <div className="p-4 bg-amber-900/20 rounded-full border border-amber-600/30 text-amber-500">
                    <ShoppingBag size={48} />
                </div>
                
                <div>
                    <h2 className="text-2xl font-fantasy font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-600 tracking-widest uppercase mb-2">
                        Рынок
                    </h2>
                    <p className="text-slate-400 font-serif italic text-lg">
                        "{randomPhrase}"
                    </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-950 px-3 py-1 rounded border border-slate-800">
                    <AlertCircle size={12} />
                    <span>Раздел находится в разработке</span>
                </div>
            </div>
        </div>
    );
};

export default MarketPage;
