"use client";

import { Bitcoin, ChartNoAxesCombined, CircleDollarSign, Coins, DollarSign, Euro, RefreshCw } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/context/I18nContext";
import { MARKET_IDS, type MarketId, type MarketQuote, type MarketsPayload } from "@/lib/markets/types";
import { formatAmount, formatPct, formatWhen, normalizePayload, priceDigits, priceSuffix } from "@/lib/markets/view";

const ICONS: Record<MarketId, typeof Coins> = {
  gram: Coins,
  ceyrek: CircleDollarSign,
  usd: DollarSign,
  eur: Euro,
  bist: ChartNoAxesCombined,
  btc: Bitcoin,
};

function sourceLabel(quote: MarketQuote, t: (key: string) => string) {
  if (quote.source === "tcmb") return t("mkt.src.tcmb");
  if (quote.source === "tcmb-gold" && quote.purity === "xau") return t("mkt.src.tcmbGoldXau");
  if (quote.source === "tcmb-gold") return t("mkt.src.tcmbGoldXas");
  if (quote.source === "gold-api" && quote.id === "btc") return t("mkt.src.goldApiBtc");
  if (quote.source === "gold-api") return t("mkt.src.goldApiXau");
  return t("mkt.none");
}

function delayLabel(quote: MarketQuote, t: (key: string) => string) {
  if (quote.delay === "daily") return t("mkt.delay.daily");
  if (quote.delay === "gold") return t("mkt.delay.gold");
  if (quote.delay === "spot" && quote.id === "btc") return t("mkt.delay.spotBtc");
  if (quote.delay === "spot") return t("mkt.delay.spotGram");
  return quote.reason ? t(`mkt.why.${quote.reason}`) : t("mkt.none");
}

