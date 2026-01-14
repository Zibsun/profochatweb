-- DROP SCHEMA public;

CREATE SCHEMA public AUTHORIZATION askhaturazbaev;

COMMENT ON SCHEMA public IS 'standard public schema';

-- DROP SEQUENCE public.account_account_id_seq;

CREATE SEQUENCE public.account_account_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.account_member_account_member_id_seq;

CREATE SEQUENCE public.account_member_account_member_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.bannedparticipant_id_seq;

CREATE SEQUENCE public.bannedparticipant_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.bot_bot_id_seq;

CREATE SEQUENCE public.bot_bot_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.conversation_conversation_id_seq;

CREATE SEQUENCE public.conversation_conversation_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.course_course_id_seq;

CREATE SEQUENCE public.course_course_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.course_deployment_deployment_id_seq;

CREATE SEQUENCE public.course_deployment_deployment_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.course_element_id_seq;

CREATE SEQUENCE public.course_element_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.course_group_group_id_seq;

CREATE SEQUENCE public.course_group_group_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.courseparticipant_id_seq;

CREATE SEQUENCE public.courseparticipant_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.enrollment_token_token_id_seq;

CREATE SEQUENCE public.enrollment_token_token_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.invite_link_invite_link_id_seq;

CREATE SEQUENCE public.invite_link_invite_link_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.run_run_id_seq1;

CREATE SEQUENCE public.run_run_id_seq1
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.schedule_schedule_id_seq;

CREATE SEQUENCE public.schedule_schedule_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.waiting_element_id_seq;

CREATE SEQUENCE public.waiting_element_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;-- public.account definition

-- Drop table

-- DROP TABLE public.account;

CREATE TABLE public.account (
	account_id serial4 NOT NULL,
	"name" text NOT NULL,
	slug text NOT NULL,
	plan text DEFAULT 'free'::text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	is_active bool DEFAULT true NULL,
	settings jsonb NULL,
	CONSTRAINT account_pkey PRIMARY KEY (account_id),
	CONSTRAINT account_slug_key UNIQUE (slug)
);
CREATE INDEX idx_account_active ON public.account USING btree (is_active);
CREATE INDEX idx_account_slug ON public.account USING btree (slug);


-- public.schema_migrations definition

-- Drop table

-- DROP TABLE public.schema_migrations;

CREATE TABLE public.schema_migrations (
	"version" varchar(255) NOT NULL,
	description text NULL,
	applied_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	applied_by text NULL,
	execution_time_ms int4 NULL,
	CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);
CREATE INDEX idx_schema_migrations_applied_at ON public.schema_migrations USING btree (applied_at);


-- public.account_member definition

-- Drop table

-- DROP TABLE public.account_member;

CREATE TABLE public.account_member (
	account_member_id serial4 NOT NULL,
	account_id int4 NOT NULL,
	telegram_user_id int8 NOT NULL,
	telegram_username text NULL,
	"role" text DEFAULT 'member'::text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	last_login_at timestamp NULL,
	is_active bool DEFAULT true NULL,
	CONSTRAINT account_member_account_id_telegram_user_id_key UNIQUE (account_id, telegram_user_id),
	CONSTRAINT account_member_pkey PRIMARY KEY (account_member_id),
	CONSTRAINT account_member_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(account_id) ON DELETE CASCADE
);
CREATE INDEX idx_account_member_account ON public.account_member USING btree (account_id);
CREATE INDEX idx_account_member_active ON public.account_member USING btree (account_id, is_active);
CREATE INDEX idx_account_member_telegram ON public.account_member USING btree (telegram_user_id);


-- public.bot definition

-- Drop table

-- DROP TABLE public.bot;

CREATE TABLE public.bot (
	bot_id serial4 NOT NULL,
	account_id int4 NOT NULL,
	bot_name text NOT NULL,
	bot_token text NOT NULL,
	display_name text NULL,
	description text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	is_active bool DEFAULT true NULL,
	settings jsonb NULL,
	CONSTRAINT bot_account_id_bot_name_key UNIQUE (account_id, bot_name),
	CONSTRAINT bot_bot_token_key UNIQUE (bot_token),
	CONSTRAINT bot_pkey PRIMARY KEY (bot_id),
	CONSTRAINT bot_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(account_id) ON DELETE CASCADE
);
CREATE INDEX idx_bot_account ON public.bot USING btree (account_id);
CREATE INDEX idx_bot_active ON public.bot USING btree (account_id, is_active);
CREATE INDEX idx_bot_name ON public.bot USING btree (bot_name);


