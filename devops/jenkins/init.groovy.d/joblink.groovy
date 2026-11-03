import jenkins.model.Jenkins
import hudson.security.HudsonPrivateSecurityRealm
import hudson.security.FullControlOnceLoggedInAuthorizationStrategy
import org.jenkinsci.plugins.workflow.job.WorkflowJob
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition
import hudson.model.ParametersDefinitionProperty
import hudson.model.ChoiceParameterDefinition
import hudson.model.StringParameterDefinition
import hudson.model.BooleanParameterDefinition
import hudson.plugins.git.GitSCM
import org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition

def instance = Jenkins.get()
def username = System.getenv('JENKINS_ADMIN_ID') ?: 'admin'
def password = System.getenv('JENKINS_ADMIN_PASSWORD')
if (!password) {
    throw new IllegalStateException('JENKINS_ADMIN_PASSWORD is required')
}

// One authenticated local administrator; anonymous users have no access.
def realm = instance.securityRealm
if (!(realm instanceof HudsonPrivateSecurityRealm)) {
    realm = new HudsonPrivateSecurityRealm(false)
    instance.setSecurityRealm(realm)
}
if (hudson.model.User.getById(username, false) == null) {
    realm.createAccount(username, password)
}
def strategy = new FullControlOnceLoggedInAuthorizationStrategy()
strategy.setAllowAnonymousRead(false)
instance.setAuthorizationStrategy(strategy)
instance.setNumExecutors(1)
instance.setSystemMessage('JobLink — local Docker / CI/CD demo')

// The repository is mounted read-only, so uncommitted work can be demonstrated.
// Restart Jenkins after changing Jenkinsfile to refresh this job definition.
def pipelineFile = new File('/opt/joblink/Jenkinsfile')
if (pipelineFile.exists()) {
    def job = instance.getItem('joblink-local')
    if (job == null) {
        job = instance.createProject(WorkflowJob, 'joblink-local')
    }
    job.setDescription('Kiểm thử → build → triển khai Docker → smoke checks. LOCAL dùng bản mã nguồn hiện tại; SCM dùng Git URL/branch được nhập khi chạy.')
    if (job.getProperty(ParametersDefinitionProperty) == null) {
        job.addProperty(new ParametersDefinitionProperty([
            new ChoiceParameterDefinition('SOURCE_MODE', ['LOCAL', 'SCM'] as String[], 'LOCAL: source trên máy; SCM: Git URL / branch.'),
            new StringParameterDefinition('GIT_URL', 'https://github.com/hieunofun/cong-nghe-phan-mem.git', 'Repository có các file Docker / DevOps mới.'),
            new StringParameterDefinition('GIT_BRANCH', 'main', 'Nhánh cần triển khai.'),
            new BooleanParameterDefinition('DEPLOY', true, 'Triển khai Web / AI sau kiểm thử.')
        ]))
    }
    job.setDefinition(new CpsFlowDefinition(pipelineFile.getText('UTF-8'), true))
    job.save()
}
instance.save()

// Production-style job: Jenkinsfile itself is read from the remote main branch.
def scmJob = instance.getItem('joblink-scm')
if (scmJob == null) {
    scmJob = instance.createProject(WorkflowJob, 'joblink-scm')
}
def remoteUrl = 'https://github.com/hieunofun/cong-nghe-phan-mem.git'
def scm = new GitSCM(remoteUrl)
scm.branches = [new hudson.plugins.git.BranchSpec('*/main')]
def definition = new CpsScmFlowDefinition(scm, 'Jenkinsfile')
definition.setLightweight(true)
scmJob.setDefinition(definition)
scmJob.setDescription('GitHub main → Jenkinsfile từ SCM → tests → Docker build / deploy. GitHub webhook gọi job này với SHA và delivery ID.')
if (scmJob.getProperty(ParametersDefinitionProperty) == null) {
    scmJob.addProperty(new ParametersDefinitionProperty([
        new ChoiceParameterDefinition('SOURCE_MODE', ['SCM', 'LOCAL'] as String[], 'SCM mặc định cho job nhận webhook.'),
        new StringParameterDefinition('GIT_URL', remoteUrl, 'Repository nhóm.'),
        new StringParameterDefinition('GIT_BRANCH', 'main', 'Nhánh triển khai.'),
        new StringParameterDefinition('GIT_COMMIT', '', 'SHA từ webhook; trống = đầu nhánh.'),
        new StringParameterDefinition('WEBHOOK_DELIVERY', '', 'GitHub delivery ID.'),
        new BooleanParameterDefinition('DEPLOY', true, 'Triển khai sau kiểm thử.')
    ]))
}
scmJob.save()
instance.save()
