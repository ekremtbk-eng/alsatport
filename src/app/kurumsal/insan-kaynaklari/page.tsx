"use client";

import Link from "next/link";
import { JOBS } from "@/data/corporate";
import { LEGAL_EMAIL_DESTEK } from "@/data/legal";
import { useI18n } from "@/context/I18nContext";

const JOB_TITLE: Record<string, string> = {
  fe: "job.fe",
  trust: "job.trust",
  cs: "job.cs",
  pm: "job.pm",
};
const JOB_LOC: Record<string, string> = {
  fe: "job.ist",
  trust: "job.ist2",
  cs: "job.remote",
  pm: "job.ist",
};
const JOB_TEAM: Record<string, string> = {
  fe: "job.team.p",
  trust: "job.team.t",
  cs: "job.team.s",
  pm: "job.team.p",
};

export default function CareersPage() {
  const { t } = useI18n();
  return (
    <article className="legal-prose">
      <p className="text-xs font-semibold uppercase tracking-wider text-lime">{t("corp.nav.insan-kaynaklari")}</p>
      <h2 className="!mt-1 text-2xl font-extrabold">{t("corp.hr.h")}</h2>
      <p>{t("corp.hr.p")}</p>
      <h3>{t("corp.hr.open")}</h3>
      {JOBS.length === 0 ? (
        <p>
          {t("corp.hr.none")}{" "}
          <a href={`mailto:${LEGAL_EMAIL_DESTEK}`} className="font-semibold text-lime">
            {LEGAL_EMAIL_DESTEK}
          </a>
        </p>
      ) : null}
      <div className="mt-3 space-y-2">
        {JOBS.map((j) => {
          const title = t(JOB_TITLE[j.id] ?? "job.fe");
          return (
            <a
              key={j.id}
              href={`mailto:${LEGAL_EMAIL_DESTEK}?subject=${encodeURIComponent(title)}`}
              className="flex flex-col rounded-2xl border border-line bg-panel px-4 py-3 no-underline transition hover:border-lime/40 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-extrabold text-ink">{title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {t(JOB_TEAM[j.id] ?? "job.team.p")} · {t(JOB_LOC[j.id] ?? "job.ist")} · {t("job.ft")}
                </p>
              </div>
              <span className="mt-2 text-xs font-bold text-lime sm:mt-0">{t("corp.hr.apply")}</span>
            </a>
          );
        })}
      </div>
      <p className="mt-4">
        <Link href="/kurumsal/iletisim" className="font-semibold text-lime">
          {t("corp.nav.iletisim")}
        </Link>
      </p>
    </article>
  );
}
