import { createContext, useContext, type ReactNode } from 'react'
import { brandToCss, defaultBrand, type BrandConfig } from './brand-config'

const BrandContext = createContext<BrandConfig>(defaultBrand)

export function BrandProvider({ brand, children }: { brand: BrandConfig; children: ReactNode }) {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
}

export function useBrand(): BrandConfig {
  return useContext(BrandContext)
}

/** Injeta os tokens da marca em :root. Vem depois do CSS global e, por não estar em @layer, o sobrescreve. */
export function BrandStyle({ brand }: { brand: BrandConfig }) {
  return <style id="brand-tokens" dangerouslySetInnerHTML={{ __html: brandToCss(brand) }} />
}
