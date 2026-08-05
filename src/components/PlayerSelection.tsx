import { Player, ConsumableItem, PREDEFINED_ITEMS, PredefinedItemName } from '../types';
import { PlusIcon, MinusIcon, XIcon } from 'lucide-react';
import * as Switch from '@radix-ui/react-switch';
import { useEffect, useState, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import * as Ariakit from '@ariakit/react';
import { NumericFormat } from 'react-number-format';
import { RollingText } from './ui/RollingText';

interface PlayerSelectionProps {
  players: Player[];
  onPlayerChange: (players: Player[]) => void;
  sessionStart: string;
  sessionEnd: string;
  onAddPlayer: () => void;
  onRemovePlayer: (playerIndex: number) => void;
}

export function PlayerSelection({ players, onPlayerChange, sessionStart, sessionEnd, onAddPlayer, onRemovePlayer }: PlayerSelectionProps) {
  const { t } = useLanguage();

  // Add effect to update full session players when session times change
  useEffect(() => {
    const updatedPlayers = players.map(player => ({
      ...player,
      startTime: player.isFullSession ? sessionStart : player.startTime,
      endTime: player.isFullSession ? sessionEnd : player.endTime
    }));
    onPlayerChange(updatedPlayers);
  }, [sessionStart, sessionEnd]);

  // Handler to update player name
  const handlePlayerNameChange = (index: number, newName: string) => {
    const newPlayers = [...players];
    newPlayers[index].name = newName;
    onPlayerChange(newPlayers);
  };

  const handlePlayerToggle = (index: number) => {
    const newPlayers = [...players];
    newPlayers[index].participated = !newPlayers[index].participated;
    if (newPlayers[index].participated) {
      newPlayers[index].isFullSession = true; // Set full session by default when participating
      newPlayers[index].startTime = sessionStart;
      newPlayers[index].endTime = sessionEnd;
    } else {
      newPlayers[index].isFullSession = false; // Reset when unparticipating
      newPlayers[index].startTime = '';
      newPlayers[index].endTime = '';
    }
    onPlayerChange(newPlayers);
  };

  const handleTimeChange = (index: number, field: 'startTime' | 'endTime', value: string) => {
    const newPlayers = [...players];
    newPlayers[index][field] = value;
    onPlayerChange(newPlayers);
  };

  const handleFullSessionToggle = (index: number) => {
    const newPlayers = [...players];
    newPlayers[index].isFullSession = !newPlayers[index].isFullSession;
    if (newPlayers[index].isFullSession) {
      newPlayers[index].startTime = sessionStart;
      newPlayers[index].endTime = sessionEnd;
    }
    onPlayerChange(newPlayers);
  };

  const addConsumable = (playerIndex: number) => {
    const newPlayers = [...players];
    const id = `item-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const defaultItem = PREDEFINED_ITEMS[0];
    const newConsumable: ConsumableItem = {
      id,
      name: defaultItem.name,
      quantity: 1,
      costPerUnit: defaultItem.costPerUnit
    };

    if (!newPlayers[playerIndex].consumables) {
      newPlayers[playerIndex].consumables = [];
    }
    newPlayers[playerIndex].consumables.push(newConsumable);
    onPlayerChange(newPlayers);
  };

  const updateConsumable = (
    playerIndex: number,
    consumableIndex: number,
    field: keyof ConsumableItem,
    value: string | number,
    additionalUpdates?: Partial<ConsumableItem>
  ) => {
    const newPlayers = [...players];
    const consumable = newPlayers[playerIndex].consumables[consumableIndex];
    
    switch(field) {
      case 'name':
        consumable.name = value as PredefinedItemName;
        break;
      case 'quantity':
      case 'costPerUnit':
        consumable[field] = value as number;
        break;
    }
    
    if (additionalUpdates) {
      Object.assign(consumable, additionalUpdates);
    }
    
    onPlayerChange(newPlayers);
  };

  const removeConsumable = (playerIndex: number, consumableIndex: number) => {
    const newPlayers = [...players];
    newPlayers[playerIndex].consumables.splice(consumableIndex, 1);
    onPlayerChange(newPlayers);
  };

  const [editingPlayerIndex, setEditingPlayerIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // State for editing item name - commented out as it's no longer used
  // const [editingItemName, setEditingItemName] = useState<{ playerIndex: number; itemIndex: number } | null>(null);
  // const itemInputRef = useRef<HTMLInputElement>(null);

  // Focus the input when it appears
  useEffect(() => {
    if (editingPlayerIndex !== null && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingPlayerIndex]);

  // Commented out as it's no longer relevant
  // useEffect(() => {
  //   if (editingItemName && itemInputRef.current) {
  //     itemInputRef.current.focus();
  //   }
  // }, [editingItemName]);

  return (
    <section aria-labelledby="players-heading" className="rounded-none border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h2 id="players-heading" className="text-xl font-bold text-slate-950 dark:text-white">{t.players}</h2>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {players.map((player, index) => (
          <div
            key={player.id || index}
            className={`group rounded-none border transition-colors ${player.participated ? 'border-blue-300 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/25' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40'}`}
          >
            <div className="flex min-h-12 items-center px-3 py-2">
              <input
                id={`player-${player.id}`}
                type="checkbox"
                checked={player.participated}
                onChange={() => handlePlayerToggle(index)}
                aria-label={`${t.accessibility.selectPlayer}: ${player.name}`}
                className="h-5 w-5 shrink-0 rounded-none border-slate-400 text-blue-700 focus:ring-blue-600 dark:border-slate-600 dark:bg-slate-900"
              />
              {editingPlayerIndex === index ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={player.name}
                  onChange={e => handlePlayerNameChange(index, e.target.value)}
                  onBlur={() => setEditingPlayerIndex(null)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') setEditingPlayerIndex(null);
                  }}
                  aria-label={`${t.accessibility.editPlayer}: ${player.name}`}
                  className="ml-2 min-w-0 flex-1 rounded-none border border-slate-300 bg-white px-2 py-1 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  style={{ maxWidth: 160 }}
                />
              ) : (
                <button
                  type="button"
                  className="ml-2 min-w-0 flex-1 truncate rounded-none px-1 py-1 text-left font-semibold text-slate-800 hover:text-blue-700 dark:text-slate-200 dark:hover:text-blue-300"
                  onClick={() => setEditingPlayerIndex(index)}
                  aria-label={`${t.accessibility.editPlayer}: ${player.name}`}
                >
                  {player.name}
                </button>
              )}
              <button
                type="button"
                onClick={() => onRemovePlayer(index)}
                className="ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-none text-slate-400 opacity-70 transition hover:bg-red-100 hover:text-red-700 active:scale-[0.98] sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 dark:hover:bg-red-950 dark:hover:text-red-300"
                aria-label={`${t.removePlayerButtonLabel}: ${player.name}`}
              >
                <XIcon className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {player.participated && (
              <div className="space-y-4 border-t border-blue-200 px-3 pb-4 pt-3 dark:border-blue-900">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t.fullSession}</span>
                  <div className="-m-2 flex min-h-11 min-w-11 items-center justify-center p-2">
                    <Switch.Root
                      checked={player.isFullSession}
                      onCheckedChange={() => handleFullSessionToggle(index)}
                      aria-label={`${t.fullSession}: ${player.name}`}
                      className="relative h-6 min-h-0 w-11 rounded-none bg-slate-300 transition-colors data-[state=checked]:bg-blue-700 dark:bg-slate-700"
                    >
                      <Switch.Thumb className="block h-4 w-4 translate-x-1 rounded-none bg-white shadow-sm transition-transform data-[state=checked]:translate-x-6" />
                    </Switch.Root>
                  </div>
                </div>

                {!player.isFullSession && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`player-start-${player.id}`} className="block text-sm font-medium text-slate-600 dark:text-slate-400">{t.startTime}</label>
                      <input
                        id={`player-start-${player.id}`}
                        type="time"
                        pattern="[0-9]{2}:[0-9]{2}"
                        value={player.startTime}
                        onChange={(e) => handleTimeChange(index, 'startTime', e.target.value)}
                        className="mt-1 block w-full rounded-none border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </div>
                    <div>
                      <label htmlFor={`player-end-${player.id}`} className="block text-sm font-medium text-slate-600 dark:text-slate-400">{t.endTime}</label>
                      <input
                        id={`player-end-${player.id}`}
                        type="time"
                        pattern="[0-9]{2}:[0-9]{2}"
                        value={player.endTime}
                        onChange={(e) => handleTimeChange(index, 'endTime', e.target.value)}
                        className="mt-1 block w-full rounded-none border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Additional Items Section */}
                <div className="space-y-2 w-full">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.additionalItems}</span>
                    <button
                      type="button"
                      onClick={() => addConsumable(index)}
                      aria-label={`${t.accessibility.addItem}: ${player.name}`}
                      className="flex h-9 w-9 items-center justify-center rounded-none text-blue-700 hover:bg-blue-100 active:scale-[0.98] dark:text-blue-300 dark:hover:bg-blue-950"
                    >
                      <PlusIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  
                  {player.consumables?.map((item, itemIndex) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-end w-full rounded-none bg-white p-2 dark:bg-slate-900">
                      <div className="col-span-12 sm:col-span-5">
                        <label htmlFor={`player-item-name-${item.id}`} className="block text-xs text-slate-600 dark:text-slate-400 mb-1">{t.item}</label>
                        <Ariakit.ComboboxProvider
                          value={item.name}
                          setValue={value => {
                            const costMap: Record<string, number> = {
                              "Coke": 30,
                              "Nước Suối": 20,
                              "Bò Húc": 30,
                              "Bánh Mì": 40,
                              "Mì Xào": 45,
                              "Trà Sữa": 30,
                              "Trà Chanh": 25
                            };
                            const newCost = costMap[value] || item.costPerUnit;
                            updateConsumable(index, itemIndex, 'name', value, { costPerUnit: newCost });
                          }}
                        >
                          <Ariakit.Combobox
                            id={`player-item-name-${item.id}`}
                            aria-label={`${t.item}: ${player.name}`}
                            className="w-full rounded-none border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            placeholder="Select or type an item"
                          />
                          <Ariakit.ComboboxPopover
                            className="z-50 max-h-60 w-full overflow-auto rounded-none border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
                          >
                            {["Coke", "Nước Suối", "Bò Húc", "Bánh Mì", "Mì Xào", "Trà Sữa", "Trà Chanh"].map(option => (
                              <Ariakit.ComboboxItem
                                key={option}
                                value={option}
                                className="cursor-pointer p-2 text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
                              >
                                {option}
                              </Ariakit.ComboboxItem>
                            ))}
                          </Ariakit.ComboboxPopover>
                        </Ariakit.ComboboxProvider>
                      </div>

                      <div className="col-span-5 sm:col-span-3">
                        <label htmlFor={`player-item-quantity-${item.id}`} className="block text-xs text-slate-600 dark:text-slate-400 mb-1">{t.quantity}</label>
                        <NumericFormat
                          id={`player-item-quantity-${item.id}`}
                          value={item.quantity}
                          onValueChange={(values: { value: string }) => updateConsumable(index, itemIndex, 'quantity', values.value ? parseInt(values.value) : 1)}
                          allowNegative={false}
                          decimalScale={0}
                          aria-label={`${t.quantity}: ${item.name}`}
                          className="w-full rounded-none border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          customInput={props => <input {...props} type="number" min="1" />}
                        />
                      </div>

                      <div className="col-span-5 sm:col-span-3">
                        <label htmlFor={`player-item-cost-${item.id}`} className="block text-xs text-slate-600 dark:text-slate-400 mb-1">{t.cost}</label>
                        <NumericFormat
                          id={`player-item-cost-${item.id}`}
                          value={item.costPerUnit}
                          onValueChange={(values: { value: string }) => updateConsumable(index, itemIndex, 'costPerUnit', values.value ? parseInt(values.value) : 0)}
                          allowNegative={false}
                          decimalScale={0}
                          aria-label={`${t.cost}: ${item.name}`}
                          className="w-full rounded-none border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          customInput={props => <input {...props} type="number" min="0" />}
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => removeConsumable(index, itemIndex)}
                          aria-label={`${t.accessibility.removeItem}: ${item.name}`}
                          className="flex h-10 w-10 items-center justify-center rounded-none text-red-700 hover:bg-red-100 active:scale-[0.98] dark:text-red-300 dark:hover:bg-red-950"
                        >
                          <MinusIcon className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-start">
        <button
          type="button"
          onClick={onAddPlayer}
          className="rolling-text-trigger flex min-h-11 items-center gap-2 rounded-none border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
          aria-label={t.addPlayerButtonLabel}
        >
          <PlusIcon className="w-4 h-4" aria-hidden="true" />
          <RollingText>{t.addPlayerButton}</RollingText>
        </button>
      </div>
    </section>
  );
}
