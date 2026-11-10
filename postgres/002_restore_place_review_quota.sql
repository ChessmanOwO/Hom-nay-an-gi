LOCK TABLE place_reviews IN SHARE ROW EXCLUSIVE MODE;

DELETE FROM place_review_quota;
INSERT INTO place_review_quota(owner, restaurant, used)
SELECT owner, restaurant, COUNT(*)
FROM place_reviews
WHERE status <> 'deleted'
GROUP BY owner, restaurant;

DROP TRIGGER IF EXISTS place_review_cap ON place_reviews;

CREATE OR REPLACE FUNCTION enforce_place_review_quota() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
 old_active boolean := false;
 new_active boolean := false;
 same_active boolean := false;
 next_used bigint;
BEGIN
 IF TG_OP <> 'INSERT' THEN old_active := OLD.status <> 'deleted'; END IF;
 IF TG_OP <> 'DELETE' THEN new_active := NEW.status <> 'deleted'; END IF;
 IF TG_OP = 'UPDATE' THEN
   same_active := old_active AND new_active AND OLD.owner=NEW.owner AND OLD.restaurant=NEW.restaurant;
 END IF;

 IF old_active AND NOT same_active THEN
   UPDATE place_review_quota SET used=GREATEST(used-1,0)
    WHERE owner=OLD.owner AND restaurant=OLD.restaurant;
 END IF;

 IF new_active AND NOT same_active THEN
   INSERT INTO place_review_quota(owner,restaurant,used) VALUES(NEW.owner,NEW.restaurant,1)
   ON CONFLICT(owner,restaurant) DO UPDATE SET used=place_review_quota.used+1 WHERE place_review_quota.used<10
   RETURNING used INTO next_used;
   IF next_used IS NULL THEN RAISE EXCEPTION 'PLACE_REVIEW_LIMIT'; END IF;
 END IF;

 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;

CREATE TRIGGER place_review_cap BEFORE INSERT OR UPDATE OR DELETE ON place_reviews
 FOR EACH ROW EXECUTE FUNCTION enforce_place_review_quota();
