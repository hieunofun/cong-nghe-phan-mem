pipeline {
    agent any
    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 25, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10', artifactNumToKeepStr: '5'))
    }
    parameters {
        choice(name: 'SOURCE_MODE', choices: ['SCM', 'LOCAL'], description: 'SCM: checkout từ Git. LOCAL: bản làm việc hiện tại để dự phòng offline.')
        string(name: 'GIT_URL', defaultValue: 'https://github.com/hieunofun/cong-nghe-phan-mem.git', description: 'Repository Git chính thức của nhóm.')
        string(name: 'GIT_BRANCH', defaultValue: 'main', description: 'Nhánh cần kiểm thử và triển khai.')
        string(name: 'GIT_COMMIT', defaultValue: '', description: 'SHA từ webhook; để trống để lấy commit mới nhất của nhánh.')
        string(name: 'WEBHOOK_DELIVERY', defaultValue: '', description: 'Mã delivery GitHub để đối chiếu lần chạy tự động.')
        booleanParam(name: 'DEPLOY', defaultValue: true, description: 'Triển khai Web/AI/Gateway sau khi qua toàn bộ cổng chất lượng.')
        booleanParam(name: 'PUSH_REGISTRY', defaultValue: false, description: 'Tùy chọn đẩy Docker image lên Registry (cần cấu hình REGISTRY_IMAGE_PREFIX).')
    }

    triggers { pollSCM('H/5 * * * *') }
    environment {
        COMPOSE_PROJECT_NAME = "${env.JOBLINK_COMPOSE_PROJECT ?: 'trienkhaiphanmemcki'}"
        JOBLINK_WEB_IMAGE = "joblink-web:${BUILD_TAG}"
        JOBLINK_AI_IMAGE = "joblink-ai:${BUILD_TAG}"
        JOBLINK_GATEWAY_IMAGE = "joblink-gateway:${BUILD_TAG}"
        JOBLINK_BASE_URL = 'http://web:3000'
        JOBLINK_GATEWAY_URL = 'http://gateway:80'
        AI_LIGHTWEIGHT_MODE = 'true'
        CI = 'true'
    }
    stages {
        stage('Source') {
            steps {
                deleteDir()
                script {
                    if (params.SOURCE_MODE == 'SCM') {
                        def revision = params.GIT_COMMIT?.trim()
                        if (revision && !(revision ==~ /[0-9a-fA-F]{40}/)) {
                            error('GIT_COMMIT phải là SHA Git gồm 40 ký tự hex.')
                        }
                        checkout([$class: 'GitSCM',
                            branches: [[name: revision ?: "*/${params.GIT_BRANCH}"]],
                            userRemoteConfigs: [[url: params.GIT_URL]]])
                        sh 'mkdir -p .ci; git rev-parse HEAD > .ci/source-commit.txt; printf "SCM checkout\\n" > .ci/source-mode.txt'
                        writeFile file: '.ci/webhook-delivery.txt', text: "${params.WEBHOOK_DELIVERY ?: 'manual-or-polling'}\n"
                        currentBuild.description = "SCM ${params.GIT_BRANCH} ${readFile('.ci/source-commit.txt').trim().take(7)}"
                    } else {
                        sh 'bash /opt/joblink/scripts/ci-source.sh'
                    }
                }
                sh '''
                    mkdir -p .ci
                    node --version
                    docker version --format '{{.Server.Version}}'
                    docker compose version
                    test -f Dockerfile && test -f Dockerfile.ai && test -f devops/nginx/default.conf
                '''
            }
        }
        stage('Node tests') {
            steps {
                sh 'npm ci --no-audit --no-fund'
                sh 'node --test --test-reporter=junit --test-reporter-destination=.ci/node-tests.xml tests/*.test.js'
            }
        }
        stage('Security & config audit') {
            steps {
                sh 'npm audit --omit=dev --audit-level=high > .ci/npm-audit.txt 2>&1'
                sh 'docker compose -f docker-compose.yml config -q'
                sh '''
                    if docker image inspect prom/prometheus:v3.15.1 >/dev/null 2>&1; then
                        tar -C devops/monitoring -cf - alerts.yml alerts.test.yml | \
                            docker run --rm -i --entrypoint sh prom/prometheus:v3.15.1 \
                            -c 'mkdir -p /tmp/prom && tar -C /tmp/prom -xf - && promtool test rules /tmp/prom/alerts.test.yml' > .ci/promtool-tests.log 2>&1
                        cat .ci/promtool-tests.log
                    fi
                '''
            }
        }
        stage('Build images') {
            steps {
                sh 'docker compose -f docker-compose.yml build web ai gateway'
            }
        }
        stage('AI & container checks') {
            steps {
                sh 'docker run --rm --network none "$JOBLINK_AI_IMAGE" python -m unittest ai_service.test_multilingual_matching'
                sh '''
                    WEB_UID=$(docker run --rm --network none --entrypoint id "$JOBLINK_WEB_IMAGE" -u)
                    AI_UID=$(docker run --rm --network none --entrypoint id "$JOBLINK_AI_IMAGE" -u)
                    echo "Verified non-root container UIDs: web=${WEB_UID}, ai=${AI_UID}"
                    test "$WEB_UID" != "0" && test "$AI_UID" != "0"
                '''
            }
        }
        stage('Registry publish') {
            when {
                expression { return params.PUSH_REGISTRY && env.REGISTRY_IMAGE_PREFIX }
            }
            steps {
                sh '''
                    COMMIT_SHORT=$(head -c 7 .ci/source-commit.txt 2>/dev/null || echo "latest")
                    docker tag "$JOBLINK_WEB_IMAGE" "${REGISTRY_IMAGE_PREFIX}/joblink-web:${COMMIT_SHORT}"
                    docker tag "$JOBLINK_AI_IMAGE" "${REGISTRY_IMAGE_PREFIX}/joblink-ai:${COMMIT_SHORT}"
                    docker push "${REGISTRY_IMAGE_PREFIX}/joblink-web:${COMMIT_SHORT}"
                    docker push "${REGISTRY_IMAGE_PREFIX}/joblink-ai:${COMMIT_SHORT}"
                '''
            }
        }
        stage('DB migrate & deploy') {
            when { expression { params.DEPLOY } }
            steps {
                sh 'node scripts/ci-deploy.js deploy'
            }
        }
        stage('Smoke checks') {
            when { expression { params.DEPLOY } }
            steps {
                sh 'node scripts/docker-check.js > .ci/smoke-checks.log 2>&1'
                sh 'cat .ci/smoke-checks.log'
                sh 'node scripts/ci-deploy.js confirm'
            }
        }
    }
    post {
        unsuccessful {
            sh 'if [ -f .ci/deployment.json ]; then node scripts/ci-deploy.js rollback; fi'
        }
        always {
            junit testResults: '.ci/node-tests.xml', allowEmptyResults: true
        }
        cleanup {
            archiveArtifacts artifacts: '.ci/*', allowEmptyArchive: true
        }
    }
}
