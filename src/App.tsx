import { useState, useEffect } from 'react';
import './index.css';
import { PlayerSelection } from './components/PlayerSelection';
import { ConsumableItems } from './components/ConsumableItems';
import { BillSummary } from './components/BillSummary';
import { Player, ConsumableItem, BillData } from './types';
import { Sun, Moon, Heart } from 'lucide-react';

const initialPlayers: Player[] = [
  "Nam", "Chung", "Huy", "Tinh", "Hieu", "Tuan"
].map(name => ({
  name,
  participated: false,
  startTime: '',
  endTime: ''
}));

const initialConsumables: ConsumableItem[] = [
  "Coke", "Bread", "Water", "Noodle"
].map(name => ({
  name,
  selected: false,
  quantity: 1,
  costPerUnit: 0,
  assignedPlayer: 'ALL'
}));

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('darkMode');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return savedMode ? savedMode === 'true' : prefersDark;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);

  const [billData, setBillData] = useState<BillData>({
    totalAmount: 0,
    sessionStart: '',
    sessionEnd: '',
    players: initialPlayers,
    consumables: initialConsumables
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);

  // Update all participating players' times when session times change
  useEffect(() => {
    if (billData.sessionStart || billData.sessionEnd) {
      const updatedPlayers = billData.players.map(player => ({
        ...player,
        startTime: player.participated ? (player.startTime || billData.sessionStart) : player.startTime,
        endTime: player.participated ? (player.endTime || billData.sessionEnd) : player.endTime,
      }));
      setBillData(prev => ({ ...prev, players: updatedPlayers }));
    }
  }, [billData.sessionStart, billData.sessionEnd]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 flex-grow">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bill Splitter</h1>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column - Inputs */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Total Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={billData.totalAmount}
                  onChange={(e) => setBillData({
                    ...billData,
                    totalAmount: parseFloat(e.target.value) || 0
                  })}
                  className="w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter total amount"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Session Start
                  </label>
                  <input
                    type="time"
                    step="60"
                    value={billData.sessionStart}
                    onChange={(e) => setBillData({
                      ...billData,
                      sessionStart: e.target.value
                    })}
                    className="w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Session End
                  </label>
                  <input
                    type="time"
                    step="60"
                    value={billData.sessionEnd}
                    onChange={(e) => setBillData({
                      ...billData,
                      sessionEnd: e.target.value
                    })}
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
            />

            <ConsumableItems
              items={billData.consumables}
              onItemsChange={(consumables) => setBillData({ ...billData, consumables })}
              players={billData.players.filter(p => p.participated)}
            />
          </div>

          {/* Right Column - Summary */}
          <div>
            <BillSummary data={billData} />
          </div>
        </div>
      </div>
      <footer className="mt-8 py-4 text-center text-xs text-gray-500 dark:text-gray-400">
        Crafted with <Heart size={12} className="inline text-red-500" /> by Nash Billiard Club
      </footer>
    </div>
  );
}

export default App;