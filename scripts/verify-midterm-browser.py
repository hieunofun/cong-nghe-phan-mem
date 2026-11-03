"""Capture the actual local demo and verify three application login flows."""
import json
from pathlib import Path
import sys

sys.path.insert(0, 'E:/site-packages')
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'artifacts' / 'midterm-demo'
OUTPUT.mkdir(parents=True, exist_ok=True)
SECRETS = dict(line.split('=', 1) for line in
               (ROOT / '.devops/credentials.env').read_text().splitlines() if '=' in line)


def app_checks(browser):
    results = []
    context = browser.new_context(viewport={'width': 1440, 'height': 960})
    page = context.new_page()
    page.goto('http://localhost:3000', wait_until='networkidle')
    page.get_by_text('Lập trình viên Backend Node.js', exact=False).first.wait_for()
    page.screenshot(path=str(OUTPUT / 'web-home.png'), full_page=True)
    context.close()
    print('PASS browser: home renders seeded jobs')
    for role, email, password in [
        ('candidate', 'candidate@joblink.vn', 'Candidate@123'),
        ('company', 'hr@vietsoft.vn', 'Company@123'),
        ('admin', 'admin@joblink.vn', 'Admin@123')
    ]:
        context = browser.new_context(viewport={'width': 1440, 'height': 960})
        page = context.new_page()
        errors, failed_api = [], []
        page.on('pageerror', lambda err: errors.append(str(err)))
        page.on('response', lambda response: failed_api.append(f'{response.status} {response.url}')
                if '/api/' in response.url and response.status >= 400 else None)
        page.goto('http://localhost:3000/login.html', wait_until='networkidle')
        page.locator('#email').fill(email)
        page.locator('#password').fill(password)
        page.locator('#submit-btn').click()
        page.wait_for_url(f'**/{role}-dashboard.html')
        page.wait_for_load_state('networkidle')
        if role == 'candidate':
            assert page.locator('#full_name').input_value(), 'Empty candidate profile'
        page.screenshot(path=str(OUTPUT / f'web-{role}.png'), full_page=True)
        assert not errors, errors
        assert not failed_api, failed_api
        results.append({'role': role, 'javascriptErrors': errors, 'failedApi': failed_api})
        print(f'PASS browser: {role} login and dashboard')
        context.close()
    return results


def devops_screens(browser):
    context = browser.new_context(viewport={'width': 1440, 'height': 960})
    page = context.new_page()
    page.goto('http://localhost:8080/login', wait_until='domcontentloaded')
    page.locator('input[name="j_username"]').fill('admin')
    page.locator('input[name="j_password"]').fill(SECRETS['JENKINS_ADMIN_PASSWORD'])
    page.locator('button[name="Submit"], button[type="submit"]').first.click()
    page.wait_for_url(lambda url: '/login' not in url)
    page.goto('http://localhost:8080/job/joblink-scm/', wait_until='networkidle')
    page.get_by_text('Stage View', exact=False).first.wait_for(timeout=30000)
    stage_box = page.get_by_text('Stage View', exact=True).first.bounding_box()
    page.screenshot(path=str(OUTPUT / 'jenkins-pipeline.png'),
                    clip={'x': 355, 'y': max(0, stage_box['y'] - 10), 'width': 1070, 'height': 360})
    print('PASS browser: Jenkins job and stages visible')
    context.close()

    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, color_scheme='dark')
    page = context.new_page()
    page.goto('http://localhost:3001/login', wait_until='networkidle')
    page.locator('input[name="user"]').fill('admin')
    page.locator('input[name="password"]').fill(SECRETS['GRAFANA_ADMIN_PASSWORD'])
    page.get_by_role('button', name='Log in', exact=True).click()
    page.wait_for_url(lambda url: '/login' not in url, timeout=30000)
    page.goto('http://localhost:3001/d/joblink-overview?orgId=1&kiosk', wait_until='networkidle')
    page.get_by_text('Web / Express', exact=True).wait_for(timeout=30000)
    page.get_by_text('UP', exact=True).first.wait_for(timeout=30000)
    page.screenshot(path=str(OUTPUT / 'grafana-dashboard.png'), full_page=True)
    print('PASS browser: Grafana dashboard renders live UP states')
    context.close()

    context = browser.new_context(viewport={'width': 1440, 'height': 960})
    page = context.new_page()
    page.goto('http://localhost:9090/alerts', wait_until='domcontentloaded', timeout=60000)
    page.get_by_text('JobLinkServiceDown', exact=False).first.wait_for(timeout=30000)
    page.screenshot(path=str(OUTPUT / 'prometheus-alerts.png'), full_page=True)
    print('PASS browser: Prometheus alert rules visible')
    context.close()


with sync_playwright() as p:
    edge = Path('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')
    browser = p.chromium.launch(headless=True, **({'executable_path': str(edge)} if edge.exists() else {}))
    result = app_checks(browser)
    (OUTPUT / 'browser-checks.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    devops_screens(browser)
    browser.close()
