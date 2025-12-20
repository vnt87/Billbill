import { useState, useEffect, useRef } from 'react';
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column - Inputs */}
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.totalAmount}
            </label>
            <input
              ref={totalAmountInputRef}
              type="number"
              min="0"
              step="1"
              value={totalAmountInput}
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
                if (billData.totalAmount === 0 && e.target.value === '0') {
                  setTotalAmountInput('');
                }
                e.target.placeholder = '';
              }}
              onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                const parsed = parseFloat(totalAmountInput);
                if (isNaN(parsed) || parsed < 0) {
                  setTotalAmountInput('0');
                  setBillData({ ...billData, totalAmount: 0 });
                } else {
                  setTotalAmountInput(parsed.toString());
                  setBillData({ ...billData, totalAmount: parsed });
                }
                e.target.placeholder = t.placeholder.totalAmount;
              }}
              className="w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t.placeholder.totalAmount}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t.sessionStart}
              </label>
                <input
                  type="time"
                  step="60"
                  pattern="[0-9]{2}:[0-9]{2}"
                  value={billData.sessionStart}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const newStart = e.target.value;
                  if (billData.sessionEnd && newStart > billData.sessionEnd) {
                    setBillData({
                      ...billData,
                      sessionStart: billData.sessionEnd
                    });
                  } else {
                    setBillData({
                      ...billData,
                      sessionStart: newStart
                    });
                  }
                }}
                className="w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t.sessionEnd}
              </label>
                <input
                  type="time"
                  step="60"
                  pattern="[0-9]{2}:[0-9]{2}"
                  value={billData.sessionEnd}
                min={billData.sessionStart || undefined}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const newEnd = e.target.value;
                  if (billData.sessionStart && newEnd < billData.sessionStart) {
                    setBillData({
                      ...billData,
                      sessionEnd: billData.sessionStart
                    });
                  } else {
                    setBillData({
                      ...billData,
                      sessionEnd: newEnd
                    });
                  }
                }}
                className="w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
        </div>

        <PlayerSelection
          players={billData.players}
          onPlayerChange={(players) => setBillData({ ...billData, players })}
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
      <div className="lg:col-span-4">
        <BillSummary data={billData} sharedItems={sharedItems} />
      </div>
    </div>
  );
}
