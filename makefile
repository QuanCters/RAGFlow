run:
	python3 -m api.ragflow_server

up:
	docker compose -f docker/docker-compose-base.yml up -d
.PHONY: run up

