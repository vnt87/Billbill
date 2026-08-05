import { ConsumableItem, PredefinedItemName } from '../types';
import { PlusIcon, MinusIcon, InfoIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import * as Ariakit from '@ariakit/react';
import { NumericFormat } from 'react-number-format';
import { RollingText } from './ui/RollingText';

interface SharedItemsProps {
  items: ConsumableItem[];
  onItemsChange: (items: ConsumableItem[]) => void;
}

export function SharedItems({ items, onItemsChange }: SharedItemsProps) {
  const { t } = useLanguage();

  const addSharedItem = () => {
    const id = `shared-item-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const newItem: ConsumableItem = {
      id,
      name: "Nước Suối",
      quantity: 1,
      costPerUnit: 20
    };
    onItemsChange([...items, newItem]);
  };

  const updateSharedItem = (
    index: number,
    field: keyof ConsumableItem,
    value: string | number,
    additionalUpdates?: Partial<ConsumableItem>
  ) => {
    const newItems = [...items];
    const item = newItems[index];
    
    switch(field) {
      case 'name':
        item.name = value as PredefinedItemName;
        break;
      case 'quantity':
      case 'costPerUnit':
        item[field] = value as number;
        break;
    }
    
    if (additionalUpdates) {
      Object.assign(item, additionalUpdates);
    }
    
    onItemsChange(newItems);
  };

  const removeSharedItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    onItemsChange(newItems);
  };

  return (
    <section aria-labelledby="shared-items-heading" className="rounded-none border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900 space-y-4">
      <div>
        <div className="flex items-center">
          <h2 id="shared-items-heading" className="text-xl font-bold text-slate-950 dark:text-white">{t.sharedItems}</h2>
          <div className="relative ml-2 group">
            <button
              type="button"
              aria-label={t.accessibility.sharedItemsInfo}
              aria-describedby="shared-items-tooltip"
              className="flex h-9 w-9 items-center justify-center rounded-none text-slate-500 hover:bg-slate-100 hover:text-blue-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-300"
            >
              <InfoIcon className="h-4 w-4" aria-hidden="true" />
            </button>
            <div id="shared-items-tooltip" role="tooltip" className="pointer-events-none absolute left-1/2 top-0 z-50 -mt-2 w-64 -translate-x-1/2 -translate-y-full rounded-none border border-slate-200 bg-white p-3 text-sm text-slate-800 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {t.sharedItemsTooltip}
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-2 w-full">
        {items.map((item, index) => (
          <div key={item.id} className="grid grid-cols-12 gap-2 items-end w-full rounded-none bg-slate-50 p-2 dark:bg-slate-950/50">
            <div className="col-span-12 sm:col-span-5">
              <label htmlFor={`shared-item-name-${item.id}`} className="block text-xs text-slate-600 dark:text-slate-400 mb-1">{t.item}</label>
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
                  updateSharedItem(index, 'name', value, { costPerUnit: newCost });
                }}
              >
                <Ariakit.Combobox
                  id={`shared-item-name-${item.id}`}
                  aria-label={t.item}
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
              <label htmlFor={`shared-item-quantity-${item.id}`} className="block text-xs text-slate-600 dark:text-slate-400 mb-1">{t.quantity}</label>
              <NumericFormat
                id={`shared-item-quantity-${item.id}`}
                value={item.quantity}
                onValueChange={(values: { value: string }) => updateSharedItem(index, 'quantity', values.value ? parseInt(values.value) : 1)}
                allowNegative={false}
                decimalScale={0}
                aria-label={`${t.quantity}: ${item.name}`}
                className="w-full rounded-none border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                customInput={props => <input {...props} type="number" min="1" />}
              />
            </div>

            <div className="col-span-5 sm:col-span-3">
              <label htmlFor={`shared-item-cost-${item.id}`} className="block text-xs text-slate-600 dark:text-slate-400 mb-1">{t.cost}</label>
              <NumericFormat
                id={`shared-item-cost-${item.id}`}
                value={item.costPerUnit}
                onValueChange={(values: { value: string }) => updateSharedItem(index, 'costPerUnit', values.value ? parseInt(values.value) : 0)}
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
                onClick={() => removeSharedItem(index)}
                aria-label={`${t.accessibility.removeItem}: ${item.name}`}
                className="flex h-10 w-10 items-center justify-center rounded-none text-red-700 hover:bg-red-100 active:scale-[0.98] dark:text-red-300 dark:hover:bg-red-950"
              >
                <MinusIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-start">
        <button
          type="button"
          onClick={addSharedItem}
          className="rolling-text-trigger flex min-h-11 items-center gap-2 rounded-none border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
          aria-label={t.addSharedItemButtonLabel}
        >
          <PlusIcon className="w-4 h-4" aria-hidden="true" />
          <RollingText>{t.addSharedItemButton}</RollingText>
        </button>
      </div>
    </section>
  );
}
