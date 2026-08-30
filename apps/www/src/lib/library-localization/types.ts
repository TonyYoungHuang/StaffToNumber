import type { LocalizedValue } from "@score/i18n";

export const LIBRARY_ERAS = ["Baroque", "Classical", "Romantic", "Renaissance", "Contemporary"] as const;
export const LIBRARY_INSTRUMENTS = [
  "Piano",
  "Keyboard",
  "Strings",
  "Violin",
  "Voice",
  "Orchestra",
  "Woodwinds",
  "Brass",
  "Percussion",
  "Viola",
  "Cello",
  "Choir",
] as const;
export const LIBRARY_ENSEMBLES = [
  "Solo",
  "Orchestra",
  "Choir and orchestra",
  "Symphony orchestra",
  "String ensemble",
  "Chamber ensemble",
  "Solo and orchestra",
  "SATB choir and orchestra",
  "Voice and piano",
  "SATB a cappella",
] as const;
export const LIBRARY_DIFFICULTIES = ["Beginner", "Easy", "Intermediate", "Advanced"] as const;
export const LIBRARY_FORMATS = ["MusicXML", "Source edition", "Scans", "Source editions", "Choral source editions"] as const;
export const LIBRARY_ASSET_STATUSES = ["downloadable", "source-linked"] as const;
export const LIBRARY_WORK_RIGHTS = ["CC0", "Public domain"] as const;

export type LibraryEra = (typeof LIBRARY_ERAS)[number];
export type LibraryInstrument = (typeof LIBRARY_INSTRUMENTS)[number];
export type LibraryEnsemble = (typeof LIBRARY_ENSEMBLES)[number];
export type LibraryDifficulty = (typeof LIBRARY_DIFFICULTIES)[number];
export type LibraryFormat = (typeof LIBRARY_FORMATS)[number];
export type LibraryAssetStatus = (typeof LIBRARY_ASSET_STATUSES)[number];
export type LibraryWorkRights = (typeof LIBRARY_WORK_RIGHTS)[number];
export type LibraryAssetLicense = "scoretransposer-cc0" | "source-linked-review";

export type LibraryLocalizedValue = LocalizedValue<string>;

export function defineLibraryLocalizedValue<const TValue extends LibraryLocalizedValue>(value: TValue): TValue {
  return value;
}

export type LibraryCatalog = {
  metadata: {
    title: string;
    description: string;
    keywords: string[];
    imageAlt: string;
  };
  index: {
    eyebrow: string;
    title: string;
    body: string;
    catalog: string;
    catalogBody: string;
    query: string;
    queryPlaceholder: string;
    instrument: string;
    ensemble: string;
    era: string;
    all: string;
    search: string;
    clear: string;
    resultTemplate: string;
    emptyTitle: string;
    emptyBody: string;
    details: string;
    rights: string;
    why: string;
    whyBody: string;
    start: string;
    filtersAria: string;
  };
  detail: {
    eyebrow: string;
    source: string;
    rights: string;
    instruments: string;
    download: string;
    openSource: string;
    workspace: string;
    back: string;
    notice: string;
    home: string;
    libraryName: string;
    breadcrumb: string;
    titleTemplate: string;
    descriptionTemplate: string;
    titleKeywordTemplate: string;
    composerKeywordTemplate: string;
    genericKeyword: string;
    imageAltTemplate: string;
    circaPrefix: string;
  };
  values: {
    eras: Record<LibraryEra, string>;
    instruments: Record<LibraryInstrument, string>;
    ensembles: Record<LibraryEnsemble, string>;
    difficulties: Record<LibraryDifficulty, string>;
    formats: Record<LibraryFormat, string>;
    assetStatuses: Record<LibraryAssetStatus, string>;
    workRights: Record<LibraryWorkRights, string>;
    assetLicenses: Record<LibraryAssetLicense, string>;
  };
};
