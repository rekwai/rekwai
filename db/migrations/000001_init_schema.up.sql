--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4 (Debian 17.4-1.pgdg120+2)
-- Dumped by pg_dump version 17.4 (Debian 17.4-1.pgdg120+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


SET default_tablespace = '';

SET default_table_access_method = heap;


--
-- Name: client; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    key character varying(6) NOT NULL,
    creation_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: extracted_requirement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.extracted_requirement (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    document_name character varying(255) NOT NULL,
    description text NOT NULL,
    implementation_status character varying(100),
    implementation_description text,
    extraction_timestamp timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    organization_id uuid NOT NULL,
    product_id uuid NOT NULL,
    requirement_verification text,
    "order" real NOT NULL
);


--
-- Name: extracted_requirement_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.extracted_requirement_type (
    extracted_requirement_id uuid NOT NULL,
    type character varying NOT NULL
);


--
-- Name: organization; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    creation_date timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    creation_date timestamp(3) with time zone DEFAULT now() NOT NULL,
    organization_id uuid NOT NULL,
    product_key character varying(6) NOT NULL,
    current_requirement_key_number integer DEFAULT 1 NOT NULL,
    current_requirement_document_key_number integer DEFAULT 1 NOT NULL,
    current_questionnaire_key_number integer DEFAULT 1 NOT NULL
);


--
-- Name: questionnaire; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questionnaire (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_name character varying(512) NOT NULL,
    file_type character varying(128) NOT NULL,
    creation_date timestamp(3) with time zone DEFAULT now() NOT NULL,
    upload_status character varying(32) NOT NULL,
    upload_timestamp timestamp with time zone DEFAULT now() NOT NULL,
    product_id uuid NOT NULL,
    s3_object_key character varying(512) NOT NULL,
    organization_id uuid NOT NULL,
    client_id uuid NOT NULL,
    key character varying(255) NOT NULL
);


--
-- Name: questionnaire_question; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questionnaire_question (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    questionnaire_id uuid NOT NULL,
    question_text text NOT NULL,
    status character varying(50) DEFAULT 'extracted'::character varying NOT NULL,
    generated_answer text,
    reviewed_answer text,
    review_status character varying(50) DEFAULT 'pending'::character varying,
    extraction_timestamp timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    generation_timestamp timestamp with time zone,
    review_timestamp timestamp with time zone,
    "order" real NOT NULL,
    answer_type character varying(10),
    CONSTRAINT questionnaire_question_answer_type_check CHECK (answer_type IN ('yes', 'no', 'n/a'))
);


--
-- Name: requirement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requirement (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    description text NOT NULL,
    embedding public.vector(1536) NOT NULL,
    implementation_description text NOT NULL,
    implementation_status character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    product_id uuid NOT NULL,
    requirement_verification text,
    organization_id uuid NOT NULL,
    requirement_key character varying(32) NOT NULL
);


--
-- Name: requirement_document; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requirement_document (
    id uuid NOT NULL,
    s3_object_key character varying(500) NOT NULL,
    organization_id uuid NOT NULL,
    product_id uuid NOT NULL,
    original_filename character varying(255) NOT NULL,
    file_extension character varying(10) NOT NULL,
    content_size_bytes bigint NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    document_key character varying(32) NOT NULL
);


--
-- Name: requirement_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requirement_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requirement_id uuid NOT NULL,
    change_timestamp timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    change_type character varying(10) NOT NULL,
    user_id character varying(255),
    product_id uuid NOT NULL,
    new_description text,
    previous_description text,
    new_implementation_description text,
    previous_implementation_description text,
    new_implementation_status character varying(255),
    previous_implementation_status character varying(255),
    new_requirement_verification text,
    previous_requirement_verification text,
    new_types json,
    previous_types json,
    CONSTRAINT requirement_history_change_type_check CHECK (((change_type)::text = ANY (ARRAY[('CREATE'::character varying)::text, ('UPDATE'::character varying)::text, ('DELETE'::character varying)::text])))
);


--
-- Name: requirement_link_extraction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requirement_link_extraction (
    requirement_id uuid NOT NULL,
    extracted_requirement_id uuid NOT NULL
);


--
-- Name: requirement_link_question; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requirement_link_question (
    requirement_id uuid NOT NULL,
    question_id uuid NOT NULL
);


--
-- Name: requirement_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requirement_type (
    requirement_id uuid NOT NULL,
    type character varying NOT NULL
);


--
-- Name: client client_organization_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client
    ADD CONSTRAINT client_organization_key_unique UNIQUE (organization_id, key);


--
-- Name: client client_organization_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client
    ADD CONSTRAINT client_organization_name_unique UNIQUE (organization_id, name);


--
-- Name: client client_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client
    ADD CONSTRAINT client_pkey PRIMARY KEY (id);


--
-- Name: requirement_document document_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_document
    ADD CONSTRAINT document_pkey PRIMARY KEY (id);


