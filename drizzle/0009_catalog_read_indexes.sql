CREATE INDEX IF NOT EXISTS review_listing ON reviews(offering,status,date,updated);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS vote_target ON votes(review);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS history_review_date ON price_history(review,date);
