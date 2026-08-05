import { ConsumableItem, Player } from '../types';
import * as Checkbox from '@radix-ui/react-checkbox';
import * as Select from '@radix-ui/react-select';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

interface ConsumableItemsProps {
  items: ConsumableItem[];
  players: Player[];
  onItemsChange: (items: ConsumableItem[]) => void;
}

export function ConsumableItems({ items, players, onItemsChange }: ConsumableItemsProps) {
  const handleSelectionChange = (index: number) => {
    const newItems = [...items];
    newItems[index].selected = !newItems[index].selected;
    onItemsChange(newItems);
  };

  const handleValueChange = (
    index: number,
    field: 'quantity' | 'costPerUnit' | 'assignedPlayer',
    value: number | string
  ) => {
    const newItems = [...items];
    const item = newItems[index];
    
    switch(field) {
      case 'quantity':
      case 'costPerUnit':
        item[field] = value as number;
        break;
      case 'assignedPlayer':
        item.assignedPlayer = value as string;
        break;
    }
    onItemsChange(newItems);
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-slate-700 dark:text-slate-300">Additional Items</h3>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.name} className="flex flex-col space-y-2 p-3 bg-white dark:bg-slate-800 rounded-none border dark:border-slate-700">
            <div className="flex items-center">
              <Checkbox.Root
                checked={item.selected}
                onCheckedChange={() => handleSelectionChange(index)}
                className="h-4 w-4 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-none flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-600"
              >
                <Checkbox.Indicator>
                  <CheckIcon className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <span className="ml-2 text-slate-700 dark:text-slate-300">{item.name}</span>
            </div>
            {item.selected && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                  <div className="space-y-1">
                    <label className="block text-sm text-slate-600 dark:text-slate-400">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleValueChange(index, 'quantity', parseInt(e.target.value))}
                      className="border rounded-none p-2 text-sm w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      placeholder="Quantity"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm text-slate-600 dark:text-slate-400">Cost per Unit (k)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={item.costPerUnit}
                      onChange={(e) => handleValueChange(index, 'costPerUnit', parseFloat(e.target.value))}
                      className="border rounded-none p-2 text-sm w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      placeholder="Cost per unit"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm text-slate-600 dark:text-slate-400">Assigned To</label>
                  <Select.Root
                    value={item.assignedPlayer}
                    onValueChange={(value) => handleValueChange(index, 'assignedPlayer', value)}
                  >
                    <Select.Trigger className="inline-flex items-center justify-between w-full px-3 py-2 text-sm border rounded-none dark:bg-slate-700 dark:border-slate-600 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-600">
                      <Select.Value />
                      <Select.Icon>
                        <ChevronDownIcon className="h-4 w-4 dark:text-slate-400" />
                      </Select.Icon>
                    </Select.Trigger>
                    
                    <Select.Portal>
                      <Select.Content className="bg-white dark:bg-slate-800 rounded-none shadow-lg border dark:border-slate-700 z-50">
                        <Select.ScrollUpButton className="flex items-center justify-center h-6 bg-white dark:bg-slate-800 cursor-default">
                          <ChevronUpIcon className="dark:text-slate-400" />
                        </Select.ScrollUpButton>
                        
                        <Select.Viewport className="p-1">
                          <Select.Item value="ALL" className="relative flex items-center px-8 py-2 text-sm rounded-none select-none hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-white cursor-default">
                            <Select.ItemText>All Players</Select.ItemText>
                            <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                              <CheckIcon className="w-4 h-4" />
                            </Select.ItemIndicator>
                          </Select.Item>
                          
                          {players.map(player => (
                            <Select.Item 
                              key={player.name} 
                              value={player.name}
                              className="relative flex items-center px-8 py-2 text-sm rounded-none select-none hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-white cursor-default"
                            >
                              <Select.ItemText>{player.name}</Select.ItemText>
                              <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                                <CheckIcon className="w-4 h-4" />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                        
                        <Select.ScrollDownButton className="flex items-center justify-center h-6 bg-white dark:bg-slate-800 cursor-default">
                          <ChevronDownIcon className="dark:text-slate-400" />
                        </Select.ScrollDownButton>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
