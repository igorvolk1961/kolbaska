import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { catalogApi } from "../api";
import type { CurrencyRate } from "../types";

const CURRENCY_KEY = "kolbaska_currency";

interface CurrencyContextValue {
  rates: CurrencyRate[];
  currency: string;
  setCurrency: (code: string) => void;
  format: (amountBase: number) => string;
  convert: (amountBase: number) => number;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [currency, setCurrencyState] = useState(localStorage.getItem(CURRENCY_KEY) ?? "RUB");

  useEffect(() => {
    catalogApi
      .currency()
      .then(({ data }) => setRates(data))
      .catch(() => setRates([{ code: "RUB", symbol: "₽", rate_to_base: 1 }]));
  }, []);

  const setCurrency = useCallback((code: string) => {
    localStorage.setItem(CURRENCY_KEY, code);
    setCurrencyState(code);
  }, []);

  const active = rates.find((rate) => rate.code === currency) ?? rates[0];

  const convert = useCallback(
    (amountBase: number) => (active ? amountBase * active.rate_to_base : amountBase),
    [active],
  );

  const format = useCallback(
    (amountBase: number) => {
      const value = active ? amountBase * active.rate_to_base : amountBase;
      const symbol = active?.symbol ?? "₽";
      return `${value.toLocaleString("ru-RU", {
        minimumFractionDigits: 0,
        maximumFractionDigits: value < 100 ? 2 : 0,
      })} ${symbol}`;
    },
    [active],
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({ rates, currency, setCurrency, format, convert }),
    [rates, currency, setCurrency, format, convert],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("useCurrency must be used within CurrencyProvider");
  return context;
}
