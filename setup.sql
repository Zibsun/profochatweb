DROP TABLE public.conversation;
DROP TABLE public.run;

CREATE SEQUENCE IF NOT EXISTS conversation_conversation_id_seq;
CREATE TABLE public.conversation (
    "conversation_id" int4 NOT NULL DEFAULT nextval('conversation_conversation_id_seq'::regclass),
    "chat_id" int8,
    "username" text,
    "course_id" text,
    "element_id" text,
    "element_type" text,
    "role" text,
    "json" text,
    "report" text,
    "score" float4,
    "maxscore" float4,
    "date_inserted" timestamp DEFAULT CURRENT_TIMESTAMP,
    "run_id" int4,
    PRIMARY KEY ("conversation_id")
);

CREATE SEQUENCE IF NOT EXISTS run_run_id_seq1;
CREATE TABLE public.run (
    "run_id" int4 NOT NULL DEFAULT nextval('run_run_id_seq1'::regclass),
    "chat_id" int8,
    "username" text,
    "botname" text,
    "course_id" text,
    "date_inserted" timestamp DEFAULT CURRENT_TIMESTAMP,
    "utm_source" text NULL,    
    "utm_campaign" text NULL,
    "is_ended" bool NULL,
    PRIMARY KEY ("run_id")
);

CREATE SEQUENCE IF NOT EXISTS waiting_element_id_seq;
CREATE TABLE public.waiting_element (
    "waiting_element_id" int4 NOT NULL DEFAULT nextval('waiting_element_id_seq'::regclass),
    "chat_id" int8 NOT NULL,
    "waiting_till_date" timestamp,
    "is_waiting" bool,
    "element_id" text,
    "course_id" text,
    "botname" text,
    PRIMARY KEY ("waiting_element_id")
);

CREATE TABLE public.course (
    "course_id" text NOT NULL,
    "bot_name" text NOT NULL,
    "creator_id" int8,
    "date_created" timestamp DEFAULT CURRENT_TIMESTAMP,
    "yaml" text,
    PRIMARY KEY ("course_id", "bot_name")
);

CREATE SEQUENCE IF NOT EXISTS course_element_id_seq;
CREATE TABLE public.course_element (
    "course_element_id" int8 NOT NULL DEFAULT nextval('course_element_id_seq'::regclass),
    "element_id" text,
    "json" text,
    "element_type" text,
    "course_id" text,
    "bot_name" text,
    PRIMARY KEY ("course_element_id")
);
CREATE INDEX idx_course_courseid_botname ON course (course_id, bot_name);

CREATE SEQUENCE IF NOT EXISTS courseparticipant_id_seq;
CREATE TABLE public.courseparticipants (
    "courseparticipant_id" int4 NOT NULL DEFAULT nextval('courseparticipant_id_seq'::regclass),
    "course_id" text NOT NULL,
    "username" text NOT NULL,
    PRIMARY KEY ("courseparticipant_id")
);
CREATE INDEX idx_courseparticipants_2 ON courseparticipants (course_id, username);

CREATE SEQUENCE IF NOT EXISTS bannedparticipant_id_seq;
CREATE TABLE public.bannedparticipants (
    "bannedparticipant_id" int4 NOT NULL DEFAULT nextval('bannedparticipant_id_seq'::regclass),
    "botname" text NOT NULL,
    "chat_id" int8 NOT NULL,
    "banned_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "ban_reason" text NULL,
    "excluded" smallint NULL,
    PRIMARY KEY ("bannedparticipant_id")
);
CREATE INDEX idx_bannedparticipants_3 ON bannedparticipants (botname, chat_id, excluded);

CREATE TABLE public.gen_settings (
    "id" int4 PRIMARY KEY,
    "bot_name" text not null,
    "s_key" text not null,
    "s_value" text
);