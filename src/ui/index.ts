// API pública do design system (T05). Telas de negócio importam daqui, nunca de arquivos internos.
export { BrandProvider, BrandStyle, useBrand } from './brand/BrandProvider'
export {
  BrandConfigError,
  brandToCss,
  brandToCssVars,
  defaultBrand,
  getBrand,
  resetBrand,
  setBrand,
} from './brand/brand-config'
export type { BrandColors, BrandConfig, WelcomeScreenConfig } from './brand/brand-config'

export { Badge, ICONE_DO_TOM } from './components/Badge'
export type { Tone } from './components/Badge'
export { Button } from './components/Button'
export type { ButtonProps, ButtonVariant } from './components/Button'
export { Card } from './components/Card'
export { Checkbox } from './components/Checkbox'
export { ConfirmSheet } from './components/ConfirmSheet'
export { DateStrip } from './components/DateStrip'
export type { DateStripDay } from './components/DateStrip'
export { Icon, ICON_NAMES } from './components/Icon'
export type { IconName } from './components/Icon'
export { Input } from './components/Input'
export { DateTimeText, MoneyText } from './components/format'
export type { FormatoData } from './components/format-data'
export { OtpInput } from './components/OtpInput'
export { PhoneInput } from './components/PhoneInput'
export { Select } from './components/Select'
export type { SelectOption } from './components/Select'
export {
  AccessDenied,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PendingExternal,
} from './components/states'
export { Filters, Table } from './components/Table'
export type { TableColumn } from './components/Table'
export { TimeSlotGrid } from './components/TimeSlotGrid'
export type { TimeSlot } from './components/TimeSlotGrid'
export { ToastProvider, useToast } from './components/Toast'

export {
  AdminShell,
  ClientShell,
  DesktopOnlyNotice,
  PublicShell,
  StaffShell,
} from './layouts/Shells'
export { PlaceholderScreen } from './layouts/PlaceholderScreen'

export { MutationStatus } from './mutation/MutationStatus'
export type { ConflictAlternative } from './mutation/MutationStatus'
export { MutationController, fieldErrorsOf, networkError } from './mutation/mutation-controller'
export type { MutationMeta, MutationOptions, MutationState } from './mutation/mutation-controller'
export { useMutation } from './mutation/useMutation'
export type { UseMutation } from './mutation/useMutation'

export { decideAccess, homeOf, loginHref, safeDestination } from './navigation/access'
export type { AccessDecision, Area } from './navigation/access'
export { MENU_ADMIN, TABS_CLIENTE, TABS_PUBLICO, isStaff, staffTabs } from './navigation/tabs'
export type { NavItem } from './navigation/tabs'
export { setNotificationCount, useNotificationCount } from './notifications/notification-count'

export {
  ensureUiSession,
  invalidateUiSession,
  setUiSessionSource,
  useUiSession,
} from './session/ui-session'
export type { UiSession, UiSessionSnapshot, UiSessionSource } from './session/ui-session'

export { WelcomeCarousel } from './welcome/WelcomeCarousel'
export type { WelcomeExit } from './welcome/WelcomeCarousel'
export { WelcomeGate } from './welcome/WelcomeGate'
export { markWelcomeSeen, readSeenWelcomeVersion, shouldShowWelcome } from './welcome/welcome-rules'
