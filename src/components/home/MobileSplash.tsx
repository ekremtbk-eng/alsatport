"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { BRAND_MARK, BRAND_NAME } from "@/lib/brand";
import { useDevice } from "@/context/DeviceContext";
import { useI18n } from "@/context/I18nContext";

const KEY = "alsatport-splash-v1";

export function MobileSplash() {
  const { isPhone } = useDevice();
  const { t } = useI18n();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isPhone) return;
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* private mode */
    }
    setShow(true);
  }, [isPhone]);

  useEffect(() => {
    if (!show) return;
    const id = window.setTimeout(() => setShow(false), 1300);
    return () => window.clearTimeout(id);
  }, [show]);

  if (!show) return null;

  return (
    <div className="m-splash" role="dialog" aria-label={BRAND_NAME} aria-live="polite">
      <Image
        src={BRAND_MARK.src}
        alt=""
        className="m-splash-mark"
        width={120}
        height={120}
        sizes="120px"
        priority
        unoptimized
      />
      <div className="m-splash-foot">
        <strong>{BRAND_NAME}</strong>
        <span>{t("home.tag")}</span>
      </div>
    </div>
  );
}
