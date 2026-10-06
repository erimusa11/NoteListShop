import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { ItemListKey } from '@/types/models';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface Category {
  /** The field on a list (trip) that holds this category's items. */
  key: ItemListKey;
  /** Tab id, also the key used in the reports. */
  section: string;
  label: string;
  /** Tab label with its own line break, when the automatic split at " & " does not fit. */
  tabLabel?: string;
  icon: IconName;
  activeIcon: IconName;
  color: string;
  showQuantity: boolean;
  /** "Gjithsej …" above the list. */
  totalLabel: string;
  addTitle: string;
  namePlaceholder?: string;
  /** When set, adding an item is a choice between these names instead of free text. */
  nameOptions?: string[];
  /** Heading above the choices while adding (default "Lloji"). */
  optionsLabel?: string;
  /**
   * Adds one more choice after `nameOptions` that lets you type any name. Those items are grouped under this label
   * in the totals, the filter and the report; without it, a name that is not a choice is grouped under "Të tjera".
   */
  otherOption?: string;
  /** Title of the report that splits this category's spending by `nameOptions`. */
  optionsReportTitle?: string;
  emptyText: string;
}

// Every category works the same way: its own list per shopping list, star to repeat it, priority, price, totals.
// To add one, add its key to `ItemListKey` and `ShoppingTrip` (types/models.ts) and an entry here.
export const CATEGORIES: Category[] = [
  {
    key: 'items',
    section: 'products',
    label: 'Produktet',
    icon: 'basket-outline',
    activeIcon: 'basket',
    color: '#E06A00',
    showQuantity: true,
    totalLabel: 'Gjithsej produktet',
    addTitle: 'Shto artikull',
    emptyText: 'Kjo listë nuk ka artikuj.',
  },
  {
    key: 'supplies',
    section: 'supplies',
    label: 'Detergjente & Extra',
    icon: 'sparkles-outline',
    activeIcon: 'sparkles',
    color: '#1F9E89',
    showQuantity: false,
    totalLabel: 'Gjithsej detergjente & extra',
    addTitle: 'Shto artikull',
    emptyText: 'Nuk ka ende asnjë artikull.',
  },
  {
    key: 'bills',
    section: 'bills',
    label: 'Faturat',
    icon: 'receipt-outline',
    activeIcon: 'receipt',
    color: '#3B6FD4',
    showQuantity: false,
    totalLabel: 'Gjithsej faturat',
    addTitle: 'Shto faturë',
    emptyText: 'Nuk ka ende asnjë faturë.',
  },
  {
    key: 'wishlist',
    section: 'wishlist',
    label: 'Dëshirat',
    icon: 'heart-outline',
    activeIcon: 'heart',
    color: '#C93D7A',
    showQuantity: false,
    totalLabel: 'Gjithsej dëshirat',
    addTitle: 'Shto dëshirë',
    emptyText: 'Lista e dëshirave është bosh.',
  },
  {
    key: 'clothes',
    section: 'clothes',
    label: 'Veshje & Rroba',
    tabLabel: 'Veshje &\nRroba',
    icon: 'shirt-outline',
    activeIcon: 'shirt',
    color: '#7A5C3E',
    showQuantity: false,
    totalLabel: 'Gjithsej veshje & rroba',
    addTitle: 'Shto veshje',
    namePlaceholder: 'P.sh. Xhaketë, Këpucë…',
    emptyText: 'Nuk ka ende asnjë veshje.',
  },
  // Its key stays `fuel` (it was once "Karburant & Makina") so the items saved under it keep showing here.
  {
    key: 'fuel',
    section: 'fuel',
    label: 'Makina & Shërbime',
    tabLabel: 'Makina\n& Shërbime',
    icon: 'car-outline',
    activeIcon: 'car',
    color: '#5F6B7A',
    showQuantity: false,
    totalLabel: 'Gjithsej makina & shërbime',
    addTitle: 'Shto shpenzim',
    namePlaceholder: 'P.sh. Servis, Sigurim, Taksa…',
    // Entries saved before the choice existed have free-text names (Servis, Sigurim…); they fall under "Tjetër".
    nameOptions: ['Kia Morning', 'Hyundai Tucson'],
    optionsLabel: 'Për cilën makinë',
    otherOption: 'Tjetër',
    optionsReportTitle: 'Shpenzimet sipas makinës',
    emptyText: 'Nuk ka ende asnjë shpenzim.',
  },
  {
    key: 'refuel',
    section: 'refuel',
    label: 'Karburant',
    icon: 'flame-outline',
    activeIcon: 'flame',
    color: '#A8322D',
    showQuantity: false,
    totalLabel: 'Gjithsej karburanti',
    addTitle: 'Shto karburant',
    nameOptions: ['Naftë', 'Gaz', 'Benzinë'],
    optionsReportTitle: 'Karburanti sipas llojit',
    emptyText: 'Nuk ka ende asnjë karburant.',
  },
  {
    key: 'outings',
    section: 'outings',
    label: 'Shetitje',
    icon: 'walk-outline',
    activeIcon: 'walk',
    color: '#1E6B3A',
    showQuantity: false,
    totalLabel: 'Gjithsej shetitje',
    addTitle: 'Shto shetitje',
    namePlaceholder: 'P.sh. Kinema, Kafe, Udhëtim…',
    emptyText: 'Nuk ka ende asnjë shetitje.',
  },
  {
    key: 'playstation',
    section: 'playstation',
    label: 'Playstation & Abonime',
    tabLabel: 'Playstation\n& Abonime',
    icon: 'game-controller-outline',
    activeIcon: 'game-controller',
    color: '#33415C',
    showQuantity: false,
    totalLabel: 'Gjithsej playstation & abonime',
    addTitle: 'Shto abonim',
    namePlaceholder: 'P.sh. PS Plus, Netflix, Lojë…',
    emptyText: 'Nuk ka ende asnjë abonim.',
  },
  {
    key: 'health',
    section: 'health',
    label: 'Shendeti & Vizita',
    tabLabel: 'Shendeti &\nVizita',
    icon: 'medkit-outline',
    activeIcon: 'medkit',
    color: '#6FA32B',
    showQuantity: false,
    totalLabel: 'Gjithsej shëndeti & vizita',
    addTitle: 'Shto shpenzim',
    namePlaceholder: 'P.sh. Mjek, Analiza, Dentist…',
    nameOptions: ['Drion', 'Alois', 'Alma', 'Eri'],
    optionsLabel: 'Për kë',
    otherOption: 'Tjetër',
    optionsReportTitle: 'Shendeti sipas personit',
    emptyText: 'Nuk ka ende asnjë shpenzim.',
  },
  {
    key: 'online',
    section: 'online',
    label: 'Blerje online',
    tabLabel: 'Blerje\nonline',
    icon: 'globe-outline',
    activeIcon: 'globe',
    color: '#16A5D8',
    showQuantity: false,
    totalLabel: 'Gjithsej blerje online',
    addTitle: 'Shto blerje',
    namePlaceholder: 'P.sh. Porosi në internet…',
    emptyText: 'Nuk ka ende asnjë blerje online.',
  },
  {
    key: 'kitchen',
    section: 'kitchen',
    label: 'Guzhina & Enë Guzhine',
    tabLabel: 'Guzhina &\nEnë Guzhine',
    icon: 'restaurant-outline',
    activeIcon: 'restaurant',
    color: '#D4A017',
    showQuantity: false,
    totalLabel: 'Gjithsej guzhina & enë guzhine',
    addTitle: 'Shto artikull',
    namePlaceholder: 'P.sh. Tenxhere, Pjata…',
    emptyText: 'Nuk ka ende asnjë artikull.',
  },
];

export const INCOME_COLOR = '#7C5CBF';
