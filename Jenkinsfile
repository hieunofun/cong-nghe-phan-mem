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
        string(name: 'GIT_URL', defaultValue: 'https://github.com/hieunofun/cong-nghe-phan-mem.git', description: 'Repository phải có Jenkinsfile và các file Docker/DevOps mới trước khi dùng SCM.')
        string(name: 'GIT_BRANCH', defaultValue: 'main', description: 'Nhánh cần kiểm thử và triển khai.')
        string(name: 'GIT_COMMIT', defaultValue: '', description: 'SHA từ webhook; để trống để lấy commit mới nhất của nhánh.')
        string(name: 'WEBHOOK_DELIVERY', defaultValue: '', description: 'Mã delivery GitHub để đối chiếu lần chạy tự động.')
        booleanParam(name: 'DEPLOY', defaultValue: true, description: 'Triển khai Web/AI trên máy demo sau khi kiểm thử đạt.')
    }

    triggers { pollSCM('H/5 * * * *') }
    environment {
        COMPOSE_PROJECT_NAME = "${env.JOBLINK_COMPOSE_PROJECT ?: 'trienkhaiphanmemcki'}"
        JOBLINK_WEB_IMAGE = "joblink-web:${BUILD_TAG}"
        JOBLINK_AI_IMAGE = "joblink-ai:${BUILD_TAG}"
        JOBLINK_BASE_URL = 'http://web:3000'
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
                    test -f Dockerfile && test -f Dockerfile.ai
                '''
            }
        }
        stage('Node tests') {
            steps {
                sh 'npm ci --no-audit --no-fund'
                sh 'node --test --test-reporter=junit --test-reporter-destination=.ci/node-tests.xml tests/*.test.js'
            }
        }
        stage('Build images') {
            steps {
                sh 'docker compose -f docker-compose.yml build web ai'
            }
        }
        stage('AI tests') {
            steps {
                sh 'docker run --rm --network none "$JOBLINK_AI_IMAGE" python -m unittest ai_service.test_multilingual_matching'
            }
        }
        stage('Deploy') {
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
