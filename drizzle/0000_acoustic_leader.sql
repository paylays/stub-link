CREATE TABLE "clicks" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "clicks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"link_id" bigint NOT NULL,
	"clicked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"visitor_hash" varchar(32) NOT NULL,
	"device_type" varchar(16) NOT NULL,
	"browser" varchar(64) NOT NULL,
	"os" varchar(64) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "links_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"code" varchar(7) NOT NULL,
	"target_url" text NOT NULL,
	"stats_token_hash" varchar(64) NOT NULL,
	"creator_ip_hash" varchar(32) NOT NULL,
	"expires_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "links_code_unique" UNIQUE("code"),
	CONSTRAINT "links_stats_token_hash_unique" UNIQUE("stats_token_hash"),
	CONSTRAINT "links_target_url_len" CHECK (char_length("links"."target_url") <= 2048)
);
--> statement-breakpoint
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clicks_link_clicked_idx" ON "clicks" USING btree ("link_id","clicked_at");--> statement-breakpoint
CREATE INDEX "links_creator_ip_created_idx" ON "links" USING btree ("creator_ip_hash","created_at");