--
-- Name: extracted_requirement extracted_requirement_document_order_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extracted_requirement
    ADD CONSTRAINT extracted_requirement_document_order_unique UNIQUE (document_id, "order");


--
-- Name: extracted_requirement extracted_requirement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extracted_requirement
    ADD CONSTRAINT extracted_requirement_pkey PRIMARY KEY (id);


--
-- Name: extracted_requirement_type extracted_requirement_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extracted_requirement_type
    ADD CONSTRAINT extracted_requirement_type_pkey PRIMARY KEY (extracted_requirement_id, type);


--
-- Name: organization organization_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization
    ADD CONSTRAINT organization_pkey PRIMARY KEY (id);


--
-- Name: product product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_pkey PRIMARY KEY (id);


--
-- Name: questionnaire questionnaire_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire
    ADD CONSTRAINT questionnaire_pkey PRIMARY KEY (id);


--
-- Name: questionnaire_question questionnaire_question_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_question
    ADD CONSTRAINT questionnaire_question_pkey PRIMARY KEY (id);


--
-- Name: questionnaire_question questionnaire_question_questionnaire_order_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_question
    ADD CONSTRAINT questionnaire_question_questionnaire_order_unique UNIQUE (questionnaire_id, "order");


--
-- Name: requirement_history requirement_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_history
    ADD CONSTRAINT requirement_history_pkey PRIMARY KEY (id);


--
-- Name: requirement_link_extraction requirement_link_extraction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_link_extraction
    ADD CONSTRAINT requirement_link_extraction_pkey PRIMARY KEY (requirement_id, extracted_requirement_id);


--
-- Name: requirement_link_question requirement_link_question_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_link_question
    ADD CONSTRAINT requirement_link_question_pkey PRIMARY KEY (requirement_id, question_id);


--
-- Name: requirement requirement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement
    ADD CONSTRAINT requirement_pkey PRIMARY KEY (id);


--
-- Name: requirement_type requirement_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_type
    ADD CONSTRAINT requirement_type_pkey PRIMARY KEY (requirement_id, type);


--
-- Name: questionnaire unique_questionnaire_key_per_org; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire
    ADD CONSTRAINT unique_questionnaire_key_per_org UNIQUE (organization_id, key);


--
-- Name: product uq_product_org_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT uq_product_org_key UNIQUE (organization_id, product_key);


--
-- Name: requirement_document uq_requirement_document_org_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_document
    ADD CONSTRAINT uq_requirement_document_org_key UNIQUE (organization_id, document_key);


--
-- Name: requirement uq_requirement_org_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement
    ADD CONSTRAINT uq_requirement_org_key UNIQUE (organization_id, requirement_key);


--
-- Name: idx_client_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_organization_id ON public.client USING btree (organization_id);


--
-- Name: idx_extracted_requirement_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_extracted_requirement_document_id ON public.extracted_requirement USING btree (document_id);


--
-- Name: idx_extracted_requirement_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_extracted_requirement_order ON public.extracted_requirement USING btree (document_id, "order");


--
-- Name: idx_extracted_requirement_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_extracted_requirement_organization_id ON public.extracted_requirement USING btree (organization_id);


--
-- Name: idx_extracted_requirement_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_extracted_requirement_product_id ON public.extracted_requirement USING btree (product_id);


--
-- Name: idx_extracted_requirement_type_extracted_requirement_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_extracted_requirement_type_extracted_requirement_id ON public.extracted_requirement_type USING btree (extracted_requirement_id);


--
-- Name: idx_extracted_requirement_type_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_extracted_requirement_type_type ON public.extracted_requirement_type USING btree (type);


--
-- Name: idx_questionnaire_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questionnaire_client_id ON public.questionnaire USING btree (client_id);


--
-- Name: idx_questionnaire_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questionnaire_organization_id ON public.questionnaire USING btree (organization_id);


--
-- Name: idx_questionnaire_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questionnaire_product_id ON public.questionnaire USING btree (product_id);


--
-- Name: idx_questionnaire_question_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questionnaire_question_order ON public.questionnaire_question USING btree (questionnaire_id, "order");


--
-- Name: idx_requirement_document_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requirement_document_organization_id ON public.requirement_document USING btree (organization_id);


--
-- Name: idx_requirement_document_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requirement_document_product_id ON public.requirement_document USING btree (product_id);


--
-- Name: idx_requirement_embedding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requirement_embedding ON public.requirement USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: idx_requirement_history_change_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requirement_history_change_timestamp ON public.requirement_history USING btree (change_timestamp);


--
-- Name: idx_requirement_history_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requirement_history_product_id ON public.requirement_history USING btree (product_id);


--
-- Name: idx_requirement_history_requirement_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requirement_history_requirement_id ON public.requirement_history USING btree (requirement_id);


--
-- Name: idx_requirement_link_extraction_extracted_requirement_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requirement_link_extraction_extracted_requirement_id ON public.requirement_link_extraction USING btree (extracted_requirement_id);