-- public.conversation definition

-- Drop table

-- DROP TABLE public.conversation;

CREATE TABLE public.conversation (
	conversation_id serial4 NOT NULL,
	chat_id int8 NULL,
	username text NULL,
	course_code text NULL,
	element_id text NULL,
	element_type text NULL,
	"role" text NULL,
	"json" text NULL,
	report text NULL,
	score float4 NULL,
	maxscore float4 NULL,
	date_inserted timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	run_id int4 NULL,
	account_id int4 DEFAULT 1 NOT NULL,
	course_id int4 NULL,
	CONSTRAINT conversation_pkey PRIMARY KEY (conversation_id),
	CONSTRAINT conversation_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(account_id) ON DELETE CASCADE
);
CREATE INDEX idx_conversation_account ON public.conversation USING btree (account_id);
CREATE INDEX idx_conversation_chat ON public.conversation USING btree (chat_id);
CREATE INDEX idx_conversation_course ON public.conversation USING btree (course_id, account_id);
CREATE INDEX idx_conversation_date ON public.conversation USING btree (date_inserted DESC);
CREATE INDEX idx_conversation_element ON public.conversation USING btree (course_id, account_id, element_id);
CREATE INDEX idx_conversation_role ON public.conversation USING btree (run_id, role);
CREATE INDEX idx_conversation_run ON public.conversation USING btree (run_id);


-- public.course definition

-- Drop table

-- DROP TABLE public.course;

CREATE TABLE public.course (
	course_code text NOT NULL,
	bot_name text NOT NULL,
	creator_id int8 NULL,
	date_created timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	yaml text NULL,
	account_id int4 DEFAULT 1 NOT NULL,
	title text NULL,
	description text NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	metadata jsonb NULL,
	is_active bool DEFAULT true NULL,
	course_id serial4 NOT NULL,
	CONSTRAINT course_course_code_account_id_key UNIQUE (course_code, account_id),
	CONSTRAINT course_pkey PRIMARY KEY (course_id),
	CONSTRAINT course_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(account_id) ON DELETE CASCADE
);
CREATE INDEX idx_course_account ON public.course USING btree (account_id);
CREATE INDEX idx_course_active ON public.course USING btree (account_id, is_active);
CREATE INDEX idx_course_coursecode_botname ON public.course USING btree (course_code, bot_name);
CREATE INDEX idx_course_created ON public.course USING btree (account_id, date_created DESC);


-- public.course_element definition

-- Drop table

-- DROP TABLE public.course_element;

CREATE TABLE public.course_element (
	course_element_id int8 DEFAULT nextval('course_element_id_seq'::regclass) NOT NULL,
	element_id text NULL,
	"json" text NULL,
	element_type text NULL,
	course_code text NULL,
	bot_name text NULL,
	account_id int4 DEFAULT 1 NOT NULL,
	course_id int4 NOT NULL,
	CONSTRAINT course_element_pkey PRIMARY KEY (course_element_id),
	CONSTRAINT course_element_course_fkey FOREIGN KEY (course_id) REFERENCES public.course(course_id) ON DELETE CASCADE
);
CREATE INDEX idx_course_element_course ON public.course_element USING btree (course_id, account_id);
CREATE INDEX idx_course_element_order ON public.course_element USING btree (course_id, account_id, course_element_id);
CREATE INDEX idx_course_element_type ON public.course_element USING btree (course_id, account_id, element_type);


-- public.course_group definition

-- Drop table

-- DROP TABLE public.course_group;

