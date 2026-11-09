-- Retain all existing reviews, counting only active non-deleted reviews towards cap.
DROP INDEX IF EXISTS one_place_review;
CREATE INDEX IF NOT EXISTS place_owner_restaurant ON place_reviews(owner,restaurant);
DROP TRIGGER IF EXISTS place_review_insert_cap;
DROP TRIGGER IF EXISTS place_review_move_cap;
CREATE TRIGGER place_review_insert_cap BEFORE INSERT ON place_reviews
WHEN (SELECT COUNT(*) FROM place_reviews WHERE owner=NEW.owner AND restaurant=NEW.restaurant AND status!='deleted')>=10
BEGIN SELECT RAISE(ABORT, 'PLACE_REVIEW_LIMIT'); END;
CREATE TRIGGER place_review_move_cap BEFORE UPDATE OF owner,restaurant ON place_reviews
WHEN (NEW.owner<>OLD.owner OR NEW.restaurant<>OLD.restaurant)
AND (SELECT COUNT(*) FROM place_reviews WHERE owner=NEW.owner AND restaurant=NEW.restaurant AND status!='deleted')>=10
BEGIN SELECT RAISE(ABORT, 'PLACE_REVIEW_LIMIT'); END;