--
-- Name: idx_requirement_link_extraction_requirement_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requirement_link_extraction_requirement_id ON public.requirement_link_extraction USING btree (requirement_id);


--
-- Name: idx_requirement_link_question_question_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requirement_link_question_question_id ON public.requirement_link_question USING btree (question_id);


--
-- Name: idx_requirement_link_question_requirement_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requirement_link_question_requirement_id ON public.requirement_link_question USING btree (requirement_id);


--
-- Name: idx_requirement_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requirement_product_id ON public.requirement USING btree (product_id);


--
-- Name: idx_requirement_type_requirement_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requirement_type_requirement_id ON public.requirement_type USING btree (requirement_id);


--
-- Name: idx_requirement_type_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requirement_type_type ON public.requirement_type USING btree (type);


--
-- Name: requirement_requirement_embedding_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX requirement_requirement_embedding_idx ON public.requirement USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: client fk_client_organization; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client
    ADD CONSTRAINT fk_client_organization FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: extracted_requirement fk_extracted_requirement_document; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extracted_requirement
    ADD CONSTRAINT fk_extracted_requirement_document FOREIGN KEY (document_id) REFERENCES public.requirement_document(id) ON DELETE CASCADE;


--
-- Name: extracted_requirement fk_extracted_requirement_organization; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extracted_requirement
    ADD CONSTRAINT fk_extracted_requirement_organization FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: extracted_requirement fk_extracted_requirement_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extracted_requirement
    ADD CONSTRAINT fk_extracted_requirement_product FOREIGN KEY (product_id) REFERENCES public.product(id) ON DELETE CASCADE;


--
-- Name: extracted_requirement_type fk_extracted_requirement_type_extracted_requirement_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extracted_requirement_type
    ADD CONSTRAINT fk_extracted_requirement_type_extracted_requirement_id FOREIGN KEY (extracted_requirement_id) REFERENCES public.extracted_requirement(id) ON DELETE CASCADE;


--
-- Name: product fk_product_organization; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT fk_product_organization FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: questionnaire fk_questionnaire_client; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire
    ADD CONSTRAINT fk_questionnaire_client FOREIGN KEY (client_id) REFERENCES public.client(id);


--
-- Name: questionnaire fk_questionnaire_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire
    ADD CONSTRAINT fk_questionnaire_product FOREIGN KEY (product_id) REFERENCES public.product(id) ON DELETE CASCADE;


--
-- Name: requirement_history fk_requirement; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_history
    ADD CONSTRAINT fk_requirement FOREIGN KEY (requirement_id) REFERENCES public.requirement(id) ON DELETE CASCADE;


--
-- Name: requirement_document fk_requirement_document_organization; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_document
    ADD CONSTRAINT fk_requirement_document_organization FOREIGN KEY (organization_id) REFERENCES public.organization(id);


--
-- Name: requirement_document fk_requirement_document_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_document
    ADD CONSTRAINT fk_requirement_document_product FOREIGN KEY (product_id) REFERENCES public.product(id) ON DELETE CASCADE;


--
-- Name: requirement_history fk_requirement_history_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_history
    ADD CONSTRAINT fk_requirement_history_product FOREIGN KEY (product_id) REFERENCES public.product(id) ON DELETE CASCADE;


--
-- Name: requirement_link_extraction fk_requirement_link_extraction_extracted_requirement; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_link_extraction
    ADD CONSTRAINT fk_requirement_link_extraction_extracted_requirement FOREIGN KEY (extracted_requirement_id) REFERENCES public.extracted_requirement(id) ON DELETE CASCADE;


--
-- Name: requirement_link_extraction fk_requirement_link_extraction_requirement; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_link_extraction
    ADD CONSTRAINT fk_requirement_link_extraction_requirement FOREIGN KEY (requirement_id) REFERENCES public.requirement(id) ON DELETE CASCADE;


--
-- Name: requirement_link_question fk_requirement_link_question_question; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_link_question
    ADD CONSTRAINT fk_requirement_link_question_question FOREIGN KEY (question_id) REFERENCES public.questionnaire_question(id) ON DELETE CASCADE;


--
-- Name: requirement_link_question fk_requirement_link_question_requirement; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_link_question
    ADD CONSTRAINT fk_requirement_link_question_requirement FOREIGN KEY (requirement_id) REFERENCES public.requirement(id) ON DELETE CASCADE;


--
-- Name: requirement fk_requirement_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement
    ADD CONSTRAINT fk_requirement_product FOREIGN KEY (product_id) REFERENCES public.product(id) ON DELETE CASCADE;


--
-- Name: requirement_type fk_requirement_type_requirement_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_type
    ADD CONSTRAINT fk_requirement_type_requirement_id FOREIGN KEY (requirement_id) REFERENCES public.requirement(id) ON DELETE CASCADE;


--
-- Name: questionnaire_question questionnaire_question_questionnaire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_question
    ADD CONSTRAINT questionnaire_question_questionnaire_id_fkey FOREIGN KEY (questionnaire_id) REFERENCES public.questionnaire(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--