CREATE TABLE public.course_group (
	course_group_id int4 DEFAULT nextval('course_group_group_id_seq'::regclass) NOT NULL,
	account_id int4 NOT NULL,
	bot_id int4 NOT NULL,
	course_id int4 NOT NULL,
	"name" text NOT NULL,
	description text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	is_active bool DEFAULT true NULL,
	settings jsonb NULL,
	CONSTRAINT course_group_bot_id_course_id_name_key UNIQUE (bot_id, course_id, name),
	CONSTRAINT course_group_pkey PRIMARY KEY (course_group_id),
	CONSTRAINT course_group_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(account_id) ON DELETE CASCADE,
	CONSTRAINT course_group_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bot(bot_id) ON DELETE CASCADE,
	CONSTRAINT course_group_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.course(course_id) ON DELETE CASCADE
);
CREATE INDEX idx_course_group_account ON public.course_group USING btree (account_id);
CREATE INDEX idx_course_group_active ON public.course_group USING btree (bot_id, is_active);
CREATE INDEX idx_course_group_bot ON public.course_group USING btree (bot_id);
CREATE INDEX idx_course_group_course ON public.course_group USING btree (course_id);


-- public.courseparticipants definition

-- Drop table

-- DROP TABLE public.courseparticipants;

CREATE TABLE public.courseparticipants (
	courseparticipant_id int4 DEFAULT nextval('courseparticipant_id_seq'::regclass) NOT NULL,
	course_code text NOT NULL,
	username text NOT NULL,
	account_id int4 DEFAULT 1 NOT NULL,
	chat_id int8 NULL,
	added_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	added_by int8 NULL,
	course_id int4 NOT NULL,
	CONSTRAINT courseparticipants_pkey PRIMARY KEY (courseparticipant_id),
	CONSTRAINT courseparticipants_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(account_id) ON DELETE CASCADE,
	CONSTRAINT courseparticipants_course_fkey FOREIGN KEY (course_id) REFERENCES public.course(course_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX courseparticipants_unique ON public.courseparticipants USING btree (course_id, account_id, COALESCE(chat_id, (0)::bigint), COALESCE(username, ''::text));
CREATE INDEX idx_courseparticipants_account ON public.courseparticipants USING btree (account_id);
CREATE INDEX idx_courseparticipants_chat ON public.courseparticipants USING btree (chat_id);
CREATE INDEX idx_courseparticipants_course ON public.courseparticipants USING btree (course_id, account_id);
CREATE INDEX idx_courseparticipants_coursecode ON public.courseparticipants USING btree (course_code, account_id);
CREATE INDEX idx_courseparticipants_username ON public.courseparticipants USING btree (username);


-- public.gen_settings definition

-- Drop table

-- DROP TABLE public.gen_settings;

CREATE TABLE public.gen_settings (
	id int4 NOT NULL,
	bot_name text NOT NULL,
	s_key text NOT NULL,
	s_value text NULL,
	account_id int4 NULL,
	bot_id int4 NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT gen_settings_pkey PRIMARY KEY (id),
	CONSTRAINT gen_settings_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(account_id) ON DELETE CASCADE,
	CONSTRAINT gen_settings_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bot(bot_id) ON DELETE CASCADE
);
CREATE INDEX idx_gen_settings_account ON public.gen_settings USING btree (account_id);
CREATE INDEX idx_gen_settings_bot ON public.gen_settings USING btree (bot_id);
CREATE INDEX idx_gen_settings_key ON public.gen_settings USING btree (account_id, bot_id, s_key);


-- public.invite_link definition

-- Drop table

-- DROP TABLE public.invite_link;

CREATE TABLE public.invite_link (
	invite_link_id serial4 NOT NULL,
	course_group_id int4 NOT NULL,
	"token" text NOT NULL,
	max_uses int4 NULL,
	current_uses int4 DEFAULT 0 NULL,
	expires_at timestamp NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	created_by int8 NULL,
	is_active bool DEFAULT true NULL,
	metadata jsonb NULL,
	CONSTRAINT invite_link_pkey PRIMARY KEY (invite_link_id),
	CONSTRAINT invite_link_token_key UNIQUE (token),
	CONSTRAINT invite_link_course_group_id_fkey FOREIGN KEY (course_group_id) REFERENCES public.course_group(course_group_id) ON DELETE CASCADE
);
CREATE INDEX idx_invite_link_active ON public.invite_link USING btree (course_group_id, is_active);
CREATE INDEX idx_invite_link_course_group ON public.invite_link USING btree (course_group_id);
CREATE INDEX idx_invite_link_expires ON public.invite_link USING btree (expires_at) WHERE (expires_at IS NOT NULL);
CREATE INDEX idx_invite_link_token ON public.invite_link USING btree (token);


-- public.schedule definition

-- Drop table

-- DROP TABLE public.schedule;

CREATE TABLE public.schedule (
	schedule_id serial4 NOT NULL,
	course_group_id int4 NOT NULL,
	schedule_type text NOT NULL,
	schedule_config jsonb NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	is_active bool DEFAULT true NULL,
	CONSTRAINT schedule_course_group_id_key UNIQUE (course_group_id),
	CONSTRAINT schedule_pkey PRIMARY KEY (schedule_id),
	CONSTRAINT schedule_course_group_id_fkey FOREIGN KEY (course_group_id) REFERENCES public.course_group(course_group_id) ON DELETE CASCADE
);
CREATE INDEX idx_schedule_active ON public.schedule USING btree (course_group_id, is_active);
CREATE INDEX idx_schedule_course_group ON public.schedule USING btree (course_group_id);


-- public.waiting_element definition

-- Drop table

-- DROP TABLE public.waiting_element;

CREATE TABLE public.waiting_element (
	waiting_element_id int4 DEFAULT nextval('waiting_element_id_seq'::regclass) NOT NULL,
	chat_id int8 NOT NULL,
	waiting_till_date timestamp NULL,
	is_waiting bool NULL,
	element_id text NULL,
	course_code text NULL,
	botname text NULL,
	account_id int4 DEFAULT 1 NOT NULL,
	bot_id int4 NULL,
	run_id int4 NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	course_id int4 NULL,
	CONSTRAINT waiting_element_pkey PRIMARY KEY (waiting_element_id),
	CONSTRAINT waiting_element_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(account_id) ON DELETE CASCADE,
	CONSTRAINT waiting_element_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bot(bot_id) ON DELETE CASCADE
);
CREATE INDEX idx_waiting_account ON public.waiting_element USING btree (account_id);
CREATE INDEX idx_waiting_active ON public.waiting_element USING btree (is_waiting, waiting_till_date) WHERE (is_waiting = true);
CREATE INDEX idx_waiting_bot ON public.waiting_element USING btree (bot_id);
CREATE INDEX idx_waiting_date ON public.waiting_element USING btree (waiting_till_date);
CREATE INDEX idx_waiting_run ON public.waiting_element USING btree (run_id);


-- public.bannedparticipants definition

-- Drop table

-- DROP TABLE public.bannedparticipants;

CREATE TABLE public.bannedparticipants (
	bannedparticipant_id int4 DEFAULT nextval('bannedparticipant_id_seq'::regclass) NOT NULL,
	botname text NOT NULL,
	chat_id int8 NOT NULL,
	banned_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	ban_reason text NULL,
	excluded int2 NULL,
	account_id int4 DEFAULT 1 NOT NULL,
	bot_id int4 NULL,
	metadata jsonb NULL,
	CONSTRAINT bannedparticipants_pkey PRIMARY KEY (bannedparticipant_id),
	CONSTRAINT bannedparticipants_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(account_id) ON DELETE CASCADE,
	CONSTRAINT bannedparticipants_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bot(bot_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX bannedparticipants_unique ON public.bannedparticipants USING btree (bot_id, chat_id, excluded);
CREATE INDEX idx_banned_account ON public.bannedparticipants USING btree (account_id);
CREATE INDEX idx_banned_active ON public.bannedparticipants USING btree (bot_id, excluded) WHERE (excluded = 0);
CREATE INDEX idx_banned_bot ON public.bannedparticipants USING btree (bot_id);
CREATE INDEX idx_banned_chat ON public.bannedparticipants USING btree (bot_id, chat_id, excluded);
CREATE INDEX idx_bannedparticipants_3 ON public.bannedparticipants USING btree (botname, chat_id, excluded);