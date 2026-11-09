import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  real,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"), // null for accounts created with Google/Facebook
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("user"), // user | admin
  ageConfirmed: boolean("age_confirmed").notNull().default(false),
  rulesAcceptedAt: timestamp("rules_accepted_at", { withTimezone: true }),
  // Shipping address: only shown to fulfillment code, never to other users.
  addressName: text("address_name"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  bio: text("bio"),
  showInFeed: boolean("show_in_feed").notNull().default(true), // first name + city in the homepage activity feed
  interests: text("interests"), // free-text "other interests"
  interestTags: jsonb("interest_tags").$type<string[]>().notNull().default([]),
  interestOther: jsonb("interest_other").$type<Record<string, string>>().notNull().default({}), // per-category "Other" text
  wantedCategories: jsonb("wanted_categories").$type<string[]>().notNull().default([]),
  exclusions: text("exclusions"), // comma-separated keywords
  platforms: jsonb("platforms").$type<string[]>().notNull().default([]), // consoles the user owns
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  deletionRequestedAt: timestamp("deletion_requested_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Google / Facebook identities linked to a user.
export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    id: serial("id").primaryKey(),
    provider: text("provider").notNull(), // google | facebook
    providerUserId: text("provider_user_id").notNull(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("oauth_provider_user").on(t.provider, t.providerUserId)],
);

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const media = pgTable("media", {
  id: text("id").primaryKey(), // random uuid, never sequential
  ownerId: integer("owner_id").notNull().references(() => users.id),
  pathname: text("pathname").notNull(),
  contentType: text("content_type").notNull(),
  kind: text("kind").notNull(), // item | packing
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const items = pgTable(
  "items",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id").notNull().references(() => users.id),
    title: text("title").notNull(),
    category: text("category").notNull(),
    brand: text("brand"),
    platform: text("platform"), // required for video games
    cardFormat: text("card_format"), // trading cards: sealed | bundle | deck
    cardCondition: text("card_condition"), // trading cards: nm | lp | mp (not for sealed)
    condition: text("condition").notNull(), // new | like_new | good
    description: text("description").notNull(),
    functionNote: text("function_note").notNull(),
    accessoriesComplete: boolean("accessories_complete").notNull(),
    wearNote: text("wear_note"),
    story: text("story"), // note/card for whoever receives it, revealed after the swap
    riddle: text("riddle"), // clue for Plus-tier receivers, shown only after the swap locks
    riddleSource: text("riddle_source"), // ai | admin
    aiSuggestion: jsonb("ai_suggestion").$type<import("@/lib/identify-types").Suggestion>(), // what AI identified at upload
    weightOz: real("weight_oz").notNull(), // packed weight
    lengthIn: real("length_in").notNull(), // packed dims, sorted desc
    widthIn: real("width_in").notNull(),
    heightIn: real("height_in").notNull(),
    shipFromZip: text("ship_from_zip").notNull(),
    photoIds: jsonb("photo_ids").$type<string[]>().notNull().default([]),
    status: text("status").notNull().default("pending_review"),
    // awaiting_payment | pending_review | needs_info | valuation_ready | in_pool | paused | proposed
    // | locked | exchanged | withdrawn | rejected
    postageHeldCents: integer("postage_held_cents").notNull().default(0),
    adminNote: text("admin_note"),
    repooledFromExchangeId: integer("repooled_from_exchange_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    pooledAt: timestamp("pooled_at", { withTimezone: true }),
  },
  (t) => [index("items_status_idx").on(t.status), index("items_owner_idx").on(t.ownerId)],
);

export const valuations = pgTable("valuations", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => items.id),
  version: integer("version").notNull(),
  lowCents: integer("low_cents").notNull(),
  highCents: integer("high_cents").notNull(),
  midCents: integer("mid_cents").notNull(),
  basis: text("basis").notNull(), // where the number came from
  confidence: text("confidence").notNull(), // low | medium | high
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  itemId: integer("item_id").references(() => items.id),
  exchangeId: integer("exchange_id"),
  kind: text("kind").notNull(), // postage_charge | postage_refund
  amountCents: integer("amount_cents").notNull(),
  provider: text("provider").notNull().default("test"),
  providerReference: text("provider_reference"),
  status: text("status").notNull().default("succeeded"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const batches = pgTable("batches", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().default("draft"), // draft | published | discarded
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
});

export const exchanges = pgTable("exchanges", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => batches.id),
  status: text("status").notNull().default("draft"),
  // draft | proposed | locked | in_transit | completed | cancelled | disputed | resolved
  tier: text("tier").notNull(),
  matchReason: text("match_reason"),
  acceptDeadline: timestamp("accept_deadline", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  cancelReason: text("cancel_reason"),
  reviewsPublishedAt: timestamp("reviews_published_at", { withTimezone: true }),
});

// One row per side. A side SENDS sendItemId and receives the other side's item.
export const exchangeParties = pgTable(
  "exchange_parties",
  {
    id: serial("id").primaryKey(),
    exchangeId: integer("exchange_id").notNull().references(() => exchanges.id),
    userId: integer("user_id").notNull().references(() => users.id),
    sendItemId: integer("send_item_id").notNull().references(() => items.id),
    valuationId: integer("valuation_id").notNull().references(() => valuations.id),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    declinedAt: timestamp("declined_at", { withTimezone: true }),
    labelCarrier: text("label_carrier"),
    trackingNumber: text("tracking_number"),
    actualPostageCents: integer("actual_postage_cents"),
    packingPhotoId: text("packing_photo_id"),
    pickedUpAt: timestamp("picked_up_at", { withTimezone: true }), // carrier scan, not label creation
    receivedAt: timestamp("received_at", { withTimezone: true }),
    guess: text("guess"), // receiver's guess from the riddle, before unboxing
  },
  (t) => [uniqueIndex("party_exchange_user").on(t.exchangeId, t.userId)],
);

// An item can be in at most one live exchange: the primary key enforces it.
export const itemLocks = pgTable("item_locks", {
  itemId: integer("item_id").primaryKey().references(() => items.id),
  exchangeId: integer("exchange_id").notNull().references(() => exchanges.id),
});

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    exchangeId: integer("exchange_id").notNull().references(() => exchanges.id),
    reviewerId: integer("reviewer_id").notNull().references(() => users.id),
    revieweeId: integer("reviewee_id").notNull().references(() => users.id),
    matchesDescription: boolean("matches_description").notNull(),
    packaging: integer("packaging").notNull(), // 1-5
    enjoyment: integer("enjoyment").notNull(), // 1-5, never affects reputation
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("review_once").on(t.exchangeId, t.reviewerId)],
);

export const reputationEvents = pgTable(
  "reputation_events",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    exchangeId: integer("exchange_id"),
    kind: text("kind").notNull(),
    points: integer("points").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("rep_once").on(t.userId, t.exchangeId, t.kind)],
);

export const disputes = pgTable("disputes", {
  id: serial("id").primaryKey(),
  exchangeId: integer("exchange_id").notNull().references(() => exchanges.id),
  openedBy: integer("opened_by").notNull().references(() => users.id),
  reason: text("reason").notNull(), // not_as_described | lost | damaged | other
  details: text("details").notNull(),
  lostOption: text("lost_option"), // return | let_go | insurance
  status: text("status").notNull().default("open"), // open | resolved
  resolution: text("resolution"),
  fraudConfirmedUserId: integer("fraud_confirmed_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  data: jsonb("data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