function Spark({ values, label }: { values: number[]; label: string }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 240;
  const height = 72;
  const line = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * (height - 10) - 5;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const rising = values[values.length - 1] >= values[0];
  return (
    <svg className="mkt-spark" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <path d={line} fill="none" stroke={rising ? "#059669" : "#dc2626"} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

function QuoteFacts({ quote, locale, t }: { quote: MarketQuote; locale: string; t: (key: string) => string }) {
  const digits = priceDigits(quote.id);
  const suffix = priceSuffix(quote.id);
  const money = (value: number | null) => (value == null ? t("mkt.none") : `${formatAmount(value, digits, locale)} ${suffix}`.trim());
  return (
    <dl className="mkt-facts">
      <div>
        <dt>{t("mkt.updated")}</dt>
        <dd>{quote.updatedAt ? formatWhen(quote.updatedAt, locale) : t("mkt.none")}</dd>
      </div>
      <div>
        <dt>{t("mkt.buy")}</dt>
        <dd>{quote.estimate ? t("mkt.notDealer") : money(quote.buy)}</dd>
      </div>
      <div>
        <dt>{t("mkt.sell")}</dt>
        <dd>{quote.estimate ? t("mkt.notDealer") : quote.sell == null && quote.status === "ok" ? t("mkt.sell.none") : money(quote.sell)}</dd>
      </div>
      <div>
        <dt>{t("mkt.change")}</dt>
        <dd>{quote.changePct == null ? t("mkt.none") : formatPct(quote.changePct, locale)}</dd>
      </div>
      <div>
        <dt>{t("mkt.source")}</dt>
        <dd>{sourceLabel(quote, t)}</dd>
      </div>
      <div>
        <dt>{t("mkt.delay")}</dt>
        <dd>{delayLabel(quote, t)}</dd>
      </div>
      {quote.fxUpdatedAt ? (
        <div>
          <dt>{t("mkt.fxAt")}</dt>
          <dd>{formatWhen(quote.fxUpdatedAt, locale)}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export function MarketPanel() {
  const { t, locale } = useI18n();
  const titleId = useId();
  const moreId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const [payload, setPayload] = useState<MarketsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState<MarketId | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancel = false;
    async function load() {
      try {
        const res = await fetch("/api/markets");
        if (!res.ok) throw new Error(String(res.status));
        const next = normalizePayload(await res.json());
        if (cancel) return;
        if (next) {
          setPayload(next);
          setOffline(false);
        } else setOffline(true);
      } catch {
        if (!cancel) setOffline(true);
      } finally {
        if (!cancel) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void load();
    }, 5 * 60 * 1000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (active && !dialog.open) dialog.showModal();
    if (!active && dialog.open) dialog.close();
  }, [active]);

  const quotes = payload?.quotes ?? MARKET_IDS.map((id) => ({ id, status: "unavailable" as const }));
  const activeQuote = payload?.quotes.find((quote) => quote.id === active) ?? null;
  const stale = Boolean(offline && payload);

  function openQuote(id: MarketId, button: HTMLButtonElement) {
    openerRef.current = button;
    setActive(id);
  }

  function closeQuote() {
    setActive(null);
    dialogRef.current?.close();
  }

  return (
    <section className="mkt" aria-labelledby={titleId}>
      <div className="mkt-head">
        <div className="mkt-title">
          <span className="mkt-mark" aria-hidden>
            <ChartNoAxesCombined />
          </span>
          <h1 id={titleId}>{t("mkt.title")}</h1>
        </div>
        <div className="mkt-actions">
          <button
            type="button"
            className="mkt-refresh"
            aria-label={t("mkt.refresh")}
            disabled={refreshing}
            onClick={() => {
              setRefreshing(true);
              void fetch("/api/markets")
                .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
                .then((body) => {
                  const next = normalizePayload(body);
                  if (next) {
                    setPayload(next);
                    setOffline(false);
                  } else setOffline(true);
                })
                .catch(() => setOffline(true))
                .finally(() => setRefreshing(false));
            }}
          >
            <RefreshCw className={refreshing ? "is-spin" : ""} aria-hidden />
          </button>
          <button
            type="button"
            className="mkt-all"
            aria-expanded={expanded}
            aria-controls={moreId}
            onClick={() => setExpanded((open) => !open)}
          >
            {expanded ? t("mkt.all.close") : t("mkt.all")}
          </button>
        </div>
        <p className="mkt-sub">{t("mkt.sub")}</p>
      </div>

      <div className="mkt-row" tabIndex={0} role="region" aria-label={t("mkt.region")}>
        {quotes.map((quote) => {
          const id = quote.id;
          const full = payload?.quotes.find((item) => item.id === id);
          const Icon = ICONS[id];
          const ready = full?.status === "ok" && full.price != null && !loading;
          const change = ready ? full.changePct : null;
          const tone = change == null ? "flat" : change > 0 ? "up" : change < 0 ? "down" : "flat";
          const label = t(`mkt.${id}`);
          return (
            <button
              key={id}
              type="button"
              className="mkt-card"
              onClick={(event) => openQuote(id, event.currentTarget)}
            >
              <span className="mkt-card-top">
                <span className={`mkt-ico mkt-ico-${id}`} aria-hidden>
                  <Icon />
                </span>
                <span className="mkt-name">{label}</span>
              </span>
              {ready ? (
                <>
                  <span className="mkt-price">
                    {formatAmount(full.price as number, priceDigits(id), locale)}
                    <small>{priceSuffix(id)}</small>
                  </span>
                  <span className="mkt-meta">
                    <span className={`mkt-chg mkt-chg-${tone}`}>
                      {full.estimate ? t("mkt.estimate") : change == null ? t("mkt.change") : formatPct(change, locale)}
                    </span>
                    <span className="mkt-time">{formatWhen(full.updatedAt, locale)}</span>
                  </span>
                  {full.stale || stale ? <span className="mkt-stale">{t("mkt.stale")}</span> : null}
                </>
              ) : (
                <span className="mkt-wait">{loading && !offline ? t("mkt.loading") : t("mkt.none")}</span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mkt-foot">{t("mkt.foot")}</p>

      <div id={moreId} className="mkt-more" hidden={!expanded}>
        {payload
          ? payload.quotes.map((quote) => (
              <article key={quote.id} className="mkt-more-card">
                <h2>{t(`mkt.${quote.id}`)}</h2>
                <QuoteFacts quote={quote} locale={locale} t={t} />
                {quote.series ? <Spark values={quote.series} label={t("mkt.chart")} /> : null}
              </article>
            ))
          : <p>{loading ? t("mkt.loading") : t("mkt.none")}</p>}
      </div>

      <dialog
        ref={dialogRef}
        className="mkt-dialog"
        aria-labelledby="mkt-dialog-title"
        onClose={() => {
          setActive(null);
          openerRef.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) closeQuote();
        }}
      >
        {activeQuote ? (
          <DialogBody quote={activeQuote} locale={locale} t={t} close={closeQuote} />
        ) : (
          <p>{t("mkt.none")}</p>
        )}
      </dialog>
    </section>
  );
}

function DialogBody({
  quote,
  locale,
  t,
  close,
}: {
  quote: MarketQuote;
  locale: string;
  t: (key: string) => string;
  close: () => void;
}) {
  const digits = priceDigits(quote.id);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
  }, [quote.id]);
  return (
    <>
      <div className="mkt-dialog-head">
        <h2 id="mkt-dialog-title">{t(`mkt.${quote.id}`)}</h2>
        <button ref={closeRef} type="button" className="mkt-close" onClick={close}>
          {t("mkt.close")}
        </button>
      </div>
      {quote.status === "ok" && quote.price != null ? (
        <p className="mkt-dialog-price">
          {formatAmount(quote.price, digits, locale)} {priceSuffix(quote.id)}
        </p>
      ) : (
        <p className="mkt-wait">{t("mkt.none")}</p>
      )}
      {quote.estimate ? <p className="mkt-wait">{t("mkt.estimate")}</p> : null}
      {quote.stale ? <p className="mkt-stale">{t("mkt.stale")}</p> : null}
      <QuoteFacts quote={quote} locale={locale} t={t} />
      {quote.series ? <Spark values={quote.series} label={t("mkt.chart")} /> : null}
    </>
  );
}
