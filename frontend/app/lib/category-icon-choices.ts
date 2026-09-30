import {
  Banknote,
  BookOpen,
  Briefcase,
  Car,
  Cloud,
  Coffee,
  CreditCard,
  Dumbbell,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  Heart,
  Home,
  Landmark,
  type LucideIcon,
  Monitor,
  Music,
  PawPrint,
  PiggyBank,
  Plane,
  ReceiptText,
  Repeat,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Stethoscope,
  Tag,
  TrendingUp,
  Utensils,
  Wallet,
  Wrench,
  Zap,
} from '@/app/components/icons';

/**
 * Icons offered in the category editor. `value` is what the category row stores
 * (legacy `mdi:*` names), so existing categories keep their choice.
 */
export const CATEGORY_ICON_CHOICES: ReadonlyArray<{ value: string; Icon: LucideIcon }> = [
  { value: 'mdi:home', Icon: Home },
  { value: 'mdi:food', Icon: Utensils },
  { value: 'mdi:coffee', Icon: Coffee },
  { value: 'mdi:cart', Icon: ShoppingCart },
  { value: 'mdi:shopping', Icon: ShoppingBag },
  { value: 'mdi:car', Icon: Car },
  { value: 'mdi:gas-station', Icon: Fuel },
  { value: 'mdi:airplane', Icon: Plane },
  { value: 'mdi:medical-bag', Icon: Stethoscope },
  { value: 'mdi:dumbbell', Icon: Dumbbell },
  { value: 'mdi:school', Icon: GraduationCap },
  { value: 'mdi:book', Icon: BookOpen },
  { value: 'mdi:gift', Icon: Gift },
  { value: 'mdi:gamepad-variant', Icon: Gamepad2 },
  { value: 'mdi:music', Icon: Music },
  { value: 'mdi:paw', Icon: PawPrint },
  { value: 'mdi:monitor', Icon: Monitor },
  { value: 'mdi:cloud', Icon: Cloud },
  { value: 'mdi:autorenew', Icon: Repeat },
  { value: 'mdi:phone', Icon: Smartphone },
  { value: 'mdi:lightning-bolt', Icon: Zap },
  { value: 'mdi:wrench', Icon: Wrench },
  { value: 'mdi:shield-check', Icon: ShieldCheck },
  { value: 'mdi:receipt', Icon: ReceiptText },
  { value: 'mdi:wallet', Icon: Wallet },
  { value: 'mdi:cash', Icon: Banknote },
  { value: 'mdi:bank', Icon: Landmark },
  { value: 'mdi:credit-card', Icon: CreditCard },
  { value: 'mdi:piggy-bank', Icon: PiggyBank },
  { value: 'mdi:chart-line', Icon: TrendingUp },
  { value: 'mdi:briefcase', Icon: Briefcase },
  { value: 'mdi:heart', Icon: Heart },
  { value: 'mdi:tag', Icon: Tag },
];

const ICON_BY_VALUE = new Map(CATEGORY_ICON_CHOICES.map(choice => [choice.value, choice.Icon]));

/** Icon for a stored `mdi:*` value; unknown values fall back to a tag. */
export function categoryIconFor(value?: string | null): LucideIcon {
  return (value && ICON_BY_VALUE.get(value)) || Tag;
}
