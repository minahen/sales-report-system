PROJECT_ID := project-56785728-c1d1-40d7-9cc
REGION     := asia-northeast1
SERVICE    := sales-report-system
IMAGE      := $(REGION)-docker.pkg.dev/$(PROJECT_ID)/$(SERVICE)/app

.PHONY: help build push deploy deploy-prod logs db/migrate db/migrate-prod db/seed db/studio

help: ## コマンド一覧を表示
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Dockerイメージをビルド
	docker build -t $(IMAGE):$(TAG) .

push: ## Artifact RegistryへDockerイメージをプッシュ
	docker push $(IMAGE):$(TAG)

deploy: ## Cloud Runへデプロイ（staging）
	gcloud run deploy $(SERVICE)-staging \
		--image $(IMAGE):$(TAG) \
		--region $(REGION) \
		--project $(PROJECT_ID) \
		--platform managed \
		--allow-unauthenticated \
		--set-env-vars NODE_ENV=staging

deploy-prod: ## Cloud Runへデプロイ（production）
	gcloud run deploy $(SERVICE) \
		--image $(IMAGE):$(TAG) \
		--region $(REGION) \
		--project $(PROJECT_ID) \
		--platform managed \
		--allow-unauthenticated \
		--set-env-vars NODE_ENV=production

logs: ## Cloud Runのログを表示
	gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$(SERVICE)" \
		--project $(PROJECT_ID) \
		--limit 100 \
		--format "value(textPayload)"

db/migrate: ## DBマイグレーションを実行（開発環境のみ）
	npx prisma migrate dev

db/migrate-prod: ## DBマイグレーションを実行（本番・CI用）
	npx prisma migrate deploy

db/seed: ## シードデータを投入
	npx prisma db seed

db/studio: ## Prisma Studioを起動
	npx prisma studio
