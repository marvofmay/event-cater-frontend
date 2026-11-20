"use client";

import { useMemo, useState } from "react";
import { Alert, Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useRemote } from "@/app/components/catering/api";
import { useUser } from "@/app/context/userContext";
import NoticeCover from "./NoticeCover";
import NoticeDetailDialog from "./NoticeDetailDialog";
import NoticesManageTable from "./NoticesManageTable";
import type { CompanyNotice } from "./types";
import "./notices-board.css";

function formatAbsolute(value: string) {
  try {
    return new Intl.DateTimeFormat("pl-PL", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatRelative(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatAbsolute(value);
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat("pl", { numeric: "auto" });
  if (abs < 60) return rtf.format(Math.round(diffSec), "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(diffSec / (86400 * 30)), "month");
  return rtf.format(Math.round(diffSec / (86400 * 365)), "year");
}

function FeedSkeleton() {
  return (
    <>
      {[0, 1, 2].map((key) => (
        <div key={key} className="ec-notices__skeleton" aria-hidden>
          <div className="ec-notices__skeleton-cover" />
          <div className="ec-notices__skeleton-lines">
            <div className="ec-notices__skeleton-line ec-notices__skeleton-line--sm" />
            <div className="ec-notices__skeleton-line ec-notices__skeleton-line--lg" />
            <div className="ec-notices__skeleton-line" />
            <div className="ec-notices__skeleton-line" style={{ width: "85%" }} />
          </div>
        </div>
      ))}
    </>
  );
}

function NoticeCard({
  notice,
  openLabel,
  createdByLabel,
  onOpen,
}: {
  notice: CompanyNotice;
  openLabel: string;
  createdByLabel: string;
  onOpen: () => void;
}) {
  return (
    <li className="ec-notices__reveal">
      <article
        className="ec-notices__item"
        role="button"
        tabIndex={0}
        aria-label={`${openLabel}: ${notice.title}`}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen();
          }
        }}
      >
        {notice.cover && (
          <div className="ec-notices__cover">
            <NoticeCover
              noticeUuid={notice.uuid}
              imageUuid={notice.cover.uuid}
              alt=""
              maxHeight={220}
            />
          </div>
        )}
        <div className="ec-notices__body">
          <p className="ec-notices__meta">
            <time dateTime={notice.createdAt}>{formatRelative(notice.createdAt)}</time>
            <span className="ec-notices__meta-dot" aria-hidden />
            <span>
              {createdByLabel} {notice.createdByName}
            </span>
          </p>
          <h2 className="ec-notices__item-title">{notice.title}</h2>
          <p className="ec-notices__excerpt">{notice.body}</p>
          <p className="ec-notices__cta">
            {openLabel}
            <span className="ec-notices__cta-arrow" aria-hidden>
              →
            </span>
          </p>
        </div>
      </article>
    </li>
  );
}

export default function CompanyNoticesBoard() {
  const { t } = useTranslation();
  const { hasPermission } = useUser();
  const canManage =
    hasPermission("company_notices.create") ||
    hasPermission("company_notices.update") ||
    hasPermission("company_notices.delete");
  const remote = useRemote<{ items: CompanyNotice[] }>(canManage ? null : "/company-notices");
  const [selected, setSelected] = useState<CompanyNotice | null>(null);

  const items = useMemo(() => remote.data?.items ?? [], [remote.data?.items]);

  if (canManage) return <NoticesManageTable />;

  const metaFor = (notice: CompanyNotice) =>
    `${t("info.createdBy")}: ${notice.createdByName} · ${formatAbsolute(notice.createdAt)}`;

  return (
    <section className="ec-notices" aria-labelledby="ec-notices-title">
      <header className="ec-notices__header ec-notices__reveal">
        <p className="ec-notices__eyebrow">{t("info.eyebrow")}</p>
        <h1 id="ec-notices-title" className="ec-notices__title">
          {t("info.title")}
        </h1>
        <p className="ec-notices__intro">{t("info.intro")}</p>
      </header>

      {remote.error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: "0.85rem" }}>
          {remote.error || t("info.loadError")}
        </Alert>
      )}

      {remote.loading && (
        <Box aria-busy="true" aria-live="polite">
          <FeedSkeleton />
        </Box>
      )}

      {!remote.loading && items.length === 0 && !remote.error && (
        <div className="ec-notices__empty ec-notices__reveal">
          <p className="ec-notices__empty-title">{t("info.emptyTitle")}</p>
          <p className="ec-notices__empty-text">{t("info.empty")}</p>
        </div>
      )}

      {!remote.loading && items.length > 0 && (
        <ul className="ec-notices__feed">
          {items.map((notice) => (
            <NoticeCard
              key={notice.uuid}
              notice={notice}
              openLabel={t("info.open")}
              createdByLabel={t("info.createdBy")}
              onOpen={() => setSelected(notice)}
            />
          ))}
        </ul>
      )}

      <NoticeDetailDialog
        notice={selected}
        onClose={() => setSelected(null)}
        metaLine={selected ? metaFor(selected) : undefined}
      />
    </section>
  );
}
