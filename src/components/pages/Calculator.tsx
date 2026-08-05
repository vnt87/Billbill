import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { PlayerSelection } from '../PlayerSelection';
import { BillSummary } from '../BillSummary';
import { SharedItems } from '../SharedItems';
import { Player, BillData, ConsumableItem } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

let playerIdCounter = 1;
const initialPlayers: Player[] = [
  "Nam", "Chung", "Huy", "Tính", "Hiếu", "Tuấn", "Thủy", "Khánh", "Long", "Nam Hoàng"
].map(name => ({
  id: `player-${playerIdCounter++}`,
  name,
  participated: false,
  startTime: '',
  endTime: '',
  consumables: [],
  isFullSession: true
}));

export function Calculator() {
  const { t } = useLanguage();
  const location = useLocation();
  const [billData, setBillData] = useState<BillData>(() => {
    if (location.state?.initialData) {
      return location.state.initialData;
    }
    return {
      totalAmount: 0,
      sessionStart: '',
      sessionEnd: '',
      players: initialPlayers
    };
  });
  const [sharedItems, setSharedItems] = useState<ConsumableItem[]>([]);

  // Track guest player count for unique default names
  const [guestPlayerCount, setGuestPlayerCount] = useState(1);

  // Handler to add a new guest player
  const handleAddPlayer = () => {
    const guestName = `Guest ${guestPlayerCount}`;
    const newPlayer: Player = {
      id: `player-${playerIdCounter++}`,
      name: guestName,
      participated: false,
      startTime: '',
      endTime: '',
      consumables: [],
      isFullSession: true
    };
    setBillData(prev => ({
      ...prev,
      players: [...prev.players, newPlayer]
    }));
    setGuestPlayerCount(count => count + 1);
  };

  // Handler to remove a player by index
  const handleRemovePlayer = (playerIndex: number) => {
    setBillData(prev => ({
      ...prev,
      players: prev.players.filter((_, idx) => idx !== playerIndex)
    }));
  };

  const [totalAmountInput, setTotalAmountInput] = useState(billData.totalAmount.toString());
  const totalAmountInputRef = useRef<HTMLInputElement>(null);
  const [touched, setTouched] = useState({ amount: false, session: false, participants: false });

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (touched.amount && billData.totalAmount <= 0) errors.push(t.validation.amountRequired);
    if (touched.session && (!billData.sessionStart || !billData.sessionEnd)) errors.push(t.validation.sessionTimesRequired);
    if (touched.session && billData.sessionStart && billData.sessionEnd && billData.sessionStart === billData.sessionEnd) {
      errors.push(t.validation.sessionTimeInvalid);
    }
    if (touched.participants && !billData.players.some(player => player.participated)) errors.push(t.validation.participantsRequired);
    return errors;
  }, [billData.totalAmount, billData.sessionStart, billData.sessionEnd, billData.players, t, touched]);

  const isFormValid = billData.totalAmount > 0 &&
    Boolean(billData.sessionStart && billData.sessionEnd) &&
    billData.sessionStart !== billData.sessionEnd &&
    billData.players.some(player => player.participated);

  // Synchronize totalAmountInput with billData.totalAmount when it changes from outside
  useEffect(() => {
    if (document.activeElement !== totalAmountInputRef.current) {
      setTotalAmountInput(billData.totalAmount.toString());
    }
  }, [billData.totalAmount]);

  // Update all participating players' times when session times change
  useEffect(() => {
    if (billData.sessionStart || billData.sessionEnd) {
      const updatedPlayers = billData.players.map((player: Player) => ({
        ...player,
        startTime: player.participated ? (player.startTime || billData.sessionStart) : player.startTime,
        endTime: player.participated ? (player.endTime || billData.sessionEnd) : player.endTime,
      }));
      setBillData((prev: BillData) => ({ ...prev, players: updatedPlayers }));
    }
  }, [billData.sessionStart, billData.sessionEnd]);

  return (
    <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column - Inputs */}
      <div className="lg:col-span-8 space-y-6">
        <section aria-labelledby="session-heading" className="rounded-none border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900 space-y-5">
          <div>
            <h1 id="session-heading" className="text-xl font-bold text-slate-950 dark:text-white">{t.sections.session}</h1>
          </div>
          <div>
            <label htmlFor="total-amount" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.totalAmount}
            </label>
            <div className="relative">
              <input
                id="total-amount"
                ref={totalAmountInputRef}
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={totalAmountInput}
                aria-invalid={touched.amount && billData.totalAmount <= 0}
                aria-describedby={touched.amount && billData.totalAmount <= 0 ? 'amount-error' : undefined}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = e.target.value;
                  setTotalAmountInput(val);
                  const parsed = parseFloat(val);
                  if (!isNaN(parsed) && parsed >= 0) {
                    setBillData({ ...billData, totalAmount: parsed });
                  } else if (val === '') {
                    setBillData({ ...billData, totalAmount: 0 });
                  }
                }}
                onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
                  if (billData.totalAmount === 0 && e.target.value === '0') setTotalAmountInput('');
                }}
                onBlur={() => {
                  setTouched(previous => ({ ...previous, amount: true }));
                  const parsed = parseFloat(totalAmountInput);
                  if (isNaN(parsed) || parsed < 0) {
                    setTotalAmountInput('0');
                    setBillData({ ...billData, totalAmount: 0 });
                  } else {
                    setTotalAmountInput(parsed.toString());
                    setBillData({ ...billData, totalAmount: parsed });
                  }
                }}
                className="w-full rounded-none border border-slate-300 bg-white px-3 py-2.5 pr-12 text-lg font-semibold text-slate-950 outline-none transition focus:border-blue-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder={t.placeholder.totalAmount}
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center font-semibold text-slate-500 dark:text-slate-400">k</span>
            </div>
            {touched.amount && billData.totalAmount <= 0 && (
              <p id="amount-error" className="mt-1.5 text-sm font-medium text-red-700 dark:text-red-400">{t.validation.amountRequired}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="session-start" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.sessionStart}
              </label>
                <input
                  id="session-start"
                  type="time"
                  step="60"
                  pattern="[0-9]{2}:[0-9]{2}"
                  value={billData.sessionStart}
                onChange={(e) => setBillData({ ...billData, sessionStart: e.target.value })}
                onBlur={() => setTouched(previous => ({ ...previous, session: true }))}
                className="w-full rounded-none border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="session-end" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.sessionEnd}
              </label>
                <input
                  id="session-end"
                  type="time"
                  step="60"
                  pattern="[0-9]{2}:[0-9]{2}"
                  value={billData.sessionEnd}
                onChange={(e) => setBillData({ ...billData, sessionEnd: e.target.value })}
                onBlur={() => setTouched(previous => ({ ...previous, session: true }))}
                className="w-full rounded-none border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>
          {touched.session && (!billData.sessionStart || !billData.sessionEnd) && (
            <p className="text-sm font-medium text-red-700 dark:text-red-400">{t.validation.sessionTimesRequired}</p>
          )}
          {touched.session && billData.sessionStart && billData.sessionEnd && billData.sessionStart === billData.sessionEnd && (
            <p className="text-sm font-medium text-red-700 dark:text-red-400">{t.validation.sessionTimeInvalid}</p>
          )}
        </section>

        <PlayerSelection
          players={billData.players}
          onPlayerChange={(players) => {
            setBillData(previous => {
              if (JSON.stringify(previous.players) !== JSON.stringify(players)) {
                setTouched(touchedState => ({ ...touchedState, participants: true }));
              }
              return { ...previous, players };
            });
          }}
          sessionStart={billData.sessionStart}
          sessionEnd={billData.sessionEnd}
          onAddPlayer={handleAddPlayer}
          onRemovePlayer={handleRemovePlayer}
        />
        <SharedItems
          items={sharedItems}
          onItemsChange={setSharedItems}
        />
      </div>

      {/* Right Column - Summary */}
      <div className="lg:col-span-4 lg:relative">
        <BillSummary data={billData} sharedItems={sharedItems} validationErrors={validationErrors} isValid={isFormValid} />
      </div>
    </main>
  );
}
