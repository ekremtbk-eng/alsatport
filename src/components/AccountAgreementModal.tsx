"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  LEGAL_BRAND,
  LEGAL_EMAIL_DESTEK,
  LEGAL_EMAIL_KVKK,
  LEGAL_KEP,
  LEGAL_UPDATED,
  LEGAL_WEB,
} from "@/data/legal";
import { useI18n } from "@/context/I18nContext";
import { X } from "lucide-react";

export function AccountAgreementModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const node = (
    <div className="oauth-layer" role="dialog" aria-modal="true" aria-labelledby="agreement-title">
      <button type="button" className="login-modal-backdrop" aria-label={t("common.close")} onClick={onClose} />
      <div className="agreement-box">
        <button type="button" className="login-modal-x" onClick={onClose} aria-label={t("common.close")}>
          <X className="h-5 w-5" />
        </button>
        <p className="agreement-kicker">{LEGAL_BRAND} — Al, Sat, Keşfet!</p>
        <h2 id="agreement-title" className="agreement-title">
          Bireysel Üyelik Sözleşmesi ve Ekleri
        </h2>
        <p className="agreement-meta">Son güncelleme: {LEGAL_UPDATED}</p>
        <div className="agreement-body">
          <p>
            İşbu Bireysel Üyelik Sözleşmesi (“Sözleşme”), {LEGAL_WEB} adresinde faaliyet gösteren{" "}
            {LEGAL_BRAND}’un (“Platform”, “Şirket”) sunduğu “Al, Sat, Keşfet!”
            ilkesiyle işletilen çevrimiçi ilan ve ticaret hizmetlerine üye olan gerçek kişi (“Üye”)
            ile elektronik ortamda akdedilmiştir.
          </p>
          <h3>1. Konu</h3>
          <p>
            Sözleşme; AlsatPort üzerinden ilan yayımlama, arama, mesajlaşma, favori, mağaza ve ilgili
            dijital hizmetlerin kullanım koşullarını, tarafların hak ve yükümlülüklerini 6098 sayılı
            Türk Borçlar Kanunu, 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun ve 6698
            sayılı KVKK çerçevesinde düzenler.
          </p>
          <h3>2. Üyelik ve hesap</h3>
          <p>
            Üye, kayıt sırasında verdiği e-posta, ad, soyad ve diğer bilgilerin doğru olduğunu kabul
            eder. Hesap güvenliği Üye’ye aittir. AlsatPort, hukuka aykırı, yanıltıcı veya Platform
            kurallarına aykırı hesapları durdurabilir.
          </p>
          <h3>3. İlan ve içerik kuralları</h3>
          <p>
            Üye, yayımladığı her ilanın hukuka uygunluğundan bizzat sorumludur. Canlı hayvan satışı
            AlsatPort’ta yasaktır. Fikri ve sınai haklara aykırı, aldatıcı veya mevzuata aykırı içerik
            yayımlanamaz. Platform, kullanıcılar arasındaki alım-satım ilişkisine taraf değildir.
          </p>
          <h3>4. Kişisel veriler ve ticari ileti</h3>
          <p>
            Kişisel veriler, AlsatPort KVKK Aydınlatma Metni’nde belirtilen amaçlarla işlenir.
            Kampanya, tanıtım ve reklam içerikli ticari elektronik iletiler yalnızca Üye’nin açık
            rızası varsa gönderilir. Rıza, {LEGAL_EMAIL_KVKK} üzerinden geri alınabilir.
          </p>
          <h3>5. Sorumluluk</h3>
          <p>
            AlsatPort, hizmetin kesintisiz ve hatasız sunulacağını taahhüt etmez. Üyeler arasındaki
            hukuki ve mali edimler kendilerine aittir.
          </p>
          <h3>6. Yürürlük ve iletişim</h3>
          <p>
            Sözleşme, Üye’nin “kabul ediyorum” beyanıyla yürürlüğe girer. Destek: {LEGAL_EMAIL_DESTEK}{" "}
            · KVKK: {LEGAL_EMAIL_KVKK} · KEP: {LEGAL_KEP}
          </p>
        </div>
        <button type="button" className="btn-primary h-11 w-full rounded-xl" onClick={onClose}>
          {t("common.close")}
        </button>
      </div>
    </div>
  );
  if (!ready) return null;
  return createPortal(node, document.body);
}
