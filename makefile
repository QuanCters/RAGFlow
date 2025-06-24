run:
	python3 -m api.ragflow_server

up:
	docker compose -f docker/docker-compose-base.yml up -d

down: 
	docker compose -f docker/docker-compose-base.yml down -v 
.PHONY: run up down
