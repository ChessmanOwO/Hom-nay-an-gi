-- Retain all existing reviews, including soft-deleted rows.
DROP INDEX IF EXISTS one_place_review;
CREATE INDEX place_owner_restaurant ON place_reviews(owner,restaurant);
-- Database enforces the lifetime cap even for concurrent requests and merges.
CREATE TRIGGER place_review_insert_cap BEFORE INSERT ON place_reviews
WHEN (SELECT COUNT(*) FROM place_reviews WHERE owner=NEW.owner AND restaurant=NEW.restaurant)>=10
BEGIN SELECT RAISE(ABORT, 'PLACE_REVIEW_LIMIT'); END;
CREATE TRIGGER place_review_move_cap BEFORE UPDATE OF owner,restaurant ON place_reviews
WHEN (NEW.owner<>OLD.owner OR NEW.restaurant<>OLD.restaurant)
AND (SELECT COUNT(*) FROM place_reviews WHERE owner=NEW.owner AND restaurant=NEW.restaurant)>=10
BEGIN SELECT RAISE(ABORT, 'PLACE_REVIEW_LIMIT'); END;
