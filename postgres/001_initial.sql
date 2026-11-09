CREATE TABLE "audit" (
 "id" text PRIMARY KEY NOT NULL,
 "actor" text NOT NULL,
 "action" text NOT NULL,
 "target" text NOT NULL,
 "reason" text NOT NULL,
 "created" bigint NOT NULL
);
CREATE TABLE "price_history" (
 "id" text PRIMARY KEY NOT NULL,
 "review" text NOT NULL,
 "date" text NOT NULL,
 "total" bigint NOT NULL,
 "portions" bigint NOT NULL,
 "people" bigint NOT NULL,
 "unit" text NOT NULL,
 "created" bigint NOT NULL
);
CREATE TABLE "limits" (
 "key" text PRIMARY KEY NOT NULL,
 "count" bigint NOT NULL,
 "expires" bigint NOT NULL
);
CREATE TABLE "offerings" (
 "id" text PRIMARY KEY NOT NULL,
 "restaurant" text NOT NULL,
 "type" text NOT NULL,
 "name" text NOT NULL,
 "category" text NOT NULL,
 "meal" text NOT NULL,
 "vegetarian" bigint NOT NULL,
 "status" text NOT NULL,
 "owner" text NOT NULL,
 "created" bigint NOT NULL
);
CREATE TABLE "photos" (
 "id" text PRIMARY KEY NOT NULL,
 "owner" text NOT NULL,
 "mime" text NOT NULL,
 "created" bigint NOT NULL
);
CREATE TABLE "reports" (
 "id" text PRIMARY KEY NOT NULL,
 "owner" text NOT NULL,
 "target" text NOT NULL,
 "reason" text NOT NULL,
 "status" text NOT NULL,
 "created" bigint NOT NULL
);
CREATE TABLE "restaurants" (
 "id" text PRIMARY KEY NOT NULL,
 "name" text NOT NULL,
 "address" text NOT NULL,
 "city" text NOT NULL,
 "district" text NOT NULL,
 "lat" double precision NOT NULL,
 "lng" double precision NOT NULL,
 "hours" text NOT NULL,
 "front" text NOT NULL,
 "status" text NOT NULL,
 "owner" text NOT NULL,
 "created" bigint NOT NULL
);
CREATE TABLE "reviews" (
 "id" text PRIMARY KEY NOT NULL,
 "offering" text NOT NULL,
 "owner" text NOT NULL,
 "author" text NOT NULL,
 "date" text NOT NULL,
 "total" bigint NOT NULL,
 "portions" bigint NOT NULL,
 "people" bigint NOT NULL,
 "unit" text NOT NULL,
 "rating" bigint NOT NULL,
 "taste" text NOT NULL,
 "portion" text NOT NULL,
 "value" text NOT NULL,
 "photos" text NOT NULL,
 "sponsored" bigint NOT NULL,
 "status" text NOT NULL,
 "reason" text NOT NULL,
 "created" bigint NOT NULL,
 "updated" bigint NOT NULL,
 "front" text NOT NULL DEFAULT ''
);
CREATE TABLE "saves" (
 "id" text PRIMARY KEY NOT NULL,
 "owner" text NOT NULL,
 "kind" text NOT NULL,
 "target" text NOT NULL
);
CREATE TABLE "food_types" (
 "id" text PRIMARY KEY NOT NULL,
 "name" text NOT NULL,
 "key" text NOT NULL,
 "status" text NOT NULL,
 "owner" text NOT NULL
);
CREATE TABLE "votes" (
 "id" text PRIMARY KEY NOT NULL,
 "owner" text NOT NULL,
 "review" text NOT NULL
);
CREATE TABLE "place_reviews" (
 "id" text PRIMARY KEY NOT NULL,
 "restaurant" text NOT NULL,
 "owner" text NOT NULL,
 "author" text NOT NULL,
 "date" text NOT NULL,
 "rating" bigint NOT NULL,
 "content" text NOT NULL,
 "media" text NOT NULL,
 "photo_count" bigint NOT NULL,
 "sponsored" bigint NOT NULL,
 "status" text NOT NULL,
 "reason" text NOT NULL,
 "created" bigint NOT NULL,
 "updated" bigint NOT NULL
);
CREATE TABLE "abuse_config" (
 "key" text PRIMARY KEY NOT NULL,
 "value" text NOT NULL
);
CREATE TABLE "review_events" (
 "id" text PRIMARY KEY NOT NULL,
 "owner" text NOT NULL,
 "network" text NOT NULL,
 "restaurant" text NOT NULL,
 "target" text NOT NULL,
 "flags" text NOT NULL,
 "created" bigint NOT NULL
);
CREATE TABLE "app_sessions" (
 "hash" text PRIMARY KEY NOT NULL,
 "user_id" text NOT NULL,
 "expires" bigint NOT NULL,
 "created" bigint NOT NULL
);
CREATE TABLE "app_users" (
 "id" text PRIMARY KEY NOT NULL,
 "google_uid" text NOT NULL,
 "email" text NOT NULL,
 "display_name" text NOT NULL,
 "created" bigint NOT NULL,
 "last_login" bigint NOT NULL
);
CREATE TABLE "account_access" (
 "google_uid" text PRIMARY KEY NOT NULL,
 "disabled" bigint NOT NULL DEFAULT 0,
 "revoked_before" bigint NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "offering_identity" ON "offerings" ("restaurant","type","name");
CREATE UNIQUE INDEX "one_review" ON "reviews" ("owner","offering");
CREATE UNIQUE INDEX "one_save" ON "saves" ("owner","kind","target");
CREATE UNIQUE INDEX "types_key" ON "food_types" ("key");
CREATE UNIQUE INDEX "one_vote" ON "votes" ("owner","review");
CREATE UNIQUE INDEX "one_report_per_target" ON "reports" ("owner","target");
CREATE INDEX "place_public_reviews" ON "place_reviews" ("restaurant","status","updated");
CREATE INDEX "abuse_account_window" ON "review_events" ("owner","created");
CREATE INDEX "abuse_network_window" ON "review_events" ("network","restaurant","created");
CREATE INDEX "abuse_review_flags" ON "review_events" ("target","created");
CREATE INDEX "app_session_expiry" ON "app_sessions" ("expires");
CREATE INDEX "app_session_user" ON "app_sessions" ("user_id");
CREATE UNIQUE INDEX "app_google_uid" ON "app_users" ("google_uid");
CREATE INDEX place_owner_restaurant ON place_reviews(owner,restaurant);
CREATE INDEX review_listing ON reviews(offering,status,date,updated);
CREATE INDEX vote_target ON votes(review);
CREATE INDEX history_review_date ON price_history(review,date);

CREATE TABLE place_review_quota(owner text NOT NULL, restaurant text NOT NULL, used bigint NOT NULL CHECK(used<=10), PRIMARY KEY(owner,restaurant));
CREATE FUNCTION enforce_place_review_quota() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE next_used bigint;
BEGIN
 IF TG_OP='UPDATE' AND NEW.owner=OLD.owner AND NEW.restaurant=OLD.restaurant THEN RETURN NEW; END IF;
 INSERT INTO place_review_quota(owner,restaurant,used) VALUES(NEW.owner,NEW.restaurant,1)
 ON CONFLICT(owner,restaurant) DO UPDATE SET used=place_review_quota.used+1 WHERE place_review_quota.used<10
 RETURNING used INTO next_used;
 IF next_used IS NULL THEN RAISE EXCEPTION 'PLACE_REVIEW_LIMIT'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER place_review_cap BEFORE INSERT OR UPDATE OF owner,restaurant ON place_reviews
 FOR EACH ROW EXECUTE FUNCTION enforce_place_review_quota();
