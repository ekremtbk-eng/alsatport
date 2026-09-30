"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { SearchSelect } from "@/components/SearchSelect";
import { TutorFilterChips } from "@/components/TutorFilterChips";
import { catName, useI18n } from "@/context/I18nContext";
import {
  categories,
  hrefForCategory,
  parentOf,
  rootOf,
  visibleChildren,
  type Category,
} from "@/data/categories";
import { TURKEY_CITIES } from "@/data/turkey";
import { mahallelerOf } from "@/data/regionProfiles";
import { districtOptions, type FilterState } from "@/lib/categoryFilters";
import { isTutorCategoryId, tutorLevelsFor, tutorSubjectsFor, TUTOR_PLACES } from "@/data/tutorOptions";

export function BrowseQuickBar({
  category,
  state,
  onChange,
  onSearch,
}: {
  category?: Category | null;
  state: FilterState;
  onChange: (key: string, value: string) => void;
  onSearch?: () => boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const root = category ? rootOf(category) : undefined;
  const child = (() => {
    if (!category || !root || category.id === root.id) return undefined;
    let cur: Category = category;
    while (cur.parentId && cur.parentId !== root.id) {
      const p = parentOf(cur);
      if (!p) break;
      cur = p;
    }
    return cur.id === root.id ? undefined : cur;
  })();
  const childOptions = visibleChildren(root);
  const grandOptions = visibleChildren(child);
  const grand = (() => {
    if (!category || !child || category.id === child.id) return undefined;
    let cur: Category = category;
    while (cur.parentId && cur.parentId !== child.id) {
      const p = parentOf(cur);
      if (!p) break;
      cur = p;
    }
    return cur.parentId === child.id ? cur : undefined;
  })();
  const leafOptions = visibleChildren(grand);
  const leaf = (() => {
    if (!category || !grand || category.id === grand.id) return undefined;
    return category.parentId === grand.id ? category : undefined;
  })();
  const cities = TURKEY_CITIES.map((c) => c.name);
  const isEstate = root?.id === "emlak";

  function goRoot(id: string) {
    const next = categories.find((c) => c.id === id);
    if (next) router.push(hrefForCategory(next));
  }

  function goChild(id: string) {
    if (!id && root) {
      router.push(hrefForCategory(root));
      return;
    }
    const next = childOptions.find((c) => c.id === id);
    if (next) router.push(hrefForCategory(next));
  }

  function goGrand(id: string) {
    if (!id && child) {
      router.push(hrefForCategory(child));
      return;
    }
    const next = grandOptions.find((c) => c.id === id);
    if (next) router.push(hrefForCategory(next));
  }

  function goLeaf(id: string) {
    if (!id && grand) {
      router.push(hrefForCategory(grand));
      return;
    }
    const next = leafOptions.find((c) => c.id === id);
    if (next) router.push(hrefForCategory(next));
  }

  return (
    <form
      className="browse-quickbar"
      onSubmit={(e) => {
        e.preventDefault();
        if (onSearch && !onSearch()) return;
        const el = document.querySelector<HTMLInputElement>(".browse-search");
        el?.focus();
      }}
    >
      <label className="browse-quick-item">
        <span className="flt-label">{t("flt.pickCat")}</span>
        <select
          className="flt-select"
          value={root?.id ?? ""}
          onChange={(e) => goRoot(e.target.value)}
        >
          <option value="">{t("flt.any")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {catName(t, c.id, c.name)}
            </option>
          ))}
        </select>
      </label>
      <label className="browse-quick-item">
        <span className="flt-label">{t("flt.pickSub")}</span>
        <select
          className="flt-select"
          value={child?.id ?? ""}
          disabled={!root}
          onChange={(e) => goChild(e.target.value)}
        >
          <option value="">{t("flt.any")}</option>
          {childOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {catName(t, c.id, c.name)}
            </option>
          ))}
        </select>
      </label>
      {grandOptions.length ? (
        <label className="browse-quick-item">
          <span className="flt-label">{t("flt.pickBranch")}</span>
          <select className="flt-select" value={grand?.id ?? ""} onChange={(e) => goGrand(e.target.value)}>
            <option value="">{t("flt.any")}</option>
            {grandOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {catName(t, c.id, c.name)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {leafOptions.length ? (
        <label className="browse-quick-item">
          <span className="flt-label">{t("flt.pickType")}</span>
          <select className="flt-select" value={leaf?.id ?? ""} onChange={(e) => goLeaf(e.target.value)}>
            <option value="">{t("flt.any")}</option>
            {leafOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {catName(t, c.id, c.name)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="browse-quick-item">
        <SearchSelect
          label={t("post.city")}
          value={state.city ?? ""}
          options={cities}
          placeholder={t("flt.any")}
          anyLabel={t("flt.any")}
          onChange={(v) => onChange("city", v)}
        />
      </div>
      <div className="browse-quick-item">
        <SearchSelect
          label={t("post.district")}
          value={state.district ?? ""}
          options={districtOptions(state.city)}
          placeholder={state.city ? t("flt.any") : t("flt.cityFirst")}
          disabled={!state.city}
          anyLabel={t("flt.any")}
          onChange={(v) => onChange("district", v)}
        />
      </div>
      {isEstate ? (
        <div className="browse-quick-item">
          <SearchSelect
            label={t("post.neighborhood")}
            value={state.neighborhood ?? ""}
            options={mahallelerOf(state.city, state.district)}
            placeholder={state.district ? t("flt.any") : t("flt.districtFirst")}
            disabled={!state.district}
            anyLabel={t("flt.any")}
            onChange={(v) => onChange("neighborhood", v)}
          />
        </div>
      ) : null}
      <label className="browse-quick-item">
        <span className="flt-label">{t("flt.min")}</span>
        <input
          inputMode="numeric"
          value={state.priceMin ?? ""}
          onChange={(e) => onChange("priceMin", e.target.value.replace(/[^\d]/g, ""))}
          placeholder="₺"
          className="flt-input"
        />
      </label>
      <label className="browse-quick-item">
        <span className="flt-label">{t("flt.max")}</span>
        <input
          inputMode="numeric"
          value={state.priceMax ?? ""}
          onChange={(e) => onChange("priceMax", e.target.value.replace(/[^\d]/g, ""))}
          placeholder="₺"
          className="flt-input"
        />
      </label>
      {isTutorCategoryId(category?.id) ? (
        <div className="browse-quick-tutor">
          <div className="browse-quick-item">
            <span className="flt-label">{t("flt.subject")}</span>
            <TutorFilterChips
              options={tutorSubjectsFor(category?.id ?? "tutors")}
              value={state.subject ?? ""}
              onChange={(v) => onChange("subject", v)}
              kind="tutorSubject"
            />
          </div>
          <div className="browse-quick-item">
            <span className="flt-label">{t("flt.level")}</span>
            <TutorFilterChips
              options={tutorLevelsFor(category?.id ?? "tutors")}
              value={state.level ?? ""}
              onChange={(v) => onChange("level", v)}
              kind="tutorLevel"
            />
          </div>
          <div className="browse-quick-item">
            <span className="flt-label">{t("flt.lessonPlace")}</span>
            <TutorFilterChips
              options={[...TUTOR_PLACES]}
              value={state.place ?? ""}
              onChange={(v) => onChange("place", v)}
              kind="tutorPlace"
            />
          </div>
        </div>
      ) : null}
      <button type="submit" className="btn-primary browse-quick-go h-11 px-5 text-sm">
        <Search className="h-4 w-4" />
        {t("flt.detailedSearch")}
      </button>
      {category && parentOf(category) ? (
        <p className="browse-quick-path">
          {catName(t, root?.id ?? "", root?.name ?? "")}
          {child ? ` → ${catName(t, child.id, child.name)}` : ""}
        </p>
      ) : null}
    </form>
  );
}
